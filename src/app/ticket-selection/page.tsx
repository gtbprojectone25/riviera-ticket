'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Clock } from 'lucide-react'
import { AnimatedBackground } from '@/components/animated-background'

import { TicketCounter } from './_components/ticket-counter'
import { TicketSummary } from './_components/ticket-summary'
import { SessionSelector } from './_components/session-selector'

// Import atualizado da Store e do Tipo
import { useBookingStore, SelectedTicket } from '@/stores/booking'

interface SessionTime {
  id: string
  time: string
  selected: boolean
}

export default function TicketSelectionPage() {
  const router = useRouter()

  // 1. Store Hooks
  const selectedCinema = useBookingStore((state) => state.selectedCinema)
  const setSelectedTickets = useBookingStore((state) => state.setSelectedTickets)
  const setSelectedSessionId = useBookingStore((state) => state.setSelectedSessionId)

  // 2. Mock de Sessões (Futuramente isso viria do getShowtimes do banco)
  // Importante: O ID aqui ('session-123') deve bater com o ID real no banco se quiser testar a reserva real
  const [sessionTimes, setSessionTimes] = useState<SessionTime[]>([
    { id: 'session-abc-1', time: '10:00 - 12:00', selected: false },
    { id: 'session-abc-2', time: '13:00 - 15:00', selected: false },
    { id: 'session-abc-3', time: '16:00 - 18:00', selected: false },
    { id: 'session-abc-4', time: '19:00 - 21:00', selected: true }, // Pré-selecionado
    { id: 'session-abc-5', time: '22:00 - 00:00', selected: false },
  ])

  const [tickets, setTickets] = useState<SelectedTicket[]>([
    {
      id: 'standard',
      name: 'Standard Ticket',
      price: 349,
      description: [ 'Valid only for the chosen session', 'Online ticket' ],
      amount: 0
    },
    {
      id: 'vip',
      name: 'VIP Experience',
      price: 449,
      description: [ 'Valid only for the chosen session', 'Priority access' ],
      amount: 0
    }
  ])

  // Proteção de Rota
  useEffect(() => {
    if (!selectedCinema) {
      router.push('/location')
    } else {
        // Ao carregar, já salva a sessão padrão na store
        const defaultSession = sessionTimes.find(s => s.selected);
        if(defaultSession) setSelectedSessionId(defaultSession.id);
    }
  }, [selectedCinema, router, setSelectedSessionId, sessionTimes]) // Incluído sessionTimes nas deps conforme recomendação do React

  const handleSessionSelect = (sessionId: string) => {
    // Atualiza visualmente
    setSessionTimes(prev => 
      prev.map(session => ({
        ...session,
        selected: session.id === sessionId
      }))
    )
    // Salva na Store
    setSelectedSessionId(sessionId);
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

  const handleNextStep = () => {
    const selectedTickets = tickets.filter(t => t.amount > 0);
    
    // 1. Salvar Ingressos na Store
    setSelectedTickets(selectedTickets);
    
    // 2. Garantir que a sessão está salva (caso o user não tenha clicado em nada)
    const currentSession = sessionTimes.find(s => s.selected);
    if (currentSession) {
        setSelectedSessionId(currentSession.id);
    }

    router.push('/seat-selection')
  }

  if (!selectedCinema) return null

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] pt-8 ">
        <div className="w-full max-w-md rounded-2xl mx-4 space-y-6 p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]">
          
          {/* Urgency Banner */}
          <div className="w-full bg-[#0266FC] p-3 flex items-center justify-center rounded-lg">
            <Clock className="h-4 w-4 text-white shrink-0 mr-2" />
            <p className="text-white text-xs font-medium text-center">
              To guarantee your place, finish within 10:00 minutes.
            </p>
          </div>

          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Die Odyssee</h1>
              <Badge variant="secondary" className="bg-gray-700 text-white px-4 py-2 rounded-full">Pre-order</Badge>
            </div>
            <hr className="border-gray-700 mb-4" />
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white p-0 h-auto font-normal hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> To go back
            </Button>
             <hr className="border-gray-700 mb-4" />
          </div>

          {/* Cinema Image / Pre-order visual padronizado com o HeroSection */}
          <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden bg-black/50">
            <Image
              src="/theodyssey.jpg"
              alt="Die Odyssee Pre-order"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

            <div className="absolute bottom-4 left-0 right-0 flex flex-wrap gap-2 justify-center px-4 z-10">
              <Badge variant="secondary" className="bg-white text-black text-xs px-3 py-1 rounded-full font-medium">
                Pre-order
              </Badge>
              <Badge variant="secondary" className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                2026
              </Badge>
              <Badge variant="secondary" className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                Action | Fantasy
              </Badge>
              <Badge variant="secondary" className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                +18
              </Badge>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10">
              <p className="text-white font-bold">{selectedCinema.name}</p>
              <p className="text-xs text-gray-300">{selectedCinema.address || `${selectedCinema.city}, ${selectedCinema.state}`}</p>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedCinema.name}</h2>
                <p className="text-sm text-gray-400">
                    {selectedCinema.address || `${selectedCinema.city}, ${selectedCinema.state}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="bg-gray-700 text-white px-4 py-2 rounded-full">9.7/10</Badge>
                <div className="text-right">
                  <div className="text-xs text-gray-400">Extraordinary</div>
                  <div className="text-xs text-gray-500">2.987 reviews</div>
                </div>
              </div>
            </div>
          </div>
           <hr className="border-gray-700 mb-4" />

        {/* Selectors */}
        <SessionSelector sessions={sessionTimes} onSessionSelect={handleSessionSelect} />

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
                description={ticket.description ?? []}
                amount={ticket.amount}
                onAmountChange={(change) => handleTicketAmountChange(ticket.id, change)}
                maxTotal={4}
                currentTotal={getTotalTickets()}
                isVip={ticket.id === 'vip'}
              />
            ))}
          </div>
        </div>

        <TicketSummary tickets={tickets} />

        <div className="pb-6">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)]"
            disabled={getTotalTickets() === 0}
            onClick={handleNextStep}
          >
            Escolher assentos
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500 pb-4 opacity-50">
           Secure Checkout provided by Riviera
        </div>
        </div>
      </div>
    </div>
  )
}
