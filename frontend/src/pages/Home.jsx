import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import projects from '../projects.json'
import { profile, experience, skills, certifications, repos, education } from '../profile'

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* Neural field: drifting nodes that link up and bend toward the cursor */
function NeuralField() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d')
    let w, h, nodes = [], raf, mouse = { x: -999, y: -999 }
    const init = () => {
      w = c.width = window.innerWidth; h = c.height = window.innerHeight
      nodes = Array.from({ length: Math.min(90, Math.floor((w * h) / 16000)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      }))
    }
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const a of nodes) {
        if (!reduceMotion()) {
          a.x += a.vx; a.y += a.vy
          if (a.x < 0 || a.x > w) a.vx *= -1
          if (a.y < 0 || a.y > h) a.vy *= -1
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y)
        if (dm < 160) { a.x += (mouse.x - a.x) * .004; a.y += (mouse.y - a.y) * .004 }
        ctx.fillStyle = 'rgba(107,228,255,.7)'
        ctx.beginPath(); ctx.arc(a.x, a.y, 1.6, 0, 7); ctx.fill()
        for (const b of nodes) {
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < 130) {
            ctx.strokeStyle = `rgba(107,228,255,${(1 - d / 130) * .22})`
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    const move = e => { mouse = { x: e.clientX, y: e.clientY } }
    init(); draw()
    window.addEventListener('resize', init); window.addEventListener('mousemove', move)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', init); window.removeEventListener('mousemove', move) }
  }, [])
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-0 h-full w-full" />
}

/* Agent trace: one scripted reasoning loop, typed once on load */
const TRACE = [
  ['thought', 'Question needs open complaints grouped by vendor.'],
  ['tool', 'sql_query("SELECT vendor, COUNT(*) FROM complaints WHERE status = \'open\' GROUP BY vendor")'],
  ['observe', 'rows returned, checking for duplicates across sources'],
  ['tool', 'dedupe_cluster(rows)'],
  ['answer', 'Ranked vendors with duplicate cases merged, in plain language.'],
]
const KIND = { thought: 'text-muted', tool: 'text-ice', observe: 'text-amber', answer: 'text-pink' }
const FULL = TRACE.map(([k, t]) => `${k.padEnd(8)} ${t}`).join('\n')

function AgentTrace() {
  const [n, setN] = useState(reduceMotion() ? FULL.length : 0)
  useEffect(() => {
    if (n >= FULL.length) return
    const t = setTimeout(() => setN(n + 1), 16)
    return () => clearTimeout(t)
  }, [n])
  const lines = FULL.slice(0, n).split('\n')
  return (
    <div className="rounded-xl border border-line bg-panel/90 shadow-[0_0_60px_-20px_rgba(107,228,255,.45)] backdrop-blur" aria-label="Illustrative agent reasoning trace">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 font-mono text-xs text-muted">
        <span className="h-2.5 w-2.5 rounded-full bg-pink" /><span className="h-2.5 w-2.5 rounded-full bg-amber" /><span className="h-2.5 w-2.5 rounded-full bg-ice" />
        <span className="ml-2">agent.trace (illustrative)</span>
      </div>
      <pre className="min-h-[15rem] whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-relaxed">
        {lines.map((l, i) => <div key={i} className={KIND[TRACE[i][0]]}>{l}{i === lines.length - 1 && n < FULL.length && <span className="animate-pulse">▍</span>}</div>)}
      </pre>
    </div>
  )
}

const FLOW = ['Vendor or customer email', 'AWS API Gateway + Lambda', 'LLM entity extraction', 'PostgreSQL', 'SAP ERP validation']

function Section({ id, title, children }) {
  return (
    <section id={id} className="relative border-t border-line py-16">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[220px_1fr]">
        <h2 className="text-2xl font-semibold lg:sticky lg:top-8 lg:self-start">{title}</h2>
        <div>{children}</div>
      </div>
    </section>
  )
}

function Module({ p }) {
  const live = p.status === 'live'
  const inner = (
    <div className="flex h-full flex-col rounded-xl border border-line bg-panel/80 p-5 transition group-hover:border-ice">
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="text-muted">{p.id}</span>
        <span className={`inline-flex items-center gap-2 ${live ? 'text-ice' : 'text-amber'}`}>
          <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-ice' : 'bg-amber'}`} />{live ? 'online' : 'building'}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{p.description}</p>
      <p className="mt-4 font-mono text-xs text-ice/80">{p.tags.join('  ')}</p>
    </div>
  )
  return live ? <Link to={p.route} className="group block">{inner}</Link> : <div className="group">{inner}</div>
}

