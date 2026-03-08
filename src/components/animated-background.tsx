'use client'
import { useEffect, useRef, useState } from 'react'

/**
 * Background com vídeo em tela cheia
 * Usa o arquivo public/small-vecteezy_dark-blue-dramatic-background-with-smoke-clouds_27989987_small.mp4
 */
export function AnimatedBackground() {
  const [failed, setFailed] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    const id = setTimeout(() => {
      if (isMountedRef.current) {
        setShouldLoad(true)
      }
    }, 150)
    return () => {
      isMountedRef.current = false
      clearTimeout(id)
    }
  }, [])

  const handleMediaError = () => {
    if (isMountedRef.current) {
      setFailed(true)
    }
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {shouldLoad && !failed ? (
        <video
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/Frame 4.png"
          onError={handleMediaError}
          onAbort={handleMediaError}
        >
          <source src="/small-vecteezy_dark-blue-dramatic-background-with-smoke-clouds_27989987_small.mp4" type="video/mp4" />
          <source src="/small-vecteezy_orange.mp4" type="video/mp4" />
        </video>
      ) : (
        <div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(1200px 600px at 60% 20%, rgba(80,120,255,0.25), transparent 60%), linear-gradient(180deg, #0b0b0c 0%, #0b0b0c 60%, #0b0b0c 100%)',
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-black/25" />
    </div>
  )
}
