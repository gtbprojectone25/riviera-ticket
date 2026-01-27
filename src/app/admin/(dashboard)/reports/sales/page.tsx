'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SalesSummary = {
  revenueCents: number
  ticketsSold: number
  ordersCount: number
  avgTicketCents: number
}

type RegionRow = {
  region: string
  country: string
  revenueCents: number
  ticketsSold: number
}

type CityRow = {
  city: string
  state: string
  revenueCents: number
  ticketsSold: number
}

type CinemaRow = {
  cinemaId: string
  cinemaName: string
  city: string
  state: string
  revenueCents: number
  ticketsSold: number
}

type SessionRow = {
  sessionId: string
  movieTitle: string
  startTime: string
  cinemaName: string
  auditoriumName: string | null
  revenueCents: number
  ticketsSold: number
}

type UserRow = {
  userId: string
  name: string
  email: string
  revenueCents: number
  ticketsSold: number
}

type SalesReport = {
  summary: SalesSummary
  salesByRegion: RegionRow[]
  salesByCity: CityRow[]
  salesByCinema: CinemaRow[]
  salesBySession: SessionRow[]
  salesByUser: UserRow[]
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100)
}

export default function SalesReportPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<SalesReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportType, setExportType] = useState('session')

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }, [from, to])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/reports/sales${queryString}`)
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || 'Erro ao carregar relatorio')
      }
      const payload = (await res.json()) as SalesReport
      setData(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatorio')
    } finally {
      setIsLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-white">Relatorio de vendas</h1>
        <p className="text-sm text-gray-400">
          Receita, ingressos vendidos, ticket medio e detalhamento.
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-gray-400">De</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400">Ate</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button className="bg-red-600 hover:bg-red-700" onClick={fetchData}>
              Aplicar
            </Button>
          </div>
          <div>
            <label className="text-xs text-gray-400">Exportar</label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              value={exportType}
              onChange={(event) => setExportType(event.target.value)}
            >
              <option value="summary">Resumo</option>
              <option value="region">Regiao</option>
              <option value="city">Cidade</option>
              <option value="cinema">Cinema</option>
              <option value="session">Sessao</option>
              <option value="user">Usuario</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                const params = new URLSearchParams()
                if (from) params.set('from', from)
                if (to) params.set('to', to)
                params.set('type', exportType)
                window.location.href = `/api/admin/reports/sales/export?${params.toString()}`
              }}
            >
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="bg-gray-800/50 h-24 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Receita total</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-white">
                {formatCurrency(data.summary.revenueCents)}
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Ingressos vendidos</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-white">
                {data.summary.ticketsSold}
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-white">
                {data.summary.ordersCount}
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Ticket medio</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold text-white">
                {formatCurrency(data.summary.avgTicketCents)}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Vendas por regiao</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left py-2">Regiao</th>
                    <th className="text-left py-2">Pais</th>
                    <th className="text-right py-2">Ingressos</th>
                    <th className="text-right py-2">Receita</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {data.salesByRegion.map((row) => (
                    <tr key={`${row.region}-${row.country}`} className="border-t border-gray-800">
                      <td className="py-2">{row.region}</td>
                      <td className="py-2">{row.country}</td>
                      <td className="py-2 text-right">{row.ticketsSold}</td>
                      <td className="py-2 text-right">{formatCurrency(row.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Vendas por cidade</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left py-2">Cidade</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-right py-2">Ingressos</th>
                    <th className="text-right py-2">Receita</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {data.salesByCity.map((row) => (
                    <tr key={`${row.city}-${row.state}`} className="border-t border-gray-800">
                      <td className="py-2">{row.city}</td>
                      <td className="py-2">{row.state}</td>
                      <td className="py-2 text-right">{row.ticketsSold}</td>
                      <td className="py-2 text-right">{formatCurrency(row.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Vendas por cinema</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left py-2">Cinema</th>
                    <th className="text-left py-2">Cidade</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-right py-2">Ingressos</th>
                    <th className="text-right py-2">Receita</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {data.salesByCinema.map((row) => (
                    <tr key={row.cinemaId} className="border-t border-gray-800">
                      <td className="py-2">{row.cinemaName}</td>
                      <td className="py-2">{row.city}</td>
                      <td className="py-2">{row.state}</td>
                      <td className="py-2 text-right">{row.ticketsSold}</td>
                      <td className="py-2 text-right">{formatCurrency(row.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Vendas por sessao</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left py-2">Sessao</th>
                    <th className="text-left py-2">Cinema</th>
                    <th className="text-left py-2">Sala</th>
                    <th className="text-left py-2">Data/Hora</th>
                    <th className="text-right py-2">Ingressos</th>
                    <th className="text-right py-2">Receita</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {data.salesBySession.map((row) => (
                    <tr key={row.sessionId} className="border-t border-gray-800">
                      <td className="py-2">{row.movieTitle}</td>
                      <td className="py-2">{row.cinemaName}</td>
                      <td className="py-2">{row.auditoriumName || '-'}</td>
                      <td className="py-2">
                        {new Date(row.startTime).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 text-right">{row.ticketsSold}</td>
                      <td className="py-2 text-right">{formatCurrency(row.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Vendas por usuario</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-right py-2">Ingressos</th>
                    <th className="text-right py-2">Receita</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {data.salesByUser.map((row) => (
                    <tr key={row.userId} className="border-t border-gray-800">
                      <td className="py-2">{row.name}</td>
                      <td className="py-2">{row.email}</td>
                      <td className="py-2 text-right">{row.ticketsSold}</td>
                      <td className="py-2 text-right">{formatCurrency(row.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
