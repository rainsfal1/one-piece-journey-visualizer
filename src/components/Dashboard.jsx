import { useState, useMemo } from 'react'
import episodes from '../data/episodes.json'
import {
  getArcMetrics,
  getCharacterFrequenciesForArc,
  getScatterData,
  getEpisodeCountByArc,
  getSagaDistribution,
  getWorldImpactDistribution,
  getBountyProgression,
  getCrewJoinTimeline,
  getTopCharactersOverall,
  getNarrativeRiskComparison,
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
  AreaChart,
  Area,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
} from 'recharts'

const CHART_COLORS = ['#6cc3ff', '#ff9a7a', '#7aff9a', '#ffd97a', '#d97aff', '#7affff', '#ff7ab8', '#b8ff7a']
const IMPACT_COLORS = { Local: '#6cc3ff', Regional: '#ffd97a', Global: '#ff7a7a' }

const VISUALIZATION_OPTIONS = [
  { id: 'scatter', label: 'Risk vs Narrative', icon: '⚡' },
  { id: 'episodes', label: 'Episode Count', icon: '📊' },
  { id: 'saga', label: 'Saga Distribution', icon: '🗺️' },
  { id: 'impact', label: 'World Impact', icon: '🌍' },
  { id: 'characters', label: 'Top Characters', icon: '👥' },
  { id: 'crew', label: 'Crew Timeline', icon: '🏴‍☠️' },
  { id: 'comparison', label: 'Arc Comparison', icon: '📈' },
  { id: 'bounty', label: 'Bounty Tracker', icon: '💰' },
]

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

