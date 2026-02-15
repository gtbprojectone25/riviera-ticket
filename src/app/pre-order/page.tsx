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
    'To secure your tickets, select an available screening in your area. Choose the date, time, and theatre of your choice.',
    'Decide how many tickets you’d like to reserve. Please note: the limit is up to 4 tickets per guest.',
    'Add the tickets to your cart and complete payment. Once confirmed, you’ll be able to track all updates through your official Riviera account.',
  ]

  const handleContinueClick = () => {
    setShowWarningModal(true)
  }

  const handleModalTimeout = () => {
    setShowWarningModal(false)
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden flex flex-col">
      <div className="relative z-10 flex-1 flex flex-col">
        <div className="mx-auto w-full max-w-sm px-2 py-6 flex flex-col">
          {/* CARD ÚNICO COM POSTER + CARDS + BOTÃO */}
          <div className="relative rounded-xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.4)] bg-black/40 border-0">
            <div className="relative aspect-9/16">
              <Image
                src="/aquiles-capa.png"
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
                  
                  <h1 className="text-3xl font-bold text-[#dbdbdb] drop-shadow-lg leading-tight">
                    The Odyssey
                  </h1>
                </div>
                <Badge className="bg-black/70 text-white px-3 py-1 text-xs">
                  Pre-order
                </Badge>
              </div>

              {/* >>> AQUI: CARDS + BOTÃO SOBRE A IMAGEM, NO RODAPÉ <<< */}
              <div className="absolute left-3 right-3 bottom-3 space-y-3">
                <div className="space-y-2">
                  {notices.map((notice, index) => (
                    <Card
                      key={index}
                      className="bg-[rgba(66,65,65,0.1)] backdrop-blur-md border-0 rounded-xl shadow-lg"
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
                          <p className="text-gray-100 text-xs leading-relaxed ">
                            {notice}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button
                  onClick={handleContinueClick}
                  className="w-full bg-[#0f62fe] hover:bg-[#0c52d1] text-white h-12 text-sm font-semibold rounded-xl shadow-[0_10px_30px_rgba(15,98,254,0.35)] cursor-pointer"
                >
                  Continue
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
