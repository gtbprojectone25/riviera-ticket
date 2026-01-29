import { Suspense } from 'react'
import { AuditoriumsTable } from './_components/auditoriums-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Salas | Admin Riviera',
}

export default function AuditoriumsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Salas</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerencie salas e mapas de assentos
          </p>
        </div>
        <Link href="/admin/auditoriums/new">
          <Button className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Sala
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div className="bg-gray-800/50 rounded-xl h-96 animate-pulse" />}>
        <AuditoriumsTable />
      </Suspense>
    </div>
  )
}
