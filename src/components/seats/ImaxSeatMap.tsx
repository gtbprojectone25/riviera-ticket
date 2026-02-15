'use client'

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Accessibility, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { ScreenArc } from './ScreenArc'
import {
  buildImaxLayout,
  type ImaxSeatRowInput,
  type SeatRenderNode,
  type SpacerNode,
} from './layout/imaxLayout'
import type { SeatUiState } from '@/app/seat-selection/useSeatSelectionManager'

type ImaxSeatMapProps = {
  rows: ImaxSeatRowInput[]
  selectedSeatIds: string[]
  onSeatToggle: (seatId: string) => void
  allowedTypes?: string[]
  maxSelectable?: number
  seatUiStates?: Map<string, SeatUiState>
  currentCartId?: string | null
  debugLayout?: boolean
  debug?: boolean
}

const MIN_SCALE = 0.7
const MAX_SCALE = 2.2
const PAN_MARGIN = 24
const GHOST_TAP_BLOCK_MS = 150

function formatHeldUntil(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isSeatTypeAllowed(type: string, allowedTypes: string[]) {
  if (allowedTypes.length === 0) return true
  if (allowedTypes.includes(type)) return true
  if (type === 'WHEELCHAIR' && allowedTypes.includes('STANDARD')) return true
  if (type === 'PREMIUM' && allowedTypes.includes('STANDARD')) return true
  return false
}

function seatVisual(node: SeatRenderNode) {
  if (node.status === 'SOLD') return { bg: 'bg-zinc-800', fg: 'text-zinc-300', blocked: true }
  if (node.status === 'HELD') return { bg: 'bg-zinc-500', fg: 'text-zinc-100', blocked: true }
  if (node.type === 'VIP') return { bg: 'bg-violet-600', fg: 'text-violet-100', blocked: false }
  if (node.type === 'WHEELCHAIR') return { bg: 'bg-sky-700', fg: 'text-sky-100', blocked: false }
  return { bg: 'bg-sky-500', fg: 'text-sky-100', blocked: false }
}

const SeatButton = memo(function SeatButton({
  node,
  selected,
  disabled,
  disabledReason,
  onToggle,
  debug,
}: {
  node: SeatRenderNode
  selected: boolean
  disabled: boolean
  disabledReason: 'SOLD' | 'HELD' | 'NO_SLOT' | null
  onToggle: (id: string) => void
  debug?: boolean
}) {
  const visual = seatVisual(node)
  const heldText = formatHeldUntil(node.heldUntil)
  const seatLabel = node.seatCode
  const statusText =
    disabledReason === 'SOLD'
      ? 'unavailable'
      : disabledReason === 'HELD'
        ? 'held'
        : disabledReason === 'NO_SLOT'
          ? 'no matching ticket slot'
          : 'available'
  const debugText = debug
    ? ` | id=${node.dbId} seat_id=${node.seatCode} status=${node.status} type=${node.type}`
    : ''
  const title = disabledReason === 'NO_SLOT'
    ? `${seatLabel} · No ticket available for this seat type${debugText}`
    : node.status === 'HELD' && heldText
      ? `${seatLabel} · held until ${heldText}${debugText}`
      : `${seatLabel}${debugText}`

  return (
    <button
      type="button"
      aria-label={`Seat ${seatLabel} ${statusText}`}
      title={title}
      disabled={disabled}
      onClick={() => onToggle(node.seatId)}
      className={[
        'absolute flex h-4 w-4 items-center justify-center rounded-[3px] border border-black/30 text-[8px] font-semibold transition',
        selected ? 'bg-orange-400 text-zinc-950' : disabled ? 'bg-zinc-700 text-zinc-200' : visual.bg,
        selected ? '' : visual.fg,
        disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:brightness-110',
        selected ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-zinc-950' : '',
      ].join(' ')}
      style={{
        transform: `translate(${node.x}px, ${node.y}px)`,
      }}
    >
      {node.type === 'WHEELCHAIR' ? <Accessibility className="h-2.5 w-2.5" aria-hidden="true" /> : null}
    </button>
  )
})

function CorridorLayer({
  spacers,
  debugLayout,
}: {
  spacers: SpacerNode[]
  debugLayout: boolean
}) {
  return (
    <>
      {spacers.map((spacer) => (
        <div
          key={spacer.id}
          aria-hidden="true"
          className={[
            'absolute rounded-sm',
            spacer.kind === 'corridor' ? 'bg-zinc-700/15' : 'bg-zinc-800/20',
            debugLayout && spacer.kind === 'corridor' ? 'ring-1 ring-orange-400/60' : '',
          ].join(' ')}
          style={{
            transform: `translate(${spacer.x}px, ${spacer.y}px)`,
            width: spacer.width,
            height: spacer.height,
          }}
        />
      ))}
    </>
  )
}

export function ImaxSeatMap({
  rows,
  selectedSeatIds,
  onSeatToggle,
  allowedTypes = [],
  maxSelectable = 6,
  seatUiStates,
  debugLayout = false,
  debug = false,
}: ImaxSeatMapProps) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [legendOpen, setLegendOpen] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const didPanRef = useRef(false)
  const isPinchingRef = useRef(false)
  const suppressTapUntilRef = useRef(0)
  const lockedScrollRef = useRef(false)
  const prevBodyStylesRef = useRef<{ overflow: string; touchAction: string } | null>(null)
  const hasAutoCenteredRef = useRef(false)

  const layout = useMemo(() => buildImaxLayout(rows), [rows])

  const selectedNodes = useMemo(
    () => layout.seatNodes.filter((node) => selectedSeatIds.includes(node.seatId)),
    [layout.seatNodes, selectedSeatIds],
  )
  const statusCounts = useMemo(
    () =>
      layout.seatNodes.reduce<Record<string, number>>((acc, node) => {
        acc[node.status] = (acc[node.status] ?? 0) + 1
        return acc
      }, {}),
    [layout.seatNodes],
  )
  const typeCounts = useMemo(
    () =>
      layout.seatNodes.reduce<Record<string, number>>((acc, node) => {
        const key = String(node.type)
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {}),
    [layout.seatNodes],
  )

  const padX = 48
  const padY = 24
  const stageWidth = layout.bounds.width + padX * 2
  const stageHeight = layout.bounds.height + padY * 2 + 12

  const normalizeX = useCallback((x: number) => x - layout.bounds.minX + padX, [layout.bounds.minX])
  const normalizeY = useCallback((y: number) => y - layout.bounds.minY + padY, [layout.bounds.minY])

  const lockPageScroll = useCallback(() => {
    if (lockedScrollRef.current) return
    prevBodyStylesRef.current = {
      overflow: document.body.style.overflow,
      touchAction: document.body.style.touchAction,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    lockedScrollRef.current = true
  }, [])

  const unlockPageScroll = useCallback(() => {
    if (!lockedScrollRef.current) return
    const prev = prevBodyStylesRef.current
    document.body.style.overflow = prev?.overflow ?? ''
    document.body.style.touchAction = prev?.touchAction ?? ''
    lockedScrollRef.current = false
  }, [])

  useEffect(() => () => unlockPageScroll(), [unlockPageScroll])

  const clampOffset = useCallback(
    (candidateX: number, candidateY: number, targetScale: number) => {
      const scaledW = stageWidth * targetScale
      const scaledH = stageHeight * targetScale
      const vw = viewportSize.width
      const vh = viewportSize.height

      if (vw === 0 || vh === 0) return { x: candidateX, y: candidateY }

      let x = candidateX
      let y = candidateY

      if (scaledW <= vw) {
        x = (vw - scaledW) / 2
      } else {
        const minX = vw - scaledW - PAN_MARGIN
        const maxX = PAN_MARGIN
        x = Math.max(minX, Math.min(maxX, x))
      }

      if (scaledH <= vh) {
        y = (vh - scaledH) / 2
      } else {
        const minY = vh - scaledH - PAN_MARGIN
        const maxY = PAN_MARGIN
        y = Math.max(minY, Math.min(maxY, y))
      }

      return { x, y }
    },
    [stageHeight, stageWidth, viewportSize.height, viewportSize.width],
  )

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const nextViewport = { width: entry.contentRect.width, height: entry.contentRect.height }
      setViewportSize(nextViewport)

      setOffset((prev) => {
        if (!hasAutoCenteredRef.current) {
          hasAutoCenteredRef.current = true
          return clampOffset(
            (nextViewport.width - stageWidth) / 2,
            (nextViewport.height - stageHeight) / 2,
            1,
          )
        }
        return clampOffset(prev.x, prev.y, scale)
      })
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [clampOffset, scale, stageHeight, stageWidth])

  const applyScaleAt = useCallback(
    (nextScaleRaw: number, focalX: number, focalY: number) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScaleRaw))
      if (nextScale === scale) return
      const ratio = nextScale / Math.max(scale, 0.001)
      const nextX = focalX - (focalX - offset.x) * ratio
      const nextY = focalY - (focalY - offset.y) * ratio
      setScale(nextScale)
      setOffset(clampOffset(nextX, nextY, nextScale))
    },
    [clampOffset, offset.x, offset.y, scale],
  )

  const getDragThreshold = useCallback(() => {
    if (typeof window === 'undefined') return 8
    return window.matchMedia('(pointer: coarse)').matches ? 8 : 4
  }, [])

  const shouldBlockSeatTap = useCallback(() => {
    if (Date.now() < suppressTapUntilRef.current) return true
    if (didPanRef.current) return true
    if (isPinchingRef.current) return true
    return false
  }, [])

  const handleSeatToggleIntent = useCallback(
    (seatId: string) => {
      if (shouldBlockSeatTap()) return
      const seatState = seatUiStates?.get(seatId)
      if (seatState?.disabled) return
      onSeatToggle(seatId)
    },
    [onSeatToggle, seatUiStates, shouldBlockSeatTap],
  )

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    didPanRef.current = false
    activePointerIdRef.current = event.pointerId
    lockPageScroll()
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 1) {
      dragStartRef.current = { x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y }
    }

    if (pointersRef.current.size === 2) {
      isPinchingRef.current = true
      const [a, b] = Array.from(pointersRef.current.values())
      pinchStartRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
      }
    }
  }, [lockPageScroll, offset.x, offset.y, scale])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    const viewportRect = viewportRef.current?.getBoundingClientRect()

    if (pointersRef.current.size === 1 && dragStartRef.current && activePointerIdRef.current === event.pointerId) {
      const deltaX = event.clientX - dragStartRef.current.x
      const deltaY = event.clientY - dragStartRef.current.y
      const dist = Math.hypot(deltaX, deltaY)
      if (dist < getDragThreshold()) return

      didPanRef.current = true
      ;(event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId)
      event.preventDefault()
      setOffset(
        clampOffset(
          dragStartRef.current.offsetX + deltaX,
          dragStartRef.current.offsetY + deltaY,
          scale,
        ),
      )
      return
    }

    if (pointersRef.current.size === 2 && pinchStartRef.current && viewportRect) {
      isPinchingRef.current = true
      event.preventDefault()
      const [a, b] = Array.from(pointersRef.current.values())
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      const nextScale = pinchStartRef.current.scale * (distance / Math.max(pinchStartRef.current.distance, 1))
      const centerX = ((a.x + b.x) / 2) - viewportRect.left
      const centerY = ((a.y + b.y) / 2) - viewportRect.top
      applyScaleAt(nextScale, centerX, centerY)
    }
  }, [applyScaleAt, clampOffset, getDragThreshold, scale])

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchStartRef.current = null
    if (pointersRef.current.size < 2) isPinchingRef.current = false
    if (didPanRef.current) {
      suppressTapUntilRef.current = Date.now() + GHOST_TAP_BLOCK_MS
    }

    if (activePointerIdRef.current === event.pointerId) {
      activePointerIdRef.current = null
    }

    if (pointersRef.current.size === 0) {
      dragStartRef.current = null
      unlockPageScroll()
    }
  }, [unlockPageScroll])

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return
    event.preventDefault()
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const focusX = event.clientX - rect.left
    const focusY = event.clientY - rect.top
    const next = event.deltaY > 0 ? scale - 0.08 : scale + 0.08
    applyScaleAt(next, focusX, focusY)
  }, [applyScaleAt, scale])

  const resetView = useCallback(() => {
    setScale(1)
    setOffset(
      clampOffset(
        (viewportSize.width - stageWidth) / 2,
        (viewportSize.height - stageHeight) / 2,
        1,
      ),
    )
  }, [clampOffset, stageHeight, stageWidth, viewportSize.height, viewportSize.width])

  return (
    <div className="w-full space-y-4 rounded-2xl border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(39,39,42,0.45),rgba(9,9,11,0.98)_54%)] p-3 md:p-4">
      <ScreenArc />

      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-400">
          {selectedNodes.length}/{maxSelectable} selecionados
          {debugLayout ? <span className="ml-2 rounded bg-orange-500/20 px-1.5 py-0.5 text-[10px] text-orange-300">debugLayout</span> : null}
          {debug ? (
            <span className="ml-2 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300">
              status {JSON.stringify(statusCounts)} | type {JSON.stringify(typeCounts)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => applyScaleAt(scale - 0.1, viewportSize.width / 2, viewportSize.height / 2)} className="rounded-md border border-zinc-700 p-1.5 text-zinc-200 hover:bg-zinc-800" aria-label="Diminuir zoom">
            <ZoomOut className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => applyScaleAt(scale + 0.1, viewportSize.width / 2, viewportSize.height / 2)} className="rounded-md border border-zinc-700 p-1.5 text-zinc-200 hover:bg-zinc-800" aria-label="Aumentar zoom">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onClick={resetView} className="rounded-md border border-zinc-700 p-1.5 text-zinc-200 hover:bg-zinc-800" aria-label="Centralizar mapa">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="relative w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/45 h-[50vh] max-h-[520px] sm:h-[60vh] sm:max-h-[680px]"
        onWheel={onWheel}
        style={{ touchAction: 'none' }}
      >
        <div
          className="absolute inset-0 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="absolute will-change-transform transition-transform duration-75"
            style={{
              width: stageWidth,
              height: stageHeight,
              left: 0,
              top: 0,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: 'top left',
              position: 'relative',
            }}
          >
            <CorridorLayer
              spacers={layout.spacerNodes.map((node) => ({
                ...node,
                x: normalizeX(node.x),
                y: normalizeY(node.y),
              }))}
              debugLayout={debugLayout}
            />

            {debugLayout
              ? layout.blockDebugNodes.map((block) => (
                <div
                  key={block.id}
                  className="absolute rounded-sm border border-emerald-400/60 bg-emerald-400/10"
                  style={{
                    transform: `translate(${normalizeX(block.x)}px, ${normalizeY(block.y)}px)`,
                    width: block.width,
                    height: block.height,
                  }}
                />
              ))
              : null}

            {layout.rowLabelNodes.map((label) => (
              <div
                key={`row-label-${label.row}`}
                className="absolute flex h-4 w-4 items-center justify-center rounded-[3px] bg-zinc-800 text-[8px] font-semibold text-zinc-200"
                style={{
                  transform: `translate(${normalizeX(label.x)}px, ${normalizeY(label.y)}px)`,
                }}
              >
                {label.row}
              </div>
            ))}

            {layout.seatNodes.map((node) => {
              const isSelected = selectedSeatIds.includes(node.seatId)
              const fallbackAllowed = isSeatTypeAllowed(String(node.type), allowedTypes)
              const fromManager = seatUiStates?.get(node.seatId)
              const fallbackDisabled = node.status !== 'AVAILABLE' || !fallbackAllowed
              const disabled = fromManager ? fromManager.disabled : fallbackDisabled
              const disabledReason = fromManager
                ? fromManager.reason
                : node.status === 'SOLD'
                  ? 'SOLD'
                  : node.status === 'HELD'
                    ? 'HELD'
                    : !fallbackAllowed
                      ? 'NO_SLOT'
                      : null
              return (
                <SeatButton
                  key={node.seatId}
                  node={{
                    ...node,
                    x: normalizeX(node.x),
                    y: normalizeY(node.y),
                  }}
                  selected={isSelected}
                  disabled={disabled}
                  disabledReason={disabledReason}
                  onToggle={handleSeatToggleIntent}
                  debug={debug}
                />
              )
            })}
          </div>
        </div>
      </div>

      <details className="sm:hidden rounded-lg border border-zinc-800 bg-zinc-900/70" open={legendOpen} onToggle={(e) => setLegendOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-zinc-100">Map legend</summary>
        <div className="grid grid-cols-2 gap-2 px-3 pb-3 text-[11px] text-zinc-300">
          <LegendItem className="bg-violet-600" label="Available (VIP)" />
          <LegendItem className="bg-sky-500" label="Available (Standard)" />
          <LegendItem className="bg-orange-500" label="Selected" />
          <LegendItem className="bg-zinc-700" label="Unavailable" />
          <LegendItem className="bg-zinc-500" label="Reserved" />
          <LegendItem className="bg-sky-700" label="Wheelchair Accessible" icon={<Accessibility className="h-3.5 w-3.5 text-white" />} />
        </div>
      </details>

      <div className="hidden sm:grid grid-cols-2 gap-2 text-[11px] text-zinc-300 lg:grid-cols-3">
        <LegendItem className="bg-violet-600" label="Available (VIP)" />
        <LegendItem className="bg-sky-500" label="Available (Standard)" />
        <LegendItem className="bg-orange-500" label="Selected" />
        <LegendItem className="bg-zinc-700" label="Unavailable" />
        <LegendItem className="bg-zinc-500" label="Reserved" />
        
        <LegendItem className="bg-sky-700" label="Wheelchair Accessible" icon={<Accessibility className="h-3.5 w-3.5 text-white" />} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3">
        <p className="text-xs font-medium text-zinc-100">Selected Seats</p>
        <p className="mt-1 text-xs text-zinc-400">
          {selectedNodes.length > 0
            ? selectedNodes
              .map((node) => node.seatCode)
              .join(', ')
            : 'No seats selected'}
        </p>
        
      </div>
    </div>
  )
}

function LegendItem({
  className,
  label,
  icon,
}: {
  className: string
  label: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-4 w-4 items-center justify-center rounded-sm ${className}`}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

