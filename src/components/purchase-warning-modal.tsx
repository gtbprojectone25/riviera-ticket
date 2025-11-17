'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle } from 'lucide-react'

interface PurchaseWarningModalProps {
  open: boolean
  onContinue: () => void
  onTimeout?: () => void
}

export function PurchaseWarningModal({
  open,
  onContinue,
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
        key={open ? 'open' : 'closed'} // Force reset when reopening
        className="sm:max-w-lg max-w-[90%] bg-gray-950 border-gray-800 rounded-3xl p-0 overflow-hidden shadow-2xl"
      >
        <div className="p-8 space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          {/* Main Text */}
          <div className="text-center space-y-4">
            <p className="text-gray-200 text-sm leading-relaxed">
              Para garantir que todos tenham a chance de assistir, apenas 4 ingressos foram disponibilizados a cada sessão, por isso caso você não finalize seu pedido em até 10 minutos, terá que entrar na fila novamente.
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress 
                value={progress} 
                className="w-full h-2 bg-gray-800"
              />
              <p className="text-xs text-gray-400">
                Você será redirecionado em {timeLeft} segundo{timeLeft !== 1 ? 's' : ''}...
              </p>
            </div>
          </div>

          {/* Continue Button */}
          <Button
            onClick={onContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold rounded-xl shadow-lg transition-colors"
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}