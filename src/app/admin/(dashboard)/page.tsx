import { Suspense } from 'react'
import { DashboardStats } from './_components/dashboard-stats'
import { RecentOrders } from './_components/recent-orders'
import { TopSessions } from './_components/top-sessions'
import { SalesChart } from './_components/sales-chart'
import { AlertsCard } from './_components/alerts-card'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Visão geral do sistema
        </p>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<StatsLoading />}>
        <DashboardStats />
      </Suspense>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Suspense fallback={<ChartLoading />}>
          <SalesChart />
        </Suspense>

        {/* Alerts */}
        <Suspense fallback={<ChartLoading />}>
          <AlertsCard />
        </Suspense>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Suspense fallback={<TableLoading />}>
          <RecentOrders />
        </Suspense>

        {/* Top Sessions */}
        <Suspense fallback={<TableLoading />}>
          <TopSessions />
        </Suspense>
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
  return (
    <div className="bg-gray-800/50 rounded-xl h-80 animate-pulse" />
  )
}

function TableLoading() {
  return (
    <div className="bg-gray-800/50 rounded-xl h-96 animate-pulse" />
  )
}
