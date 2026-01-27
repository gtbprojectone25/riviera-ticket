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
  return (
    <div className={`bg-[#000000] border border-gray-800 rounded-lg p-6 ${isVip ? 'relative' : ''}`}>
      {/* Gradiente VIP */}
      {isVip && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-purple-500 via-blue-500 to-yellow-500 rounded-t-lg"></div>
      )}
      
      {/* Título e Preço */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-xl font-semibold text-white">{label}</h4>
        <div className="bg-gray-600 text-white px-4 py-2 rounded-full font-semibold">
          {formatCurrency(price)}
        </div>
      </div>
      
      
                 <hr className="border-gray-700 mb-4" />

      {/* Descrição */}
      <ul className="space-y-2 mb-6">
        {description.map((desc, index) => (
          <li key={index} className="text-sm text-gray-300 flex items-start">
            <span className="text-gray-500 mr-2">•</span>
            {desc}
          </li>
        ))}
      </ul>

      {/* Seletor de Quantidade */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-white">Amount</p>
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white rounded-full"
            onClick={() => onAmountChange(-1)}
            disabled={amount <= 0}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-2xl font-bold text-white w-8 text-center">
            {amount}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-800 border-gray-700 hover:bg-gray-700 text-white rounded-full"
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
