import { useState, useMemo } from 'react'
import episodes from '../data/episodes.json'
import {
  getArcMetrics,
  getCharacterFrequenciesForArc,
  getScatterData,
} from '../utils/dataPrep'

import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Tooltip as ReTooltip,
} from 'recharts'

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

function CharacterBars({ arc, episodes }) {
  if (!arc || !arc.startEpisode || !arc.endEpisode) return <div className="empty">No episode data available</div>

  const start = arc.startEpisode
  const end = arc.endEpisode
  const counts = episodes.reduce((acc, ep) => {
    if (typeof ep.episode !== 'number') return acc
    if (ep.episode < start || ep.episode > end) return acc
    const chars = ep.character_appearances ?? []
    chars.forEach((c) => {
      acc[c] = (acc[c] || 0) + 1
    })
    return acc
  }, {})

  const list = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  if (!list.length) return <div className="empty">No character appearances found for this arc.</div>
  const max = list[0][1]

  return (
    <div className="character-bars">
      {list.map(([name, cnt]) => (
        <div className="char-row" key={name}>
          <div className="char-name">{name}</div>
          <div className="char-bar-wrap">
            <div className="char-bar" style={{ width: `${Math.round((cnt / max) * 100)}%` }} />
          </div>
          <div className="char-count">{cnt}</div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ arcs = [], open = false, onClose, onSelect }) {
  const [tab, setTab] = useState('overview')
  const [query, setQuery] = useState('')
  const [selectedArc, setSelectedArc] = useState(null)

  const metrics = useMemo(() => getArcMetrics(), [])

  const scatterData = useMemo(() => getScatterData(), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return arcs
    return arcs.filter((a) => a.label.toLowerCase().includes(q) || a.id.includes(q))
  }, [arcs, query])

  if (!open) return null

  return (
    <div className="dashboard-backdrop" onClick={onClose}>
      <div className="dashboard-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dashboard-header">
          <div>
            <div className="dashboard-title">Voyage Dashboard</div>
            <div className="dashboard-sub">Interactive visualizations and arc insights — beginner-friendly explanations included.</div>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="dashboard-main">
          <div className="dashboard-left">
            <div className="dashboard-tabs">
              <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
              <button className={tab === 'episodes' ? 'active' : ''} onClick={() => setTab('episodes')}>Episodes</button>
              <button className={tab === 'characters' ? 'active' : ''} onClick={() => setTab('characters')}>Characters</button>
              <button className={tab === 'visuals' ? 'active' : ''} onClick={() => setTab('visuals')}>Visuals</button>
            </div>

            <div className="dashboard-instructions">
              <strong>How to use</strong>
              <p>Pick an island on the right to focus it on the globe and open detailed visualizations. Tabs contain guided charts with short explanations so newcomers can understand the data quickly.</p>
            </div>

            <div className="dashboard-placeholder">
              {tab === 'overview' && (
                <div>
                  <div className="card">
                    <h4>What you'll see</h4>
                    <p>Contextual metrics (narrative weight, crew risk), episode timelines, top characters, and interactive charts that explain the arc.</p>
                  </div>
                  <div className="card">
                    <h4>Beginner tip</h4>
                    <p>Hover charts for precise numbers. Click bars to highlight episodes or focus a character.</p>
                  </div>

                  {selectedArc ? (
                    <div className="card overview-charts">
                      <div className="overview-header">
                        <div className="overview-title">{selectedArc.label}</div>
                        <div className="overview-sub">{selectedArc.saga} • Episodes: {selectedArc.startEpisode}–{selectedArc.endEpisode} ({selectedArc.episodeCount})</div>
                      </div>

                      <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="x" name="Narrative" domain={[0, 1]} tickFormatter={(v) => Math.round(v * 100)} />
                            <YAxis type="number" dataKey="y" name="Risk" domain={[0, 1]} tickFormatter={(v) => Math.round(v * 100)} />
                            <ReTooltip formatter={(value, name) => (name === 'x' || name === 'y' ? Math.round(value * 100) : value)} />
                            <Scatter name="Arcs" data={scatterData} fill="#8884d8">
                              {scatterData.map((entry) => (
                                <Cell key={entry.id} fill={entry.id === selectedArc.id ? '#ff9a7a' : '#6cc3ff'} />
                              ))}
                            </Scatter>
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                        <div style={{ flex: 1, height: 180 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={[{ name: 'weight', value: selectedArc.narrativeWeight }, { name: 'rest', value: 1 - selectedArc.narrativeWeight }]} dataKey="value" innerRadius={36} outerRadius={56} startAngle={90} endAngle={-270}>
                                <Cell key="c1" fill="#6cc3ff" />
                                <Cell key="c2" fill="rgba(255,255,255,0.06)" />
                              </Pie>
                              <Legend verticalAlign="bottom" />
                              <ReTooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        <div style={{ flex: 1, height: 180 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getCharacterFrequenciesForArc(selectedArc.id, 6)} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="name" type="category" width={120} />
                              <Bar dataKey="count" fill="#3aa0ff" />
                              <ReTooltip />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="card">
                      <div style={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="x" name="Narrative" domain={[0, 1]} tickFormatter={(v) => Math.round(v * 100)} />
                            <YAxis type="number" dataKey="y" name="Risk" domain={[0, 1]} tickFormatter={(v) => Math.round(v * 100)} />
                            <ReTooltip formatter={(value, name) => (name === 'x' || name === 'y' ? Math.round(value * 100) : value)} />
                            <Scatter name="Arcs" data={scatterData} fill="#6cc3ff" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <small>Scatter: Narrative weight vs Crew risk (bubble size ~ episode count). Click an island on the right to focus it.</small>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'episodes' && (
                <div className="card">Episode timelines and event anchors will appear here.</div>
              )}

              {tab === 'characters' && (
                <div className="card">Character frequency bars, bounties and quick profiles will appear here.</div>
              )}

              {tab === 'visuals' && (
                <div className="card">Placeholder thumbnails for scatterplots, histograms and networks. Click an island to populate.</div>
              )}
            </div>
          </div>

          <div className="dashboard-right">
            <div className="island-search-row">
              <input className="island-search" placeholder="Search islands..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="island-list-scroll">
              {filtered.map((a) => (
                <div key={a.id} className="island-list-item">
                  <div className="island-label">{a.label}</div>
                  <div className="island-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedArc(a)
                        onSelect?.(a)
                      }}
                    >
                      Focus
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 ? <div className="empty">No islands</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
