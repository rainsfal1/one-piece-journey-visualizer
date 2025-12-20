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

// Saga color mapping for consistent styling
const SAGA_COLORS = {
  'East Blue Saga': '#6cc3ff',
  'Alabasta Saga': '#ffd97a', 
  'Sky Island Saga': '#7aff9a',
  'Water 7 Saga': '#ff9a7a',
  'Thriller Bark Saga': '#d97aff',
  'Summit War Saga': '#ff7ab8',
  'Fish-Man Island Saga': '#7affff',
  'Dressrosa Saga': '#b8ff7a',
  'Whole Cake Island Saga': '#ff7a7a',
  'Wano Country Saga': '#ffa07a',
  'Final Saga': '#c8a0ff',
}

/** Combined Episode & Saga Visualization - Unified View */
function EpisodeSagaViz() {
  const episodeData = useMemo(() => getEpisodeCountByArc(), [])
  const sagaData = useMemo(() => getSagaDistribution(), [])
  const [hoveredSaga, setHoveredSaga] = useState(null)
  const [selectedSaga, setSelectedSaga] = useState(null)
  const sagaRefs = useMemo(() => ({}), [])

  const totalEpisodes = episodeData.reduce((sum, a) => sum + a.episodeCount, 0)
  
  // Group arcs by saga for the unified view
  const groupedData = useMemo(() => {
    const groups = {}
    episodeData.forEach(arc => {
      const saga = arc.saga || 'Unknown'
      if (!groups[saga]) groups[saga] = { saga, arcs: [], total: 0 }
      groups[saga].arcs.push(arc)
      groups[saga].total += arc.episodeCount
    })
    return Object.values(groups)
  }, [episodeData])

  // Handle saga card click - scroll to and highlight
  const handleSagaClick = (sagaName) => {
    setSelectedSaga(sagaName)
    setHoveredSaga(sagaName)
    
    // Scroll the saga group into view
    const element = sagaRefs[sagaName]
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    
    // Clear selection after a delay
    setTimeout(() => {
      setSelectedSaga(null)
    }, 2000)
  }

  return (
    <div className="viz-full">
      <div className="viz-full-header">
        <div className="viz-header-text">
          <h2>📊 The Grand Line Journey</h2>
          <p>Episode distribution across sagas and their story arcs — click a saga to jump to it</p>
        </div>
      </div>

      {/* Saga summary cards */}
      <div className="saga-summary-row">
        {sagaData.map((saga) => {
          const color = SAGA_COLORS[saga.saga] || '#6cc3ff'
          const isActive = hoveredSaga === saga.saga || selectedSaga === saga.saga
          return (
            <div 
              key={saga.saga}
              className={`saga-summary-card ${isActive ? 'hovered' : ''} ${selectedSaga === saga.saga ? 'selected' : ''}`}
              style={{ '--saga-color': color }}
              onMouseEnter={() => setHoveredSaga(saga.saga)}
              onMouseLeave={() => !selectedSaga && setHoveredSaga(null)}
              onClick={() => handleSagaClick(saga.saga)}
            >
              <div className="saga-card-bar" style={{ background: color }} />
              <div className="saga-card-content">
                <div className="saga-card-name">{saga.saga.replace(' Saga', '')}</div>
                <div className="saga-card-stats">
                  <span className="saga-eps">{saga.episodeCount} eps</span>
                  <span className="saga-arcs">{saga.arcCount} arcs</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main visualization - Arcs grouped by Saga */}
      <div className="saga-arc-container">
        {groupedData.map((group) => {
          const color = SAGA_COLORS[group.saga] || '#6cc3ff'
          const isHighlighted = !hoveredSaga || hoveredSaga === group.saga
          const isSelected = selectedSaga === group.saga
          const percentage = Math.round((group.total / totalEpisodes) * 100)
          
          return (
            <div 
              key={group.saga} 
              ref={(el) => { sagaRefs[group.saga] = el }}
              className={`saga-group ${isHighlighted ? '' : 'dimmed'} ${isSelected ? 'selected' : ''}`}
              style={{ '--saga-color': color }}
              onMouseEnter={() => setHoveredSaga(group.saga)}
              onMouseLeave={() => !selectedSaga && setHoveredSaga(null)}
            >
              <div className="saga-group-header">
                <div className="saga-group-indicator" style={{ background: color }} />
                <div className="saga-group-title">{group.saga.replace(' Saga', '')}</div>
                <div className="saga-group-total">{group.total} episodes ({percentage}%)</div>
              </div>
              
              <div className="arc-bars-container">
                {group.arcs.map((arc) => {
                  const widthPercent = (arc.episodeCount / Math.max(...group.arcs.map(a => a.episodeCount))) * 100
                  return (
                    <div key={arc.id} className="arc-bar-row">
                      <div className="arc-bar-label">{arc.label}</div>
                      <div className="arc-bar-track">
                        <div 
                          className="arc-bar-fill" 
                          style={{ 
                            width: `${widthPercent}%`,
                            background: `linear-gradient(90deg, ${color}dd, ${color}88)`
                          }}
                        />
                        <span className="arc-bar-value">{arc.episodeCount}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom stats */}
      <div className="viz-stats-row viz-stats-bottom">
        <div className="viz-stat">
          <span className="viz-stat-value">{totalEpisodes}</span>
          <span className="viz-stat-label">Total Episodes</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">{episodeData.length}</span>
          <span className="viz-stat-label">Story Arcs</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">{sagaData.length}</span>
          <span className="viz-stat-label">Major Sagas</span>
        </div>
        <div className="viz-stat">
          <span className="viz-stat-value">{Math.round(totalEpisodes / episodeData.length)}</span>
          <span className="viz-stat-label">Avg per Arc</span>
        </div>
      </div>
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
