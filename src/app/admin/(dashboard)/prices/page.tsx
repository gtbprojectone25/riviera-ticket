import { Suspense } from 'react'
import { PriceRulesTable } from './_components/price-rules-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Regras de Preco | Admin Riviera',
}

export default function PricesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Regras de Preco</h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure regras por cinema, sala e horario
          </p>
        </div>
        <Link href="/admin/prices/new">
          <Button className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova regra
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div className="bg-gray-800/50 rounded-xl h-96 animate-pulse" />}>
        <PriceRulesTable />
      </Suspense>
    </div>
  )
}
