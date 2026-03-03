'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog'
import { TriangleAlert } from 'lucide-react'
import { useCheckoutTimer } from '@/components/flow'

interface PurchaseWarningModalProps {
    open: boolean
    onTimeout?: () => void
    onContinue?: () => void
}

export function PurchaseWarningModal({
    open,
    onTimeout,
    onContinue
}: PurchaseWarningModalProps) {

    const router = useRouter()
    const { startTimer } = useCheckoutTimer()

    const [timeLeft, setTimeLeft] = useState(15)
    const [progress, setProgress] = useState(0)
    const totalSeconds = 15

    const handleReleaseSeats = useCallback(() => {
        onTimeout?.()
        startTimer()
        router.push('/location')
    }, [onTimeout, router, startTimer])

    useEffect(() => {
        if (!open) return

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) {
                    clearInterval(interval)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [open])

    useEffect(() => {
        if (timeLeft === 0 && open) {
            handleReleaseSeats()
        }
    }, [timeLeft, open, handleReleaseSeats])

    useEffect(() => {
        if (!open) return
        let rafId = 0
        const start = performance.now()
        const durationMs = totalSeconds * 1000

        const tick = (now: number) => {
            const elapsed = now - start
            const next = Math.min(100, (elapsed / durationMs) * 100)
            setProgress(next)
            if (next < 100) {
                rafId = requestAnimationFrame(tick)
            }
        }

        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [open, totalSeconds])

    void onContinue

    // Format seconds to 0:00
    const formattedTime = `0:${timeLeft.toString().padStart(2, '0')}`

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogOverlay className="bg-black/60 backdrop-blur-md" />
            <DialogContent
                className="w-full max-w-md bg-[#090b10] border-gray-800 p-0 shadow-2xl overflow-hidden rounded-4xl gap-0"
                style={{ maxHeight: '90vh' }}
            >
                <DialogTitle className="sr-only">
                    Your seat is at risk
                </DialogTitle>

                <div className="relative flex flex-col items-center py-12 px-8">
                    {/* Background Glow Effect */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-red-500/10 blur-[60px] rounded-full pointer-events-none" />

                    {/* Radar/Pulse Effect Container */}
                    <div className="relative h-36 mb-8 flex items-center justify-center">
                        {/* Concentric Circles */}
                        <div className="absolute w-24 h-24 rounded-full border border-red-500/10" />
                        <div className="absolute w-36 h-36 rounded-full border border-red-500/5" />
                        
                        {/* Icon */}
                        <div className="relative z-10">
                            <TriangleAlert className="w-10 h-10 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        </div>
                    </div>

                    {/* Important Notice Label */}
                    <div className="flex items-center gap-3 w-full mb-6 px-4">
                        <div className="h-px flex-1 bg-linear-to-r from-transparent to-red-900/50" />
                        <span className="text-[10px] font-bold text-red-500 tracking-[0.2em] uppercase whitespace-nowrap">
                            Important Notice
                        </span>
                        <div className="h-px flex-1 bg-linear-to-l from-transparent to-red-900/50" />
                    </div>

                    {/* Main Title */}
                    <h2 className="text-3xl font-black text-white text-center mb-6 tracking-tight leading-none">
                        Your seat is<br />at risk
                    </h2>

                    {/* Body Text */}
                    <div className="space-y-4 text-center mb-8 px-2">
                        <p className="text-sm text-gray-400 leading-relaxed max-w-[320px] mx-auto">
                            To ensure everyone has a fair chance to
                            attend, only <span className="text-white font-bold">4 tickets</span> are made
                            available per session.
                        </p>
                        <p className="text-sm text-gray-400 leading-relaxed max-w-[320px] mx-auto">
                            If your order is not completed in time,
                            your selected seats will be <span className="text-white font-bold">released back</span> to the queue.
                        </p>
                    </div>

                    {/* Progress Bar Section */}
                    <div className="w-full space-y-2 mb-8 max-w-[320px]">
                        <div className="flex justify-between items-end px-1">
                            <span className="text-xs font-medium text-gray-500">
                                Redirecting automatically
                            </span>
                            <span className="text-xs font-bold text-red-500 font-mono">
                                {formattedTime}
                            </span>
                        </div>
                        <div className="h-1 w-full bg-gray-800/50 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-red-500 transition-all duration-100 ease-linear rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                style={{ width: `${100 - progress}%` }} 
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
