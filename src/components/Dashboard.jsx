import { useState, useMemo } from 'react'
import {
  getArcMetrics,
  getEpisodeCountByArc,
  getSagaDistribution,
  getBountyProgression,
  getCrewJoinTimeline,
  getTopCharactersOverall,
} from '../utils/dataPrep'

import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip as ReTooltip,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts'

const CHART_COLORS = ['#6cc3ff', '#ff9a7a', '#7aff9a', '#ffd97a', '#d97aff', '#7affff', '#ff7ab8', '#b8ff7a']

// Format bounty with appropriate unit (handles Chopper's small bounties)
function formatBounty(bounty) {
  if (bounty >= 1000000000) return `${(bounty / 1e9).toLocaleString()}B ฿`
  if (bounty >= 1000000) return `${(bounty / 1e6).toLocaleString()}M ฿`
  if (bounty >= 1000) return `${(bounty / 1000).toLocaleString()}K ฿`
  return `${bounty.toLocaleString()} ฿`
}

// Dashboard tile configuration
const TILES = [
  { 
    id: 'episodes', 
    label: 'Episodes & Sagas', 
    icon: '📊', 
    description: 'Episode distribution across arcs and sagas',
    accent: '#6cc3ff'
  },
  { 
    id: 'characters', 
    label: 'Top Characters', 
    icon: '👥', 
    description: 'Most appearing characters in the series',
    accent: '#7aff9a'
  },
  { 
    id: 'crew', 
    label: 'Crew Timeline', 
    icon: '🏴‍☠️', 
    description: 'When each Straw Hat joined the crew',
    accent: '#d97aff'
  },
  { 
    id: 'bounty', 
    label: 'Bounty Tracker', 
    icon: '💰', 
    description: 'Track crew bounty progression over time',
    accent: '#ffd97a'
  },
]

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

