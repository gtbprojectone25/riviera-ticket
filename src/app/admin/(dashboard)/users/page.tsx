import { Suspense } from 'react'
import { UsersTable } from './_components/users-table'

export const metadata = {
  title: 'Usuários | Admin Riviera',
}

export default function UsersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Usuários</h1>
        <p className="text-gray-400 text-sm mt-1">
          Gerencie os usuários cadastrados
        </p>
      </div>

      {/* Table */}
      <Suspense fallback={<div className="bg-gray-800/50 rounded-xl h-96 animate-pulse" />}>
        <UsersTable />
      </Suspense>
    </div>
  )
}
