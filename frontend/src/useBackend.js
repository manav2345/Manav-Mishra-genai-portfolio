import { useEffect, useState } from 'react'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// Pings /api/health on load so the free-tier backend wakes before anyone clicks a demo.
// Returns 'waking' | 'ready' | 'error'. Reuse it inside each app page too.
export function useBackend() {
  const [status, setStatus] = useState('waking')
  useEffect(() => {
    let stopped = false, tries = 0
    const ping = async () => {
      try {
        const r = await fetch(`${API}/api/health`)
        if (r.ok) { if (!stopped) setStatus('ready'); return }
      } catch { /* server still starting */ }
      if (stopped) return
      if (++tries < 12) setTimeout(ping, 5000)
      else setStatus('error')
    }
    ping()
    return () => { stopped = true }
  }, [])
  return status
}