export default function Home() {
  return (
    <div className="relative">
      <NeuralField />
      <div className="relative z-10">
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <a href="#top" className="font-mono text-sm text-ice">manav@ai-workbench:~$</a>
          <nav className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm text-muted">
            {[['apps', 'Apps'], ['experience', 'Experience'], ['skills', 'Stack'], ['contact', 'Contact']].map(([id, l]) =>
              <a key={id} href={`#${id}`} className="hover:text-text">{l}</a>)}
          </nav>
        </header>

        <main id="top">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-panel/80 px-3 py-1 font-mono text-xs text-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-ice" /> Open to GenAI and applied ML roles
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-[1.08] sm:text-6xl">{profile.name}</h1>
              <p className="mt-3 text-xl text-ice sm:text-2xl">I build AI agents that reason, retrieve and act.</p>
              <p className="mt-6 max-w-xl text-muted">{profile.summary}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#apps" className="rounded-md bg-ice px-5 py-3 font-medium text-void hover:brightness-110">Launch the apps</a>
                <a href={profile.resume} className="rounded-md border border-line px-5 py-3 font-medium hover:border-ice">Download resume</a>
              </div>
            </div>
            <AgentTrace />
          </div>

          <Section id="apps" title="Live apps">
            <p className="mb-6 max-w-xl text-muted">Working demos on a free-tier stack. The backend sleeps when idle, so the first request can take up to a minute.</p>
            <div className="grid gap-4 sm:grid-cols-2">{projects.map(p => <Module key={p.id} p={p} />)}</div>
          </Section>

          <Section id="experience" title="Experience">
            <div className="mb-12 rounded-xl border border-line bg-panel/80 p-5">
              <p className="mb-4 text-sm text-muted">Order automation at Deloitte: how one email becomes a validated SAP order</p>
              <ol className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
                {FLOW.map((s, i) => (
                  <li key={s} className="flex flex-1 items-center gap-2">
                    <span className="flex-1 rounded-md border border-line bg-void/70 px-3 py-2 text-center font-mono text-xs text-ice">{s}</span>
                    {i < FLOW.length - 1 && <span aria-hidden className="text-muted lg:block">→</span>}
                  </li>
                ))}
              </ol>
            </div>
            <ol className="space-y-10 border-l border-line pl-6">
              {experience.map(e => (
                <li key={e.company} className="relative">
                  <span className="absolute -left-[29px] top-2 h-2.5 w-2.5 rounded-full bg-ice shadow-[0_0_12px_rgba(107,228,255,.9)]" />
                  <h3 className="text-xl font-semibold">{e.company}</h3>
                  <p className="font-mono text-sm text-muted">{e.role} · {e.dates}</p>
                  <ul className="mt-3 max-w-2xl list-disc space-y-2 pl-5 text-muted marker:text-ice">
                    {e.points.map(pt => <li key={pt}>{pt}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="skills" title="Stack">
            <div className="grid gap-4 sm:grid-cols-2">
              {skills.map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-panel/80 p-5">
                  <h3 className="font-semibold">{k}</h3>
                  <p className="mt-2 flex flex-wrap gap-2">
                    {v.split(', ').map(t => <span key={t} className="rounded border border-line px-2 py-0.5 font-mono text-xs text-ice/90">{t}</span>)}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="more" title="Earlier projects">
            <ul className="max-w-3xl divide-y divide-line border-y border-line">
              {repos.map(([name, desc, url]) => (
                <li key={name} className="py-4">
                  <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-ice hover:underline">{name}</a>
                  <p className="text-sm text-muted">{desc}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="credentials" title="Credentials">
            <div className="grid max-w-3xl gap-10 sm:grid-cols-2">
              <ul className="space-y-2 text-sm">{certifications.map(([n, y]) => <li key={n}>{n} <span className="font-mono text-muted">{y}</span></li>)}</ul>
              <ul className="space-y-3 text-sm">{education.map(([n, s]) => <li key={n}>{n}<br /><span className="text-muted">{s}</span></li>)}</ul>
            </div>
          </Section>

          <Section id="contact" title="Contact">
            <p className="max-w-xl text-lg">Have an AI problem that needs an agent, a retrieval layer or a data pipeline? Email me.</p>
            <ul className="mt-6 space-y-2 font-mono text-sm">
              <li><a className="text-ice hover:underline" href={`mailto:${profile.email}`}>{profile.email}</a></li>
              <li><a className="text-ice hover:underline" href={profile.linkedin} target="_blank" rel="noreferrer">linkedin</a></li>
              <li><a className="text-ice hover:underline" href={profile.github} target="_blank" rel="noreferrer">github</a></li>
            </ul>
          </Section>
        </main>

        <footer className="border-t border-line py-8 text-center font-mono text-xs text-muted">
          {profile.name} · React, Vite, FastAPI · $0 stack
        </footer>
      </div>
    </div>
  )
}
