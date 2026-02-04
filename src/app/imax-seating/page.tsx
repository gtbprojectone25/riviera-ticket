'use client'

import { useMemo } from 'react'

const rows = [
  { label: 'A', seats: 14, aisles: [5, 9] },
  { label: 'B', seats: 16, aisles: [6, 10] },
  { label: 'C', seats: 18, aisles: [7, 11] },
  { label: 'D', seats: 20, aisles: [8, 12] },
  { label: 'E', seats: 22, aisles: [9, 13] },
  { label: 'F', seats: 22, aisles: [9, 13] },
  { label: 'G', seats: 22, aisles: [9, 13] },
  { label: 'H', seats: 22, aisles: [9, 13] },
  { label: 'J', seats: 20, aisles: [8, 12] },
  { label: 'K', seats: 18, aisles: [7, 11] },
  { label: 'L', seats: 16, aisles: [6, 10] },
  { label: 'M', seats: 14, aisles: [5, 9] },
  { label: 'N', seats: 12, aisles: [4, 8] },
]

function buildRowSeats(count: number) {
  return Array.from({ length: count }, (_, index) => index)
}

export default function ImaxSeatingPage() {
  const layout = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        seats: buildRowSeats(row.seats),
        aisleSet: new Set(row.aisles),
      })),
    [],
  )

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center py-10 px-4">
      <header className="w-full max-w-6xl mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Sinners</h1>
        <p className="text-sm text-gray-300 mt-1">
          AMC Lincoln Square 13 | Wed, May 21 | 10:00am | IMAX 70MM
        </p>
      </header>

      <div className="w-full max-w-6xl aspect-video rounded-3xl border border-white/10 bg-linear-to-b from-[#0d0d10] via-black to-[#0a0a0f] shadow-[0_20px_80px_rgba(0,0,0,0.55)] relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 opacity-70" style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(70,70,90,0.25), transparent 55%)',
        }} />

        <div className="absolute inset-0 flex flex-col items-center pt-10 px-6 space-y-6">
          {/* Screen arc */}
          <div className="relative w-[86%] h-20 mb-4">
            <div className="absolute inset-x-0 bottom-3 h-16" style={{
              background: 'radial-gradient(120% 120% at 50% 100%, rgba(255,255,255,0.08), transparent 60%)',
            }} />
            <div className="absolute inset-x-[8%] bottom-0 h-14 border-t-2 border-white/50 rounded-full" />
            <div className="absolute inset-0 flex items-end justify-center pb-2 text-[11px] tracking-[0.3em] text-gray-200/80">
              SCREEN
            </div>
          </div>

          {/* Seat grid */}
          <div className="w-full flex-1 flex flex-col items-center justify-start gap-2">
            {layout.map((row) => (
              <div key={row.label} className="flex items-center gap-3 w-full justify-center">
                <span className="w-6 text-right text-xs text-gray-400">{row.label}</span>
                <div className="flex gap-2">
                  {row.seats.map((seatIndex) => (
                    <div
                      key={seatIndex}
                      className="h-5 w-6 rounded-md bg-white/90 shadow-[0_4px_10px_rgba(255,255,255,0.08)]"
                      style={{ marginRight: row.aisleSet.has(seatIndex) ? '12px' : '0px' }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-4">
            <div className="h-4 w-5 rounded-md bg-white/90" />
            <span>Available</span>
          </div>
        </div>
      </div>
    </div>
  )
}
