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

type AuditoriumOption = {
  id: string
  name: string
  cinemaId: string
  type: string | null
}

type SessionFormData = {
  id: string
  movieTitle: string
  movieDuration: number
  startTime: string | Date
  cinemaId: string | null
  auditoriumId: string | null
  screenType: 'IMAX_70MM' | 'STANDARD'
  basePrice: number
  vipPrice: number
  salesStatus: 'ACTIVE' | 'PAUSED' | 'CLOSED' | null
}

type SessionFormProps = {
  cinemas: CinemaOption[]
  auditoriums: AuditoriumOption[]
  initialData?: SessionFormData | null
}

function formatDateTimeInput(value: string | Date | null | undefined) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (val: number) => String(val).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function SessionForm({ cinemas, auditoriums, initialData }: SessionFormProps) {
  const router = useRouter()
  const [cinemaId, setCinemaId] = useState(initialData?.cinemaId || cinemas[0]?.id || '')
  const [auditoriumId, setAuditoriumId] = useState(initialData?.auditoriumId || '')
  const [movieTitle, setMovieTitle] = useState(initialData?.movieTitle || '')
  const [movieDuration, setMovieDuration] = useState(initialData?.movieDuration || 120)
  const [startTime, setStartTime] = useState(formatDateTimeInput(initialData?.startTime))
  const [screenType, setScreenType] = useState<'IMAX_70MM' | 'STANDARD'>(
    initialData?.screenType || 'IMAX_70MM'
  )
  const [basePrice, setBasePrice] = useState(initialData?.basePrice || 0)
  const [vipPrice, setVipPrice] = useState(initialData?.vipPrice || 0)
  const [salesStatus, setSalesStatus] = useState<'ACTIVE' | 'PAUSED' | 'CLOSED'>(
    initialData?.salesStatus || 'ACTIVE'
  )
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const auditoriumOptions = useMemo(() => {
    return auditoriums.filter((aud) => aud.cinemaId === cinemaId)
  }, [auditoriums, cinemaId])

  const handleSubmit = async () => {
    setError(null)

    if (!movieTitle) {
      setError('Titulo obrigatorio')
      return
    }
    if (!startTime) {
      setError('Data/hora obrigatoria')
      return
    }
    if (!cinemaId) {
      setError('Selecione um cinema')
      return
    }
    if (!auditoriumId) {
      setError('Selecione uma sala')
      return
    }

    setIsSaving(true)

    const payload = {
      movieTitle,
      movieDuration: Number(movieDuration),
      startTime,
      cinemaId,
      auditoriumId,
      screenType,
      basePrice: Number(basePrice),
      vipPrice: Number(vipPrice),
      salesStatus,
    }

    const url = initialData
      ? `/api/admin/sessions/${initialData.id}`
      : '/api/admin/sessions'
    const method = initialData ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setIsSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao salvar sessao')
      return
    }

    router.push('/admin/sessions')
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
            <Label className="text-gray-300">Titulo</Label>
            <Input
              value={movieTitle}
              onChange={(event) => setMovieTitle(event.target.value)}
              placeholder="Nome do filme"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Duracao (min)</Label>
              <Input
                type="number"
                min={1}
                value={movieDuration}
                onChange={(event) => setMovieDuration(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Data/Hora</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Cinema</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              value={cinemaId}
              onChange={(event) => {
                setCinemaId(event.target.value)
                setAuditoriumId('')
              }}
            >
              {cinemas.map((cinema) => (
                <option key={cinema.id} value={cinema.id}>
                  {cinema.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Sala</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              value={auditoriumId}
              onChange={(event) => setAuditoriumId(event.target.value)}
            >
              <option value="">Selecione</option>
              {auditoriumOptions.map((auditorium) => (
                <option key={auditorium.id} value={auditorium.id}>
                  {auditorium.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Formato</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              value={screenType}
              onChange={(event) => setScreenType(event.target.value as 'IMAX_70MM' | 'STANDARD')}
            >
              <option value="IMAX_70MM">IMAX 70mm</option>
              <option value="STANDARD">Standard</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Preco base (centavos)</Label>
              <Input
                type="number"
                min={0}
                value={basePrice}
                onChange={(event) => setBasePrice(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Preco VIP (centavos)</Label>
              <Input
                type="number"
                min={0}
                value={vipPrice}
                onChange={(event) => setVipPrice(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Status de vendas</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              value={salesStatus}
              onChange={(event) => setSalesStatus(event.target.value as 'ACTIVE' | 'PAUSED' | 'CLOSED')}
            >
              <option value="ACTIVE">Ativa</option>
              <option value="PAUSED">Pausada</option>
              <option value="CLOSED">Encerrada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-red-600 hover:bg-red-700"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar sessao'}
        </Button>
      </div>
    </div>
  )
}
