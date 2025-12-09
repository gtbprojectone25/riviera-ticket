import { Suspense } from 'react'
import { ReportCards } from './_components/report-cards'
import { RevenueChart } from './_components/revenue-chart'
import { OccupancyStats } from './_components/occupancy-stats'

export const metadata = {
  title: 'Relatórios | Admin Riviera',
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <p className="text-gray-400 text-sm mt-1">
          Análises e métricas do sistema
        </p>
      </div>

      {/* Quick Stats */}
      <Suspense fallback={<StatsLoading />}>
        <ReportCards />
      </Suspense>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartLoading />}>
          <RevenueChart />
        </Suspense>
        <Suspense fallback={<ChartLoading />}>
          <OccupancyStats />
        </Suspense>
      </div>

      {/* Export Section */}
      <ExportSection />
    </div>
  )
}

function ExportSection() {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Exportar Relatórios</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Relatório Financeiro */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-2">Relatório Financeiro</h4>
          <p className="text-gray-400 text-sm mb-4">
            Faturamento por período, cinema e filme
          </p>
          <div className="flex gap-2">
            <a href="/api/admin/reports/financial/excel" target="_blank">
              <button className="px-3 py-1.5 bg-green-600/10 text-green-500 rounded border border-green-600/30 text-sm hover:bg-green-600/20">
                Excel
              </button>
            </a>
            <a href="/api/admin/reports/financial/pdf" target="_blank">
              <button className="px-3 py-1.5 bg-red-600/10 text-red-500 rounded border border-red-600/30 text-sm hover:bg-red-600/20">
                PDF
              </button>
            </a>
          </div>
        </div>

        {/* Relatório de Pedidos */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-2">Relatório de Pedidos</h4>
          <p className="text-gray-400 text-sm mb-4">
            Lista completa de pedidos e pagamentos
          </p>
          <div className="flex gap-2">
            <a href="/api/admin/reports/orders/excel" target="_blank">
              <button className="px-3 py-1.5 bg-green-600/10 text-green-500 rounded border border-green-600/30 text-sm hover:bg-green-600/20">
                Excel
              </button>
            </a>
            <a href="/api/admin/reports/orders/pdf" target="_blank">
              <button className="px-3 py-1.5 bg-red-600/10 text-red-500 rounded border border-red-600/30 text-sm hover:bg-red-600/20">
                PDF
              </button>
            </a>
          </div>
        </div>

        {/* Relatório de Ocupação */}
        <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
          <h4 className="text-white font-medium mb-2">Relatório de Ocupação</h4>
          <p className="text-gray-400 text-sm mb-4">
            Taxa de ocupação por sessão e cinema
          </p>
          <div className="flex gap-2">
            <a href="/api/admin/reports/occupancy/excel" target="_blank">
              <button className="px-3 py-1.5 bg-green-600/10 text-green-500 rounded border border-green-600/30 text-sm hover:bg-green-600/20">
                Excel
              </button>
            </a>
            <a href="/api/admin/reports/occupancy/pdf" target="_blank">
              <button className="px-3 py-1.5 bg-red-600/10 text-red-500 rounded border border-red-600/30 text-sm hover:bg-red-600/20">
                PDF
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsLoading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-800/50 rounded-xl h-28 animate-pulse" />
      ))}
    </div>
  )
}

function ChartLoading() {
  return <div className="bg-gray-800/50 rounded-xl h-80 animate-pulse" />
}
