import arcData from '../data/arcData'
import episodes from '../data/episodes.json'
import crewJoins from '../data/crewJoins'

const worldImpactOrder = { Local: 1, Regional: 2, Global: 3 }

export function getArcMetrics() {
  return arcData.map((a) => ({
    id: a.id,
    label: a.label,
    saga: a.saga ?? 'Unknown',
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

/** Episode count per arc for bar chart */
export function getEpisodeCountByArc() {
  return arcData.map((a) => ({
    id: a.id,
    label: a.label,
    shortLabel: a.label.length > 16 ? a.label.slice(0, 14) + '…' : a.label,
    episodeCount: Number(a.episodeCount ?? 0),
    saga: a.saga,
  }))
}

/** Group arcs by saga and sum episode counts */
export function getSagaDistribution() {
  const sagaMap = {}
  arcData.forEach((a) => {
    const saga = a.saga ?? 'Unknown'
    if (!sagaMap[saga]) sagaMap[saga] = { saga, episodeCount: 0, arcCount: 0 }
    sagaMap[saga].episodeCount += Number(a.episodeCount ?? 0)
    sagaMap[saga].arcCount += 1
  })
  return Object.values(sagaMap)
}

/** World impact distribution for pie chart */
export function getWorldImpactDistribution() {
  const counts = { Local: 0, Regional: 0, Global: 0 }
  arcData.forEach((a) => {
    const impact = a.worldImpact ?? 'Regional'
    counts[impact] = (counts[impact] || 0) + 1
  })
  return Object.entries(counts).map(([name, value]) => ({ name, value }))
}

/** Bounty progression data from arcData bountyUpdates */
export function getBountyProgression() {
  const bountyMap = {}
  arcData.forEach((arc) => {
    if (!arc.bountyUpdates) return
    arc.bountyUpdates.forEach(({ character, to }) => {
      if (!bountyMap[character]) bountyMap[character] = []
      bountyMap[character].push({ arcId: arc.id, label: arc.label, bounty: to })
    })
  })
  // Return array of characters with their progression
  return Object.entries(bountyMap).map(([character, progression]) => ({
    character,
    progression,
  }))
}

/** Crew join timeline */
export function getCrewJoinTimeline() {
  return crewJoins.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    episode: c.episode,
    arcId: c.arcId,
    order: c.order,
  }))
}

/** Top characters across all arcs */
export function getTopCharactersOverall(topN = 10) {
  const counts = {}
  episodes.forEach((ep) => {
    const chars = ep.character_appearances ?? []
    chars.forEach((c) => {
      counts[c] = (counts[c] || 0) + 1
    })
  })
  const list = Object.entries(counts).map(([name, count]) => ({ name, count }))
  list.sort((a, b) => b.count - a.count)
  return list.slice(0, topN)
}

/** Arc comparison radar data */
export function getArcRadarData(arcId) {
  const arc = arcData.find((a) => a.id === arcId)
  if (!arc) return []
  return [
    { metric: 'Narrative', value: (arc.narrativeWeight ?? 0) * 100 },
    { metric: 'Crew Risk', value: (arc.crewRisk ?? 0) * 100 },
    { metric: 'Episodes', value: Math.min(100, (arc.episodeCount ?? 0) / 2) },
    { metric: 'Impact', value: worldImpactOrder[arc.worldImpact] * 33 },
  ]
}

/** Narrative vs Risk comparison for all arcs (bar chart) */
export function getNarrativeRiskComparison() {
  return arcData.map((a) => ({
    id: a.id,
    label: a.label,
    shortLabel: a.label.length > 12 ? a.label.slice(0, 10) + '…' : a.label,
    narrativeWeight: Math.round((a.narrativeWeight ?? 0) * 100),
    crewRisk: Math.round((a.crewRisk ?? 0) * 100),
  }))
}

export default {
  getArcMetrics,
  getCharacterFrequenciesForArc,
  getScatterData,
  getEpisodeCountByArc,
  getSagaDistribution,
  getWorldImpactDistribution,
  getBountyProgression,
  getCrewJoinTimeline,
  getTopCharactersOverall,
  getArcRadarData,
  getNarrativeRiskComparison,
}
