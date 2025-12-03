'use client'

import { ShoppingCart } from 'lucide-react'
import Image from 'next/image'

interface TicketType {
  id: string
  name: string
  price: number
  amount: number
}

interface PremiumTicketSummaryProps {
  tickets: TicketType[]
}

export function PremiumTicketSummary({ tickets }: PremiumTicketSummaryProps) {
  const ticketsWithAmount = tickets.filter(ticket => ticket.amount > 0)
  
  if (ticketsWithAmount.length === 0) {
    return null
  }

  const getTotalTickets = () => {
    return tickets.reduce((total, ticket) => total + ticket.amount, 0)
  }

  const getTotalPrice = () => {
    return tickets.reduce((total, ticket) => total + (ticket.price * ticket.amount), 0)
  }

  return (
    <div className="bg-[#1c1c1c] rounded-2xl p-6 border border-white/5">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="h-5 w-5 text-white" />
        <h4 className="text-xl font-semibold text-white">Resumo</h4>
      </div>

      <div className="space-y-4">
        {ticketsWithAmount.map((ticket, index) => (
          <div key={ticket.id}>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-white font-semibold text-base">
                  Ticket {ticket.name === 'VIP' ? 'Vip' : 'Standard'}
                </span>
                <div className="text-sm text-gray-400 mt-1">
                  {ticket.amount}x ${ticket.price}
                </div>
              </div>
              <div className="px-4 py-2 rounded-full bg-[#2A2A2A] border border-white/5 text-white text-xs font-bold">
                ${ticket.price}
              </div>
            </div>
            {index < ticketsWithAmount.length - 1 && (
              <div className="h-px bg-white/10 w-full my-4" />
            )}
          </div>
        ))}

        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white">
              Total ({getTotalTickets()} tickets)
            </span>
            <span className="text-2xl font-bold text-green-400">
              ${getTotalPrice().toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente para os cards explicativos
export function FeatureCards() {
  const features = [
    {
      text: "Sua compra é validada diretamente pelo sistema IMAX. Todo o processo é protegido por transações seguras, com suporte dedicado disponível até o dia da sua sessão."
    },
    {
      text: "Ao concluir o pagamento, sua reserva é confirmada e você garante lugar em uma das apenas 26 salas no mundo que exibem este filme em IMAX 70mm. Uma oportunidade única que já está esgotada em cidades como Londres, Nova York e Melbourne."
    },
    {
      text: "Receba seus ingressos digitais imediatamente no seu e-mail. Além disso, você pode acompanhar todas as atualizações da sua sessão com praticidade pelo RevieraTickets."
    }
  ]

  return (
    <div className="space-y-4">
      {features.map((feature, index) => (
        <div 
          key={index}
          className="bg-[#1c1c1c] rounded-2xl p-5 border border-white/5 flex items-start gap-4"
        >
          <div className="shrink-0">
            <Image 
              src="/Group.png" 
              alt="Feature icon" 
              width={24} 
              height={24}
              className="w-6 h-6"
            />
          </div>
          <p className="text-sm text-white leading-relaxed flex-1">
            {feature.text}
          </p>
        </div>
      ))}
    </div>
  )
}

// Componente para 100% Buyer Guarantee
export function BuyerGuarantee() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-white">100% Buyer Guarantee</h3>
      </div>
      
      <div className="space-y-2 pl-7">
        <p className="text-xs text-gray-400">• Secure transactions backed by full service customer care</p>
        <p className="text-xs text-gray-400">• Full compensation for events that are canceled and not rescheduled</p>
        <p className="text-xs text-gray-400">• Valid tickets delivered in time for the event or your money back</p>
        <p className="text-xs text-gray-400">
          • <span className="text-gray-500 underline cursor-pointer hover:text-gray-300">Learn more about our Buyer Guarantee</span>
        </p>
      </div>
    </div>
  )
}

