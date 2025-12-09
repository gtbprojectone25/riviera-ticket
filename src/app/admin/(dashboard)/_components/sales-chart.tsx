'use client'

import { useMemo } from 'react'

// Dados simulados para demo - em produção viria do backend
const salesData = [
  { day: 'Seg', revenue: 12500 },
  { day: 'Ter', revenue: 8900 },
  { day: 'Qua', revenue: 15200 },
  { day: 'Qui', revenue: 11800 },
  { day: 'Sex', revenue: 22500 },
  { day: 'Sáb', revenue: 31200 },
  { day: 'Dom', revenue: 28700 },
]

export function SalesChart() {
  const maxRevenue = useMemo(() => 
    Math.max(...salesData.map(d => d.revenue)), 
    []
  )

  const totalRevenue = useMemo(() => 
    salesData.reduce((acc, d) => acc + d.revenue, 0),
    []
  )

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Vendas da Semana</h3>
          <p className="text-sm text-gray-400 mt-1">
            Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
          </p>
        </div>
        <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500">
          <option>Última semana</option>
          <option>Último mês</option>
          <option>Último trimestre</option>
        </select>
      </div>

      {/* Simple Bar Chart */}
      <div className="flex items-end justify-between gap-2 h-48">
        {salesData.map((data) => {
          const heightPercent = (data.revenue / maxRevenue) * 100
          
          return (
            <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col items-center">
                <span className="text-xs text-gray-400 mb-1">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    notation: 'compact'
                  }).format(data.revenue)}
                </span>
                <div 
                  className="w-full max-w-10 bg-linear-to-t from-red-600 to-red-400 rounded-t-lg transition-all duration-300 hover:from-red-500 hover:to-red-300"
                  style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                />
              </div>
              <span className="text-xs text-gray-500">{data.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
