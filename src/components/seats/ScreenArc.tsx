'use client'

type ScreenArcProps = {
  title?: string
  subtitle?: string
}

export function ScreenArc({
  title = 'SCREEN',
  subtitle = 'FRONT OF THEATER',
}: ScreenArcProps) {
  return (
    <div className="mb-8 w-full px-2">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <span className="text-[11px] font-bold tracking-[0.22em] text-zinc-100">{title}</span>
        <div className="relative mt-2 h-14 w-full overflow-hidden">
          <div className="absolute left-[-8%] right-[-8%] top-0 h-[220%] rounded-[100%] border-t-14 border-zinc-300/70 shadow-[0_-6px_24px_rgba(255,255,255,0.25)]" />
          <div className="absolute inset-x-0 top-0 h-6 bg-linear-to-b from-zinc-100/10 to-transparent" />
        </div>
        <span className="-mt-2 text-[10px] tracking-[0.28em] text-zinc-400">{subtitle}</span>
      </div>
    </div>
  )
}

