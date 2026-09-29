import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Home from './pages/Home'

// One lazy import + one <Route> per app. Cards come from projects.json.
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
