'use client'

/**
 * Background com vídeo em tela cheia
 * Usa o arquivo public/small-vecteezy_dark-blue-dramatic-background-with-smoke-clouds_27989987_small.mp4
 */
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <video
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/small-vecteezy_dark-blue-dramatic-background-with-smoke-clouds_27989987_small.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-black/25" />
    </div>
  )
}
