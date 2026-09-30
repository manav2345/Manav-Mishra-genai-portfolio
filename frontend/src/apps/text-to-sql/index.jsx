import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useBackend } from '../../useBackend'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const EXAMPLES = ['Which category earns the most revenue?', 'Top 5 customers by total spend', 'How many orders were cancelled in each city?', 'Average rating for each product category']

async function streamAsk(question, onEvent) {
  const r = await fetch(`${API}/api/text_to_sql/ask`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) })
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.detail || `Request failed (${r.status})`) }
  const reader = r.body.getReader(), dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const parts = buf.split('\n\n'); buf = parts.pop()
    for (const p of parts) if (p.startsWith('data: ')) await onEvent(JSON.parse(p.slice(6))) // one LangGraph node update per event
  }
}

function Typed({ text, speed = 14 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= text.length) return
    const t = setTimeout(() => setN(n + 1), speed)
    return () => clearTimeout(t)
  }, [n, text, speed])
  return <>{text.slice(0, n)}{n < text.length && <span className="animate-pulse">▍</span>}</>
}

function useGo() {
  const [go, setGo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setGo(true), 60); return () => clearTimeout(t) }, [])
  return go
}

function Stage({ n, title, step, children }) {
  const active = step === n, done = step > n
  return (
    <section className="rounded-2xl border border-line bg-panel/80 p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${done ? 'bg-ice text-void' : 'border border-ice text-ice'} ${active ? 'animate-pulse' : ''}`}>{done ? '✓' : n}</span>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Retrieval({ data }) {
  const go = useGo()
  const max = Math.max(...data.tables.map(t => t.score), 0.001)
  return (
    <div>
      <p className="mb-3 font-mono text-xs text-muted">Ranked by {data.method === 'embeddings' ? 'embedding similarity' : 'keyword similarity (fallback)'}: tables first, then columns of the top 3</p>
      <ul className="space-y-3">
        {data.tables.map((t, i) => (
          <li key={t.name} className={t.selected ? '' : 'opacity-40'}>
            <div className="flex items-center gap-3 font-mono text-sm">
              <span className="w-28 shrink-0">{t.name}</span>
              <div className="h-2 flex-1 rounded bg-void">
                <div className={`h-2 rounded ${t.selected ? 'bg-ice' : 'bg-line'}`} style={{ width: go ? `${Math.max(3, (t.score / max) * 100)}%` : '0%', transition: `width 700ms ease ${i * 120}ms` }} />
              </div>
              <span className="w-12 text-right text-xs text-muted">{t.score.toFixed(2)}</span>
            </div>
            {t.selected && (
              <div className="mt-2 flex flex-wrap gap-2 pl-[7.75rem]">
                {t.columns.map((c, j) => (
                  <span key={c.name} className={`rounded border px-2 py-0.5 font-mono text-xs ${c.selected ? 'border-ice text-ice' : 'border-line text-muted line-through'}`}
                    style={{ opacity: go ? 1 : 0, transform: go ? 'none' : 'translateY(6px)', transition: `all 400ms ease ${600 + i * 120 + j * 70}ms` }}>
                    {c.name} <span className="text-muted">{c.score.toFixed(2)}</span>
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Only the highlighted tables and columns are sent to the model.</p>
    </div>
  )
}

function Results({ res }) {
  const go = useGo()
  if (res.error) return <p className="font-mono text-sm text-pink">SQL error: {res.error}</p>
  if (!res.rows.length) return <p className="text-sm text-muted">The query ran but returned no rows.</p>
  return (
    <div className="max-h-72 overflow-auto rounded-lg border border-line">
      <table className="w-full text-left font-mono text-xs">
        <thead className="sticky top-0 bg-void text-ice"><tr>{res.columns.map(c => <th key={c} className="px-3 py-2">{c}</th>)}</tr></thead>
        <tbody>
          {res.rows.map((r, i) => (
            <tr key={i} className="border-t border-line" style={{ opacity: go ? 1 : 0, transition: `opacity 350ms ease ${Math.min(i, 15) * 60}ms` }}>
              {r.map((v, j) => <td key={j} className="px-3 py-1.5">{String(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function TextToSql() {
  const server = useBackend()
  const [q, setQ] = useState('')
  const [step, setStep] = useState(0) // 0 idle, 1-4 running stage, 5 finished
  const [ret, setRet] = useState(null), [tries, setTries] = useState([]), [res, setRes] = useState(null), [ans, setAns] = useState('')
  const [err, setErr] = useState('')
  const [showJump, setShowJump] = useState(false)
  const stagesRef = useRef(null)
  const endRef = useRef(null)
  const followRef = useRef(true)
  const sql = tries.length ? tries[tries.length - 1].sql : ''
  const busy = step > 0 && step < 5

  const scrollToEnd = useCallback(() => {
    if (!followRef.current) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = reduce ? 'auto' : 'smooth'
    // Primary: scroll the sentinel into view (works for window scroll)
    try { endRef.current?.scrollIntoView({ behavior, block: 'end' }) } catch { /* ignore */ }
    // Fallback: window/documentElement scrollTo covers production where
    // document.body.scrollHeight !== documentElement.scrollHeight or
    // scrollIntoView is throttled/blocked. rAF ensures layout is flushed.
    requestAnimationFrame(() => {
      if (!followRef.current) return
      const top = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
      try { window.scrollTo({ top, behavior }) } catch { window.scrollTo(0, top) }
      try { document.documentElement.scrollTo?.({ top, behavior }) } catch { /* ignore */ }
    })
    // Dual-scroll strategy ensures auto-follow works in both local dev and
    // deployed Vercel where document structure may differ.
  }, [])

  useEffect(() => {
    if (step > 0) scrollToEnd()
  }, [step, ret, tries.length, res, ans, err, scrollToEnd])

  useEffect(() => {
    if (!busy || !stagesRef.current) return undefined
    let frame = null
    const observer = new ResizeObserver(() => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        scrollToEnd()
      })
    })
    observer.observe(stagesRef.current)
    return () => {
      observer.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [busy, scrollToEnd])

  useEffect(() => {
    const stopFollowing = () => {
      followRef.current = false
      if (busy) setShowJump(true)
    }
    const handleWheel = event => {
      if (event.deltaY < 0) stopFollowing()
    }
    const handleKeyDown = event => {
      if (['PageUp', 'ArrowUp', 'Home'].includes(event.key)) stopFollowing()
    }
    const handleScroll = () => {
      const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    const atBottom = window.innerHeight + window.scrollY >= scrollHeight - 40
      if (atBottom) {
        followRef.current = true
        setShowJump(false)
      }
    }
    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchmove', stopFollowing, { passive: true })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchmove', stopFollowing)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [busy])

  async function run(question) {
    if (busy || question.trim().length < 3) return
    followRef.current = true
    setShowJump(false)
    setQ(question); setErr(''); setRet(null); setTries([]); setRes(null); setAns(''); setStep(1)
    const handle = async ev => {
      if (ev.node === 'retrieve_schema') { setRet(ev); await sleep(2200); setStep(2) }
      else if (ev.node === 'generate_sql') { setTries(t => [...t, { sql: ev.sql }]); await sleep(Math.min(ev.sql.length * 14 + 600, 3500)); setStep(3) }
      else if (ev.node === 'run_sql') {
        setRes(ev.result); await sleep(1200)
        if (ev.result.error && ev.result.retry) { // LangGraph loops back to generate_sql
          setTries(t => t.map((x, i) => (i === t.length - 1 ? { ...x, error: ev.result.error } : x))); setRes(null); setStep(2)
        } else setStep(ev.result.error ? 5 : 4)
      }
      else if (ev.node === 'explain') { setAns(ev.answer); setStep(5) }
      else if (ev.node === 'error') throw new Error(ev.message)
    }
    try { await streamAsk(question, handle); setStep(5) } catch (e) { setErr(e.message); setStep(0) } // on failure, hide stages instead of showing false checkmarks
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-center justify-between font-mono text-xs">
        <Link to="/" className="text-ice hover:underline">← Portfolio</Link>
        <span className={server === 'ready' ? 'text-ice' : server === 'error' ? 'text-pink' : 'animate-pulse text-amber'}>
          {server === 'ready' ? '● server online' : server === 'error' ? '● server unreachable' : '● waking server (up to 60s)'}
        </span>
      </div>
      <h1 className="mt-8 text-3xl font-bold">Ask your database</h1>
      <p className="mt-2 text-muted">Type a question. Watch it find the right tables, write SQL, run it and explain the answer. Demo data: an online store with 6 tables.</p>

      <div className="mt-6 flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run(q)} maxLength={300} placeholder="e.g. Which category earns the most revenue?"
          className="flex-1 rounded-md border border-line bg-panel px-4 py-3 text-sm outline-none focus:border-ice" />
        <button onClick={() => run(q)} disabled={busy} className="rounded-md bg-ice px-5 py-3 font-medium text-void disabled:opacity-50">{busy ? 'Working…' : 'Ask'}</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map(e => <button key={e} onClick={() => run(e)} disabled={busy} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-ice hover:text-text disabled:opacity-50">{e}</button>)}
      </div>

      <div ref={stagesRef} className="mt-8 space-y-4">
        {step >= 1 && <Stage n={1} title="Find relevant schema" step={step}>{ret ? <Retrieval data={ret} /> : <p className="animate-pulse text-sm text-muted">Scoring tables and columns…</p>}</Stage>}
        {step >= 2 && (
          <Stage n={2} title="Generate SQL" step={step}>
            {tries.filter(t => t.error).map((t, i) => <p key={i} className="mb-2 font-mono text-xs text-pink">Attempt {i + 1} failed: {t.error}. Sending the error back to the model…</p>)}
            {sql && !(step === 2 && tries[tries.length - 1].error)
              ? <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-void p-4 font-mono text-[13px] text-ice"><Typed key={sql} text={sql} /></pre>
              : !err && <p className="animate-pulse text-sm text-muted">Model is writing the query…</p>}
          </Stage>
        )}
        {step >= 3 && <Stage n={3} title="Run the query" step={step}>{res ? <Results res={res} /> : !err && <p className="animate-pulse text-sm text-muted">Executing…</p>}</Stage>}
        {step >= 4 && <Stage n={4} title="Explain the result" step={step}>{ans ? <p className="text-pink"><span className="text-text"><Typed text={ans} speed={10} /></span></p> : !err && <p className="animate-pulse text-sm text-muted">Model is writing the answer…</p>}</Stage>}
        {err && <p role="alert" className="rounded-lg border border-pink p-4 text-sm text-pink">{err}</p>}
      </div>
      <div ref={endRef} className="h-24" aria-hidden />
      {showJump && busy && (
        <button
          type="button"
          aria-label="Follow pipeline progress"
          onClick={() => { followRef.current = true; setShowJump(false); scrollToEnd() }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-ice bg-panel px-4 py-2 font-mono text-xs text-ice shadow-lg"
        >
          Follow progress ↓
        </button>
      )}
      <p className="mt-10 font-mono text-xs text-muted">Orchestration: LangGraph + LangChain · Model: Nemotron 3 Super 120B · Retrieval: NVIDIA embeddings · DB: SQLite, read-only</p>
    </div>
  )
}
