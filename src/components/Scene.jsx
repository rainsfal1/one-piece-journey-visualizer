import { OrbitControls, Stars, Billboard } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import React, { Suspense, useEffect, useMemo, useState, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { FiZoomIn, FiZoomOut, FiRefreshCw, FiPlay, FiPause } from 'react-icons/fi'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { arcs } from '../data/arcs'
import { arcData } from '../data/arcData'
import IslandList from './IslandList'
import Dashboard from './Dashboard'
import ArcDashboard from './ArcDashboard'
import RoutePath from './RoutePath'
import WorldGlobe from './WorldGlobe'
import MovingShip from './MovingShip'
import JourneyToast from './JourneyToast'
import crewJoins from '../data/crewJoins'
import { buildPathFromArcs } from '../utils/pathUtils'
import { pathPoints as smoothPathPoints, buildArcProgressMap } from '../utils/pathBuilder'

function SceneContent({
  onArcChange,
  followShip,
  controlsRef,
  pathPoints,
  isPlaying,
  progress,
  onProgressChange,
  mode,
  onMarkerClick,
  followOffsetScale,
  shipSpeed,
}) {
  const { gl } = useThree()

  useEffect(() => {
    gl.shadowMap.enabled = true
  }, [gl])

  const handleReachArc = (arc) => {
    // eslint-disable-next-line no-console
    console.log('Reached arc:', arc.label)
  }

  return (
    <>
      <color attach="background" args={['#0c1321']} />
      <Stars radius={140} depth={80} count={5200} factor={1.7} saturation={0} fade />
      <ambientLight intensity={0.65} color="#27324a" />
      <directionalLight castShadow position={[16, 14, 10]} intensity={2.1} color="#ffd9a3" />
      <directionalLight position={[-14, 10, -12]} intensity={0.95} color="#8cb7ff" />
      <hemisphereLight skyColor="#6c86b0" groundColor="#1a2132" intensity={1.05} />

      <Suspense fallback={null}>
        <mesh position={[20, 14, 12]}>
          <sphereGeometry args={[1.6, 32, 32]} />
          <meshStandardMaterial color="#ffd27f" emissive="#ffd27f" emissiveIntensity={7} />
        </mesh>

        <WorldGlobe />
        <mesh>
          <sphereGeometry args={[5.1, 64, 64]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.05} roughness={0.6} metalness={0} depthWrite={false} />
        </mesh>
        <group>
          {arcData.map((arc) => {
            const pos = new THREE.Vector3(arc.position.x, arc.position.y, arc.position.z)
            const normalized = pos.clone().normalize().multiplyScalar(5.05)
            return (
              <mesh
                key={arc.id}
                position={normalized}
                onClick={(e) => {
                  e.stopPropagation()
                  if (mode === 'autoplay') return
                  onMarkerClick?.(arc)
                }}
              >
                <sphereGeometry args={[0.05, 12, 12]} />
                <meshStandardMaterial emissive="#ffdd88" color="#ffdd88" emissiveIntensity={2} />
              </mesh>
            )
          })}
        </group>
        <RoutePath points={pathPoints} />
        <MovingShip
          pathPoints={pathPoints}
          arcs={arcData}
          onReachArc={handleReachArc}
          onArcChange={onArcChange}
          followShip={followShip}
          controlsRef={controlsRef}
          isPlaying={isPlaying}
          progress={progress}
          speed={shipSpeed}
          onProgressChange={onProgressChange}
          followOffsetScale={followOffsetScale}
        />
      </Suspense>

      <EffectComposer>
        <Bloom intensity={1.1} mipmapBlur luminanceThreshold={0.08} radius={0.85} />
      </EffectComposer>

      <OrbitControls ref={controlsRef} enablePan={false} minDistance={8} maxDistance={20} />
    </>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error', error, info)
  }

  render() {
    if (this.state.error) {
      const msg = this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error)
      return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,6,10,0.95)', color: 'white', zIndex: 9999, padding: 20 }}>
          <div style={{ maxWidth: 900 }}>
            <h2 style={{ marginTop: 0 }}>Scene error</h2>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg}</pre>
            <p>Check DevTools console for stack trace.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function Scene() {
  const [currentArc, setCurrentArc] = useState(null)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [followShip, setFollowShip] = useState(false)
  const [mode, setMode] = useState('manual') // manual | autoplay
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedArcForModal, setSelectedArcForModal] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [followOffsetScale, setFollowOffsetScale] = useState(1)
  const controlsRef = useRef(null)
  const cameraRef = useRef(null)
  const animFrameRef = useRef(null)

  const pathPoints = useMemo(() => smoothPathPoints, [])

  // ship speed handling for join popups
  // Reduced base speed so autoplay progression is noticeably slower
  // (was 0.03; lower to 0.01 so arc join popups don't trigger too early)
  const BASE_SHIP_SPEED = 0.01
  const [shipSpeed, setShipSpeed] = useState(BASE_SHIP_SPEED)
  const speedAnimRef = useRef(null)
  const triggeredRef = useRef({})
  const prevProgressRef = useRef(progress)
  const pendingRef = useRef([])

  const animateSpeedTo = useCallback((target, duration = 300) => {
    if (speedAnimRef.current) cancelAnimationFrame(speedAnimRef.current)
    const start = performance.now()
    const from = shipSpeed
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = t * t * (3 - 2 * t)
      const val = from + (target - from) * eased
      setShipSpeed(val)
      if (t < 1) speedAnimRef.current = requestAnimationFrame(step)
      else speedAnimRef.current = null
    }
    speedAnimRef.current = requestAnimationFrame(step)
  }, [shipSpeed])

  const handleProgressChange = useCallback(
    (value) => {
      setProgress(value)
    },
    [setProgress],
  )
  
  const animateZoomInForPlay = useCallback(
    (atProgress = progress) => {
      return new Promise((resolve) => {
        if (!cameraRef.current || !pathPoints || pathPoints.length < 2) {
          resolve()
          return
        }

        const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'centripetal')
        const segments = Math.max(pathPoints.length * 8, pathPoints.length)
        const frames = curve.computeFrenetFrames(segments, false)
        const shipPointRaw = curve.getPointAt(atProgress)
        const shipPos = shipPointRaw.clone().normalize().multiplyScalar(5.05)

        const frameIndex = Math.min(Math.floor(atProgress * segments), segments - 1)
        const tangent = frames.tangents[frameIndex].clone().normalize()
        const globeUp = shipPos.clone().normalize()
        const cameraUp = cameraRef.current.up.clone().normalize()
        const blend = 0.35
        const blendedUp = globeUp.clone().multiplyScalar(1 - blend).add(cameraUp.clone().multiplyScalar(blend)).normalize()

        const right = new THREE.Vector3().crossVectors(blendedUp, tangent).normalize()
        const forward = new THREE.Vector3().crossVectors(right, blendedUp).normalize()
        const mat = new THREE.Matrix4().makeBasis(right, blendedUp, forward)
        const shipQuat = new THREE.Quaternion().setFromRotationMatrix(mat)

        // compute a closer camera position (zoom in by 2x relative to base follow offset)
        const baseOffset = new THREE.Vector3(2, 1.5, 2)
        const followOffset = baseOffset.applyQuaternion(shipQuat)
        const currentCam = cameraRef.current.position.clone()
        const targetCam = shipPos.clone().add(followOffset.multiplyScalar(0.5))

        const startCamPos = currentCam
        const startTarget = controlsRef.current ? controlsRef.current.target.clone() : cameraRef.current.getWorldDirection(new THREE.Vector3())

        const duration = 400
        let start = null

        if (controlsRef.current) controlsRef.current.enabled = false

        const step = (time) => {
          if (!start) start = time
          const t = Math.min(1, (time - start) / duration)
          const eased = t * t * (3 - 2 * t)
          cameraRef.current.position.lerpVectors(startCamPos, targetCam, eased)
          if (controlsRef.current) {
            controlsRef.current.target.lerpVectors(startTarget, shipPos, eased)
            controlsRef.current.update()
          }

          if (t < 1) {
            animFrameRef.current = requestAnimationFrame(step)
          } else {
            // snap to prevent follow jump
            cameraRef.current.position.copy(targetCam)
            if (controlsRef.current) {
              // After zooming out, reset the orbit-controls target to the globe center
              // so further rotations pivot around the globe instead of the ship.
              controlsRef.current.target.set(0, 0, 0)
              controlsRef.current.update()
              controlsRef.current.enabled = true
            }
            animFrameRef.current = null
            resolve()
          }
        }

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = requestAnimationFrame(step)
      })
    },
    [cameraRef, controlsRef, pathPoints, progress],
  )

  const animateCameraToNeutralRestore = useCallback(() => {
    return new Promise((resolve) => {
      if (!cameraRef.current) {
        resolve()
        return
      }

      const neutralPos = new THREE.Vector3(8, 8, 12)
      const neutralTarget = new THREE.Vector3(0, 0, 0)

      const startCamPos = cameraRef.current.position.clone()
      const startTarget = controlsRef.current ? controlsRef.current.target.clone() : cameraRef.current.getWorldDirection(new THREE.Vector3())

      const duration = 900
      let start = null

      if (controlsRef.current) controlsRef.current.enabled = false

      const step = (time) => {
        if (!start) start = time
        const t = Math.min(1, (time - start) / duration)
        const eased = t * t * (3 - 2 * t)
        cameraRef.current.position.lerpVectors(startCamPos, neutralPos, eased)
        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(startTarget, neutralTarget, eased)
          controlsRef.current.update()
        }

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(step)
        } else {
          if (controlsRef.current) {
            controlsRef.current.target.copy(neutralTarget)
            controlsRef.current.update()
            controlsRef.current.enabled = true
          }
          animFrameRef.current = null
          resolve()
        }
      }

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = requestAnimationFrame(step)
    })
  }, [cameraRef, controlsRef])

  const handlePlayPause = () => {
    if (mode === 'manual') {
      // Smoothly pan to ship camera, then do a short zoom-in (2x), then start playback and enable follow
      ;(async () => {
        await animateCameraToShip(progress)
        await animateZoomInForPlay(progress)
        setMode('autoplay')
        setIsPlaying(true)
        setFollowShip(true)
        // ensure Luffy popup appears immediately at journey start if not already triggered
        try {
          const luffyJoin = crewJoins.find((c) => c.id === 'luffy')
          if (luffyJoin && !triggeredRef.current[luffyJoin.id]) {
            triggeredRef.current[luffyJoin.id] = true
            if (toasts.length === 0) {
              setToasts([luffyJoin])
              animateSpeedTo(Math.min(BASE_SHIP_SPEED * 0.18, BASE_SHIP_SPEED * 0.25), 180)
              setTimeout(() => {
                setToasts([])
                animateSpeedTo(BASE_SHIP_SPEED, 400)
              }, POPUP_MS)
            } else {
              pendingRef.current.push(luffyJoin)
            }
          }
        } catch (e) {
          // defensive: ignore errors
        }
      })()
    } else {
      // Stop playback immediately, reset follow mode, then return camera to neutral centered on globe
      setIsPlaying(false)
      setFollowShip(false)
      ;(async () => {
        // animate to neutral camera/target so dragging rotates around globe center
        await animateCameraToNeutralRestore()
        setMode('manual')
      })()
    }
  }

  const handleSliderChange = (e) => {
    const val = parseFloat(e.target.value)
    setProgress(val)
    if (isPlaying || mode === 'autoplay') {
      setIsPlaying(false)
      setMode('manual')
      setFollowShip(false)
    }
  }

  const arcProgressMap = useMemo(() => buildArcProgressMap(arcData), [])

  const animateCameraToArc = useCallback(
    (arc) => {
      if (!arc || !cameraRef.current) return

      const target = new THREE.Vector3(arc.position.x, arc.position.y, arc.position.z).normalize()
      const surfacePos = target.clone().multiplyScalar(5.05)

      const startCamPos = cameraRef.current.position.clone()
      const startTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0)

      const startDistance = startCamPos.length()
      const rotatedPos = target.clone().multiplyScalar(startDistance)
      const zoomDistance = Math.min(Math.max(6, startDistance * 0.6), startDistance - 1)
      const zoomPos = target.clone().multiplyScalar(zoomDistance)

      const rotateDuration = 900
      const zoomDuration = 700

      let phase = 0
      let phaseStart = null
      let sPos = startCamPos.clone()
      let sTarget = startTarget.clone()

      if (controlsRef.current) controlsRef.current.enabled = false

      const step = (time) => {
        if (!phaseStart) phaseStart = time
        const elapsed = time - phaseStart

        if (phase === 0) {
          const t = Math.min(1, elapsed / rotateDuration)
          const eased = t * t * (3 - 2 * t)
          cameraRef.current.position.lerpVectors(sPos, rotatedPos, eased)
          if (controlsRef.current) {
            controlsRef.current.target.lerpVectors(sTarget, surfacePos, eased)
            controlsRef.current.update()
          }

          if (t < 1) {
            animFrameRef.current = requestAnimationFrame(step)
            return
          }

          // switch to zoom phase
          phase = 1
          phaseStart = null
          sPos = cameraRef.current.position.clone()
          sTarget = controlsRef.current ? controlsRef.current.target.clone() : surfacePos.clone()
          animFrameRef.current = requestAnimationFrame(step)
          return
        }

        // zoom phase
        const t2 = Math.min(1, elapsed / zoomDuration)
        const eased2 = t2 * t2 * (3 - 2 * t2)
        cameraRef.current.position.lerpVectors(sPos, zoomPos, eased2)
        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(sTarget, surfacePos, eased2)
          controlsRef.current.update()
        }

        if (t2 < 1) {
          animFrameRef.current = requestAnimationFrame(step)
        } else {
          if (controlsRef.current) controlsRef.current.enabled = true
          animFrameRef.current = null
        }
      }

      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = requestAnimationFrame(step)
    },
    [cameraRef, controlsRef],
  )

  const animateCameraToShip = useCallback(
    (startProgress = progress) => {
      return new Promise((resolve) => {
        if (!cameraRef.current || !pathPoints || pathPoints.length < 2) {
          resolve()
          return
        }

        // build a curve to sample the ship position and orientation
        const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'centripetal')
        const segments = Math.max(pathPoints.length * 8, pathPoints.length)
        const frames = curve.computeFrenetFrames(segments, false)
        const shipPointRaw = curve.getPointAt(startProgress)
        const shipPos = shipPointRaw.clone().normalize().multiplyScalar(5.05)

        const frameIndex = Math.min(Math.floor(startProgress * segments), segments - 1)
        const tangent = frames.tangents[frameIndex].clone().normalize()
        const globeUp = shipPos.clone().normalize()
        const cameraUp = cameraRef.current.up.clone().normalize()
        const blend = 0.35
        const blendedUp = globeUp.clone().multiplyScalar(1 - blend).add(cameraUp.clone().multiplyScalar(blend)).normalize()

        const right = new THREE.Vector3().crossVectors(blendedUp, tangent).normalize()
        const forward = new THREE.Vector3().crossVectors(right, blendedUp).normalize()
        const mat = new THREE.Matrix4().makeBasis(right, blendedUp, forward)
        const shipQuat = new THREE.Quaternion().setFromRotationMatrix(mat)

        // desired camera offset matches MovingShip's follow offset rotated by ship orientation
        // use a slightly larger offset so the follow lerp doesn't cause an abrupt zoom-in
        const baseOffset = new THREE.Vector3(2, 1.5, 2)
        const desiredOffset = baseOffset.applyQuaternion(shipQuat).multiplyScalar(1.25)
        const desiredCamPos = shipPos.clone().add(desiredOffset)

        const startCamPos = cameraRef.current.position.clone()
        const startTarget = controlsRef.current ? controlsRef.current.target.clone() : new THREE.Vector3(0, 0, 0)

        const rotateDuration = 800
        const zoomDuration = 700

        let phase = 0
        let phaseStart = null
        let sPos = startCamPos.clone()
        let sTarget = startTarget.clone()

        if (controlsRef.current) controlsRef.current.enabled = false

        const step = (time) => {
          if (!phaseStart) phaseStart = time
          const elapsed = time - phaseStart

          if (phase === 0) {
            const t = Math.min(1, elapsed / rotateDuration)
            const eased = t * t * (3 - 2 * t)
            cameraRef.current.position.lerpVectors(sPos, desiredCamPos, eased)
            if (controlsRef.current) {
              controlsRef.current.target.lerpVectors(sTarget, shipPos, eased)
              controlsRef.current.update()
            }

            if (t < 1) {
              animFrameRef.current = requestAnimationFrame(step)
              return
            }

            phase = 1
            phaseStart = null
            sPos = cameraRef.current.position.clone()
            sTarget = controlsRef.current ? controlsRef.current.target.clone() : shipPos.clone()
            animFrameRef.current = requestAnimationFrame(step)
            return
          }

          const t2 = Math.min(1, elapsed / zoomDuration)
          const eased2 = t2 * t2 * (3 - 2 * t2)
          cameraRef.current.position.lerpVectors(sPos, desiredCamPos, eased2)
          if (controlsRef.current) {
            controlsRef.current.target.lerpVectors(sTarget, shipPos, eased2)
            controlsRef.current.update()
          }

          if (t2 < 1) {
            animFrameRef.current = requestAnimationFrame(step)
          } else {
            // snap camera & target to final desired positions to avoid a jump when follow starts
            cameraRef.current.position.copy(desiredCamPos)
            if (controlsRef.current) {
              controlsRef.current.target.copy(shipPos)
              controlsRef.current.update()
              controlsRef.current.enabled = true
            }
            animFrameRef.current = null
            resolve()
          }
        }

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = requestAnimationFrame(step)
      })
    },
    [cameraRef, controlsRef, pathPoints, progress],
  )

  const animateZoomOutFromShip = useCallback(
    (atProgress = progress) => {
      return new Promise((resolve) => {
        if (!cameraRef.current || !pathPoints || pathPoints.length < 2) {
          resolve()
          return
        }

        const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'centripetal')
        const segments = Math.max(pathPoints.length * 8, pathPoints.length)
        const shipPointRaw = curve.getPointAt(atProgress)
        const shipPos = shipPointRaw.clone().normalize().multiplyScalar(5.05)

        const startCamPos = cameraRef.current.position.clone()
        const dir = startCamPos.clone().sub(shipPos)
        const startDist = dir.length()
        if (startDist === 0) {
          resolve()
          return
        }
        const dirNorm = dir.normalize()
        const desiredDist = Math.max(8, Math.min(14, startDist * 1.6))
        const desiredCamPos = shipPos.clone().add(dirNorm.multiplyScalar(desiredDist))

        const startTarget = controlsRef.current ? controlsRef.current.target.clone() : shipPos.clone()

        const duration = 1800
        let start = null

        if (controlsRef.current) controlsRef.current.enabled = false

        const step = (time) => {
          if (!start) start = time
          const t = Math.min(1, (time - start) / duration)
          const eased = t * t * (3 - 2 * t)
          cameraRef.current.position.lerpVectors(startCamPos, desiredCamPos, eased)
          if (controlsRef.current) {
            controlsRef.current.target.lerpVectors(startTarget, shipPos, eased)
            controlsRef.current.update()
          }

          if (t < 1) {
            animFrameRef.current = requestAnimationFrame(step)
          } else {
            if (controlsRef.current) {
              controlsRef.current.target.copy(shipPos)
              controlsRef.current.update()
              controlsRef.current.enabled = true
            }
            animFrameRef.current = null
            resolve()
          }
        }

        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = requestAnimationFrame(step)
      })
    },
    [cameraRef, controlsRef, pathPoints, progress],
  )

  // ensure we cancel any running animation when unmounting
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  const handleMarkerClick = (arc) => {
    setIsPlaying(false)
    setMode('manual')
    setFollowShip(false)
    const val = arcProgressMap[arc.id] ?? 0
    setProgress(val)
    setCurrentArc(arc)
    setSelectedArcForModal(arc)
    setIsModalOpen(true)
  }

  // popups for crew joining while autoplay is active
  const [toasts, setToasts] = useState([])
  const POPUP_MS = 3000

  useEffect(() => {
    if (!isPlaying) {
      prevProgressRef.current = progress
      return
    }

    for (const join of crewJoins) {
      if (triggeredRef.current[join.id]) continue
      const prev = prevProgressRef.current
      const cur = progress

      // determine a more accurate target progress by mapping the join's episode
      // to the arc that contains that episode, falling back to the episode-normalized value
      let targetProgress = join.progress
      try {
        const arcForEpisode = arcData.find((a) => join.episode >= (a.startEpisode ?? 0) && join.episode <= (a.endEpisode ?? Infinity))
        if (arcForEpisode && arcProgressMap && arcProgressMap[arcForEpisode.id] != null) {
          targetProgress = arcProgressMap[arcForEpisode.id]
        }
      } catch (e) {
        // fallback to join.progress
      }

      // detect crossing of the threshold — trigger slightly earlier so the popup
      // appears before the ship reaches the island. Compute a lead based on
      // the base ship speed and popup duration.
      const proximityWindow = 0.01
      const leadSeconds = Math.min(3.0, (POPUP_MS / 1000) * 0.6) // seconds to lead by (caps at 3s)
      const leadProgress = Math.max(0, BASE_SHIP_SPEED * leadSeconds)
      const triggerProgress = Math.max(0, targetProgress - leadProgress)

      // special-case: ensure Luffy (episode 1 / progress 0) shows when journey starts
      const isLuffy = join.episode === 1 || join.id === 'luffy'
      const crossed = isLuffy
        ? (cur <= targetProgress + proximityWindow || (prev < targetProgress && cur >= targetProgress))
        : ((prev < triggerProgress && cur >= triggerProgress) || (Math.abs(cur - targetProgress) <= proximityWindow))
      if (!crossed) continue

      // mark seen
      triggeredRef.current[join.id] = true

      // if a toast is active, queue this join
      if (toasts.length > 0) {
        pendingRef.current.push(join)
        continue
      }

      // compute slowdown so the next untriggered join happens after the popup
      const timeWindow = (POPUP_MS + 400) / 1000
      let targetSlow = BASE_SHIP_SPEED * 0.18
      const nextJoin = crewJoins.find((j) => !triggeredRef.current[j.id] && j.progress > join.progress)
      if (nextJoin) {
        const delta = Math.max(0.0001, nextJoin.progress - join.progress)
        const suggested = (delta / timeWindow) * 0.9
        targetSlow = Math.min(targetSlow, Math.max(suggested, BASE_SHIP_SPEED * 0.005))
      }

      setToasts([join])
      animateSpeedTo(targetSlow, 220)

      setTimeout(() => {
        setToasts([])
        const next = pendingRef.current.shift()
        if (next) {
          // compute next's slowdown relative to its following join
          const laterJoin = crewJoins.find((j) => !triggeredRef.current[j.id] && j.progress > next.progress)
          let nextTargetSlow = BASE_SHIP_SPEED * 0.18
          if (laterJoin) {
            const delta2 = Math.max(0.0001, laterJoin.progress - next.progress)
            const suggested2 = (delta2 / timeWindow) * 0.9
            nextTargetSlow = Math.min(nextTargetSlow, Math.max(suggested2, BASE_SHIP_SPEED * 0.005))
          }
          setToasts([next])
          animateSpeedTo(nextTargetSlow, 220)
          setTimeout(() => {
            setToasts([])
            animateSpeedTo(BASE_SHIP_SPEED, 400)
          }, POPUP_MS)
        } else {
          animateSpeedTo(BASE_SHIP_SPEED, 400)
        }
      }, POPUP_MS)
    }

    prevProgressRef.current = progress
  }, [isPlaying, progress, animateSpeedTo, toasts.length])

  const handleIslandSelect = (arc) => {
    if (!arc) return
    setIsPlaying(false)
    setMode('manual')
    setFollowShip(false)
    const val = arcProgressMap[arc.id] ?? 0
    setProgress(val)
    setCurrentArc(arc)
    setSelectedArcForModal(arc)
    setIsModalOpen(true)
    animateCameraToArc(arc)
  }

  const openDashboard = () => setDashboardOpen(true)
  const closeDashboard = () => setDashboardOpen(false)

  const closeModalAndResetControls = () => {
    setIsModalOpen(false)
    setSelectedArcForModal(null)
    // reset orbit controls target back to globe center so dragging works as initial
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
      controlsRef.current.enabled = true
    }
  }

  const navigateModalArc = (direction) => {
    if (!selectedArcForModal) return
    const list = arcData
    const idx = list.findIndex((a) => a.id === selectedArcForModal.id)
    if (idx === -1) return
    let nextIdx = direction === 'next' ? idx + 1 : idx - 1
    if (nextIdx < 0) nextIdx = list.length - 1
    if (nextIdx >= list.length) nextIdx = 0
    const nextArc = list[nextIdx]
    setSelectedArcForModal(nextArc)
    setCurrentArc(nextArc)
    // update progress slider to match the selected arc
    const val = arcProgressMap[nextArc.id] ?? 0
    setProgress(val)
    // animate camera to new arc for continuity
    animateCameraToArc(nextArc)
  }

  // keyboard navigation for modal (left/right arrows)
  useEffect(() => {
    const handler = (e) => {
      if (!isModalOpen) return
      if (e.key === 'ArrowLeft') {
        navigateModalArc('prev')
      } else if (e.key === 'ArrowRight') {
        navigateModalArc('next')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isModalOpen, selectedArcForModal])

  const handleResetCamera = () => {
    setFollowShip(false)
    if (controlsRef.current) controlsRef.current.enabled = true
    if (cameraRef.current) {
      cameraRef.current.position.set(8, 8, 12)
      cameraRef.current.lookAt(new THREE.Vector3(0, 0, 0))
    }
  }

  const handleZoom = (direction) => {
    if (followShip) {
      setFollowOffsetScale((s) => Math.max(0.4, Math.min(2, s + (direction === 'in' ? -0.1 : 0.1))))
      return
    }
    if (controlsRef.current && controlsRef.current.dollyIn) {
      const zoomScale = 0.92
      if (direction === 'in') {
        controlsRef.current.dollyIn(zoomScale)
      } else {
        controlsRef.current.dollyOut(zoomScale)
      }
      controlsRef.current.update()
    }
  }

  return (
    <div className="scene-wrapper">
      <IslandList arcs={arcData} onSelect={handleIslandSelect} />
      <button type="button" className="dashboard-button" onClick={openDashboard} aria-label="Open dashboard">
        Dashboard
      </button>
      <Dashboard arcs={arcData} open={dashboardOpen} onClose={closeDashboard} onSelect={(a) => {
        handleIslandSelect(a)
        closeDashboard()
      }} />
      <Canvas
        shadows
        camera={{
          position: [8, 8, 12],
          fov: 50,
          near: 0.1,
          far: 400,
        }}
        onCreated={({ camera }) => {
          cameraRef.current = camera
        }}
      >
        <SceneContent
          onArcChange={setCurrentArc}
          followShip={followShip}
          controlsRef={controlsRef}
          pathPoints={pathPoints}
          isPlaying={isPlaying}
          progress={progress}
          onProgressChange={handleProgressChange}
          mode={mode}
          onMarkerClick={handleMarkerClick}
          followOffsetScale={followOffsetScale}
          shipSpeed={shipSpeed}
        />
      </Canvas>

      {/* popup toasts */}
      <div className="journey-toast-container">
        {toasts.map((t) => (
          <JourneyToast key={t.id} item={t} />
        ))}
      </div>

      {currentArc ? (
        <div
          className="hero-card"
          onClick={() => {
            if (isPlaying) {
              setIsPlaying(false)
              setMode('manual')
              setFollowShip(false)
            }
            setSelectedArcForModal(currentArc)
            setIsModalOpen(true)
          }}
        >
          <div className="hero-title">{currentArc.label}</div>
          <div className="hero-sub">
            <span className="hero-saga">{currentArc.saga}</span>
            <span className="hero-episodes">
              Episodes: {currentArc.startEpisode} – {currentArc.endEpisode} ({currentArc.episodeCount})
            </span>
          </div>
        </div>
      ) : null}

      <div className="controls-layer">
        <div className="control-buttons left">
          <button type="button" className="control-button" onClick={handlePlayPause}>
            {mode === 'autoplay' && isPlaying ? <FiPause /> : <FiPlay />}
          </button>
        </div>

        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={handleSliderChange}
            className="timeline-slider"
          />
        </div>
      </div>

      <div className="top-right-controls">
        <button type="button" className="icon-button" onClick={() => handleZoom('in')} title="Zoom in" aria-label="Zoom in">
          <FiZoomIn />
        </button>
        <button type="button" className="icon-button" onClick={() => handleZoom('out')} title="Zoom out" aria-label="Zoom out">
          <FiZoomOut />
        </button>
        <button type="button" className="icon-button" onClick={handleResetCamera} title="Reset camera" aria-label="Reset camera">
          <FiRefreshCw />
        </button>
      </div>

      {mode === 'manual' && isModalOpen && selectedArcForModal ? (
        <div className="modal-backdrop" onClick={closeModalAndResetControls}>
          <div
            className="arc-modal arc-modal-v2"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <button
              type="button"
              aria-label="Previous arc"
              className="modal-nav modal-nav-left"
              onClick={() => navigateModalArc('prev')}
            >
              ‹
            </button>
            
            {/* Compact Header */}
            <div className="modal-header-v2">
              <div className="modal-title-row">
                <div className="modal-title-block">
                  <div className="modal-title">{selectedArcForModal.label}</div>
                  <div className="modal-meta">
                    <span className="modal-saga-badge">{selectedArcForModal.saga}</span>
                    <span className="modal-ep-badge">Ep. {selectedArcForModal.startEpisode}–{selectedArcForModal.endEpisode}</span>
                  </div>
                </div>
                <button type="button" className="modal-close" onClick={closeModalAndResetControls}>✕</button>
              </div>
            </div>

            {/* Hero Stats Row */}
            <div className="modal-hero-stats">
              <div className="hero-stat hero-stat-rating">
                <div className="hero-stat-value">{selectedArcForModal.rating?.toFixed(1) || '—'}</div>
                <div className="hero-stat-label">Rating</div>
                <div className="hero-stat-bar">
                  <div className="hero-stat-fill" style={{ width: `${(selectedArcForModal.rating / 10) * 100}%` }} />
                </div>
              </div>
              <div className="hero-stat hero-stat-emotion">
                <div className="hero-stat-value">{selectedArcForModal.emotionalImpact?.toFixed(1) || '—'}</div>
                <div className="hero-stat-label">Emotion</div>
                <div className="hero-stat-bar">
                  <div className="hero-stat-fill" style={{ width: `${(selectedArcForModal.emotionalImpact / 10) * 100}%` }} />
                </div>
              </div>
              <div className="hero-stat hero-stat-action">
                <div className="hero-stat-value">{selectedArcForModal.actionIntensity?.toFixed(1) || '—'}</div>
                <div className="hero-stat-label">Action</div>
                <div className="hero-stat-bar">
                  <div className="hero-stat-fill" style={{ width: `${(selectedArcForModal.actionIntensity / 10) * 100}%` }} />
                </div>
              </div>
              <div className="hero-stat hero-stat-fan">
                <div className="hero-stat-value">{selectedArcForModal.fanFavorite || '—'}%</div>
                <div className="hero-stat-label">Fan Score</div>
                <div className="hero-stat-bar">
                  <div className="hero-stat-fill" style={{ width: `${selectedArcForModal.fanFavorite}%` }} />
                </div>
              </div>
            </div>

            {/* Quick Stat Pills */}
            <div className="modal-stat-pills">
              <div className="stat-pill">
                <span className="pill-icon">📺</span>
                <span className="pill-value">{selectedArcForModal.episodeCount}</span>
                <span className="pill-label">Episodes</span>
              </div>
              <div className="stat-pill">
                <span className="pill-icon">📖</span>
                <span className="pill-value">{(selectedArcForModal.mangaChapters?.[1] - selectedArcForModal.mangaChapters?.[0] + 1) || '—'}</span>
                <span className="pill-label">Chapters</span>
              </div>
              <div className="stat-pill">
                <span className="pill-icon">😈</span>
                <span className="pill-value">{selectedArcForModal.newDevilFruits || 0}</span>
                <span className="pill-label">Devil Fruits</span>
              </div>
              <div className="stat-pill">
                <span className="pill-icon">🔄</span>
                <span className="pill-value">{selectedArcForModal.plotTwists || 0}</span>
                <span className="pill-label">Plot Twists</span>
              </div>
              <div className="stat-pill" data-impact={selectedArcForModal.worldImpact?.toLowerCase()}>
                <span className="pill-icon">🌍</span>
                <span className="pill-value">{selectedArcForModal.worldImpact}</span>
                <span className="pill-label">Impact</span>
              </div>
            </div>

            {/* Pacing & Risk Bars */}
            <div className="modal-meter-row">
              <div className="modal-meter">
                <div className="meter-header">
                  <span className="meter-label">⏱️ Anime Pacing</span>
                  <span className="meter-value" data-quality={selectedArcForModal.animePacing >= 0.65 ? 'good' : selectedArcForModal.animePacing >= 0.5 ? 'ok' : 'slow'}>
                    {selectedArcForModal.animePacing >= 0.65 ? 'Great' : selectedArcForModal.animePacing >= 0.5 ? 'Decent' : 'Slow'}
                  </span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill meter-fill-pacing" style={{ width: `${(selectedArcForModal.animePacing || 0.5) * 100}%` }} />
                </div>
              </div>
              <div className="modal-meter">
                <div className="meter-header">
                  <span className="meter-label">⚔️ Crew Risk</span>
                  <span className="meter-value">{Math.round((selectedArcForModal.crewRisk || 0) * 100)}%</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill meter-fill-risk" style={{ width: `${(selectedArcForModal.crewRisk || 0) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Arc Dashboard with visualizations */}
            <ArcDashboard arc={selectedArcForModal} expanded={true} />

            {/* Collapsible Summary */}
            {selectedArcForModal.summary && (
              <details className="modal-details">
                <summary>📜 Story Summary</summary>
                <p>{selectedArcForModal.summary}</p>
              </details>
            )}

            <button
              type="button"
              aria-label="Next arc"
              className="modal-nav modal-nav-right"
              onClick={() => navigateModalArc('next')}
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Scene
