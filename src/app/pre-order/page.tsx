'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { AnimatedBackground } from '@/components/animated-background'
import { PurchaseWarningModal } from '@/components/PurchaseWarningModal'

export default function PreOrderPage() {
    const [showWarningModal, setShowWarningModal] = useState(false)

    const notices = [
        'Para garantir seus ingressos, selecione a sessão disponível na sua região. Escolha a data, o horário e o cinema desejado.',
        'Decida quantos ingressos deseja reservar. Lembre-se: o limite é de até 4 ingressos por pessoa.',
        'Adicione os ingressos ao carrinho e conclua o pagamento. Após a confirmação, você poderá acompanhar todas as atualizações na sua conta oficial do Reviera',
    ]

    const handleContinueClick = () => {
        setShowWarningModal(true)
    }

    const handleModalTimeout = () => {
        setShowWarningModal(false)
        // Redirecionamento é feito no modal
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Background with centered poster */}
            <div className="absolute inset-0 z-0 flex items-start justify-center pt-8">
                <div className="relative w-full max-w-xl aspect-2/3 mx-auto rounded-[20px] overflow-hidden">
                    <Image
                        src="/posterodysseyedt.png"
                        alt="Die Odyssee Poster"
                        fill
                        className="object-cover"
                        priority
                    />

                    {/* gradient apenas na imagem */}
                    <div className="absolute inset-0 pointer-events-none bg-linear-to-b from-black/60 via-black/20 to-transparent" />
                </div>
            </div>


            {/* Content overlay */}
            <div className="relative z-10 flex-1 flex flex-col min-h-screen">
                <div className="container mx-auto px-4 py-6 flex-1 flex flex-col">
                    <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-start pb-20 mt-16">
                        {/* Header with Title and Badge */}
                        <div className="flex items-center justify-between mt-0 mb-4">
                            <h1 className="text-3xl font-bold drop-shadow-lg">Die Odyssee</h1>
                            <Badge
                                variant="secondary"
                                className="bg-gray-900/90 backdrop-blur-sm text-white text-sm px-4 py-1.5 rounded-full border border-gray-700/50"
                            >
                                Pré-order
                            </Badge>
                        </div>



                        {/* Notices Cards */}
                        <div className="space-y-4 mt-40">
                            {notices.map((notice, index) => (

                                <Card
                                    key={index}
                                    className="bg-gray-800/80 border-gray-800/60 backdrop-blur-md rounded-2xl "
                                >

                                    <CardContent className="p-5">
                                        <div className="flex gap-4 items-start">
                                            <div className="shrink-0 mt-1">
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center">
                                                    <Image src="/Group.png" alt="Check" width={80} height={80} className="object-contain" />
                                                </div>
                                            </div>
                                            <p className="text-gray-200 text-sm leading-relaxed pt-1 mt-3 mb-3">
                                                {notice}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Continue Button */}
                        <div className="pt-4 mt-5">
                            <Button
                                onClick={handleContinueClick}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-7 text-lg font-semibold rounded-xl shadow-lg cursor-pointer transition-transform"
                            >
                                Continuar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Aviso */}
            <PurchaseWarningModal
                open={showWarningModal}
                onTimeout={handleModalTimeout}
            />
        </div>
    )
}
