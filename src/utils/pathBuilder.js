import * as THREE from 'three'
import { rawPathPoints } from '../data/rawPathPoints'

const GLOBE_RADIUS = 5
const OFFSET = 0.05

const uniquePoints = rawPathPoints.filter((p, i, arr) => {
  if (i === 0) return true
  const prev = arr[i - 1]
  return p.x !== prev.x || p.y !== prev.y || p.z !== prev.z
})

const controlPoints = uniquePoints.map((p) => {
  const v = new THREE.Vector3(p.x, p.y, p.z)
  return v.normalize().multiplyScalar(GLOBE_RADIUS + OFFSET)
})

const curve = new THREE.CatmullRomCurve3(controlPoints, false, 'centripetal', 0.5)
const NUM_SAMPLES = 1500
export const pathPoints = curve.getPoints(NUM_SAMPLES)

export function findClosestPathIndex(target, points = pathPoints) {
  let bestIndex = 0
  let bestDist = Infinity
  points.forEach((p, i) => {
    const d = p.distanceTo(target)
    if (d < bestDist) {
      bestDist = d
      bestIndex = i
    }
  })
  return bestIndex
}

export function buildArcProgressMap(arcs) {
  const map = {}
  const total = pathPoints.length - 1 || 1
  arcs.forEach((arc) => {
    const v = new THREE.Vector3(arc.position.x, arc.position.y, arc.position.z).normalize().multiplyScalar(GLOBE_RADIUS + OFFSET)
    const idx = findClosestPathIndex(v)
    map[arc.id] = idx / total
  })
  return map
}
