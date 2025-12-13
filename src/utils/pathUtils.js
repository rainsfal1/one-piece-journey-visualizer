import { Vector3 } from 'three'

export function buildPathFromArcs(arcs, radius = 5.05, segmentsPerLeg = 40) {
  if (!arcs || arcs.length < 2) return []

  const points = []

  for (let i = 0; i < arcs.length - 1; i += 1) {
    const start = new Vector3(arcs[i].position.x, arcs[i].position.y, arcs[i].position.z).normalize()
    const end = new Vector3(arcs[i + 1].position.x, arcs[i + 1].position.y, arcs[i + 1].position.z).normalize()

    for (let s = 0; s <= segmentsPerLeg; s += 1) {
      if (s === 0 && i > 0) {
        continue
      }
      const t = s / segmentsPerLeg
      const step = new Vector3().lerpVectors(start, end, t).normalize().multiplyScalar(radius)
      points.push(step)
    }
  }

  return points
}

export default buildPathFromArcs
