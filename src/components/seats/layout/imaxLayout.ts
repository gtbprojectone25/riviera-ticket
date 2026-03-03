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
  _ignoredScale: number,
  blocks: RowBlocks,
) {
  // Use a fixed array length reference (e.g. 14 rows) to stabilize scale progression
  // or pass totalRows from buildImaxLayout
  const scale = lerp(0.92, 1.06, rowIndex / 14) 
  const step = SEAT_UNIT * scale
  const gap = 4 * scale
  const corridor = 24 * scale
  const margin = SIDE_MARGIN * scale
  const rowHeight = 18 * scale

  // Calculate total width first to center everything
  const getBlockWidth = (items: RowSlot[]) => 
    items.length > 0 ? items.length * step + Math.max(0, items.length - 1) * gap : 0

  const leftWidth = getBlockWidth(blocks.left)
  const centerWidth = getBlockWidth(blocks.center)
  const rightWidth = getBlockWidth(blocks.right)

  // Determine number of corridors based on which blocks exist
  let currentCorridors = 0
  if (blocks.left.length > 0 && (blocks.center.length > 0 || blocks.right.length > 0)) currentCorridors++
  if (blocks.center.length > 0 && blocks.right.length > 0) currentCorridors++
  
  const totalContentWidth = leftWidth + centerWidth + rightWidth + (currentCorridors * corridor)
  let cursorX = -totalContentWidth / 2

  const placeBlock = (
    blockType: 'LEFT' | 'CENTER' | 'RIGHT',
    items: RowSlot[],
  ) => {
    if (items.length === 0) return

    const blockWidth = getBlockWidth(items)
    
    // Debug info
    acc.blockDebugNodes.push({
      id: `${rowLabel}-${blockType}`,
      row: rowLabel,
      block: blockType,
      x: cursorX,
      y: rowY - rowHeight * 0.5,
      width: blockWidth,
      height: rowHeight,
    })

    items.forEach((seat, index) => {
      // Position seat relative to start of block
      const xOffset = index * (step + gap) + (step / 2)
      const xBase = cursorX + xOffset
      
      // Calculate curve effect based on distance from center (0)
      // Normalize x to -1...1 range roughly for curve calc
      const xNorm = xBase / 400 
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

  // Place LEFT block
  placeBlock('LEFT', blocks.left)

  // Add corridor after LEFT if there are more blocks
  if (blocks.left.length > 0 && (blocks.center.length > 0 || blocks.right.length > 0)) {
    acc.spacerNodes.push({
      id: `${rowLabel}-corridor-1`,
      row: rowLabel,
      kind: 'corridor',
      x: cursorX,
      y: rowY - rowHeight / 2,
      width: corridor,
      height: rowHeight,
    })
    cursorX += corridor
  }

  // Place CENTER block
  placeBlock('CENTER', blocks.center)

  // Add corridor after CENTER if there is RIGHT block
  if (blocks.center.length > 0 && blocks.right.length > 0) {
    acc.spacerNodes.push({
      id: `${rowLabel}-corridor-2`,
      row: rowLabel,
      kind: 'corridor',
      x: cursorX,
      y: rowY - rowHeight / 2,
      width: corridor,
      height: rowHeight,
    })
    cursorX += corridor
  }

  // Place RIGHT block
  placeBlock('RIGHT', blocks.right)
}

export function buildImaxLayout(rowsInput: ImaxSeatRowInput[]): ImaxLayoutResult {
  const rows = sortRows(rowsInput)
  const seatNodes: SeatRenderNode[] = []
  const spacerNodes: SpacerNode[] = []
  const rowLabelNodes: RowLabelNode[] = []
  const blockDebugNodes: BlockDebugNode[] = []

  rows.forEach((row, rowIndex) => {
    const rowY = rowIndex * ROW_STEP
    // Sort seats by number to ensure correct order 1, 2, 3...
    const slots = sortSeatsByNumber(row.seats)
    
    // Split into visual blocks (aisles)
    const blocks = inferBlocks(slots)

    pushBlockNodes(
      { seatNodes, spacerNodes, blockDebugNodes },
      row.label,
      rowIndex,
      rowY,
      0, // scale passed inside function now based on row index logic
      blocks,
    )

    // Add row label to the left of the leftmost seat
    const rowSeats = seatNodes.filter(s => s.row === row.label)
    if (rowSeats.length > 0) {
      const minRowX = Math.min(...rowSeats.map(s => s.x))
      rowLabelNodes.push({
        row: row.label,
        x: minRowX - 30, // 30px padding to left
        y: rowY,
      })
    }
  })

  // Calculate bounds
  const allX = [
    ...seatNodes.map((n) => n.x),
    ...rowLabelNodes.map((n) => n.x),
  ]
  const allY = [
    ...seatNodes.map((n) => n.y),
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
      minX: minX - 20, // Add some padding
      maxX: maxX + 20,
      minY: minY - 20,
      maxY: maxY + 20,
      width: Math.max(0, maxX - minX) + 40,
      height: Math.max(0, maxY - minY) + 40,
    },
  }
}
