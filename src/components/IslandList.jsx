import { useState, useMemo } from 'react'

export default function IslandList({ arcs = [], onSelect }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return arcs
    return arcs.filter((a) => a.label.toLowerCase().includes(q) || (a.id && a.id.includes(q)))
  }, [arcs, query])

  return (
    <div className="island-list-wrapper">
      <button type="button" className="island-list-toggle" onClick={() => setOpen((s) => !s)}>
        {open ? 'Close islands' : 'Islands'}
      </button>

      {open ? (
        <div className="island-list-panel">
          <input
            className="island-search"
            placeholder="Search islands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="island-items">
            {filtered.map((arc) => (
              <button
                key={arc.id}
                type="button"
                className="island-item"
                onClick={() => {
                  onSelect?.(arc)
                }}
              >
                {arc.label}
              </button>
            ))}
            {filtered.length === 0 ? <div className="empty">No islands found</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
