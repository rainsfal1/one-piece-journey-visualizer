import React, { useEffect, useRef } from 'react'

export default function JourneyToast({ item }) {
  if (!item) return null

  // attempt to build a static asset URL for the crew image
  let imgUrl = null
  try {
    // images are located under `src/assets/img` in this project
    imgUrl = new URL(`../assets/img/${item.id}.png`, import.meta.url).href
  } catch (e) {
    imgUrl = null
  }

  // build audio URL for popup sound
  let audioUrl = null
  try {
    // audio assets live under src/assets/audio
    audioUrl = new URL(`../assets/audio/wow.mp3`, import.meta.url).href
  } catch (e) {
    audioUrl = null
  }

  const initials = (item.name || '')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')

  const audioRef = useRef(null)

  useEffect(() => {
    if (!audioUrl) return undefined
    try {
      const a = new Audio(audioUrl)
      a.volume = 0.9
      // play once when toast mounts; ignore promise rejections
      const p = a.play()
      audioRef.current = a
      if (p && typeof p.then === 'function') p.catch(() => {})
    } catch (e) {
      // ignore audio errors
    }

    return () => {
      try {
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.src = ''
          audioRef.current = null
        }
      } catch (err) {
        // ignore cleanup errors
      }
    }
  }, [audioUrl])

  return (
    <div className="journey-toast" role="status" aria-live="polite">
      <div className="journey-body">
        <div className="journey-name">{item.name}</div>
        <div className="journey-sub">Joined • {item.role} • Ep {item.episode}</div>
      </div>
      <div className="journey-avatar">
        {imgUrl ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={imgUrl} alt={`${item.name} avatar`} />
        ) : (
          <span className="journey-initials">{initials}</span>
        )}
      </div>
    </div>
  )
}
