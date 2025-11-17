'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft } from 'lucide-react'
import { Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TicketCounter } from './_components/ticket-counter'
import { TicketSummary } from './_components/ticket-summary'
import { SessionSelector } from './_components/session-selector'
import { AnimatedBackground } from '@/components/animated-background'
import Image from 'next/image'

interface TicketType {
  id: string
  name: string
  price: number
  description: string[]
  amount: number
}

interface SessionTime {
  id: string
  time: string
  selected: boolean
}

export default function TicketSelectionPage() {
  const router = useRouter()
  
  // Dados do cinema vindos da página anterior (simulado)
  const cinemaData = {
    name: 'Roxy Cinema',
    address: '234 W 42nd St, New York, NY 10036',
    rating: '9.7/10',
    status: 'Extraordinary',
    reviews: '2.987 reviews'
  }

  const [sessionTimes, setSessionTimes] = useState<SessionTime[]>([
    { id: '1', time: '10am at 12pm', selected: false },
    { id: '2', time: '10am at 12pm', selected: false },
    { id: '3', time: '10am at 12pm', selected: false },
    { id: '4', time: '10am at 12pm', selected: false },
    { id: '5', time: '10am at 12pm', selected: false },
    { id: '6', time: '10am at 12pm', selected: true }, // Selecionado por padrão
  ])

  const [tickets, setTickets] = useState<TicketType[]>([
    {
      id: 'standard',
      name: 'Standard Ticket',
      price: 349,
      description: [
        'Valid only for the chosen session',
        'Online ticket with access via QR code'
      ],
      amount: 0
    },
    {
      id: 'vip',
      name: 'VIP',
      price: 449,
      description: [
        'Valid only for the chosen session',
        'Online ticket with access via QR code'
      ],
      amount: 0
    }
  ])

  const handleSessionSelect = (sessionId: string) => {
    setSessionTimes(prev => 
      prev.map(session => ({
        ...session,
        selected: session.id === sessionId
      }))
    )
  }

  const handleTicketAmountChange = (ticketId: string, change: number) => {
    setTickets(prev => 
      prev.map(ticket => {
        if (ticket.id === ticketId) {
          const newAmount = Math.max(0, Math.min(4, ticket.amount + change))
          return { ...ticket, amount: newAmount }
        }
        return ticket
      })
    )
  }

  const getTotalTickets = () => {
    return tickets.reduce((total, ticket) => total + ticket.amount, 0)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] pt-8 ">
          {/* Card Container */}
        <div className="w-full max-w-md rounded-2xl mx-4 space-y-6 p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]">
          {/* Banner de Urgência */}
          <div className="w-full bg-[#0266FC] p-3 flex items-center justify-center rounded-lg">
            <Clock className="h-4 w-4 text-white shrink-0 mr-2" />
            <p className="text-white text-xs font-medium text-center">
              To guarantee your place, finish within 10:00 minutes (only 4 per session).
            </p>
          </div>
          {/* Cabeçalho do Filme */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Die Odyssee</h1>
              <Badge 
                variant="secondary" 
                className="bg-gray-700 text-white px-4 py-2 rounded-full"
              >
                Pre-order
              </Badge>
            </div>

            {/* Botão Voltar */}
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white p-0 h-auto font-normal"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              To go back
            </Button>
          </div>          {/* Imagem da Sala de Cinema */}
          <div className="w-full h-48 bg-gray-800 rounded-lg overflow-hidden relative">
            <Image
              src="/sala-cinema.png"
              alt="Interior da Sala de Cinema"
              fill
              className="object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.parentElement!.style.background = 'linear-gradient(135deg, #8B5A3C 0%, #4A1810 100%)'
              }}
            />
          </div>          {/* Informações do Cinema */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-white">{cinemaData.name}</h2>
                <p className="text-sm text-gray-400">{cinemaData.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold">
                  {cinemaData.rating}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{cinemaData.status}</div>
                  <div className="text-xs text-gray-500">{cinemaData.reviews}</div>
                </div>
              </div>
            </div>
          </div>        {/* Seleção de Sessão */}
        <SessionSelector 
          sessions={sessionTimes}
          onSessionSelect={handleSessionSelect}
        />

        {/* Seleção de Tipo de Ingresso */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Choose the type of ticket you will buy</h3>
            <p className="text-sm text-gray-400">The purchase limit is 4 tickets</p>
          </div>

          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketCounter
                key={ticket.id}
                label={ticket.name}
                price={ticket.price}
                description={ticket.description}
                amount={ticket.amount}
                onAmountChange={(change) => handleTicketAmountChange(ticket.id, change)}
                maxTotal={4}
                currentTotal={getTotalTickets()}
                isVip={ticket.id === 'vip'}
              />
            ))}
          </div>
        </div>

        {/* Resumo */}
        <TicketSummary tickets={tickets} />

        {/* Botão de Ação */}
        <div className="pb-6">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-lg"
            disabled={getTotalTickets() === 0}
            onClick={() => router.push('/seat-selection')}
          >
            Escolher assentos
          </Button>
        </div>

        {/* Sugestão no rodapé */}
        <div className="text-center text-sm text-gray-500 pb-4">
          Sugestão de colocar luz por baixo... Escolher alguma para aplicar
        </div>
        </div>
      </div>
    </div>
  )
}
