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
    <Card className="bg-black/80 border border-gray-800 rounded-xl">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 text-white" />
          <h4 className="text-base font-semibold text-white">Resumo</h4>
        </div>

        <div className="space-y-4">
          {ticketsWithAmount.map((ticket, index) => (
            <div key={ticket.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-white font-medium">
                    Ticket {ticket.name === 'VIP' ? 'VIP' : 'Standard'}
                  </span>
                  <div className="text-xs text-gray-400">
                    {ticket.amount}x {formatCurrency(ticket.price)}
                  </div>
                </div>
                <span className="text-white font-semibold">
                  {formatCurrency(ticket.price * ticket.amount)}
                </span>
              </div>
              {index < ticketsWithAmount.length - 1 && (
                <div className="h-px w-full bg-gray-800" />
              )}
            </div>
          ))}

          <div className="h-px w-full bg-gray-800" />

          <div className="flex justify-between items-end">
            <div className="text-sm font-semibold text-white">
              Total ({getTotalTickets()} tickets)
            </div>
            <div className="text-2xl font-bold text-green-400">
              {formatCurrency(getTotalPrice())}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
