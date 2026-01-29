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
}

type SessionOption = {
  id: string
  movieTitle: string
  startTime: string | Date
  cinemaId: string | null
  auditoriumId: string | null
}

type PriceRuleFormData = {
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
}

type PriceRuleFormProps = {
  cinemas: CinemaOption[]
  auditoriums: AuditoriumOption[]
  sessions: SessionOption[]
  initialData?: PriceRuleFormData | null
}

const DAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
]

function minutesToTime(value: number | null) {
  if (value === null) return ''
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function timeToMinutes(value: string) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

export function PriceRuleForm({
  cinemas,
  auditoriums,
  sessions,
  initialData,
}: PriceRuleFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialData?.name || '')
  const [priority, setPriority] = useState(initialData?.priority ?? 0)
  const [priceCents, setPriceCents] = useState(initialData?.priceCents ?? 0)
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)
  const [cinemaId, setCinemaId] = useState(initialData?.cinemaId || '')
  const [auditoriumId, setAuditoriumId] = useState(initialData?.auditoriumId || '')
  const [sessionId, setSessionId] = useState(initialData?.sessionId || '')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initialData?.daysOfWeek || [])
  const [startTime, setStartTime] = useState(minutesToTime(initialData?.startMinute ?? null))
  const [endTime, setEndTime] = useState(minutesToTime(initialData?.endMinute ?? null))
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  const toggleDay = (value: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(value)) {
        return prev.filter((day) => day !== value)
      }
      return [...prev, value]
    })
  }

  const handleSubmit = async () => {
    setError(null)

    if (!name) {
      setError('Nome obrigatorio')
      return
    }

    if (priceCents < 0) {
      setError('Preco invalido')
      return
    }

    const startMinute = timeToMinutes(startTime)
    const endMinute = timeToMinutes(endTime)

    if ((startTime || endTime) && (startMinute === null || endMinute === null)) {
      setError('Hora inicial e final devem ser validas')
      return
    }

    const payload = {
      name,
      priority: Number(priority),
      priceCents: Number(priceCents),
      isActive,
      cinemaId: cinemaId || null,
      auditoriumId: auditoriumId || null,
      sessionId: sessionId || null,
      daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : null,
      startMinute,
      endMinute,
    }

    setIsSaving(true)

    const url = initialData
      ? `/api/admin/price-rules/${initialData.id}`
      : '/api/admin/price-rules'
    const method = initialData ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setIsSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao salvar regra')
      return
    }

    router.push('/admin/prices')
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
            <Label className="text-gray-300">Nome</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Matinee Sao Paulo"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Preco (centavos)</Label>
              <Input
                type="number"
                min={0}
                value={priceCents}
                onChange={(event) => setPriceCents(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Prioridade</Label>
              <Input
                type="number"
                min={0}
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value))}
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
                setSessionId('')
              }}
            >
              <option value="">Todos</option>
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
              onChange={(event) => {
                setAuditoriumId(event.target.value)
                setSessionId('')
              }}
            >
              <option value="">Todas</option>
              {auditoriumOptions.map((auditorium) => (
                <option key={auditorium.id} value={auditorium.id}>
                  {auditorium.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Sessao</Label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
              value={sessionId}
              onChange={(event) => setSessionId(event.target.value)}
            >
              <option value="">Todas</option>
              {sessionOptions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.movieTitle}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Dias da semana</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <label key={day.value} className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={daysOfWeek.includes(day.value)}
                    onChange={() => toggleDay(day.value)}
                    className="accent-red-500"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Hora inicial</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Hora final</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="accent-red-500"
            />
            Regra ativa
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-red-600 hover:bg-red-700"
          onClick={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? 'Salvando...' : 'Salvar regra'}
        </Button>
      </div>
    </div>
  )
}
