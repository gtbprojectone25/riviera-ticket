export type ImaxSeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD'
export type ImaxSeatType = 'STANDARD' | 'VIP' | 'WHEELCHAIR' | 'GAP' | 'PREMIUM' | string

export type ImaxSeatInput = {
  id: string
  seatId?: string
  seat_id?: string
  row: string
  number: number
  type: ImaxSeatType
  status: ImaxSeatStatus
  price?: number
  heldUntil?: string | null
  heldByCartId?: string | null
}

export type ImaxSeatRowInput = {
  label: string
  seats: ImaxSeatInput[]
}

export type SeatRenderNode = {
  seatId: string
  seatCode: string
  dbId: string
  row: string
  number: number
  type: ImaxSeatType
  status: ImaxSeatStatus
  price: number
  heldUntil: string | null
  heldByCartId: string | null
  x: number
  y: number
  scale: number
  rowIndex: number
}

export type SpacerNode = {
  id: string
  row: string
  kind: 'corridor' | 'margin'
  x: number
  y: number
  width: number
  height: number
}

export type BlockDebugNode = {
  id: string
  row: string
  block: 'LEFT' | 'CENTER' | 'RIGHT'
  x: number
  y: number
  width: number
  height: number
}

export type RowLabelNode = {
  row: string
  x: number
  y: number
}

export type ImaxLayoutResult = {
  seatNodes: SeatRenderNode[]
  spacerNodes: SpacerNode[]
  rowLabelNodes: RowLabelNode[]
  blockDebugNodes: BlockDebugNode[]
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number }
}

type RowSlot = ImaxSeatInput

type RowBlocks = {
  left: RowSlot[]
  center: RowSlot[]
  right: RowSlot[]
}

const SEAT_UNIT = 18
const FRONT_SCALE = 0.92
const BACK_SCALE = 1.06
const ROW_STEP = 28
const CURVE_STRENGTH = 8
const SIDE_MARGIN = 20

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function sortRows(rows: ImaxSeatRowInput[]) {
  return [...rows].sort((a, b) => a.label.localeCompare(b.label))
}

function sortSeatsByNumber(seats: ImaxSeatInput[]) {
  return [...seats].sort((a, b) => a.number - b.number)
}

function inferBlocks(slots: RowSlot[]): RowBlocks {
  if (slots.length <= 2) return { left: slots, center: [], right: [] }

  let bestGapIdx = -1
  let bestGapDelta = 0
  for (let i = 0; i < slots.length - 1; i += 1) {
    const a = slots[i]
    const b = slots[i + 1]
    const delta = b.number - a.number
    const ratio = i / Math.max(1, slots.length - 1)
    const isMiddle = ratio > 0.2 && ratio < 0.8
    if (isMiddle && delta > bestGapDelta) {
      bestGapDelta = delta
      bestGapIdx = i
    }
  }

  if (bestGapIdx >= 0 && bestGapDelta >= 2) {
    return {
      left: slots.slice(0, bestGapIdx + 1),
      center: [],
      right: slots.slice(bestGapIdx + 1),
    }
  }

  const leftSize = Math.max(1, Math.floor(slots.length * 0.3))
  const centerSize = Math.max(1, Math.floor(slots.length * 0.4))
  const rightSize = Math.max(0, slots.length - leftSize - centerSize)

  return {
    left: slots.slice(0, leftSize),
    center: slots.slice(leftSize, leftSize + centerSize),
    right: slots.slice(leftSize + centerSize, leftSize + centerSize + rightSize),
  }
}

