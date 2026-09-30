import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.apps import text_to_sql


def fake_score(question, items):
    return ({key: 1.0 / (index + 1) for index, (key, _) in enumerate(items)}, "keyword")


class SqlChain:
    def invoke(self, values):
        return (
            "SELECT c.name, COUNT(o.id) AS total_orders "
            "FROM customers c JOIN orders o ON o.customer_id = c.id "
            "GROUP BY c.id, c.name ORDER BY total_orders DESC LIMIT 5"
        )


class ExplainChain:
    def invoke(self, values):
        return "The query returned the top customers by order count."


text_to_sql.score = fake_score
text_to_sql.sql_chain = lambda: SqlChain()
text_to_sql.explain_chain = lambda: ExplainChain()

events = []
for update in text_to_sql.GRAPH.stream(
    {"question": "top 5 customers by total spend"},
    stream_mode="updates",
):
    events.extend(update.keys())

expected = ["retrieve_schema", "generate_sql", "run_sql", "explain"]
assert events == expected, f"Expected {expected}, got {events}"
print("smoke_test OK:", " -> ".join(events))