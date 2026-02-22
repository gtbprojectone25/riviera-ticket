'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download, Filter } from 'lucide-react'
import { useState, useCallback } from 'react'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'SUCCEEDED', label: 'Pago' },
  { value: 'FAILED', label: 'Falhou' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export function OrdersFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    router.push(`/admin/orders?${params.toString()}`)
  }, [search, status, dateFrom, dateTo, router])

  const clearFilters = useCallback(() => {
    setSearch('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
    router.push('/admin/orders')
  }, [router])

  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const handleExportExcel = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    setExportingExcel(true)
    try {
      const res = await fetch(`/api/admin/reports/orders/excel?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Falha ao exportar')
      }
      const blob = await res.blob()
      const date = new Date().toISOString().split('T')[0]
      downloadBlob(blob, `pedidos-${date}.xlsx`)
    } catch (e) {
      console.error(e)
      alert((e instanceof Error ? e.message : 'Erro ao exportar Excel. Verifique se está logado no admin.') as string)
    } finally {
      setExportingExcel(false)
    }
  }, [search, status, dateFrom, dateTo])

  const handleExportPdf = useCallback(async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    setExportingPdf(true)
    try {
      const res = await fetch(`/api/admin/reports/orders/pdf?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Falha ao exportar')
      }
      const blob = await res.blob()
      const date = new Date().toISOString().split('T')[0]
      downloadBlob(blob, `pedidos-${date}.pdf`)
    } catch (e) {
      console.error(e)
      alert((e instanceof Error ? e.message : 'Erro ao exportar PDF. Verifique se está logado no admin.') as string)
    } finally {
      setExportingPdf(false)
    }
  }, [search, status, dateFrom, dateTo])

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por email, nome ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
          />
        </div>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-gray-700/50 border-gray-600 text-white w-auto"
          />
          <span className="text-gray-500">até</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-gray-700/50 border-gray-600 text-white w-auto"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button onClick={applyFilters} className="bg-red-600 hover:bg-red-700">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
          <Button variant="outline" onClick={clearFilters} className="border-gray-600 text-gray-300">
            Limpar
          </Button>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={handleExportExcel}
          disabled={exportingExcel}
          className="border-green-600 text-green-500 hover:bg-green-600/10"
        >
          <Download className="w-4 h-4 mr-2" />
          {exportingExcel ? 'Exportando...' : 'Exportar Excel'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="border-red-600 text-red-500 hover:bg-red-600/10"
        >
          <Download className="w-4 h-4 mr-2" />
          {exportingPdf ? 'Exportando...' : 'Exportar PDF'}
        </Button>
      </div>
    </div>
  )
}
