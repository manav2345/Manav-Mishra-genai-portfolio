import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import projects from '../projects.json'
import { profile, experience, skills, certifications, repos, education } from '../profile'

const QUESTION = 'Which vendors have the most open complaints this quarter?'
const SQL = `SELECT vendor, COUNT(*) AS open_cases
FROM complaints
WHERE status = 'open'
  AND created_at >= date_trunc('quarter', now())
GROUP BY vendor
ORDER BY open_cases DESC
LIMIT 5;`

function useTyped(text, speed = 14) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (n >= text.length) return
    const t = setTimeout(() => setN(n + 1), speed)
    return () => clearTimeout(t)
  }, [n, text, speed])
  return text.slice(0, n)
}

function QueryPanel() {
  const typed = useTyped(SQL)
  const done = typed.length === SQL.length
  return (
    <div className="rounded-lg border border-line bg-white shadow-sm" aria-label="Example of a natural-language database query">
      <div className="border-b border-line px-4 py-3 text-sm text-muted">Example: the kind of question my Text-to-SQL agents answer</div>
      <div className="space-y-4 p-4">
        <p className="rounded-md bg-paper px-3 py-2 text-sm">{QUESTION}</p>
        <pre className="min-h-[9.5rem] overflow-x-auto rounded-md bg-ink p-4 text-[13px] leading-relaxed text-slate-100">
          <code>{typed}{!done && <span className="animate-pulse">|</span>}</code>
        </pre>
        <p className={`text-sm text-muted transition-opacity duration-500 ${done ? 'opacity-100' : 'opacity-0'}`}>
          The agent runs the query, then explains the result in plain language.
        </p>
      </div>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="border-t border-line py-14">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-[220px_1fr]">
        <h2 className="font-display text-2xl font-semibold lg:sticky lg:top-8 lg:self-start">{title}</h2>
        <div>{children}</div>
      </div>
    </section>
  )
}

function ProjectRow({ p }) {
  const live = p.status === 'live'
  const body = (
    <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-xl">
        <h3 className="font-display text-xl font-semibold">{p.title}</h3>
        <p className="mt-1 text-muted">{p.description}</p>
        <p className="mt-2 text-sm text-muted">{p.tags.join(', ')}</p>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-2 text-sm ${live ? 'text-cobalt font-medium' : 'text-muted'}`}>
        <span className={`h-2 w-2 rounded-full ${live ? 'bg-cobalt' : 'bg-signal'}`} />
        {live ? 'Open the app' : 'In progress'}
      </span>
    </div>
  )
  return live ? (
    <Link to={p.route} className="block border-b border-line hover:bg-white/60">{body}</Link>
  ) : (
    <div className="border-b border-line">{body}</div>
  )
}

export default function Home() {
  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <a href="#top" className="font-display text-lg font-semibold">{profile.name}</a>
        <nav className="flex gap-5 text-sm text-muted">
          <a href="#apps" className="hover:text-ink">Live apps</a>
          <a href="#experience" className="hover:text-ink">Experience</a>
          <a href="#skills" className="hover:text-ink">Skills</a>
          <a href="#contact" className="hover:text-ink">Contact</a>
        </nav>
      </header>

      <main id="top">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="text-muted">{profile.title} · {profile.location}</p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] sm:text-6xl">
              I build AI agents and RAG systems that work inside enterprise workflows.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted">{profile.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#apps" className="rounded-md bg-cobalt px-5 py-3 font-medium text-white hover:bg-[#1c39c4]">Try the live apps</a>
              <a href={profile.resume} className="rounded-md border border-ink px-5 py-3 font-medium hover:bg-white">Download resume</a>
            </div>
          </div>
          <QueryPanel />
        </div>

        <Section id="apps" title="Live apps">
          <p className="mb-2 max-w-xl text-muted">
            Working demos on a free-tier stack. Each one runs against a real backend, so the first request can take up to a minute to wake it.
          </p>
          <div className="border-t border-line">{projects.map(p => <ProjectRow key={p.id} p={p} />)}</div>
        </Section>

        <Section id="experience" title="Experience">
          <ol className="space-y-10 border-l border-line pl-6">
            {experience.map(e => (
              <li key={e.company} className="relative">
                <span className="absolute -left-[29px] top-2 h-2.5 w-2.5 rounded-full bg-cobalt" />
                <h3 className="font-display text-xl font-semibold">{e.company}</h3>
                <p className="text-muted">{e.role} · {e.dates}</p>
                <ul className="mt-3 max-w-2xl list-disc space-y-2 pl-5">
                  {e.points.map(pt => <li key={pt}>{pt}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="skills" title="Skills">
          <dl className="max-w-3xl divide-y divide-line border-y border-line">
            {skills.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]">
                <dt className="font-semibold">{k}</dt>
                <dd className="text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="more" title="Earlier projects">
          <ul className="max-w-3xl divide-y divide-line border-y border-line">
            {repos.map(([name, desc, url]) => (
              <li key={name} className="py-4">
                <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-cobalt hover:underline">{name}</a>
                <p className="text-muted">{desc}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="credentials" title="Certifications and education">
          <div className="grid max-w-3xl gap-10 sm:grid-cols-2">
            <ul className="space-y-2">
              {certifications.map(([n, y]) => <li key={n}>{n} <span className="text-muted">({y})</span></li>)}
            </ul>
            <ul className="space-y-3">
              {education.map(([n, s]) => <li key={n}>{n}<br /><span className="text-muted">{s}</span></li>)}
            </ul>
          </div>
        </Section>

        <Section id="contact" title="Contact">
          <p className="max-w-xl text-lg">Open to GenAI and applied ML roles. The fastest way to reach me is email.</p>
          <ul className="mt-6 space-y-2">
            <li><a className="text-cobalt hover:underline" href={`mailto:${profile.email}`}>{profile.email}</a></li>
            <li><a className="text-cobalt hover:underline" href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn</a></li>
            <li><a className="text-cobalt hover:underline" href={profile.github} target="_blank" rel="noreferrer">GitHub</a></li>
          </ul>
        </Section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        {profile.name} · Built with React, Vite and FastAPI
      </footer>
    </div>
  )
}
