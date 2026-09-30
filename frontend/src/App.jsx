import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Home from './pages/Home'

// One lazy import + one <Route> per app. Cards come from projects.json.
const TextToSql = lazy(() => import('./apps/text-to-sql'))
const RagChat = lazy(() => import('./apps/rag-chat'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<p className="p-8 text-muted">Loading...</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apps/text-to-sql" element={<TextToSql />} />
          <Route path="/apps/rag-chat" element={<RagChat />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
