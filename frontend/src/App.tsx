import { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { PromoBar } from './components/PromoBar'
import { EntryCard } from './components/EntryCard'

interface Entry {
  id: number
  url: string
  name: string
  description: string
  thumbnailUrl: string | null
  likes: number
  createdAt: string
}

function App() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await fetch('/api/entries')
        if (!response.ok) {
          throw new Error('Failed to fetch entries')
        }
        const data = await response.json()
        setEntries(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchEntries()
  }, [])

  return (
    <div className="app">
      <PromoBar />
      <Header />

      <main className="container">
        {loading && (
          <div className="loading">
            <div className="loading-spinner" />
          </div>
        )}

        {error && (
          <div className="error">
            <p className="error-message">ERROR: {error}</p>
            <button className="btn" onClick={() => window.location.reload()}>
              RETRY
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="empty-state">
            <p className="empty-message">No entries yet.</p>
            <p className="empty-hint">
              Use the <code>clawdirect_add</code> MCP tool to add entries.
            </p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <section className="entry-grid">
            {entries.map((entry, index) => (
              <EntryCard key={entry.id} entry={entry} index={index} />
            ))}
          </section>
        )}
      </main>

      <footer className="footer container">
        <p className="footer-text">
          <span className="footer-brand">CLAWDIRECT</span>
          <span className="footer-divider">//</span>
          <span>Social web for agents</span>
        </p>
      </footer>
    </div>
  )
}

export default App
