'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Film, Edit } from 'lucide-react'
import { DeleteSessionButton } from './delete-session-button'

type SessionWithStats = {
  id: string
  movieTitle: string
  movieDuration: number
  startTime: string
  cinemaName: string
  screenType: string
  totalSeats: number
  availableSeats: number
  salesStatus: 'ACTIVE' | 'PAUSED' | 'CLOSED'
  auditoriumName: string | null
  ticketsSold: number
  soldSeats: number
  occupancy: number
}

type BulkAction = 'DUPLICATE' | 'PAUSE' | 'CLOSE'

export function SessionsTableClient({ sessions }: { sessions: SessionWithStats[] }) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  const allSelected = sessions.length > 0 && selectedIds.length === sessions.length

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : sessions.map((session) => session.id))
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      return [...prev, id]
    })
  }

  const salesBadge = (status: SessionWithStats['salesStatus']) => {
    switch (status) {
      case 'PAUSED':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'CLOSED':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      default:
        return 'bg-green-500/10 text-green-500 border-green-500/20'
    }
  }

  const handleBulkAction = async (action: BulkAction) => {
    if (selectedIds.length === 0) {
      setError('Selecione pelo menos uma sessao')
      return
    }

    setError(null)

    let daysOffset: number | undefined
    if (action === 'DUPLICATE') {
      const input = window.prompt('Duplicar para quantos dias a frente?', '7')
      if (!input) {
        return
      }
      const parsed = Number(input)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError('Informe um numero de dias valido')
        return
      }
      daysOffset = Math.floor(parsed)
    } else {
      const confirmMessage =
        action === 'PAUSE'
          ? 'Pausar vendas das sessoes selecionadas?'
          : 'Encerrar vendas das sessoes selecionadas?'
      if (!window.confirm(confirmMessage)) {
        return
      }
    }

    setIsWorking(true)

    const res = await fetch('/api/admin/sessions/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        sessionIds: selectedIds,
        daysOffset,
      }),
    })

    setIsWorking(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao executar acao')
      return
    }

    setSelectedIds([])
    router.refresh()
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="flex flex-col gap-3 px-4 py-3 border-b border-gray-700/50 bg-gray-900/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-gray-400">
            {selectedIds.length} selecionada(s)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="text-xs"
              disabled={selectedIds.length === 0 || isWorking}
              onClick={() => handleBulkAction('DUPLICATE')}
            >
              Duplicar
            </Button>
            <Button
              variant="outline"
              className="text-xs"
              disabled={selectedIds.length === 0 || isWorking}
              onClick={() => handleBulkAction('PAUSE')}
            >
              Pausar vendas
            </Button>
            <Button
              variant="outline"
              className="text-xs text-red-300 border-red-500/30"
              disabled={selectedIds.length === 0 || isWorking}
              onClick={() => handleBulkAction('CLOSE')}
            >
              Encerrar vendas
            </Button>
          </div>
        </div>
        {error && (
          <div className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-3 py-2 text-xs">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-red-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Filme
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Cinema/Sala
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Formato
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Ocupacao
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Vendas
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  Nenhuma sessao encontrada
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(session.id)}
                      onChange={() => toggleSelect(session.id)}
                      className="h-4 w-4 accent-red-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                        <Film className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white truncate max-w-[200px]">
                          {session.movieTitle}
                        </p>
                        <p className="text-xs text-gray-500">{session.movieDuration} min</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300 truncate max-w-[160px]">
                      {session.cinemaName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.auditoriumName || 'Sala nao definida'}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-white">
                          {format(new Date(session.startTime), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                      {session.screenType}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${session.occupancy}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-300">{session.occupancy}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {session.soldSeats}/{session.totalSeats} vendidos
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={salesBadge(session.salesStatus)}>
                      {session.salesStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/sessions/${session.id}/edit`}>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                      <DeleteSessionButton sessionId={session.id} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