/** Combined Episode & Saga Visualization */
function EpisodeSagaViz() {
  const episodeData = useMemo(() => getEpisodeCountByArc(), [])
  const sagaData = useMemo(() => getSagaDistribution(), [])
  const [view, setView] = useState('bars') // 'bars' | 'pie'

  const totalEpisodes = episodeData.reduce((sum, a) => sum + a.episodeCount, 0)

  return (
    <div className="viz-full">
      <div className="viz-full-header">
        <div className="viz-header-text">
          <h2>📊 Episodes & Saga Distribution</h2>
          <p>Explore how episodes are distributed across arcs and major sagas</p>
        </div>
        <div className="view-toggle">
          <button className={view === 'bars' ? 'active' : ''} onClick={() => setView('bars')}>
            <span>📊</span> By Arc
          </button>
          <button className={view === 'pie' ? 'active' : ''} onClick={() => setView('pie')}>
            <span>🥧</span> By Saga
          </button>
        </div>
      </div>

      <div className="viz-stats-row">
        <div className="viz-stat">
          <span className="viz-stat-value">{totalEpisodes}</span>
          <span className="viz-stat-label">Total Episodes</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">{episodeData.length}</span>
          <span className="viz-stat-label">Arcs</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">{sagaData.length}</span>
          <span className="viz-stat-label">Sagas</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">{Math.round(totalEpisodes / episodeData.length)}</span>
          <span className="viz-stat-label">Avg per Arc</span>
        </div>
      </div>

      {view === 'bars' ? (
        <div className="viz-chart-full" style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={episodeData} margin={{ top: 20, right: 20, bottom: 80, left: 20 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6cc3ff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6cc3ff" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="shortLabel" angle={-45} textAnchor="end" height={80} stroke="#8ab4f8" fontSize={11} />
              <YAxis stroke="#8ab4f8" />
              <ReTooltip content={<CustomTooltip />} />
              <Bar dataKey="episodeCount" name="Episodes" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="viz-split-view">
          <div className="viz-chart-half">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={sagaData} 
                  dataKey="episodeCount" 
                  nameKey="saga" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60}
                  outerRadius={110} 
                  paddingAngle={2}
                  label={({ saga, percent }) => `${saga.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {sagaData.map((entry, index) => (
                    <Cell key={entry.saga} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="saga-legend">
            {sagaData.map((s, i) => (
              <div key={s.saga} className="saga-legend-item">
                <span className="saga-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="saga-name">{s.saga}</span>
                <span className="saga-count">{s.episodeCount} eps</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Top Characters Visualization */
function TopCharactersViz() {
  const data = useMemo(() => getTopCharactersOverall(15), [])

  return (
    <div className="viz-full">
      <div className="viz-full-header">
        <div className="viz-header-text">
          <h2>👥 Most Appearing Characters</h2>
          <p>Characters with the highest episode appearances across the entire series</p>
        </div>
      </div>

      <div className="viz-chart-full" style={{ height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, bottom: 10, left: 110 }}>
            <defs>
              <linearGradient id="charGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7aff9a" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#7aff9a" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
            <XAxis type="number" stroke="#8ab4f8" />
            <YAxis dataKey="name" type="category" stroke="#8ab4f8" fontSize={12} width={105} />
            <ReTooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Appearances" fill="url(#charGrad)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="character-podium">
        {data.slice(0, 3).map((c, i) => (
          <div key={c.name} className={`podium-card podium-${i + 1}`}>
            <div className="podium-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
            <div className="podium-name">{c.name}</div>
            <div className="podium-count">{c.count} episodes</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Crew Timeline Visualization */
function CrewTimelineViz() {
  const data = useMemo(() => getCrewJoinTimeline(), [])

  return (
    <div className="viz-full">
      <div className="viz-full-header">
        <div className="viz-header-text">
          <h2>🏴‍☠️ Straw Hat Crew Timeline</h2>
          <p>When each crew member officially joined the Straw Hat Pirates</p>
        </div>
      </div>

      <div className="viz-chart-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <defs>
              <linearGradient id="crewGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97aff" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#d97aff" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" stroke="#8ab4f8" fontSize={11} angle={-15} textAnchor="end" height={50} />
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
            <Area type="stepAfter" dataKey="episode" stroke="#d97aff" fill="url(#crewGrad)" strokeWidth={3} dot={{ fill: '#ff9a7a', strokeWidth: 2, r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="crew-grid">
        {data.map((c, i) => (
          <div key={c.id} className="crew-member-card" style={{ '--accent': CHART_COLORS[i % CHART_COLORS.length] }}>
            <div className="crew-order">#{c.order}</div>
            <div className="crew-info">
              <div className="crew-name">{c.name}</div>
              <div className="crew-role">{c.role}</div>
            </div>
            <div className="crew-episode">Ep. {c.episode}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Define crew order for consistent display (outside component to avoid dependency issues)
const CREW_ORDER = [
  'Monkey D. Luffy', 'Roronoa Zoro', 'Nami', 'Usopp', 'Sanji',
  'Tony Tony Chopper', 'Nico Robin', 'Franky', 'Brook', 'Jinbe'
]

/** Bounty Tracker Visualization with character selector */
function BountyTrackerViz() {
  const rawData = useMemo(() => getBountyProgression(), [])
  
  // Sort crew members by the predefined order
  const sortedData = useMemo(() => {
    return [...rawData].sort((a, b) => {
      const aIndex = CREW_ORDER.findIndex(name => a.character.includes(name.split(' ').pop()))
      const bIndex = CREW_ORDER.findIndex(name => b.character.includes(name.split(' ').pop()))
      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })
  }, [rawData])
  
  const [selectedChar, setSelectedChar] = useState(() => {
    const luffy = sortedData.find(d => d.character.includes('Luffy'))
    return luffy?.character || sortedData[0]?.character || ''
  })

  const selectedData = rawData.find(d => d.character === selectedChar)
  const chartData = selectedData?.progression.map((p) => ({ 
    label: p.label.split('/')[0].split(' ')[0], 
    bounty: p.bounty,
    fullLabel: p.label,
  })) ?? []

  const currentBounty = selectedData?.progression[selectedData.progression.length - 1]?.bounty || 0
  const firstBounty = selectedData?.progression[0]?.bounty || 0
  const increase = firstBounty > 0 ? Math.round(((currentBounty - firstBounty) / firstBounty) * 100) : 0
  
  // Determine Y-axis format based on bounty scale
  const maxBounty = Math.max(...chartData.map(d => d.bounty), 1)
  const formatYAxis = (v) => {
    if (maxBounty >= 1000000000) return `${(v / 1e9).toFixed(1)}B`
    if (maxBounty >= 1000000) return `${(v / 1e6).toFixed(0)}M`
    if (maxBounty >= 1000) return `${(v / 1000).toFixed(0)}K`
    return v.toString()
  }

  return (
    <div className="viz-full">
      <div className="viz-full-header">
        <div className="viz-header-text">
          <h2>💰 Bounty Tracker</h2>
          <p>Track bounty progression for Straw Hat crew members</p>
        </div>
      </div>

      {/* Character Selector */}
      <div className="bounty-selector">
        {sortedData.map((char) => {
          // Get short name for display
          const nameParts = char.character.split(' ')
          const shortName = char.character.includes('Chopper') ? 'Chopper' 
            : char.character.includes('Robin') ? 'Robin'
            : nameParts[nameParts.length - 1]
          const isSelected = char.character === selectedChar
          const latestBounty = char.progression[char.progression.length - 1]?.bounty || 0
          return (
            <button
              key={char.character}
              className={`bounty-char-btn ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedChar(char.character)}
            >
              <span className="btn-name">{shortName}</span>
              <span className="btn-bounty">{latestBounty >= 1000000 ? `${(latestBounty / 1e6).toLocaleString()}M` : latestBounty.toLocaleString()}</span>
            </button>
          )
        })}
      </div>

      {/* Stats Row */}
      <div className="bounty-stats-row">
        <div className="bounty-stat bounty-stat-current">
          <span className="bounty-stat-label">Current Bounty</span>
          <span className="bounty-stat-value">{formatBounty(currentBounty)}</span>
        </div>
        <div className="bounty-stat">
          <span className="bounty-stat-label">First Bounty</span>
          <span className="bounty-stat-value">{formatBounty(firstBounty)}</span>
        </div>
        <div className="bounty-stat">
          <span className="bounty-stat-label">Updates</span>
          <span className="bounty-stat-value">{chartData.length}</span>
        </div>
        <div className="bounty-stat bounty-stat-increase">
          <span className="bounty-stat-label">Total Increase</span>
          <span className="bounty-stat-value">+{increase.toLocaleString()}%</span>
        </div>
      </div>

      {/* Chart */}
      <div className="viz-chart-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 60, left: 30 }}>
            <defs>
              <linearGradient id="bountyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd97a" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ffd97a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" angle={-35} textAnchor="end" stroke="#8ab4f8" fontSize={11} height={60} />
            <YAxis stroke="#8ab4f8" tickFormatter={formatYAxis} />
            <ReTooltip formatter={(value) => [formatBounty(value), 'Bounty']} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullLabel || label} />
            <Area type="monotone" dataKey="bounty" stroke="transparent" fill="url(#bountyGrad)" />
            <Line 
              type="monotone" 
              dataKey="bounty" 
              stroke="#ffd97a" 
              strokeWidth={3} 
              dot={{ fill: '#ff9a7a', strokeWidth: 2, r: 6, stroke: '#ffd97a' }} 
              activeDot={{ r: 10, fill: '#ffd97a' }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function Dashboard({ arcs = [], open = false, onClose }) {
  const [activeViz, setActiveViz] = useState(null) // null = show tiles
  const metrics = useMemo(() => getArcMetrics(), [])

  if (!open) return null

  const renderContent = () => {
    if (!activeViz) {
      return (
        <div className="dashboard-tiles">
          {TILES.map((tile) => (
            <button
              key={tile.id}
              className="dashboard-tile"
              style={{ '--tile-accent': tile.accent }}
              onClick={() => setActiveViz(tile.id)}
            >
              <div className="tile-icon">{tile.icon}</div>
              <div className="tile-content">
                <h3>{tile.label}</h3>
                <p>{tile.description}</p>
              </div>
              <div className="tile-arrow">→</div>
            </button>
          ))}
        </div>
      )
    }

    switch (activeViz) {
      case 'episodes':
        return <EpisodeSagaViz />
      case 'characters':
        return <TopCharactersViz />
      case 'crew':
        return <CrewTimelineViz />
      case 'bounty':
        return <BountyTrackerViz />
      default:
        return null
    }
  }

  const activeTile = TILES.find(t => t.id === activeViz)

  return (
    <div className="dashboard-backdrop" onClick={onClose}>
      <div className="dashboard-panel-v2" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div className="dashboard-header-v2">
          <div className="header-left">
            {activeViz && (
              <button className="back-btn" onClick={() => setActiveViz(null)}>
                ← Back
              </button>
            )}
            <div className="header-title">
              <h1>{activeViz ? activeTile?.label : '📊 Voyage Dashboard'}</h1>
              {!activeViz && <p>Select a visualization to explore the data</p>}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Main Content */}
        <div className="dashboard-content-v2">
          {renderContent()}
        </div>

        {/* Quick Stats Footer (only on tiles view) */}
        {!activeViz && (
          <div className="dashboard-footer-v2">
            <div className="footer-stat">
              <span className="fs-value">{arcs.length}</span>
              <span className="fs-label">Arcs</span>
            </div>
            <div className="footer-stat">
              <span className="fs-value">{metrics.reduce((sum, a) => sum + a.episodeCount, 0)}</span>
              <span className="fs-label">Episodes</span>
            </div>
            <div className="footer-stat">
              <span className="fs-value">10</span>
              <span className="fs-label">Crew</span>
            </div>
            <div className="footer-stat">
              <span className="fs-value">{metrics.filter(a => a.worldImpact === 'Global').length}</span>
              <span className="fs-label">Global Events</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
