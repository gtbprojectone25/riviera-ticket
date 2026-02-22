'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Loader2, RefreshCw } from 'lucide-react'

type TicketRow = {
  id: string
  subject: string
  category: string
  status: string
  createdAt: string
  updatedAt: string
  userEmail: string | null
  userName: string | null
  userSurname: string | null
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberto',
  IN_REVIEW: 'Em análise',
  RESOLVED: 'Resolvido',
}

const CATEGORY_LABEL: Record<string, string> = {
  BUG: 'Bug / Erro',
  QUESTION: 'Dúvida',
  FINANCIAL: 'Financeiro',
  SUGGESTION: 'Sugestão',
}

export function SupportTicketsClient() {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const url = statusFilter ? `/api/admin/support?status=${statusFilter}` : '/api/admin/support'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as { tickets: TicketRow[]; pendingCount: number }
      setTickets(data.tickets)
      setPendingCount(data.pendingCount ?? 0)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">Todos os status</option>
          <option value="OPEN">Aberto</option>
          <option value="IN_REVIEW">Em análise</option>
          <option value="RESOLVED">Resolvido</option>
        </select>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      )}

      {!loading && tickets.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-400">
          Nenhum chamado encontrado.
        </div>
      )}

      {!loading && tickets.length > 0 && (
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/80 text-gray-400">
              <tr>
                <th className="text-left py-3 px-4 font-medium">Assunto</th>
                <th className="text-left py-3 px-4 font-medium">Cliente</th>
                <th className="text-left py-3 px-4 font-medium">Categoria</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Atualizado</th>
                <th className="text-right py-3 px-4 font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tickets.map((t) => (
                <tr key={t.id} className="hover:bg-gray-800/40">
                  <td className="py-3 px-4 text-white font-medium max-w-[200px] truncate">
                    {t.subject}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {[t.userName, t.userSurname].filter(Boolean).join(' ') || t.userEmail || '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {CATEGORY_LABEL[t.category] ?? t.category}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="secondary"
                      className={
                        t.status === 'OPEN'
                          ? 'bg-amber-500/20 text-amber-400'
                          : t.status === 'RESOLVED'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-blue-500/20 text-blue-400'
                      }
                    >
                      {STATUS_LABEL[t.status] ?? t.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {format(new Date(t.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/admin/support/${t.id}`}
                      className="inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 font-medium"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Atender
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
