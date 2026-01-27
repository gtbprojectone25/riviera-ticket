'use client'

import { ShoppingCart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface TicketType {
  id: string
  name: string
  price: number
  amount: number
}

interface TicketSummaryProps {
  tickets: TicketType[]
}

export function TicketSummary({ tickets }: TicketSummaryProps) {
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
    <Card className="bg-[#000000] border-gray-800">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingCart className="h-5 w-5 text-white" />
          <h4 className="text-xl font-semibold text-white">Resumo</h4>
        </div>

        <div className="space-y-4">
          {ticketsWithAmount.map((ticket) => (
            <div key={ticket.id} className="flex justify-between items-center">
              <div>
                <span className="text-white font-medium">
                  Ticket {ticket.name === 'VIP' ? 'VIP' : 'Standard'}
                </span>
                
                <div className="text-sm text-gray-400">
                  {ticket.amount}x {formatCurrency(ticket.price)}
                </div>
              </div>
              <span className="text-white font-semibold">
                {formatCurrency(ticket.price * ticket.amount)}
              </span>
            </div>
          ))}

          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-white">
                Total ({getTotalTickets()} tickets)
              </span>
              <span className="text-2xl font-bold text-green-400">
                {formatCurrency(getTotalPrice())}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
