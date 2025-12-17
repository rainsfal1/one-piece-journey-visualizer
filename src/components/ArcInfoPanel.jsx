import { useState } from 'react'
import ArcDashboard from './ArcDashboard'

const truncate = (text, limit = 320) => {
  if (!text) return ''
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}...`
}

export function ArcInfoPanel({ arc }) {
  const [showDashboard, setShowDashboard] = useState(false)
  
  if (!arc) return null

  const {
    label,
    saga,
    startEpisode,
    endEpisode,
    episodeCount,
    summary,
    keyEvents,
    highlightCharacters,
    narrativeWeight,
    crewRisk,
    worldImpact,
    rating,
  } = arc

  return (
    <div className={`arc-info-panel ${showDashboard ? 'expanded' : ''}`}>
      <div className="arc-panel-header">
        <div>
          <div className="arc-title">{label}</div>
          <div className="arc-saga">{saga}</div>
        </div>
        {rating && (
          <div className="arc-rating-badge">
            <span className="rating-star">★</span>
            <span className="rating-value">{rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      
      <div className="arc-episodes">
        Episodes: {startEpisode} – {endEpisode} ({episodeCount})
      </div>
      
      {summary ? <div className="arc-summary">{truncate(summary)}</div> : null}
      
      {!showDashboard && keyEvents?.length ? (
        <div className="arc-section">
          <div className="arc-section-title">Key events</div>
          <ul className="arc-list">
            {keyEvents.slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      
      {!showDashboard && highlightCharacters?.length ? (
        <div className="arc-section">
          <div className="arc-section-title">Highlight characters</div>
          <ul className="arc-list">
            {highlightCharacters.slice(0, 3).map(({ name, role, epithet, bountyDuringArc }) => (
              <li key={name}>
                <strong>{name}</strong> — {role}
                {epithet ? ` (${epithet})` : ''}
                {bountyDuringArc ? ` • Bounty: ${new Intl.NumberFormat('en-US').format(bountyDuringArc)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      
      {!showDashboard && (
        <div className="arc-metrics">
          <span>Narrative weight: {(narrativeWeight ?? 0).toFixed(2)}</span>
          <span>Crew risk: {(crewRisk ?? 0).toFixed(2)}</span>
          <span>Impact: {worldImpact}</span>
        </div>
      )}
      
      {/* Dashboard Toggle */}
      <button 
        className="arc-dashboard-toggle"
        onClick={() => setShowDashboard(!showDashboard)}
      >
        {showDashboard ? '▼ Hide Insights' : '▲ Show Arc Insights & Charts'}
      </button>
      
      {/* Integrated Arc Dashboard */}
      {showDashboard && <ArcDashboard arc={arc} expanded={showDashboard} />}
    </div>
  )
}

export default ArcInfoPanel
