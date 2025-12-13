import { Line } from '@react-three/drei'

export function RoutePath({ points }) {
  if (!points?.length) return null
  return <Line points={points.map((p) => [p.x, p.y, p.z])} color="#ff4444" lineWidth={2} />
}

export default RoutePath
