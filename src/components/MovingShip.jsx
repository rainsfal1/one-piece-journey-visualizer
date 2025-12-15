import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, useEffect } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'
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
const smoothedQuat = new Quaternion()
const cameraTargetQuat = new Quaternion()
const cameraTargetVec = new Vector3()
const smoothedPosition = new Vector3()
const previousForward = new Vector3(0, 0, 1)
const cameraPosSmoothed = new Vector3()
const cameraTargetSmoothed = new Vector3()

const MERRY_SCALE = 0.032
const SUNNY_SCALE = 0.072

export function MovingShip({
  pathPoints,
  arcs,
  speed = 0.035,
  onReachArc,
  onArcChange,
  followShip,
  controlsRef,
  isPlaying,
  progress,
  onProgressChange,
  followOffsetScale = 1,
  sunnyStartProgress = 0.4,
}) {
  const shipRef = useRef(null)
  const progressRef = useRef(0)
  const previousArcId = useRef(null)
  const previousOrientation = useRef(new Quaternion())
  const hasOrientation = useRef(false)
  const previousPosition = useRef(new Vector3())
  const [shipModel, setShipModel] = useState('merry')
  const { camera } = useThree()
  const pathData = useMemo(() => {
    if (!pathPoints || pathPoints.length < 2) return null
    const distances = [0]
    let total = 0
    for (let i = 1; i < pathPoints.length; i += 1) {
      total += pathPoints[i].distanceTo(pathPoints[i - 1])
      distances.push(total)
    }
    return { distances, total }
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
      cameraPosSmoothed.copy(target)
      cameraTargetSmoothed.copy(shipRef.current.position)
      if (controlsRef?.current) controlsRef.current.enabled = false
    } else if (controlsRef?.current) {
      controlsRef.current.enabled = true
    }
  }, [followShip, camera, controlsRef])

  useFrame((_, delta) => {
    if (!pathData || !shipRef.current || !pathPoints || pathPoints.length < 2) return

    if (isPlaying) {
      progressRef.current = (progressRef.current + delta * speed) % 1
      onProgressChange?.(progressRef.current)
    } else if (typeof progress === 'number') {
      progressRef.current = progress
    }

    if (shipModel !== 'sunny' && progressRef.current >= sunnyStartProgress) {
      setShipModel('sunny')
    }

    const { distances, total } = pathData
    const targetDistance = progressRef.current * total

    let idx = distances.findIndex((d) => d >= targetDistance)
    if (idx === -1) idx = distances.length - 1
    const prevIdx = Math.max(0, idx - 1)
    const nextIdx = idx
    const segmentDist = distances[nextIdx] - distances[prevIdx] || 1
    const segmentT = Math.min(1, Math.max(0, (targetDistance - distances[prevIdx]) / segmentDist))

    const p0 = pathPoints[prevIdx]
    const p1 = pathPoints[nextIdx]
    const lerped = new Vector3().copy(p0).lerp(p1, segmentT)
    const radius = 5.05
    const shipPosition = lerped.clone().normalize().multiplyScalar(radius)

    if (!hasOrientation.current) {
      shipRef.current.position.copy(shipPosition)
      previousPosition.current.copy(shipPosition)
    } else {
      smoothedPosition.copy(previousPosition.current).lerp(shipPosition, 0.12)
      const stabilized = smoothedPosition.clone().normalize().multiplyScalar(radius)
      shipRef.current.position.copy(stabilized)
      previousPosition.current.copy(stabilized)
    }
    const scale = shipModel === 'sunny' ? SUNNY_SCALE : MERRY_SCALE
    shipRef.current.scale.set(scale, scale, scale)

    const lookAhead = Math.min(pathPoints.length - 1, nextIdx + 8)
    const lookBack = Math.max(0, prevIdx - 8)
    const forwardDir = new Vector3().subVectors(pathPoints[lookAhead], pathPoints[lookBack]).normalize()
    const rawTangent = forwardDir.lengthSq() > 0 ? forwardDir : new Vector3().subVectors(p1, p0).normalize()
    const blendedTangent = previousForward.lengthSq() > 0 ? rawTangent.clone().lerp(previousForward, 0.65) : rawTangent
    let tangent = blendedTangent.normalize()
    if (previousForward.lengthSq() > 0 && tangent.dot(previousForward) < 0) {
      tangent = tangent.multiplyScalar(-1)
    }
    previousForward.copy(tangent)
    const globeUp = shipPosition.clone().normalize()
    const cameraUp = camera.up.clone().normalize()
    const blend = 0.35
    const blendedUp = globeUp.clone().multiplyScalar(1 - blend).add(cameraUp.clone().multiplyScalar(blend)).normalize()

    const right = tmpRight.crossVectors(blendedUp, tangent).normalize()
    const forward = tmpForward.crossVectors(right, blendedUp).normalize()
    const finalUp = blendedUp

    tmpMat.makeBasis(right, finalUp, forward)
    tmpQuat.setFromRotationMatrix(tmpMat)
    if (!hasOrientation.current) {
      previousOrientation.current.copy(tmpQuat)
      shipRef.current.quaternion.copy(tmpQuat)
      hasOrientation.current = true
    } else {
      smoothedQuat.copy(previousOrientation.current).slerp(tmpQuat, 0.04)
      shipRef.current.quaternion.copy(smoothedQuat)
      previousOrientation.current.copy(smoothedQuat)
    }

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
      const desiredModel = closestArc?.shipModel
      if (desiredModel === 'sunny' && shipModel !== 'sunny') {
        setShipModel('sunny')
      }
      onArcChange?.(closestArc)
      onReachArc?.(closestArc)
      // eslint-disable-next-line no-console
      console.log('Reached arc:', closestArc.label)
    }

    if (followShip && shipRef.current) {
      const followOffset = new Vector3(1.8, 1.2, 1.8).multiplyScalar(followOffsetScale)
      const rotatedOffset = followOffset.applyQuaternion(shipRef.current.quaternion)
      const desiredPosition = shipRef.current.position.clone().add(rotatedOffset)
      if (cameraPosSmoothed.lengthSq() === 0) cameraPosSmoothed.copy(desiredPosition)
      cameraPosSmoothed.lerp(desiredPosition, 0.06)
      camera.position.copy(cameraPosSmoothed)

      if (cameraTargetSmoothed.lengthSq() === 0) cameraTargetSmoothed.copy(shipRef.current.position)
      cameraTargetSmoothed.lerp(shipRef.current.position, 0.08)
      cameraTargetVec.copy(cameraTargetSmoothed)
      tmpMat.lookAt(camera.position, cameraTargetVec, camera.up)
      cameraTargetQuat.setFromRotationMatrix(tmpMat)
      camera.quaternion.slerp(cameraTargetQuat, 0.05)
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
