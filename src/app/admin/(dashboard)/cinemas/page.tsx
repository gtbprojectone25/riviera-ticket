import { Suspense } from 'react'
import { CinemasTable } from './_components/cinemas-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Cinemas | Admin Riviera',
}

export default function CinemasPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cinemas</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerencie os cinemas cadastrados
          </p>
        </div>
        <Link href="/admin/cinemas/new">
          <Button className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Novo Cinema
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Suspense fallback={<div className="bg-gray-800/50 rounded-xl h-96 animate-pulse" />}>
        <CinemasTable />
      </Suspense>
    </div>
  )
}
