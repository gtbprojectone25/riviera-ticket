'use client'

import { useEffect, useRef, useState, useMemo, type PointerEvent } from 'react'
import { cn } from '@/lib/utils'

export type TicketCard3DProps = {
  type: 'STANDARD' | 'VIP'
  orderId: string
  movie: string
  date: string
  time: string
  seat: string
  cinema: string
  cinemaAddress?: string
  barcode?: string
  barcodeBlurred?: string
  screenType?: string
  className?: string
}

const isBarcodeImage = (value?: string) =>
  !!value && /^(data:|https?:|\/)/i.test(value)

// ── Letras "r"/"R" cursivas holográficas espalhadas ──────────────────────────
function HoloLetters() {
  const items = useMemo(
    () =>
      Array.from({ length: 140 }, (_, i) => ({
        left: `${(((i * 16.18 + (i % 7) * 3.14 + 5) % 94) + 2).toFixed(2)}%`,
        top: `${(((i * 9.31 + (i % 5) * 7.2 + 3) % 94) + 2).toFixed(2)}%`,
        size: 6 + (i % 7) * 2.5,
        rotate: (i * 47 + (i % 4) * 23) % 360,
        opacity: 0.10 + (i % 9) * 0.016,
        char: i % 4 === 0 ? 'R' : 'r',
      })),
    [],
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: item.left,
            top: item.top,
            fontSize: item.size,
            transform: `rotate(${item.rotate}deg)`,
            opacity: item.opacity,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: 'italic',
            fontWeight: 'bold',
            background:
              'linear-gradient(135deg, #ff6ec4 0%, #a78bfa 20%, #38bdf8 40%, #34d399 60%, #fbbf24 80%, #ff6ec4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {item.char}
        </span>
      ))}
    </div>
  )
}

// ── Recortes laterais — aceita posição customizada ───────────────────────────
function Cutouts({ top = '50%' }: { top?: string }) {
  return (
    <>
      <div
        className="pointer-events-none absolute left-0 z-10 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B0F1A]"
        style={{ top }}
      />
      <div
        className="pointer-events-none absolute right-0 z-10 h-10 w-10 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B0F1A]"
        style={{ top }}
      />
    </>
  )
}

// ── Overlay holográfico animado ───────────────────────────────────────────────
function HoloOverlay({ intense = false }: { intense?: boolean }) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'linear-gradient(135deg, rgba(255,110,196,0.25) 0%, rgba(167,139,250,0.25) 20%, rgba(56,189,248,0.25) 40%, rgba(52,211,153,0.2) 60%, rgba(251,191,36,0.25) 80%, rgba(255,110,196,0.25) 100%)',
        backgroundSize: '300% 300%',
        animation: 'holoShift 6s ease infinite',
        opacity: intense ? 0.55 : 0.35,
        mixBlendMode: 'overlay',
      }}
    />
  )
}

// ── Barcode SVG realista ──────────────────────────────────────────────────────
// Padrão fixo de larguras de barras (alternando barra/espaço) — simula EAN/Code128
const BAR_PATTERN = [
  2,1,2,3,1,1,2,1,3,1,1,2,1,1,4,1,2,1,1,2,
  3,1,1,3,2,1,1,2,4,1,1,2,1,3,1,2,1,1,2,1,
  1,3,2,1,1,4,1,1,2,1,3,1,1,2,1,2,3,1,1,2,
  1,1,4,1,2,1,1,3,1,2,1,1,2,1,3,1,2,2,1,1,
  4,1,1,2,1,2,1,1,3,1,2,1,4,1,1,1,2,1,3,2,
]

function BarcodeStripes({ dark }: { dark: boolean }) {
  const totalUnits = BAR_PATTERN.reduce((a, b) => a + b, 0)
  const barColor = dark ? 'rgba(220,228,255,0.82)' : 'rgba(10,14,30,0.80)'
  const gapColor = dark ? 'rgba(10,14,30,0)' : 'rgba(255,255,255,0)'

  // Constrói os stops do gradiente
  const stops: string[] = []
  let pos = 0
  BAR_PATTERN.forEach((w, i) => {
    const pct1 = ((pos / totalUnits) * 100).toFixed(3)
    const pct2 = (((pos + w) / totalUnits) * 100).toFixed(3)
    const color = i % 2 === 0 ? barColor : gapColor
    stops.push(`${color} ${pct1}%`, `${color} ${pct2}%`)
    pos += w
  })

  return (
    <div
      className="h-16 w-full rounded-sm"
      style={{
        backgroundImage: `linear-gradient(90deg, ${stops.join(', ')})`,
      }}
    />
  )
}

