'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

interface PurchaseWarningModalProps {
  open: boolean
  onContinue: () => void
  onTimeout?: () => void
}

export function PurchaseWarningModal({
  open,
  onTimeout
}: PurchaseWarningModalProps) {
  // Initialize with 15 and reset via key prop when modal reopens
  const [timeLeft, setTimeLeft] = useState(15)

  useEffect(() => {
    if (!open) {
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onTimeout?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open, onTimeout])

  const progress = Math.max(0, Math.min(100, ((15 - timeLeft) / 15) * 100))

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogOverlay className="bg-black/70 backdrop-blur-sm" />
      <DialogContent
        key={open ? 'open' : 'closed'}
        className="w-[92vw] max-w-[370px] bg-gray-800/80 border-gray-800/60 backdrop-blur-md rounded-2xl p-0 shadow-xl flex flex-col items-center justify-center m-2"
        style={{ minWidth: 0, maxHeight: '90vh', overflow: 'visible' }}
      >
        <div className="p-5 w-full flex flex-col items-center justify-center">
          {/* Icon */}
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
            </div>
          </div>

          {/* Main Text */}
          <div className="text-center">
            <p className="text-gray-200 text-sm leading-relaxed pt-1 mt-3 mb-3">
              Para garantir que todos tenham a chance de assistir, apenas 4 ingressos foram disponibilizados a cada sessão, por isso caso você não finalize seu pedido em até 10 minutos, terá que entrar na fila novamente.
            </p>

            {/* Progress Bar */}
            <div className="space-y-1">
              <Progress
                value={progress}
                className="w-full h-[5px] bg-gray-800"
              />
              <p className="text-[11px] text-gray-400">
                Você será redirecionado em {timeLeft} segundo{timeLeft !== 1 ? 's' : ''}...
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}