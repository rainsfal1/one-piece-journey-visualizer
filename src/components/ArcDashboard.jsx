import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import episodes from '../data/episodes.json'

const CHART_COLORS = ['#6cc3ff', '#ff9a7a', '#7aff9a', '#ffd97a', '#d97aff', '#7affff', '#ff7ab8', '#b8ff7a']

// Character popularity chart
function CharacterPopularityChart({ data }) {
  if (!data?.length) return <div className="empty-chart">No character data</div>
  
  return (
    <div className="char-pop-chart">
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 60 }}>
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis dataKey="name" type="category" tick={{ fill: '#cde6ff', fontSize: 11 }} width={55} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload
              return (
                <div className="arc-tooltip">
                  <div className="tooltip-name">{d.name}</div>
                  <div>Screen Time: {d.screenTime}%</div>
                  <div>Popularity: {d.popularity}%</div>
                </div>
              )
            }}
          />
          <Bar dataKey="screenTime" fill="#6cc3ff" radius={[0, 4, 4, 0]} name="Screen Time" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Key events timeline
function KeyEventsTimeline({ events }) {
  if (!events?.length) return null
  
  return (
    <div className="key-events-timeline">
      <div className="timeline-line" />
      {events.map((event, i) => (
        <div key={i} className="timeline-event">
          <div className="event-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
          <div className="event-text">{event}</div>
        </div>
      ))}
    </div>
  )
}

// Bounty updates display
function BountyUpdates({ updates }) {
  if (!updates?.length) return null
  
  return (
    <div className="bounty-updates">
      {updates.map((u, i) => {
        const increase = u.to - u.from
        const pct = u.from > 0 ? Math.round((increase / u.from) * 100) : 'NEW'
        return (
          <div key={i} className="bounty-update-card">
            <div className="bounty-char-name">{u.character.split(' ').pop()}</div>
            <div className="bounty-values">
              <span className="bounty-from">{(u.from / 1e6).toLocaleString()}M</span>
              <span className="bounty-arrow">→</span>
              <span className="bounty-to">{(u.to / 1e6).toLocaleString()}M</span>
            </div>
            <div className="bounty-increase">+{typeof pct === 'number' ? `${pct}%` : pct}</div>
          </div>
        )
      })}
    </div>
  )
}

// Crew changes display
function CrewChanges({ changes }) {
  if (!changes?.length) return null
  
  return (
    <div className="crew-changes">
      {changes.map((c, i) => (
        <div key={i} className={`crew-change-badge ${c.type}`}>
          <span className="change-icon">{c.type === 'join' ? '🏴‍☠️' : '👋'}</span>
          <span>{c.name}</span>
        </div>
      ))}
    </div>
  )
}

// Character appearances from episodes
function getCharacterAppearances(startEp, endEp, topN = 6) {
  if (!startEp || !endEp) return []
  
  const counts = {}
  episodes.forEach((ep) => {
    if (ep.episode >= startEp && ep.episode <= endEp) {
      (ep.character_appearances ?? []).forEach((char) => {
        counts[char] = (counts[char] || 0) + 1
      })
    }
  })
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ name, count }))
}

export default function ArcDashboard({ arc, expanded = true }) {
  const [activeTab, setActiveTab] = useState('characters')
  
  const characterAppearances = useMemo(() => 
    getCharacterAppearances(arc?.startEpisode, arc?.endEpisode, 6),
    [arc?.startEpisode, arc?.endEpisode]
  )
  
  if (!arc) return null
  if (!expanded) return null
  
  return (
    <div className="arc-dashboard">
      <div className="arc-dash-tabs">
        <button 
          className={activeTab === 'characters' ? 'active' : ''} 
          onClick={() => setActiveTab('characters')}
        >
          👥 Characters
        </button>
        <button 
          className={activeTab === 'events' ? 'active' : ''} 
          onClick={() => setActiveTab('events')}
        >
          ⚡ Events
        </button>
        <button 
          className={activeTab === 'bounty' ? 'active' : ''} 
          onClick={() => setActiveTab('bounty')}
        >
          💰 Bounties
        </button>
      </div>
      
      {activeTab === 'characters' && (
        <div className="dash-tab-content">
          {/* Character Popularity */}
          <div className="dash-section">
            <h4>🌟 Screen Time Distribution</h4>
            <CharacterPopularityChart data={arc.characterPopularity} />
          </div>
          
          {/* Episode Appearances */}
          <div className="dash-section">
            <h4>📈 Most Appearing Characters</h4>
            <div className="char-appearances">
              {characterAppearances.map((c, i) => (
                <div key={c.name} className="char-appear-row">
                  <span className="char-rank">#{i + 1}</span>
                  <span className="char-name">{c.name}</span>
                  <span className="char-count">{c.count} eps</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Crew Changes */}
          {arc.crewChanges?.length > 0 && (
            <div className="dash-section">
              <h4>🏴‍☠️ Crew Changes</h4>
              <CrewChanges changes={arc.crewChanges} />
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'events' && (
        <div className="dash-tab-content">
          {/* Key Events */}
          <div className="dash-section">
            <h4>⚡ Key Events Timeline</h4>
            <KeyEventsTimeline events={arc.keyEvents} />
          </div>
          
          {/* Animation Quality Meter */}
          <div className="dash-section">
            <h4>🎨 Animation Quality</h4>
            <div className="animation-meter">
              <div className="anim-score">{arc.animationQuality?.toFixed(1)}</div>
              <div className="anim-bar-wrap">
                <div className="anim-bar" style={{ width: `${(arc.animationQuality / 10) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'bounty' && (
        <div className="dash-tab-content">
          {/* Bounty Updates */}
          {arc.bountyUpdates?.length > 0 ? (
            <div className="dash-section">
              <h4>💰 Bounty Changes This Arc</h4>
              <BountyUpdates updates={arc.bountyUpdates} />
            </div>
          ) : (
            <div className="dash-section">
              <div className="no-bounty-msg">
                <span className="no-bounty-icon">🏴‍☠️</span>
                <p>No bounty updates in this arc</p>
              </div>
            </div>
          )}
          
          {/* Highlight Characters with bounties */}
          {arc.highlightCharacters?.some(c => c.bountyDuringArc) && (
            <div className="dash-section">
              <h4>💎 Notable Bounties</h4>
              <div className="bounty-showcase">
                {arc.highlightCharacters.filter(c => c.bountyDuringArc).map(c => (
                  <div key={c.name} className="bounty-showcase-card">
                    <div className="bs-name">{c.name.split(' ').pop()}</div>
                    <div className="bs-bounty">{(c.bountyDuringArc / 1e6).toLocaleString()}M ฿</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
