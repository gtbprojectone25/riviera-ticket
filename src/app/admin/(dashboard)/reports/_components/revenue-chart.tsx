'use client'

// Gráfico de receita - versão simplificada
// Em produção, usar Recharts ou Chart.js

const revenueData = [
  { week: 'Semana 1', revenue: 45000 },
  { week: 'Semana 2', revenue: 52000 },
  { week: 'Semana 3', revenue: 48000 },
  { week: 'Semana 4', revenue: 61000 },
]

export function RevenueChart() {
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue))
  const totalRevenue = revenueData.reduce((acc, d) => acc + d.revenue, 0)

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Receita por Semana</h3>
          <p className="text-sm text-gray-400 mt-1">
            Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {revenueData.map((data) => {
          const widthPercent = (data.revenue / maxRevenue) * 100

          return (
            <div key={data.week} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{data.week}</span>
                <span className="text-white font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.revenue)}
                </span>
              </div>
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
