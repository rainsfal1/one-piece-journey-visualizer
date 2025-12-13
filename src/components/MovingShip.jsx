import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, useEffect } from 'react'
import { CatmullRomCurve3, Matrix4, Quaternion, Vector3 } from 'three'
import { useGLTF } from '@react-three/drei'
import merryUrl from '../assets/merry.glb?url'
import sunnyUrl from '../data/thousand_sunny.glb?url'

function MerryModel(props) {
  const { scene } = useGLTF(merryUrl)

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  return <primitive object={scene} {...props} />
}

function SunnyModel(props) {
  const { scene } = useGLTF(sunnyUrl)

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }, [scene])

  return <primitive object={scene} {...props} />
}

useGLTF.preload(merryUrl)
useGLTF.preload(sunnyUrl)

const tmpPos = new Vector3()
const tmpMat = new Matrix4()
const tmpQuat = new Quaternion()
const tmpRight = new Vector3()
const tmpForward = new Vector3()

const MERRY_SCALE = 0.04
const SUNNY_SCALE = 0.06

export function MovingShip({
  pathPoints,
  arcs,
  speed = 0.03,
  onReachArc,
  onArcChange,
  followShip,
  controlsRef,
  isPlaying,
  progress,
  onProgressChange,
  followOffsetScale = 1,
}) {
  const shipRef = useRef(null)
  const progressRef = useRef(0)
  const previousArcId = useRef(null)
  const [shipModel, setShipModel] = useState('merry')
  const { camera } = useThree()
  const curveData = useMemo(() => {
    if (!pathPoints || pathPoints.length < 2) return null
    const curve = new CatmullRomCurve3(pathPoints, false, 'centripetal')
    curve.curveType = 'catmullrom'
    const segments = Math.max(pathPoints.length * 8, pathPoints.length)
    const frames = curve.computeFrenetFrames(segments, false)
    return { curve, frames, segments }
  }, [pathPoints])
  const arcVectors = useMemo(
    () => (arcs ?? []).map((arc) => ({ ...arc, vec: new Vector3(arc.position.x, arc.position.y, arc.position.z) })),
    [arcs],
  )

  useEffect(() => {
    if (typeof progress === 'number') {
      progressRef.current = progress
    }
  }, [progress])

  useEffect(() => {
    if (followShip && shipRef.current) {
      const offset = new Vector3(1.5, 1.5, 1.5).applyQuaternion(shipRef.current.quaternion)
      const target = shipRef.current.position.clone().add(offset)
      camera.position.copy(target)
      camera.lookAt(shipRef.current.position)
      if (controlsRef?.current) controlsRef.current.enabled = false
    } else if (controlsRef?.current) {
      controlsRef.current.enabled = true
    }
  }, [followShip, camera, controlsRef])

  useFrame((_, delta) => {
    if (!curveData || !shipRef.current) return

    if (isPlaying) {
      progressRef.current = (progressRef.current + delta * speed) % 1
      onProgressChange?.(progressRef.current)
    } else if (typeof progress === 'number') {
      progressRef.current = progress
    }

    const { curve, frames, segments } = curveData
    const t = progressRef.current

    const rawPoint = curve.getPointAt(t)
    const radius = 5.05
    const shipPosition = rawPoint.clone().normalize().multiplyScalar(radius)
    shipRef.current.position.copy(shipPosition)
    const scale = shipModel === 'sunny' ? SUNNY_SCALE : MERRY_SCALE
    shipRef.current.scale.set(scale, scale, scale)

    const frameIndex = Math.min(Math.floor(t * segments), segments - 1)
    const tangent = frames.tangents[frameIndex].clone().normalize()
    const globeUp = shipPosition.clone().normalize()
    const cameraUp = camera.up.clone().normalize()
    const blend = 0.35
    const blendedUp = globeUp.clone().multiplyScalar(1 - blend).add(cameraUp.clone().multiplyScalar(blend)).normalize()

    const right = tmpRight.crossVectors(blendedUp, tangent).normalize()
    const forward = tmpForward.crossVectors(right, blendedUp).normalize()
    const finalUp = blendedUp

    tmpMat.makeBasis(right, finalUp, forward)
    tmpQuat.setFromRotationMatrix(tmpMat)
    shipRef.current.quaternion.copy(tmpQuat)

    const threshold = 0.15
    let closestArc = null
    let minDist = Infinity

    for (const arc of arcVectors) {
      const dist = shipRef.current.position.distanceTo(arc.vec)
      if (dist < minDist) {
        minDist = dist
        closestArc = arc
      }
    }

    if (closestArc && minDist < threshold && closestArc.id !== previousArcId.current) {
      previousArcId.current = closestArc.id
      if (closestArc?.shipModel && closestArc.shipModel !== shipModel) {
        setShipModel(closestArc.shipModel)
      }
      onArcChange?.(closestArc)
      onReachArc?.(closestArc)
      // eslint-disable-next-line no-console
      console.log('Reached arc:', closestArc.label)
    }

    if (followShip && shipRef.current) {
      const followOffset = new Vector3(2, 1.5, 2).multiplyScalar(followOffsetScale)
      const rotatedOffset = followOffset.applyQuaternion(shipRef.current.quaternion)
      const desiredPosition = shipRef.current.position.clone().add(rotatedOffset)
      camera.position.lerp(desiredPosition, 0.05)
      camera.lookAt(shipRef.current.position)
      if (controlsRef?.current) controlsRef.current.enabled = false
    } else if (controlsRef?.current) {
      controlsRef.current.enabled = true
    }
  })

  return (
    <group ref={shipRef} scale={0.1}>
      {shipModel === 'merry' && <MerryModel />}
      {shipModel === 'sunny' && <SunnyModel />}
      {/* Fade transition could be added here via conditional opacity/animation if needed */}
    </group>
  )
}

export default MovingShip
