'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { PurchaseWarningModal } from '@/components/PurchaseWarningModal'

export default function PreOrderPage() {
  const [showWarningModal, setShowWarningModal] = useState(false)

  const notices = [
    'Para garantir seus ingressos, selecione a sessão disponível na sua região. Escolha a data, o horário e o cinema desejado.',
    'Decida quantos ingressos deseja reservar. Lembre-se: o limite é de até 4 ingressos por pessoa.',
    'Adicione os ingressos ao carrinho e conclua o pagamento. Após a confirmação, você poderá acompanhar todas as atualizações na sua conta oficial do Riviera.',
  ]

  const handleContinueClick = () => {
    setShowWarningModal(true)
  }

  const handleModalTimeout = () => {
    setShowWarningModal(false)
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex flex-col bg-black/60">
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mx-auto w-full max-w-sm px-2 py-6 flex flex-col">
          {/* CARD ÚNICO COM POSTER + CARDS + BOTÃO */}
          <div className="relative rounded-3xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.4)] bg-black/40 border border-white/5">
            <div className="relative aspect-9/16">
              <Image
                src="/posterodysseyedt.png"
                alt="The Odyssey Poster"
                fill
                className="object-cover"
                priority
              />

              {/* Gradiente escurecendo a parte de baixo */}
              <div className="absolute inset-0 bg-linear-to-b from-transparent via-black/40 to-black" />

              {/* Título + badge no topo */}
              <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wide">
                    A film by Christopher Nolan
                  </span>
                  <h1 className="text-3xl font-bold text-white drop-shadow-lg leading-tight">
                    The Odyssey
                  </h1>
                </div>
                <Badge className="bg-black/70 text-white px-3 py-1 rounded-full border border-white/10 text-xs">
                  Pre-order
                </Badge>
              </div>

              {/* >>> AQUI: CARDS + BOTÃO SOBRE A IMAGEM, NO RODAPÉ <<< */}
              <div className="absolute left-3 right-3 bottom-3 space-y-3">
                <div className="space-y-2">
                  {notices.map((notice, index) => (
                    <Card
                      key={index}
                      className="bg-[#05070b]/95 border border-white/8 rounded-3xl shadow-lg"
                    >
                      <CardContent className="p-3">
                        <div className="flex gap-3 items-start">
                          <div className="shrink-0 mt-1">
                            <Image
                              src="/Group.png"
                              alt="Check"
                              width={44}
                              height={44}
                              className="object-contain"
                            />
                          </div>
                          <p className="text-gray-100 text-xs leading-relaxed">
                            {notice}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={handleContinueClick}
                  className="w-full bg-[#0f62fe] hover:bg-[#0c52d1] text-white py-4 text-sm font-semibold rounded-xl shadow-[0_10px_30px_rgba(15,98,254,0.35)] cursor-pointer"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PurchaseWarningModal open={showWarningModal} onTimeout={handleModalTimeout} />
    </div>
  )
}
