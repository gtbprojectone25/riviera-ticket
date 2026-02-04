'use client'

import { useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useCheckoutTimer } from './CheckoutTimerProvider'
import { Clock, AlertTriangle } from 'lucide-react'

const POPUP_TOTAL_SECONDS = 10

export function ExtensionModal() {
  const {
    status,
    hasExtended,
    popupCountdown,
    extendTimer,
  } = useCheckoutTimer()

  const buttonRef = useRef<HTMLButtonElement>(null)

  // Focus the button when modal opens for accessibility
  useEffect(() => {
    if (status === 'popup' && !hasExtended && buttonRef.current) {
      // Small delay to ensure the modal is fully rendered
      const timeout = setTimeout(() => {
        buttonRef.current?.focus()
      }, 100)
      return () => clearTimeout(timeout)
    }
  }, [status, hasExtended])

  // Only show popup when timer reaches 0 and user hasn't extended yet
  const isOpen = status === 'popup' && !hasExtended

  // Progress value (100 = full, 0 = empty)
  const progressValue = (popupCountdown / POPUP_TOTAL_SECONDS) * 100

  const handleExtend = () => {
    extendTimer()
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogOverlay className="bg-black/60 backdrop-blur-md" />
      <DialogContent
        className="w-[calc(100%-32px)] max-w-sm bg-gray-900/95 border-gray-700/50 backdrop-blur-xl rounded-3xl p-0 shadow-2xl"
        style={{ maxHeight: '90vh' }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          Tempo esgotado - Prorrogação disponível
        </DialogTitle>

        <div className="p-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-amber-500/20 to-red-500/20 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-linear-to-br from-amber-500/30 to-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              </div>
            </div>
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-2">
            Tempo esgotado!
          </h2>

          {/* Description */}
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Seu tempo de reserva expirou. Deseja continuar com a compra?
            Você pode adicionar mais 3 minutos para finalizar.
          </p>

          {/* Countdown display */}
          <div className="flex items-center gap-2 mb-4 text-gray-300">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm">
              Expira em{' '}
              <span className="font-bold tabular-nums text-amber-400">
                {popupCountdown}
              </span>
              {' '}segundo{popupCountdown !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Progress bar */}
          <Progress
            value={progressValue}
            className="w-full h-1 bg-gray-800 mb-6"
          />

          {/* Extend button */}
          <Button
            ref={buttonRef}
            onClick={handleExtend}
            size="lg"
            className="w-full h-14 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-base rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Clock className="w-5 h-5 mr-2" />
            Adicionar 3 minutos
          </Button>

          {/* Warning text */}
          <p className="text-xs text-gray-500 mt-4">
            Esta é sua única chance de prorrogação
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
