const truncate = (text, limit = 320) => {
  if (!text) return ''
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}...`
}

export function ArcInfoPanel({ arc }) {
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
  } = arc

  return (
    <div className="arc-info-panel">
      <div className="arc-title">{label}</div>
      <div className="arc-saga">{saga}</div>
      <div className="arc-episodes">
        Episodes: {startEpisode} – {endEpisode} ({episodeCount})
      </div>
      {summary ? <div className="arc-summary">{truncate(summary)}</div> : null}
      {keyEvents?.length ? (
        <div className="arc-section">
          <div className="arc-section-title">Key events</div>
          <ul className="arc-list">
            {keyEvents.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {highlightCharacters?.length ? (
        <div className="arc-section">
          <div className="arc-section-title">Highlight characters</div>
          <ul className="arc-list">
            {highlightCharacters.map(({ name, role, epithet, bountyDuringArc }) => (
              <li key={name}>
                <strong>{name}</strong> — {role}
                {epithet ? ` (${epithet})` : ''}
                {bountyDuringArc ? ` • Bounty: ${new Intl.NumberFormat('en-US').format(bountyDuringArc)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="arc-metrics">
        <span>Narrative weight: {(narrativeWeight ?? 0).toFixed(2)}</span>
        <span>Crew risk: {(crewRisk ?? 0).toFixed(2)}</span>
        <span>Impact: {worldImpact}</span>
      </div>
    </div>
  )
}

export default ArcInfoPanel
