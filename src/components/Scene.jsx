import { OrbitControls, Stars, Billboard } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useState, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { FiZoomIn, FiZoomOut, FiRefreshCw, FiPlay, FiPause } from 'react-icons/fi'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { arcs } from '../data/arcs'
import { arcData } from '../data/arcData'
import IslandList from './IslandList'
import RoutePath from './RoutePath'
import WorldGlobe from './WorldGlobe'
import MovingShip from './MovingShip'
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

export function Scene() {
  const [currentArc, setCurrentArc] = useState(null)
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

  const handleProgressChange = useCallback(
    (value) => {
      setProgress(value)
    },
    [setProgress],
  )

  const handlePlayPause = () => {
    if (mode === 'manual') {
      setMode('autoplay')
      setIsPlaying(true)
      setFollowShip(true)
    } else {
      setIsPlaying(false)
      setMode('manual')
      setFollowShip(false)
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
        />
      </Canvas>

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
            className="arc-modal"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="modal-header">
              <div>
                <div className="modal-title">{selectedArcForModal.label}</div>
                <div className="modal-saga">{selectedArcForModal.saga}</div>
              </div>
              <button type="button" className="modal-close" onClick={closeModalAndResetControls}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-episodes">
                Episodes: {selectedArcForModal.startEpisode} – {selectedArcForModal.endEpisode} (
                {selectedArcForModal.episodeCount})
              </div>
              {selectedArcForModal.summary ? (
                <div className="modal-summary">{selectedArcForModal.summary}</div>
              ) : null}

              {selectedArcForModal.keyEvents?.length ? (
                <div className="modal-section">
                  <div className="modal-section-title">Key events</div>
                  <ul>
                    {selectedArcForModal.keyEvents.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {selectedArcForModal.highlightCharacters?.length ? (
                <div className="modal-section">
                  <div className="modal-section-title">Highlight characters</div>
                  <ul>
                    {selectedArcForModal.highlightCharacters.map(({ name, role, epithet, bountyDuringArc }) => (
                      <li key={name}>
                        <strong>{name}</strong> — {role}
                        {epithet ? ` (${epithet})` : ''}
                        {bountyDuringArc ? ` • Bounty: ${new Intl.NumberFormat('en-US').format(bountyDuringArc)}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="modal-metrics">
                <span>Weight: {(selectedArcForModal.narrativeWeight ?? 0).toFixed(2)}</span>
                <span>Risk: {(selectedArcForModal.crewRisk ?? 0).toFixed(2)}</span>
                <span>Impact: {selectedArcForModal.worldImpact}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Scene