function pushBlockNodes(
  acc: {
    seatNodes: SeatRenderNode[]
    spacerNodes: SpacerNode[]
    blockDebugNodes: BlockDebugNode[]
  },
  rowLabel: string,
  rowIndex: number,
  rowY: number,
  scale: number,
  blocks: RowBlocks,
) {
  const step = SEAT_UNIT * scale
  const gap = 4 * scale
  const corridor = 24 * scale
  const margin = SIDE_MARGIN * scale
  const seatVisual = 14 * scale
  const rowHeight = 18 * scale

  const leftWidth = blocks.left.length > 0 ? blocks.left.length * step + Math.max(0, blocks.left.length - 1) * gap : 0
  const centerWidth = blocks.center.length > 0 ? blocks.center.length * step + Math.max(0, blocks.center.length - 1) * gap : 0
  const rightWidth = blocks.right.length > 0 ? blocks.right.length * step + Math.max(0, blocks.right.length - 1) * gap : 0

  const corridorCount = blocks.center.length > 0 ? 2 : blocks.right.length > 0 ? 1 : 0
  const innerCorridorTotal = corridorCount * corridor
  const totalWidth = margin + leftWidth + innerCorridorTotal + centerWidth + rightWidth + margin
  let cursorX = -totalWidth / 2 + margin

  const placeBlock = (
    block: 'LEFT' | 'CENTER' | 'RIGHT',
    items: RowSlot[],
  ) => {
    if (items.length === 0) return

    const blockStart = cursorX
    const blockWidth = items.length * step + Math.max(0, items.length - 1) * gap
    acc.blockDebugNodes.push({
      id: `${rowLabel}-${block}`,
      row: rowLabel,
      block,
      x: blockStart,
      y: rowY - rowHeight * 0.65,
      width: blockWidth,
      height: rowHeight * 1.2,
    })

    items.forEach((seat, index) => {
      const xBase = blockStart + index * (step + gap) + step / 2
      const xNorm = totalWidth === 0 ? 0 : xBase / (totalWidth / 2)
      const yCurve = CURVE_STRENGTH * (xNorm * xNorm) * scale
      const y = rowY + yCurve

      if (seat.type !== 'GAP') {
        acc.seatNodes.push({
          seatId: seat.id,
          seatCode: seat.seatId ?? seat.seat_id ?? `${rowLabel}-${String(seat.number).padStart(2, '0')}`,
          dbId: seat.id,
          row: rowLabel,
          number: seat.number,
          type: seat.type,
          status: seat.status,
          price: seat.price ?? 0,
          heldUntil: seat.heldUntil ?? null,
          heldByCartId: seat.heldByCartId ?? null,
          x: xBase,
          y,
          scale,
          rowIndex,
        })
      }
    })

    cursorX += blockWidth
  }

  acc.spacerNodes.push({
    id: `${rowLabel}-margin-left`,
    row: rowLabel,
    kind: 'margin',
    x: -totalWidth / 2,
    y: rowY - rowHeight / 2,
    width: margin,
    height: rowHeight,
  })

  placeBlock('LEFT', blocks.left)

  if (blocks.center.length > 0 || blocks.right.length > 0) {
    acc.spacerNodes.push({
      id: `${rowLabel}-corridor-main-a`,
      row: rowLabel,
      kind: 'corridor',
      x: cursorX,
      y: rowY - rowHeight / 2,
      width: corridor,
      height: rowHeight,
    })
    cursorX += corridor
  }

  placeBlock('CENTER', blocks.center)

  if (blocks.center.length > 0 && blocks.right.length > 0) {
    acc.spacerNodes.push({
      id: `${rowLabel}-corridor-main-b`,
      row: rowLabel,
      kind: 'corridor',
      x: cursorX,
      y: rowY - rowHeight / 2,
      width: corridor,
      height: rowHeight,
    })
    cursorX += corridor
  }

  placeBlock('RIGHT', blocks.right)

  acc.spacerNodes.push({
    id: `${rowLabel}-margin-right`,
    row: rowLabel,
    kind: 'margin',
    x: totalWidth / 2 - margin,
    y: rowY - rowHeight / 2,
    width: margin,
    height: rowHeight,
  })

  const corridorHeight = ROW_STEP * 0.95
  acc.spacerNodes.forEach((node) => {
    if (node.row === rowLabel && node.kind === 'corridor') {
      node.height = corridorHeight
      node.y = rowY - corridorHeight / 2
    }
  })

  const seatHalf = seatVisual / 2
  acc.seatNodes.forEach((node) => {
    if (node.row === rowLabel) {
      node.x = Number(node.x.toFixed(3))
      node.y = Number((node.y - seatHalf).toFixed(3))
    }
  })
}

export function buildImaxLayout(rowsInput: ImaxSeatRowInput[]): ImaxLayoutResult {
  const rows = sortRows(rowsInput)
  const seatNodes: SeatRenderNode[] = []
  const spacerNodes: SpacerNode[] = []
  const rowLabelNodes: RowLabelNode[] = []
  const blockDebugNodes: BlockDebugNode[] = []

  rows.forEach((row, rowIndex) => {
    const t = rows.length <= 1 ? 1 : rowIndex / (rows.length - 1)
    const scale = lerp(FRONT_SCALE, BACK_SCALE, t)
    const rowY = rowIndex * ROW_STEP
    const slots = sortSeatsByNumber(row.seats)
    const blocks = inferBlocks(slots)

    pushBlockNodes(
      { seatNodes, spacerNodes, blockDebugNodes },
      row.label,
      rowIndex,
      rowY,
      scale,
      blocks,
    )

    rowLabelNodes.push({
      row: row.label,
      x: Math.min(...seatNodes.filter((s) => s.row === row.label).map((s) => s.x), -180) - 18,
      y: rowY,
    })
  })

  const allX = [
    ...seatNodes.map((n) => n.x),
    ...spacerNodes.map((n) => n.x),
    ...spacerNodes.map((n) => n.x + n.width),
    ...rowLabelNodes.map((n) => n.x),
  ]
  const allY = [
    ...seatNodes.map((n) => n.y),
    ...spacerNodes.map((n) => n.y),
    ...spacerNodes.map((n) => n.y + n.height),
    ...rowLabelNodes.map((n) => n.y),
  ]

  const minX = allX.length ? Math.min(...allX) : 0
  const maxX = allX.length ? Math.max(...allX) : 0
  const minY = allY.length ? Math.min(...allY) : 0
  const maxY = allY.length ? Math.max(...allY) : 0

  return {
    seatNodes,
    spacerNodes,
    rowLabelNodes,
    blockDebugNodes,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    },
  }
}
