'use client'

import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TicketCounterProps {
  label: string
  price: number
  description: string[]
  amount: number
  onAmountChange: (change: number) => void
  maxTotal: number
  currentTotal: number
  isVip?: boolean
}

export function TicketCounter({
  label,
  price,
  description,
  amount,
  onAmountChange,
  maxTotal,
  currentTotal,
  isVip = false
}: TicketCounterProps) {
  const cardClass = 'bg-linear-to-b from-white/5 via-white/2 to-black/95'

  return (
    <div className={`border border-white/10 rounded-xl p-4 backdrop-blur-sm ${cardClass} ${isVip ? 'relative' : ''}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-white">{label}</h4>
        <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold">
          {formatCurrency(price)}
        </div>
      </div>

      {isVip ? (
        <div className="my-3 -mx-4 h-1 w-[calc(100%+2rem)] bg-linear-to-r from-purple-500 via-blue-500 to-yellow-500" />
      ) : (
        <div className="my-3 h-px w-full bg-white/10" />
      )}

      <ul className="space-y-2">
        {description.map((desc, index) => (
          <li key={index} className="text-xs text-gray-300 flex items-start gap-2">
            <span className="text-gray-500">•</span>
            <span>{desc}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-300">Amount</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 bg-gray-900 border-gray-700 hover:bg-gray-800 text-white rounded-full"
            onClick={() => onAmountChange(-1)}
            disabled={amount <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="w-10 rounded-md bg-gray-900 px-2 py-1 text-center text-base font-semibold text-white">
            {amount}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 bg-gray-900 border-gray-700 hover:bg-gray-800 text-white rounded-full"
            onClick={() => onAmountChange(1)}
            disabled={currentTotal >= maxTotal}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
