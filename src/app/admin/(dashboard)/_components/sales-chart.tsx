'use client'

import { useMemo, useEffect, useState, useCallback } from 'react'
import { format, subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Period = 'week' | 'month' | 'quarter'

type DayItem = {
  day: string
  revenue: number // em reais (centavos / 100)
}

/** Chave de data em UTC para bater com a API (agrupamento em UTC). */
function toUTCDateKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDateRange(period: Period): { from: Date; to: Date } {
  const now = new Date()
  const to = endOfDay(now) // inclui o dia inteiro de hoje (igual ao card Faturamento)
  if (period === 'week') {
    return { from: startOfDay(subDays(now, 6)), to }
  }
  if (period === 'month') {
    // Mesmo critério do card "Faturamento Mensal": desde o mesmo dia no mês passado
    return { from: startOfDay(subMonths(now, 1)), to }
  }
  // quarter: últimos 3 meses
  return { from: startOfDay(subMonths(now, 3)), to }
}

export function SalesChart() {
  const [period, setPeriod] = useState<Period>('week')
  const [daily, setDaily] = useState<{ date: string; revenueCents: number }[]>([])
  const [loading, setLoading] = useState(true)

  const { from, to } = useMemo(() => getDateRange(period), [period])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      })
      const res = await fetch(`/api/admin/reports/sales/daily?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = (await res.json()) as { daily: { date: string; revenueCents: number }[] }
      setDaily(data.daily ?? [])
    } catch {
      setDaily([])
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const chartData = useMemo((): DayItem[] => {
    const byDate = new Map(daily.map((d) => [d.date, d.revenueCents / 100]))

    if (period === 'week') {
      const days = eachDayOfInterval({ start: from, end: to })
      return days.map((date) => {
        const key = toUTCDateKey(date)
        return {
          day: format(date, 'EEE', { locale: ptBR }),
          revenue: byDate.get(key) ?? 0,
        }
      })
    }

    if (period === 'month') {
      const days = eachDayOfInterval({ start: from, end: to })
      const weekStarts = eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 1 })
      return weekStarts.slice(0, 5).map((weekStart, i) => {
        const weekDays = days.filter(
          (d) => d >= weekStart && d < (weekStarts[i + 1] ?? new Date(to.getTime() + 1))
        )
        const revenue = weekDays.reduce((sum, d) => sum + (byDate.get(toUTCDateKey(d)) ?? 0), 0)
        return {
          day: `Sem. ${i + 1}`,
          revenue,
        }
      })
    }

    // quarter: agrupar por mês
    const months = eachMonthOfInterval({ start: from, end: to })
    const days = eachDayOfInterval({ start: from, end: to })
    return months.map((month) => {
      const monthDays = days.filter((d) => isSameMonth(d, month))
      const revenue = monthDays.reduce((sum, d) => sum + (byDate.get(toUTCDateKey(d)) ?? 0), 0)
      return {
        day: format(month, 'MMM', { locale: ptBR }),
        revenue,
      }
    })
  }, [period, daily, from, to])

  const maxRevenue = useMemo(
    () => (chartData.length ? Math.max(...chartData.map((d) => d.revenue), 1) : 1),
    [chartData]
  )
  const totalRevenue = useMemo(() => chartData.reduce((acc, d) => acc + d.revenue, 0), [chartData])

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Vendas da Semana</h3>
          <p className="text-sm text-gray-400 mt-1">
            {loading ? 'Carregando...' : (
              <>Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}</>
            )}
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-red-500"
        >
          <option value="week">Última semana</option>
          <option value="month">Último mês</option>
          <option value="quarter">Último trimestre</option>
        </select>
      </div>

      {loading && (
        <div className="flex items-end justify-between gap-2 h-48 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex-1 bg-gray-700 rounded-t" style={{ height: '40%' }} />
          ))}
        </div>
      )}

      {!loading && chartData.length > 0 && (
        <div className="flex items-end justify-between gap-2 h-48">
          {chartData.map((data) => {
            const heightPercent = (data.revenue / maxRevenue) * 100
            return (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs text-gray-400 mb-1">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      notation: 'compact',
                    }).format(data.revenue)}
                  </span>
                  <div
                    className="w-full max-w-10 bg-linear-to-t from-red-600 to-red-400 rounded-t-lg transition-all duration-300 hover:from-red-500 hover:to-red-300"
                    style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                  />
                </div>
                <span className="text-xs text-gray-500">{data.day}</span>
              </div>
            )
          })}
        </div>
      )}

      {!loading && chartData.length === 0 && (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          Nenhuma venda no período.
        </div>
      )}
    </div>
  )
}
