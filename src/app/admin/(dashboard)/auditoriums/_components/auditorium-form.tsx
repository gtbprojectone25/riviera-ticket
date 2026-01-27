'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'

type CinemaOption = {
  id: string
  name: string
}

type AssetOption = {
  id: string
  title: string | null
  fileName: string
  url: string
}

type AuditoriumFormData = {
  id: string
  cinemaId: string
  name: string
  type: 'IMAX' | 'NORMAL'
  capacity: number
  totalSeats: number
  imageAssetId: string | null
  seatMapConfig: unknown | null
  layout: unknown
}

type AuditoriumFormProps = {
  cinemas: CinemaOption[]
  assets: AssetOption[]
  initialData?: AuditoriumFormData | null
}

type SeatMapValidation = {
  value: unknown | null
  error: string | null
}

function validateSeatMap(text: string): SeatMapValidation {
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') {
      return { value: null, error: 'JSON deve ser um objeto' }
    }

    const rowsConfig = (parsed as { rowsConfig?: unknown }).rowsConfig
    if (!Array.isArray(rowsConfig) || rowsConfig.length === 0) {
      return { value: null, error: 'rowsConfig deve ser um array nao vazio' }
    }

    for (const row of rowsConfig) {
      if (!row || typeof row !== 'object') {
        return { value: null, error: 'rowsConfig invalido' }
      }
      const rowLabel = (row as { row?: unknown }).row
      const seatCount = (row as { seatCount?: unknown }).seatCount
      if (typeof rowLabel !== 'string' || rowLabel.length === 0) {
        return { value: null, error: 'row deve ser string' }
      }
      if (typeof seatCount !== 'number' || Number.isNaN(seatCount)) {
        return { value: null, error: 'seatCount deve ser numero' }
      }
    }

    return { value: parsed, error: null }
  } catch {
    return { value: null, error: 'JSON invalido' }
  }
}

export function AuditoriumForm({ cinemas, assets, initialData }: AuditoriumFormProps) {
  const router = useRouter()
  const [cinemaId, setCinemaId] = useState(initialData?.cinemaId || cinemas[0]?.id || '')
  const [name, setName] = useState(initialData?.name || '')
  const [type, setType] = useState<'IMAX' | 'NORMAL'>(initialData?.type || 'NORMAL')
  const [capacity, setCapacity] = useState(
    initialData?.capacity ?? initialData?.totalSeats ?? 0
  )
  const [imageAssetId, setImageAssetId] = useState(initialData?.imageAssetId || '')
  const [seatMapText, setSeatMapText] = useState(() => {
    const seed = initialData?.seatMapConfig || initialData?.layout || { rowsConfig: [] }
    return JSON.stringify(seed, null, 2)
  })
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const assetOptions = useMemo(() => {
    return [{ id: '', label: 'Sem imagem' }, ...assets.map((asset) => ({
      id: asset.id,
      label: asset.title || asset.fileName,
    }))]
  }, [assets])

  const handleSubmit = async () => {
    setError(null)

    if (!cinemaId) {
      setError('Selecione um cinema')
      return
    }

    if (!name) {
      setError('Nome obrigatorio')
      return
    }

    const seatMapValidation = validateSeatMap(seatMapText)
    if (seatMapValidation.error) {
      setError(seatMapValidation.error)
      return
    }

    const payload = {
      cinemaId,
      name,
      type,
      capacity: Number(capacity),
      imageAssetId: imageAssetId || null,
      seatMapConfig: seatMapValidation.value,
    }

    setIsSaving(true)

    const url = initialData
      ? `/api/admin/auditoriums/${initialData.id}`
      : '/api/admin/auditoriums'
    const method = initialData ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setIsSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao salvar')
      return
    }

    router.push('/admin/auditoriums')
    router.refresh()
  }

  return (
    <div className="space-y-6 bg-gray-900/60 border border-gray-800 rounded-xl p-6">
      {error && (
        <div className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Cinema</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              value={cinemaId}
              onChange={(event) => setCinemaId(event.target.value)}
            >
              {cinemas.map((cinema) => (
                <option key={cinema.id} value={cinema.id}>
                  {cinema.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Nome</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sala IMAX 1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Tipo</Label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
                value={type}
                onChange={(event) => setType(event.target.value as 'IMAX' | 'NORMAL')}
              >
                <option value="NORMAL">Normal</option>
                <option value="IMAX">IMAX</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Capacidade</Label>
              <Input
                type="number"
                min={0}
                value={capacity}
                onChange={(event) => setCapacity(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Imagem da sala</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              value={imageAssetId}
              onChange={(event) => setImageAssetId(event.target.value)}
            >
              {assetOptions.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-300">Seat map (JSON)</Label>
          <textarea
            className="w-full min-h-[320px] bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 font-mono"
            value={seatMapText}
            onChange={(event) => setSeatMapText(event.target.value)}
          />
          <p className="text-xs text-gray-500">
            Exemplo: {`{ "rowsConfig": [{ "row": "A", "seatCount": 10 }] }`}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-red-600 hover:bg-red-700"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar sala'}
        </Button>
      </div>
    </div>
  )
}
