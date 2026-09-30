"""Text-to-SQL demo orchestrated with LangGraph:
retrieve_schema -> generate_sql -> run_sql -(error? retry)-> explain, streamed to the UI as SSE."""
import logging
import os, re, json, math, random, sqlite3, time, threading
from collections import Counter, defaultdict
from datetime import date, timedelta
from typing import Any
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing_extensions import TypedDict
from fastapi.responses import StreamingResponse
from openai import OpenAI
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langgraph.graph import StateGraph, START, END

router = APIRouter()
log = logging.getLogger("uvicorn.error")
MODEL = "nvidia/nemotron-3-super-120b-a12b"
EMBED_MODEL = os.getenv("EMBED_MODEL", "nvidia/nemotron-3-embed-1b")

# ---------- LLM client (key comes from the NVIDIA_API_KEY env var, never from code) ----------
_client = None
def client():
    global _client
    if _client is None:
        key = os.getenv("NVIDIA_API_KEY")
        if not key:
            raise HTTPException(503, "NVIDIA_API_KEY is not configured on the server")
        _client = OpenAI(base_url="https://integrate.api.nvidia.com/v1", api_key=key, timeout=60)
    return _client

# ---------- Demo database (in-memory SQLite, rebuilt on every start) ----------
SCHEMA = {
    "customers":   ("People who buy from the store", [("id", "INTEGER"), ("name", "TEXT"), ("city", "TEXT"), ("signup_date", "TEXT")]),
    "products":    ("Items the store sells, with category and price", [("id", "INTEGER"), ("name", "TEXT"), ("category", "TEXT"), ("price", "REAL")]),
    "orders":      ("Purchases placed by customers, with date and status", [("id", "INTEGER"), ("customer_id", "INTEGER"), ("order_date", "TEXT"), ("status", "TEXT")]),
    "order_items": ("Line items: which products and how many units were in each order", [("id", "INTEGER"), ("order_id", "INTEGER"), ("product_id", "INTEGER"), ("quantity", "INTEGER")]),
    "reviews":     ("Customer ratings and comments about products", [("id", "INTEGER"), ("product_id", "INTEGER"), ("rating", "INTEGER"), ("comment", "TEXT")]),
    "employees":   ("Store staff with department and salary", [("id", "INTEGER"), ("name", "TEXT"), ("department", "TEXT"), ("salary", "REAL")]),
}
FKS = [("orders", "customer_id", "customers"), ("order_items", "order_id", "orders"),
       ("order_items", "product_id", "products"), ("reviews", "product_id", "products")]

def build_db():
    db = sqlite3.connect(":memory:", check_same_thread=False)
    for t, (_, cols) in SCHEMA.items():
        db.execute(f"CREATE TABLE {t} ({', '.join(f'{c} {ty}' for c, ty in cols)})")
    rnd = random.Random(7)
    day = lambda a, b: (a + timedelta(days=rnd.randint(0, (b - a).days))).isoformat()
    names = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Sana", "Vikram", "Isha", "Neel", "Tara"]
    cities = ["Delhi", "Mumbai", "Bengaluru", "Pune", "Chennai", "Kolkata"]
    cats = ["Electronics", "Books", "Home", "Fashion", "Sports"]
    d0, d1 = date(2025, 1, 1), date(2026, 9, 30)
    db.executemany("INSERT INTO customers VALUES (?,?,?,?)",
        [(i, f"{rnd.choice(names)} {chr(65 + i % 26)}.", rnd.choice(cities), day(date(2024, 1, 1), d1)) for i in range(1, 41)])
    db.executemany("INSERT INTO products VALUES (?,?,?,?)",
        [(i, f"{cats[i % 5]} item {i}", cats[i % 5], float(rnd.randint(199, 14999))) for i in range(1, 16)])
    db.executemany("INSERT INTO orders VALUES (?,?,?,?)",
        [(i, rnd.randint(1, 40), day(d0, d1), rnd.choice(["delivered"] * 3 + ["shipped", "cancelled", "pending"])) for i in range(1, 201)])
    db.executemany("INSERT INTO order_items VALUES (?,?,?,?)",
        [(None, o, rnd.randint(1, 15), rnd.randint(1, 4)) for o in range(1, 201) for _ in range(rnd.randint(1, 3))])
    comments = ["Great value", "Broke after a week", "Loved it", "Average", "Would buy again"]
    db.executemany("INSERT INTO reviews VALUES (?,?,?,?)",
        [(i, rnd.randint(1, 15), rnd.choice([1, 2, 3, 4, 4, 5, 5]), rnd.choice(comments)) for i in range(1, 81)])
    depts = ["Sales", "Support", "Engineering", "Ops"]
    db.executemany("INSERT INTO employees VALUES (?,?,?,?)",
        [(i, f"{rnd.choice(names)} {chr(75 + i % 12)}.", rnd.choice(depts), float(rnd.randint(30, 120) * 1000)) for i in range(1, 13)])
    db.commit()
    return db

