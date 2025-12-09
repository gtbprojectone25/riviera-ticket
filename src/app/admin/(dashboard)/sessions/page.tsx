import { Suspense } from 'react'
import { SessionsTable } from './_components/sessions-table'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Sessões | Admin Riviera',
}

export default function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessões</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gerencie as sessões de cinema
          </p>
        </div>
        <Link href="/admin/sessions/new">
          <Button className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Suspense fallback={<div className="bg-gray-800/50 rounded-xl h-96 animate-pulse" />}>
        <SessionsTable searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