/** Custom tooltip for charts */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{label || payload[0]?.payload?.label || payload[0]?.payload?.name}</div>
      {payload.map((p, i) => (
        <div key={i} className="tooltip-row">
          <span style={{ color: p.color }}>{p.name || p.dataKey}:</span> {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  )
}

/** Scatter Plot: Narrative Weight vs Crew Risk */
function ScatterPlotViz({ selectedArc }) {
  const scatterData = useMemo(() => getScatterData(), [])
  return (
    <div className="viz-container">
      <div className="viz-header">
        <h3>Narrative Weight vs Crew Risk</h3>
        <p className="viz-desc">Each dot represents an arc. X-axis shows narrative importance, Y-axis shows danger level. Click arcs on the globe to highlight.</p>
      </div>
      <div className="viz-chart" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" dataKey="x" name="Narrative" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke="#8ab4f8" />
            <YAxis type="number" dataKey="y" name="Risk" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} stroke="#8ab4f8" />
            <ReTooltip content={<CustomTooltip />} />
            <Scatter name="Arcs" data={scatterData} fill="#6cc3ff">
              {scatterData.map((entry) => (
                <Cell key={entry.id} fill={selectedArc?.id === entry.id ? '#ff9a7a' : '#6cc3ff'} r={entry.r / 5} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Bar Chart: Episode Count by Arc */
function EpisodeCountViz() {
  const data = useMemo(() => getEpisodeCountByArc(), [])
  return (
    <div className="viz-container">
      <div className="viz-header">
        <h3>Episode Count by Arc</h3>
        <p className="viz-desc">Compare the length of each story arc. Longer arcs often contain more major battles and character development.</p>
      </div>
      <div className="viz-chart" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="shortLabel" angle={-45} textAnchor="end" height={60} stroke="#8ab4f8" fontSize={11} />
            <YAxis stroke="#8ab4f8" />
            <ReTooltip content={<CustomTooltip />} />
            <Bar dataKey="episodeCount" name="Episodes" fill="#6cc3ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Pie Chart: Saga Distribution */
function SagaDistributionViz() {
  const data = useMemo(() => getSagaDistribution(), [])
  return (
    <div className="viz-container">
      <div className="viz-header">
        <h3>Saga Episode Distribution</h3>
        <p className="viz-desc">See how episodes are distributed across major story sagas. Each saga contains multiple arcs.</p>
      </div>
      <div className="viz-chart" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="episodeCount" nameKey="saga" cx="50%" cy="50%" outerRadius={100} label={({ saga, percent }) => `${saga.split(' ')[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((entry, index) => (
                <Cell key={entry.saga} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Pie Chart: World Impact */
function WorldImpactViz() {
  const data = useMemo(() => getWorldImpactDistribution(), [])
  return (
    <div className="viz-container">
      <div className="viz-header">
        <h3>World Impact Distribution</h3>
        <p className="viz-desc">How arcs affect the One Piece world: Local (island only), Regional (sea area), Global (world-changing events).</p>
      </div>
      <div className="viz-chart viz-split">
        <div style={{ flex: 1, height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={IMPACT_COLORS[entry.name]} />
                ))}
              </Pie>
              <ReTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="impact-legend">
          <div className="impact-item"><span className="impact-dot" style={{ background: IMPACT_COLORS.Local }} /> <strong>Local:</strong> Affects a single island</div>
          <div className="impact-item"><span className="impact-dot" style={{ background: IMPACT_COLORS.Regional }} /> <strong>Regional:</strong> Affects a sea or multiple islands</div>
          <div className="impact-item"><span className="impact-dot" style={{ background: IMPACT_COLORS.Global }} /> <strong>Global:</strong> World-changing consequences</div>
        </div>
      </div>
    </div>
  )
}

/** Bar Chart: Top Characters Overall */
function TopCharactersViz() {
  const data = useMemo(() => getTopCharactersOverall(12), [])
  return (
    <div className="viz-container">
      <div className="viz-header">
        <h3>Most Appearing Characters</h3>
        <p className="viz-desc">Characters with the most episode appearances across the entire series.</p>
      </div>
      <div className="viz-chart" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 100 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" stroke="#8ab4f8" />
            <YAxis dataKey="name" type="category" stroke="#8ab4f8" fontSize={12} width={95} />
            <ReTooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Appearances" fill="#7aff9a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Timeline: Crew Joins */
function CrewTimelineViz() {
  const data = useMemo(() => getCrewJoinTimeline(), [])
  return (
    <div className="viz-container">
      <div className="viz-header">
        <h3>Straw Hat Crew Timeline</h3>
        <p className="viz-desc">When each crew member officially joined the Straw Hat Pirates (by episode number).</p>
      </div>
      <div className="viz-chart" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <defs>
              <linearGradient id="crewGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6cc3ff" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6cc3ff" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="#8ab4f8" fontSize={11} angle={-20} textAnchor="end" height={50} />
            <YAxis stroke="#8ab4f8" label={{ value: 'Episode', angle: -90, position: 'insideLeft', fill: '#8ab4f8' }} />
            <ReTooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="chart-tooltip">
                  <div className="tooltip-label">{d.name}</div>
                  <div className="tooltip-row">Role: {d.role}</div>
                  <div className="tooltip-row">Joined: Episode {d.episode}</div>
                </div>
              )
            }} />
            <Area type="stepAfter" dataKey="episode" stroke="#6cc3ff" fill="url(#crewGradient)" strokeWidth={2} dot={{ fill: '#ff9a7a', strokeWidth: 2, r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="crew-cards">
        {data.map((c, i) => (
          <div key={c.id} className="crew-card" style={{ borderColor: CHART_COLORS[i % CHART_COLORS.length] }}>
            <div className="crew-name">{c.name}</div>
            <div className="crew-role">{c.role}</div>
            <div className="crew-ep">Ep. {c.episode}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Comparison: Narrative vs Risk Bar Chart */
function ArcComparisonViz() {
  const data = useMemo(() => getNarrativeRiskComparison(), [])
  return (
    <div className="viz-container">
      <div className="viz-header">
        <h3>Arc Metrics Comparison</h3>
        <p className="viz-desc">Compare narrative weight (story importance) vs crew risk (danger level) for each arc side by side.</p>
      </div>
      <div className="viz-chart" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="shortLabel" angle={-45} textAnchor="end" height={60} stroke="#8ab4f8" fontSize={10} />
            <YAxis stroke="#8ab4f8" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <ReTooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="narrativeWeight" name="Narrative" fill="#6cc3ff" radius={[4, 4, 0, 0]} />
            <Bar dataKey="crewRisk" name="Risk" fill="#ff9a7a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/** Bounty Tracker Line Chart */
function BountyTrackerViz() {
  const rawData = useMemo(() => getBountyProgression(), [])
  // Build combined timeline data for Luffy (most complete)
  const luffy = rawData.find((d) => d.character.includes('Luffy'))
  const chartData = luffy?.progression.map((p) => ({ label: p.label.split('/')[0].split(' ')[0], bounty: p.bounty / 1e6 })) ?? []

  return (
    <div className="viz-container">
      <div className="viz-header">
        <h3>Luffy's Bounty Progression</h3>
        <p className="viz-desc">Track how Luffy's bounty increased throughout major arcs (in millions of Berries).</p>
      </div>
      <div className="viz-chart" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="label" angle={-30} textAnchor="end" stroke="#8ab4f8" fontSize={11} height={50} />
            <YAxis stroke="#8ab4f8" tickFormatter={(v) => `${v}M`} />
            <ReTooltip formatter={(value) => [`${value.toLocaleString()}M ฿`, 'Bounty']} />
            <Line type="monotone" dataKey="bounty" stroke="#ffd97a" strokeWidth={3} dot={{ fill: '#ff9a7a', strokeWidth: 2, r: 6 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="bounty-summary">
        {rawData.slice(0, 4).map((char) => (
          <div key={char.character} className="bounty-card">
            <div className="bounty-char">{char.character.split(' ').pop()}</div>
            <div className="bounty-final">{(char.progression[char.progression.length - 1]?.bounty / 1e6).toLocaleString()}M ฿</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ arcs = [], open = false, onClose, onSelect }) {
  const [activeViz, setActiveViz] = useState('scatter')
  const [selectedArc, setSelectedArc] = useState(null)

  const metrics = useMemo(() => getArcMetrics(), [])

  if (!open) return null

  const renderVisualization = () => {
    switch (activeViz) {
      case 'scatter':
        return <ScatterPlotViz selectedArc={selectedArc} />
      case 'episodes':
        return <EpisodeCountViz />
      case 'saga':
        return <SagaDistributionViz />
      case 'impact':
        return <WorldImpactViz />
      case 'characters':
        return <TopCharactersViz />
      case 'crew':
        return <CrewTimelineViz />
      case 'comparison':
        return <ArcComparisonViz />
      case 'bounty':
        return <BountyTrackerViz />
      default:
        return <ScatterPlotViz selectedArc={selectedArc} />
    }
  }

  return (
    <div className="dashboard-backdrop" onClick={onClose}>
      <div className="dashboard-panel dashboard-panel-enhanced" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="dashboard-header">
          <div>
            <div className="dashboard-title">📊 Voyage Dashboard</div>
            <div className="dashboard-sub">Interactive visualizations and arc insights — toggle between different chart types to explore the data.</div>
          </div>
          <div className="dashboard-actions">
            <button type="button" className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="dashboard-main dashboard-main-enhanced">
          {/* Visualization Selector */}
          <div className="viz-selector">
            {VISUALIZATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`viz-toggle ${activeViz === opt.id ? 'active' : ''}`}
                onClick={() => setActiveViz(opt.id)}
                title={opt.label}
              >
                <span className="viz-icon">{opt.icon}</span>
                <span className="viz-label">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Main Visualization Area */}
          <div className="viz-main-area">
            {renderVisualization()}
          </div>

          {/* Quick Stats Sidebar */}
          <div className="viz-sidebar">
            <div className="sidebar-section">
              <h4>Quick Stats</h4>
              <div className="stat-grid">
                <div className="stat-card">
                  <div className="stat-value">{arcs.length}</div>
                  <div className="stat-label">Arcs</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{metrics.reduce((sum, a) => sum + a.episodeCount, 0)}</div>
                  <div className="stat-label">Episodes</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">10</div>
                  <div className="stat-label">Crew Members</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{metrics.filter((a) => a.worldImpact === 'Global').length}</div>
                  <div className="stat-label">Global Events</div>
                </div>
              </div>
            </div>

            <div className="sidebar-section">
              <h4>Highest Stakes Arcs</h4>
              <div className="arc-mini-list">
                {metrics
                  .sort((a, b) => b.crewRisk - a.crewRisk)
                  .slice(0, 5)
                  .map((arc) => (
                    <div key={arc.id} className="arc-mini-item" onClick={() => { setSelectedArc(arc); onSelect?.(arc.id) }}>
                      <span className="arc-mini-name">{arc.label.split('/')[0]}</span>
                      <span className="arc-mini-risk" style={{ color: arc.crewRisk > 0.7 ? '#ff7a7a' : '#ffd97a' }}>
                        {Math.round(arc.crewRisk * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="sidebar-section">
              <h4>Legend</h4>
              <div className="legend-info">
                <p><strong>Narrative Weight:</strong> Story importance and plot significance</p>
                <p><strong>Crew Risk:</strong> Danger level faced by the Straw Hats</p>
                <p><strong>World Impact:</strong> How events affect the One Piece world</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
