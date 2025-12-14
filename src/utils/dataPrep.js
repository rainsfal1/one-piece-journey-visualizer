import arcData from '../data/arcData'
import episodes from '../data/episodes.json'

const worldImpactOrder = { Local: 1, Regional: 2, Global: 3 }

export function getArcMetrics() {
  return arcData.map((a) => ({
    id: a.id,
    label: a.label,
    narrativeWeight: Number(a.narrativeWeight ?? 0),
    crewRisk: Number(a.crewRisk ?? 0),
    episodeCount: Number(a.episodeCount ?? 0),
    worldImpact: a.worldImpact ?? 'Regional',
    worldImpactLevel: worldImpactOrder[a.worldImpact] ?? 2,
    startEpisode: a.startEpisode,
    endEpisode: a.endEpisode,
  }))
}

export function getCharacterFrequenciesForArc(arcId, topN = 8) {
  const arc = arcData.find((a) => a.id === arcId)
  if (!arc || !arc.startEpisode || !arc.endEpisode) return []
  const start = arc.startEpisode
  const end = arc.endEpisode

  const counts = episodes.reduce((acc, ep) => {
    const epNum = Number(ep.episode)
    if (!epNum || epNum < start || epNum > end) return acc
    const chars = ep.character_appearances ?? []
    chars.forEach((c) => {
      acc[c] = (acc[c] || 0) + 1
    })
    return acc
  }, {})

  const list = Object.entries(counts).map(([name, count]) => ({ name, count }))
  list.sort((a, b) => b.count - a.count)
  return list.slice(0, topN)
}

export function getScatterData() {
  return getArcMetrics().map((a) => ({
    id: a.id,
    label: a.label,
    x: Number(a.narrativeWeight),
    y: Number(a.crewRisk),
    r: Math.max(6, Math.min(30, Math.round((a.episodeCount / 20) * 20))),
    worldImpactLevel: a.worldImpactLevel,
  }))
}

export default { getArcMetrics, getCharacterFrequenciesForArc, getScatterData }
