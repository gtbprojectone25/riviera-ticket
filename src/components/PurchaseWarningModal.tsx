'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import AlertIcon from '@/assets/icons/Rectangle.svg'

interface PurchaseWarningModalProps {
    open: boolean
    onTimeout?: () => void
}

export function PurchaseWarningModal({
    open,
    onTimeout
}: PurchaseWarningModalProps) {

    const router = useRouter()

    const [timeLeft, setTimeLeft] = useState(15)
    const [progress, setProgress] = useState(58)

    // Handler para nunca deixar progress abaixo de 75%
    const normalizeProgress = (value: number) => Math.max(value, 58)

    useEffect(() => {
        if (!open) return

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval)
                    setTimeout(() => {
                        onTimeout?.()
                        router.push('/location')
                    }, 0)
                    return 0
                }
                return prev - 1
            })

            // Exemplo: aumentar progresso ao longo do tempo
            setProgress(prev => normalizeProgress(prev + 3))

        }, 1000)

        return () => clearInterval(interval)
    }, [open, onTimeout, router])


    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogOverlay className="bg-black/10 backdrop-blur-sm" />
            <DialogContent
                key={open ? 'open' : 'closed'}
                className="w-[92vw] max-w-[370px] bg-gray-800/80 border-gray-800/60 backdrop-blur-md rounded-2xl p-0 shadow-xl flex flex-col items-center justify-center m-2"
                style={{ minWidth: 0, maxHeight: '90vh', overflow: 'visible' }}
            >
                <DialogTitle className="sr-only">
                    Aviso de Compra - Limite de Ingressos
                </DialogTitle>
                <div className="p-5 w-full flex flex-col items-center justify-center text-center">
                    <div className="flex justify-center mb-2">
                        <AlertIcon className="w-25 h-20 text-red-500" />
                    </div>
                    <div>
                        <p className="text-gray-200 text-sm leading-relaxed pt-1 mt-3 mb-3">
                            Para garantir que todos tenham a chance de assistir, apenas 4 ingressos foram disponibilizados a cada sessão. Caso você não finalize seu pedido em até 10 minutos, terá que entrar na fila novamente.
                        </p>
                        <div className="space-y-1">
                            <Progress
                                value={normalizeProgress(progress)}
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
