import { useRef, useEffect, useCallback } from 'react'
import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { LinearFilter, SRGBColorSpace } from 'three'
import mapTextureUrl from '../assets/map.webp'

const RADIUS = 5

export function WorldGlobe({ onPointerDown }) {
  const meshRef = useRef(null)
  const texture = useTexture(mapTextureUrl)
  const { gl } = useThree()

  useEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.anisotropy = gl.capabilities.getMaxAnisotropy?.() ?? 1
    texture.generateMipmaps = true
    texture.needsUpdate = true
  }, [texture, gl])

  const handlePointerDown = useCallback(
    (e) => {
      e.stopPropagation()
      onPointerDown?.(e)
    },
    [onPointerDown],
  )

  return (
    <mesh ref={meshRef} onPointerDown={handlePointerDown} castShadow receiveShadow>
      <sphereGeometry args={[RADIUS, 128, 128]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.6}
        metalness={0.15}
        emissive="#222c3f"
        emissiveIntensity={0.22}
      />
    </mesh>
  )
}

export default WorldGlobe
