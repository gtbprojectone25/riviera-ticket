'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Edit2 } from 'lucide-react'
import { DeletePriceRuleButton } from './delete-price-rule-button'

type PriceRuleRow = {
  id: string
  name: string
  priority: number
  isActive: boolean
  cinemaId: string | null
  auditoriumId: string | null
  sessionId: string | null
  daysOfWeek: number[] | null
  startMinute: number | null
  endMinute: number | null
  priceCents: number
  updatedAt: string | Date
}

type PriceRuleWithMeta = {
  rule: PriceRuleRow
  cinemaName: string | null
  auditoriumName: string | null
  sessionTitle: string | null
  sessionStart: string | Date | null
}

type FilterOption = {
  id: string
  name: string
}

type AuditoriumOption = {
  id: string
  name: string
  cinemaId: string
}

type SessionOption = {
  id: string
  movieTitle: string
  startTime: string | Date
  cinemaId: string | null
  auditoriumId: string | null
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function formatMinutes(value: number | null) {
  if (value === null) return ''
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function formatDays(days: number[] | null) {
  if (!days || days.length === 0) return 'Todos os dias'
  return days.sort((a, b) => a - b).map((day) => DAY_LABELS[day]).join(', ')
}

function formatCurrency(amountCents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(amountCents / 100)
}

export function PriceRulesTableClient({
  rules,
  cinemas,
  auditoriums,
  sessions,
}: {
  rules: PriceRuleWithMeta[]
  cinemas: FilterOption[]
  auditoriums: AuditoriumOption[]
  sessions: SessionOption[]
}) {
  const [search, setSearch] = useState('')
  const [cinemaId, setCinemaId] = useState('')
  const [auditoriumId, setAuditoriumId] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [status, setStatus] = useState('')

  const filteredRules = useMemo(() => {
    return rules.filter(({ rule, cinemaName, auditoriumName, sessionTitle }) => {
      if (cinemaId && rule.cinemaId !== cinemaId) return false
      if (auditoriumId && rule.auditoriumId !== auditoriumId) return false
      if (sessionId && rule.sessionId !== sessionId) return false
      if (status === 'active' && !rule.isActive) return false
      if (status === 'inactive' && rule.isActive) return false

      if (search) {
        const term = search.toLowerCase()
        const text = [
          rule.name,
          cinemaName,
          auditoriumName,
          sessionTitle,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!text.includes(term)) return false
      }

      return true
    })
  }, [rules, search, cinemaId, auditoriumId, sessionId, status])

  const auditoriumOptions = useMemo(() => {
    if (!cinemaId) return auditoriums
    return auditoriums.filter((auditorium) => auditorium.cinemaId === cinemaId)
  }, [auditoriums, cinemaId])

  const sessionOptions = useMemo(() => {
    if (auditoriumId) {
      return sessions.filter((session) => session.auditoriumId === auditoriumId)
    }
    if (cinemaId) {
      return sessions.filter((session) => session.cinemaId === cinemaId)
    }
    return sessions
  }, [sessions, auditoriumId, cinemaId])

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-700/50 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar regra"
          />
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
            value={cinemaId}
            onChange={(event) => {
              setCinemaId(event.target.value)
              setAuditoriumId('')
            }}
          >
            <option value="">Todos os cinemas</option>
            {cinemas.map((cinema) => (
              <option key={cinema.id} value={cinema.id}>
                {cinema.name}
              </option>
            ))}
          </select>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
            value={auditoriumId}
            onChange={(event) => setAuditoriumId(event.target.value)}
          >
            <option value="">Todas as salas</option>
            {auditoriumOptions.map((auditorium) => (
              <option key={auditorium.id} value={auditorium.id}>
                {auditorium.name}
              </option>
            ))}
          </select>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
          >
            <option value="">Todas as sessoes</option>
            {sessionOptions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.movieTitle}
              </option>
            ))}
          </select>
          <select
            className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Status</option>
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Regra
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Escopo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Janela
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Preco
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Prioridade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {filteredRules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                  Nenhuma regra encontrada
                </td>
              </tr>
            ) : (
              filteredRules.map(({ rule, cinemaName, auditoriumName, sessionTitle, sessionStart }) => (
                <tr key={rule.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-white">{rule.name}</p>
                    <p className="text-xs text-gray-500">{rule.id}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300">
                      {cinemaName || 'Todos os cinemas'}
                    </p>
                    {auditoriumName && (
                      <p className="text-xs text-gray-500">Sala: {auditoriumName}</p>
                    )}
                    {sessionTitle && (
                      <p className="text-xs text-gray-500">
                        {sessionTitle}{sessionStart ? ` - ${format(new Date(sessionStart), 'dd/MM HH:mm', { locale: ptBR })}` : ''}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300">
                      {formatDays(rule.daysOfWeek)}
                    </p>
                    {(rule.startMinute !== null || rule.endMinute !== null) && (
                      <p className="text-xs text-gray-500">
                        {formatMinutes(rule.startMinute)} - {formatMinutes(rule.endMinute)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white">{formatCurrency(rule.priceCents)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white">{rule.priority}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      className={rule.isActive
                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                        : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}
                    >
                      {rule.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/prices/${rule.id}/edit`}>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </Link>
                      <DeletePriceRuleButton ruleId={rule.id} />
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