DB, LOCK = build_db(), threading.Lock()

# ---------- Tiny per-IP limiter so strangers can't burn the free quota ----------
HITS = defaultdict(list)
def limit(request: Request, cap=90):
    ip = (request.headers.get("x-forwarded-for") or request.client.host).split(",")[0].strip()
    now = time.time()
    HITS[ip] = [t for t in HITS[ip] if now - t < 3600]
    if len(HITS[ip]) >= cap:
        raise HTTPException(429, "Hourly demo limit reached. Please try again later.")
    HITS[ip].append(now)

# ---------- Similarity scoring: NVIDIA embeddings, keyword cosine as fallback ----------
_cache = {}
def cos(a, b):
    d = sum(x * y for x, y in zip(a, b))
    n = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return d / n if n else 0.0

def toks(s):
    return [t[:-1] if t.endswith("s") and len(t) > 3 else t for t in re.findall(r"[a-z]+", s.lower().replace("_", " "))]

def embed(texts, kind):
    r = client().embeddings.create(model=EMBED_MODEL, input=texts, encoding_format="float",
                                   extra_body={"input_type": kind, "truncate": "END"})
    return [d.embedding for d in r.data]

def score(question, items):
    """items: [(key, text)] -> ({key: similarity}, method)"""
    try:
        q = embed([question], "query")[0]
        missing = [(k, t) for k, t in items if f"{EMBED_MODEL}|{k}" not in _cache]
        if missing:
            for (k, _), v in zip(missing, embed([t for _, t in missing], "passage")):
                _cache[f"{EMBED_MODEL}|{k}"] = v
        return {k: cos(q, _cache[f"{EMBED_MODEL}|{k}"]) for k, _ in items}, "embeddings"
    except Exception:
        log.warning("Embeddings failed, using keyword fallback", exc_info=True)
        qc = Counter(toks(question))
        def lex(t):
            c = Counter(toks(t)); d = sum(qc[w] * c[w] for w in qc)
            n = math.sqrt(sum(v * v for v in qc.values())) * math.sqrt(sum(v * v for v in c.values()))
            return d / n if n else 0.0
        return {k: lex(t) for k, t in items}, "keyword"

is_key = lambda c: c == "id" or c.endswith("_id")


def rank_schema(q):
    ts, method = score(q, [(t, f"table {t}: {d}") for t, (d, _) in SCHEMA.items()])
    ranked = sorted(ts, key=ts.get, reverse=True)
    top = ranked[:3]
    tables = []
    for t in ranked:
        cols = []
        if t in top:
            cs, _ = score(q, [(f"{t}.{c}", f"column {c} ({ty}) of table {t}: {SCHEMA[t][0]}") for c, ty in SCHEMA[t][1]])
            ordered = sorted(SCHEMA[t][1], key=lambda c: cs[f"{t}.{c[0]}"], reverse=True)
            keep = {c for c, _ in ordered[:4]}
            cols = [{"name": c, "type": ty, "score": round(cs[f"{t}.{c}"], 3), "selected": c in keep or is_key(c)} for c, ty in ordered]
        tables.append({"name": t, "description": SCHEMA[t][0], "score": round(ts[t], 3), "selected": t in top, "columns": cols})
    return method, tables

def schema_text(sel):
    lines = []
    for t, cols in sel.items():
        types = dict(SCHEMA[t][1])
        lines.append(f"{t}({', '.join(f'{c} {types[c]}' for c in cols if c in types)})")
    joins = [f"{a}.{c} -> {b}.id" for a, c, b in FKS if a in sel and b in sel]
    return "\n".join(lines) + (f"\nJoins: {'; '.join(joins)}" if joins else "")

def run_readonly(sql):
    sql = sql.strip().rstrip(";")
    if ";" in sql or not re.match(r"(?is)^\s*(select|with)\b", sql) or \
       re.search(r"(?i)\b(insert|update|delete|drop|alter|create|attach|pragma|replace)\b", sql):
        return {"error": "Only a single read-only SELECT query is allowed.", "columns": [], "rows": []}
    with LOCK:
        try:
            DB.execute("PRAGMA query_only = ON")
            deadline = time.time() + 3
            DB.set_progress_handler(lambda: 1 if time.time() > deadline else 0, 10000)
            cur = DB.execute(sql)
            cols = [d[0] for d in cur.description or []]
            rows = cur.fetchmany(50)
        except sqlite3.Error as e:
            return {"error": str(e), "columns": [], "rows": []}
        finally:
            DB.set_progress_handler(None, 0)
    return {"error": None, "columns": cols, "rows": [list(r) for r in rows]}

