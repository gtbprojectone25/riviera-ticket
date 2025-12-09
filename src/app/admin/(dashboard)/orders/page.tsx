import { Suspense } from 'react'
import { OrdersTable } from './_components/orders-table'
import { OrdersFilters } from './_components/orders-filters'

export const metadata = {
  title: 'Pedidos | Admin Riviera',
}

export default function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerencie todos os pedidos e pagamentos
          </p>
        </div>
      </div>

      {/* Filters */}
      <OrdersFilters />

      {/* Table */}
      <Suspense fallback={<TableLoading />}>
        <OrdersTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

function TableLoading() {
  return (
    <div className="bg-gray-800/50 rounded-xl h-96 animate-pulse" />
  )
}
