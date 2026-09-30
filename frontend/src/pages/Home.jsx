import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import projects from '../projects.json'
import { systems } from '../systems'
import { profile } from '../profile'
import { useBackend } from '../useBackend'

/* Neural field background: drifting nodes that link up and bend toward the cursor */
function NeuralField() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d')
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let w, h, nodes = [], raf, m = { x: -999, y: -999 }
    const init = () => {
      w = c.width = innerWidth; h = c.height = innerHeight
      nodes = Array.from({ length: Math.min(80, Math.floor((w * h) / 18000)) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3 }))
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const a of nodes) {
        if (!still) { a.x += a.vx; a.y += a.vy; if (a.x < 0 || a.x > w) a.vx *= -1; if (a.y < 0 || a.y > h) a.vy *= -1 }
        if (Math.hypot(a.x - m.x, a.y - m.y) < 160) { a.x += (m.x - a.x) * .004; a.y += (m.y - a.y) * .004 }
        ctx.fillStyle = 'rgba(107,228,255,.6)'; ctx.beginPath(); ctx.arc(a.x, a.y, 1.5, 0, 7); ctx.fill()
        for (const b of nodes) {
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 130) { ctx.strokeStyle = `rgba(107,228,255,${(1 - d / 130) * .18})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    const move = e => { m = { x: e.clientX, y: e.clientY } }
    init(); draw()
    addEventListener('resize', init); addEventListener('mousemove', move)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', init); removeEventListener('mousemove', move) }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 h-full w-full" />
}

function ServerStatus({ status }) {
  const map = {
    waking: ['bg-amber animate-pulse', 'text-amber', 'Waking up the demo server (free tier, up to 60s)'],
    ready: ['bg-ice', 'text-ice', 'Demo server online'],
    error: ['bg-pink', 'text-pink', 'Demo server unreachable, try again later'],
  }
  const [dot, txt, label] = map[status]
  return (
    <p role="status" className={`inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 px-3 py-1 font-mono text-xs ${txt}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />{label}
    </p>
  )
}

function Demo({ p, i, server }) {
  const live = p.status === 'live'
  const card = (
    <article className="flex h-full flex-col rounded-2xl border border-line bg-panel/80 p-6 transition group-hover:border-ice group-hover:shadow-[0_0_40px_-18px_rgba(107,228,255,.6)]">
      <div className="flex items-center justify-between font-mono text-xs text-muted">
        <span>{String(i + 1).padStart(2, '0')}</span>
        <span className={live ? 'text-ice' : 'text-amber'}>{live ? '● live' : '● in progress'}</span>
      </div>
      <h3 className="mt-6 text-2xl font-semibold">{p.title}</h3>
      <p className="mt-1 text-muted">{p.tagline}</p>
      <p className="mt-5 rounded-lg bg-void/70 px-3 py-2 font-mono text-xs text-ice">{p.how}</p>
      <div className="mt-auto flex items-center justify-between pt-6">
        <p className="font-mono text-xs text-muted">{p.tags.join(' · ')}</p>
        {live && <span className="text-sm font-medium text-ice">{server === 'waking' ? 'Starting…' : 'Open →'}</span>}
      </div>
    </article>
  )
  return live ? <Link to={p.route} className="group block">{card}</Link> : <div className="group">{card}</div>
}

const H2 = ({ children, note }) => (
  <div className="mb-8">
    <h2 className="text-3xl font-semibold">{children}</h2>
    {note && <p className="mt-2 max-w-2xl text-muted">{note}</p>}
  </div>
)

export default function Home() {
  const server = useBackend()
  return (
    <div className="relative">
      <NeuralField />
      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <span className="font-mono text-sm text-ice">{profile.name}</span>
          <nav className="flex gap-5 text-sm text-muted">
            <a href="#demos" className="hover:text-text">Demos</a>
            <a href="#systems" className="hover:text-text">Production work</a>
            <a href="#contact" className="hover:text-text">Contact</a>
          </nav>
        </header>

        <main>
          <section className="mx-auto max-w-6xl px-6 pb-20 pt-14">
            <ServerStatus status={server} />
            <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.08] sm:text-6xl">
              GenAI engineer. I ship agents, RAG and data pipelines.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              4 years in enterprise AI at Deloitte and Cognizant. Below: live demos you can try, and the production systems behind them.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#demos" className="rounded-md bg-ice px-5 py-3 font-medium text-void hover:brightness-110">See the demos</a>
              <a href={profile.resume} className="rounded-md border border-line px-5 py-3 font-medium hover:border-ice">Resume (PDF)</a>
            </div>
            <p className="mt-10 font-mono text-xs text-muted">LangGraph · RAG · Claude · GPT-4 · FastAPI · AWS · GCP · Azure</p>
          </section>

          <section id="demos" className="mx-auto max-w-6xl px-6 py-16">
            <H2 note="Each demo runs against a real backend and is built on free-tier infrastructure.">Live demos</H2>
            <div className="grid gap-5 md:grid-cols-2">{projects.map((p, i) => <Demo key={p.id} p={p} i={i} server={server} />)}</div>
          </section>

          <section id="systems" className="mx-auto max-w-6xl px-6 py-16">
            <H2 note="Client work is confidential, so these are described at a high level.">Production systems I've built</H2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {systems.map(s => (
                <article key={s.title} className="flex flex-col rounded-xl border border-line bg-panel/70 p-5">
                  <p className="font-mono text-xs text-pink">{s.org}</p>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.what}</p>
                  <p className="mt-4 font-mono text-xs text-ice">{s.flow}</p>
                  <p className="mt-auto pt-4 font-mono text-[11px] text-muted">{s.stack.join(' · ')}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="contact" className="mx-auto max-w-6xl px-6 py-20">
            <div className="rounded-2xl border border-line bg-panel/80 p-8 sm:p-12">
              <h2 className="text-3xl font-semibold">Let's talk about your AI problem.</h2>
              <p className="mt-2 text-muted">Open to GenAI and applied ML engineer roles.</p>
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-sm">
                <a className="text-ice hover:underline" href={`mailto:${profile.email}`}>{profile.email}</a>
                <a className="text-ice hover:underline" href={profile.linkedin} target="_blank" rel="noreferrer">linkedin</a>
                <a className="text-ice hover:underline" href={profile.github} target="_blank" rel="noreferrer">github</a>
              </div>
            </div>
          </section>
        </main>
        <footer className="pb-8 text-center font-mono text-xs text-muted">{profile.name} · React, Vite, FastAPI</footer>
      </div>
    </div>
  )
}
