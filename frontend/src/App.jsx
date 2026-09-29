import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import projects from './projects.json'

function Home() {
  const [backendMessage, setBackendMessage] = useState('Connecting to backend...')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/hello/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Backend request failed')
        }
        return response.json()
      })
      .then((data) => setBackendMessage(data.message))
      .catch(() => setBackendMessage('Backend unavailable'))
  }, [])

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-4xl font-bold">Your Name · AI Workbench</h1>
      <p className="mt-2 text-slate-400">
        Live GenAI and ML projects. Click any card to try it.
      </p>
      <p className="mt-4 text-sm text-emerald-400">{backendMessage}</p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={project.status === 'live' ? project.route : '#'}
            className="rounded-xl border border-slate-800 p-5 transition hover:border-indigo-500"
          >
            <h2 className="text-xl font-semibold">{project.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-slate-800 px-2 py-1 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
            {project.status !== 'live' && (
              <p className="mt-3 text-xs text-amber-400">Coming soon</p>
            )}
          </Link>
        ))}
      </div>
    </main>
  )
}

const RagChat = lazy(() => import('./apps/rag-chat'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p className="p-8">Loading...</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apps/rag-chat" element={<RagChat />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
