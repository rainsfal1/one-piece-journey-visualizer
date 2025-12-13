import { forwardRef, useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { MeshStandardMaterial } from 'three'
import merryUrl from '../assets/merry.glb?url'

export const Ship = forwardRef(function Ship(
  { position = [0, 5.1, 0], scale = [0.02, 0.02, 0.02], ...props },
  ref,
) {
  const { scene } = useGLTF(merryUrl)

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material && !child.material.isMeshStandardMaterial) {
          child.material = new MeshStandardMaterial({
            map: child.material.map ?? null,
            normalMap: child.material.normalMap ?? null,
            roughnessMap: child.material.roughnessMap ?? null,
            metalnessMap: child.material.metalnessMap ?? null,
            color: child.material.color?.clone?.() ?? undefined,
            roughness: child.material.roughness ?? 0.8,
            metalness: child.material.metalness ?? 0.1,
          })
        }
        if (child.material) {
          child.material.needsUpdate = true
        }
      }
    })
  }, [scene])

  return (
    <primitive
      ref={ref}
      object={scene}
      position={position}
      rotation={[0, Math.PI, 0]}
      scale={scale}
      {...props}
    />
  )
})

useGLTF.preload(merryUrl)

export default Ship