// ── Campo estilo Figma ────────────────────────────────────────────────────────
function FigmaField({ label, value, vip }: { label: string; value: string; vip: boolean }) {
  return (
    <div className="space-y-0.5">
      <p
        className="text-[10px] uppercase tracking-[0.12em]"
        style={{ color: vip ? 'rgba(255,255,255,0.45)' : '#6B7280' }}
      >
        {label}
      </p>
      <p
        className="text-sm font-semibold leading-tight"
        style={{ color: vip ? '#FFFFFF' : '#111827' }}
      >
        {value}
      </p>
    </div>
  )
}

// ── Info field (mantido para compatibilidade) ─────────────────────────────────
function Info({ label, value, vip }: { label: string; value: string; vip: boolean }) {
  return (
    <div className="space-y-1">
      <p className={cn('text-[10px] uppercase tracking-[0.14em]', vip ? 'text-gray-400' : 'text-gray-500')}>
        {label}
      </p>
      <p className={cn('text-sm font-semibold', vip ? 'text-white' : 'text-gray-900')}>
        {value}
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export function TicketCard3D({
  type,
  orderId,
  movie,
  date,
  time,
  seat,
  cinema,
  cinemaAddress,
  barcode,
  barcodeBlurred,
  screenType,
  className,
}: TicketCard3DProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  // Ângulo acumulado total da rotação (base + drag)
  const angleOffsetRef = useRef(0)
  const lastDragXRef = useRef(0)
  const isDragging = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const isVip = type === 'VIP'
  const barcodeSource = barcodeBlurred || barcode
  const showBarcodeImage = isBarcodeImage(barcodeSource)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setPrefersReducedMotion(media.matches)
    handleChange()
    if (media.addEventListener) {
      media.addEventListener('change', handleChange)
      return () => media.removeEventListener('change', handleChange)
    }
    media.addListener(handleChange)
    return () => media.removeListener(handleChange)
  }, [])

  // ── Animação contínua, baseada em tempo real (sem gargalo de frames) ────────
  useEffect(() => {
    if (prefersReducedMotion) {
      if (cardRef.current) {
        cardRef.current.style.transform = 'rotateX(0deg) rotateY(0deg)'
      }
      return
    }

    let rafId = 0
    let startTime = 0

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime // ms desde o início

      // Rotação base: 360° a cada 8 segundos (tempo-real = sem gargalo)
      const baseAngle = (elapsed / 8000) * 360

      // Inclinação sutil pulsante no eixo X
      const tiltX = Math.sin(elapsed / 3200) * 4

      // Ângulo total = base contínua + offset acumulado pelo drag
      const totalAngle = baseAngle + angleOffsetRef.current

      if (cardRef.current) {
        cardRef.current.style.transform =
          `rotateX(${tiltX}deg) rotateY(${totalAngle}deg)`
      }

      rafId = window.requestAnimationFrame(animate)
    }

    rafId = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(rafId)
  }, [prefersReducedMotion])

  // ── Drag: apenas adiciona ao ângulo acumulado, nunca para a rotação ─────────
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    isDragging.current = true
    lastDragXRef.current = e.clientX
    setDragging(true)
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return
    e.preventDefault()
    const delta = (e.clientX - lastDragXRef.current) * 0.6
    angleOffsetRef.current += delta
    lastDragXRef.current = e.clientX
  }

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    isDragging.current = false
    setDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handlePointerCancel = () => {
    isDragging.current = false
    setDragging(false)
  }

  // ── Estilos das faces ─────────────────────────────────────────────────────
  const frontBg = isVip
    ? 'from-[#0A0E1C] via-[#141B2E] to-[#0F1524]'
    : 'from-white via-[#F8F9FF] to-[#EEF2FF]'
  const frontBorder = isVip ? 'border-[#2563EB]/20' : 'border-[#2563EB]/15'
  const frontShadow = isVip
    ? '0 24px 60px rgba(37,99,235,0.35), 0 8px 16px rgba(0,0,0,0.5)'
    : '0 20px 50px rgba(37,99,235,0.18), 0 8px 16px rgba(15,23,42,0.12)'
  const backBg = isVip
    ? 'from-[#050810] via-[#0A0E1C] to-[#060A16]'
    : 'from-[#F0F4FF] via-white to-[#E8EDFF]'

  return (
    <>
      <style>{`
        @keyframes holoShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes holoBigR {
          0%   { filter: hue-rotate(0deg)   brightness(1.05); }
          50%  { filter: hue-rotate(200deg) brightness(1.3); }
          100% { filter: hue-rotate(360deg) brightness(1.05); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes holoGlow {
          0%, 100% { opacity: 0.45; }
          50%      { opacity: 0.85; }
        }
      `}</style>

      <div
        className={cn(
          'relative select-none touch-pan-y',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
          className,
        )}
        style={{ perspective: '1000px', touchAction: dragging ? 'none' : 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerCancel}
        onPointerCancel={handlePointerCancel}
      >
        {/* Container 3D — pivot da rotação */}
        <div
          ref={cardRef}
          className="relative mx-auto w-full max-w-[280px] will-change-transform"
          style={{ transformStyle: 'preserve-3d', height: '560px' }}
        >
          {/* ══════════════════════════════════════════
              FRENTE — layout Figma
          ══════════════════════════════════════════ */}
          <div
            className={cn(
              'absolute inset-0 overflow-hidden rounded-[18px] border bg-linear-to-br flex flex-col',
              frontBg,
              frontBorder,
              isVip ? 'text-white' : 'text-gray-900',
            )}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              boxShadow: frontShadow,
            }}
          >
            <HoloLetters />
            <HoloOverlay />

            {/* Cutouts posicionados na linha do separador (~67% do topo) */}
            <Cutouts top="67%" />

            {/* ── Cabeçalho ─────────────────────────────────────────── */}
            <div className="relative px-5 pt-5 pb-0 flex items-center justify-between">
              <span
                className="text-sm font-black uppercase tracking-[0.18em]"
                style={
                  isVip
                    ? {
                        background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }
                    : { color: '#2563EB' }
                }
              >
                {isVip ? 'VIP' : 'STANDARD'}
              </span>
              <span
                className="text-sm font-bold uppercase tracking-[0.18em]"
                style={{ color: isVip ? 'rgba(255,255,255,0.75)' : '#2563EB' }}
              >
                {screenType || 'IMAX'}
              </span>
            </div>

            {/* Barra gradiente rainbow — fixa, mais grossa */}
            <div
              className="w-full shrink-0 mt-3"
              style={{
                height: 5,
                background:
                  'linear-gradient(90deg, #7B2FFF 0%, #4F8EFF 20%, #38CFFF 38%, #8BFFC8 52%, #FFD580 68%, #FF8C42 82%, #FF4E50 100%)',
              }}
            />

            {/* ── Campos de informação ───────────────────────────────── */}
            <div className="relative px-5 pt-4 space-y-3 flex-1">

              {/* Order ID — largura total */}
              <FigmaField label="Order ID" value={`#${orderId}`} vip={isVip} />

              {/* Movie + Date */}
              <div className="grid grid-cols-2 gap-x-3">
                <FigmaField label="Movie" value={movie} vip={isVip} />
                <FigmaField label="Date" value={date} vip={isVip} />
              </div>

              {/* Seat + Time */}
              <div className="grid grid-cols-2 gap-x-3">
                <FigmaField label="Seat" value={seat} vip={isVip} />
                <FigmaField label="Time" value={time} vip={isVip} />
              </div>

              {/* Exhibition location */}
              <div className="space-y-0.5 pt-1">
                <p
                  className="text-[10px] uppercase tracking-[0.14em]"
                  style={{ color: isVip ? 'rgba(255,255,255,0.45)' : '#6B7280' }}
                >
                  Exhibition location
                </p>
                <p
                  className="text-base font-bold leading-snug"
                  style={{ color: isVip ? '#FFFFFF' : '#111827' }}
                >
                  {cinema}
                </p>
                {cinemaAddress && (
                  <p
                    className="text-[10px] leading-tight mt-0.5"
                    style={{ color: isVip ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}
                  >
                    {cinemaAddress}
                  </p>
                )}
              </div>
            </div>

            {/* ── Separador pontilhado ───────────────────────────────── */}
            <div
              className="relative mx-0 shrink-0"
              style={{ marginTop: 'auto', paddingTop: 12 }}
            >
              <div
                className="w-full"
                style={{
                  borderTop: `1px dashed ${isVip ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'}`,
                }}
              />
            </div>

            {/* ── Barcode ───────────────────────────────────────────── */}
            <div className="relative px-5 pt-4 pb-4 shrink-0 space-y-2">
              <div
                className="relative overflow-hidden rounded-lg px-3 py-3"
                style={{
                  background: isVip ? 'rgba(12,16,28,0.90)' : 'rgba(245,247,255,0.95)',
                  border: isVip
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,0,0,0.08)',
                }}
              >
                {/* Barcode — levemente visível por baixo */}
                <div style={{ filter: 'blur(2px)', opacity: 0.72 }}>
                  {showBarcodeImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={barcodeSource}
                      alt="Barcode"
                      className="h-16 w-full object-cover rounded"
                    />
                  ) : (
                    <BarcodeStripes dark={isVip} />
                  )}
                </div>

                {/* Camada glass sobre o barcode */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-lg"
                  style={{
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    background: isVip
                      ? 'linear-gradient(135deg, rgba(30,40,70,0.32) 0%, rgba(15,20,45,0.28) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(230,235,255,0.28) 100%)',
                  }}
                />

                {/* Brilho glass no topo */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-lg"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)',
                  }}
                />
              </div>
              <p
                className="text-[9px] leading-relaxed text-center"
                style={{ color: isVip ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}
              >
                The barcode is for demonstration purposes only.{'\n'}
                For greater security, the official code will be made available{'\n'}
                2 weeks before the premiere date.
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              VERSO — grande "R" Riviera holográfico
          ══════════════════════════════════════════ */}
          <div
            className={cn(
              'absolute inset-0 overflow-hidden rounded-[18px] border bg-linear-to-br',
              backBg,
              frontBorder,
            )}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              boxShadow: frontShadow,
            }}
          >
            <HoloLetters />
            <HoloOverlay intense />

            {/* Glow radial central */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 45%, rgba(167,139,250,0.25) 0%, transparent 65%)',
              }}
            />

            <Cutouts />

            {/* Conteúdo central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              {/* Grande R holográfico */}
              <div style={{ position: 'relative', lineHeight: 1 }}>
                {/* Camada glow/blur */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: 190,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: 'italic',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: '#a78bfa',
                    filter: 'blur(30px)',
                    opacity: 0.6,
                    userSelect: 'none',
                    pointerEvents: 'none',
                    animation: 'holoGlow 3s ease-in-out infinite',
                  }}
                >
                  R
                </span>
                {/* R principal */}
                <span
                  style={{
                    fontSize: 190,
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontStyle: 'italic',
                    fontWeight: 900,
                    lineHeight: 1,
                    display: 'block',
                    background:
                      'linear-gradient(135deg, #ff6ec4 0%, #a78bfa 18%, #38bdf8 36%, #34d399 54%, #fbbf24 72%, #f472b6 90%, #ff6ec4 100%)',
                    backgroundSize: '300% 300%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation:
                      'holoShift 3s ease infinite, holoBigR 7s linear infinite',
                    userSelect: 'none',
                  }}
                >
                  R
                </span>
              </div>

              {/* Nome + divisória */}
              <div className="flex flex-col items-center gap-2">
                <p
                  style={{
                    letterSpacing: '0.55em',
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background:
                      'linear-gradient(135deg, #ff6ec4, #a78bfa, #38bdf8, #fbbf24)',
                    backgroundSize: '200% 200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    animation: 'holoShift 5s ease infinite',
                  }}
                >
                  RIVIERA
                </p>
                <div
                  style={{
                    width: 80,
                    height: 1,
                    background:
                      'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)',
                  }}
                />
              </div>
            </div>

            {/* Número do pedido no rodapé */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: isVip ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
                  fontFamily: 'monospace',
                }}
              >
                N.º {orderId}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