# ---------- LangChain: prompts + chains (LCEL) ----------
def llm(temp):
    key = os.getenv("NVIDIA_API_KEY")
    if not key:
        raise RuntimeError("NVIDIA_API_KEY is not configured on the server")
    return ChatOpenAI(model=MODEL, base_url="https://integrate.api.nvidia.com/v1", api_key=key,
                      temperature=temp, top_p=1, max_tokens=1024, timeout=60, max_retries=1)

SQL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You write SQLite queries. Reply with exactly one SELECT statement and nothing else: no markdown, no explanation. "
               "Use only the tables and columns given. Dates are ISO text (YYYY-MM-DD). Today is 2026-09-30. "
               "Revenue means SUM(order_items.quantity * products.price). Limit results to 20 rows unless asked otherwise."),
    ("human", "Schema:\n{schema}\n\nQuestion: {question}{feedback}"),
])
EXPLAIN_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are a data analyst. Answer the question in 2-4 clear sentences using only the query result. "
               "Mention the key numbers. If the result is empty, say no matching data was found. Do not invent facts."),
    ("human", "Question: {question}\nSQL: {sql}\nResult ({n} rows):\n{table}"),
])
def clean_model_text(text):
    text = re.sub(r"<think>.*?</think>", "", text or "", flags=re.S)
    return re.sub(r"\*\*(.*?)\*\*", r"\1", text).strip()


strip_think = clean_model_text
def sql_chain():     return SQL_PROMPT | llm(0.1) | StrOutputParser()
def explain_chain(): return EXPLAIN_PROMPT | llm(0.3) | StrOutputParser()

# ---------- LangGraph: shared state, nodes, edges ----------
MAX_ATTEMPTS = 2

class S(TypedDict, total=False):
    question: str
    method: str
    tables: list
    selection: dict
    schema: str
    sql: str
    attempts: int
    result: dict
    answer: str

def retrieve_schema(s: S):
    method, tables = rank_schema(s["question"])
    sel = {t["name"]: [c["name"] for c in t["columns"] if c["selected"]] for t in tables if t["selected"]}
    return {"method": method, "tables": tables, "selection": sel, "schema": schema_text(sel), "attempts": 0}

def generate_sql(s: S):
    r, fb = s.get("result"), ""
    if r and r.get("error"):  # self-correction: show the model its own failure
        fb = f"\n\nYour previous query failed.\nQuery: {s['sql']}\nError: {r['error']}\nReturn a corrected query."
    out = strip_think(sql_chain().invoke({"schema": s["schema"], "question": s["question"], "feedback": fb}))
    sql = re.sub(r"```(?:sql)?", "", out, flags=re.I).strip().split(";")[0].strip()
    return {"sql": sql, "attempts": s.get("attempts", 0) + 1}

def run_sql(s: S):
    res = run_readonly(s["sql"])
    res["retry"] = bool(res["error"]) and s["attempts"] < MAX_ATTEMPTS
    return {"result": res}

def explain(s: S):
    r = s["result"]
    table = "\n".join([" | ".join(r["columns"])] + [" | ".join(str(v) for v in row) for row in r["rows"][:20]])
    ans = explain_chain().invoke({"question": s["question"], "sql": s["sql"], "n": len(r["rows"]), "table": table})
    return {"answer": strip_think(ans)}

def after_run(s: S):
    r = s["result"]
    if r["error"]:
        return "generate_sql" if r["retry"] else END
    return "explain"

def build_graph():
    g = StateGraph(S)
    g.add_node("retrieve_schema", retrieve_schema)
    g.add_node("generate_sql", generate_sql)
    g.add_node("run_sql", run_sql)
    g.add_node("explain", explain)
    g.add_edge(START, "retrieve_schema")
    g.add_edge("retrieve_schema", "generate_sql")
    g.add_edge("generate_sql", "run_sql")
    g.add_conditional_edges("run_sql", after_run, ["generate_sql", "explain", END])
    g.add_edge("explain", END)
    return g.compile()

GRAPH = build_graph()

# ---------- API ----------
class Ask(BaseModel):
    question: str

@router.post("/ask")
def ask(body: Ask, request: Request):
    limit(request, cap=20)  # each question = several LLM calls
    q = body.question.strip()[:300]
    if len(q) < 3:
        raise HTTPException(400, "Please type a question.")

    def events():
        try:
            for upd in GRAPH.stream({"question": q}, stream_mode="updates"):
                for node, data in upd.items():
                    yield f"data: {json.dumps({'node': node, **data}, default=str)}\n\n"
        except Exception as e:
            log.exception("text_to_sql graph failed")
            msg = str(e) if isinstance(e, RuntimeError) else "The language model is unavailable right now. Please try again."
            yield f"data: {json.dumps({'node': 'error', 'message': msg})}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@router.get("/graph")
def graph():
    """Mermaid source of the LangGraph workflow (handy for the README)."""
    return {"mermaid": GRAPH.get_graph().draw_mermaid()}
