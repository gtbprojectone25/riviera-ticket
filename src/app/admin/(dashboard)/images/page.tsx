'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type Asset = {
  id: string
  url: string
  fileName: string
  originalName: string | null
  mimeType: string
  size: number
  title: string | null
  alt: string | null
  createdAt: string
}

type SlotKey = 'HOME_HERO' | 'POSTER' | 'CINEMA_COVER' | 'AUDITORIUM_IMAGE'

type ImageSlot = {
  id: string
  slot: SlotKey
  assetId: string
  cinemaId: string | null
  auditoriumId: string | null
  createdAt: string
  updatedAt: string
  asset: Asset | null
}

const SLOT_OPTIONS: Array<{ value: SlotKey; label: string }> = [
  { value: 'HOME_HERO', label: 'Home Hero' },
  { value: 'POSTER', label: 'Poster' },
  { value: 'CINEMA_COVER', label: 'Cinema Cover' },
  { value: 'AUDITORIUM_IMAGE', label: 'Auditorium Image' },
]

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  const kb = value / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function validateScope(slot: SlotKey, cinemaId?: string, auditoriumId?: string) {
  if (slot === 'CINEMA_COVER' && !cinemaId) return 'cinemaId obrigatorio'
  if (slot === 'AUDITORIUM_IMAGE' && !auditoriumId) return 'auditoriumId obrigatorio'
  if ((slot === 'HOME_HERO' || slot === 'POSTER') && (cinemaId || auditoriumId)) {
    return 'HOME_HERO e POSTER nao aceitam cinemaId/auditoriumId'
  }
  return null
}

export default function AdminImagesPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [slots, setSlots] = useState<ImageSlot[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [alt, setAlt] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<SlotKey>('HOME_HERO')
  const [cinemaId, setCinemaId] = useState('')
  const [auditoriumId, setAuditoriumId] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAssets = async () => {
    const res = await fetch('/api/admin/assets')
    if (!res.ok) return
    const data = await res.json()
    setAssets(data)
  }

  const loadSlots = async () => {
    const res = await fetch('/api/admin/image-slots')
    if (!res.ok) return
    const data = await res.json()
    setSlots(data)
  }

  useEffect(() => {
    void loadAssets()
    void loadSlots()
  }, [])

  const handleUpload = async () => {
    if (!file) {
      setError('Selecione um arquivo')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (title) formData.append('title', title)
      if (alt) formData.append('alt', alt)

      const res = await fetch('/api/admin/assets', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erro ao enviar imagem')
        return
      }

      setFile(null)
      setTitle('')
      setAlt('')
      await loadAssets()
    } finally {
      setIsUploading(false)
    }
  }

  const handleSelectSlot = async (assetId: string) => {
    const scopeError = validateScope(
      selectedSlot,
      cinemaId || undefined,
      auditoriumId || undefined
    )
    if (scopeError) {
      setError(scopeError)
      return
    }

    const payload = {
      slot: selectedSlot,
      assetId,
      cinemaId: cinemaId || undefined,
      auditoriumId: auditoriumId || undefined,
    }

    const res = await fetch('/api/admin/image-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao definir slot')
      return
    }

    setError(null)
    await loadSlots()
  }

  const handleDeleteAsset = async (assetId: string) => {
    const res = await fetch(`/api/admin/assets/${assetId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao remover asset')
      return
    }
    await loadAssets()
    await loadSlots()
  }

  const handleClearSlot = async (slot: SlotKey, slotCinemaId?: string | null, slotAuditoriumId?: string | null) => {
    const payload = {
      slot,
      cinemaId: slotCinemaId || undefined,
      auditoriumId: slotAuditoriumId || undefined,
    }

    const res = await fetch('/api/admin/image-slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Erro ao remover slot')
      return
    }

    await loadSlots()
  }

  const slotsByKey = useMemo(() => {
    return SLOT_OPTIONS.map((slot) => ({
      slot: slot.value,
      label: slot.label,
      items: slots.filter((item) => item.slot === slot.value),
    }))
  }, [slots])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Images</h1>
        <p className="text-sm text-gray-400">Upload, organize e selecione imagens para os slots.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Arquivo</Label>
              <Input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Titulo</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Alt text</Label>
              <Input
                value={alt}
                onChange={(event) => setAlt(event.target.value)}
                placeholder="Opcional"
              />
            </div>
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={isUploading}
              onClick={handleUpload}
            >
              {isUploading ? 'Enviando...' : 'Enviar imagem'}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Slots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Slot atual</Label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200"
                value={selectedSlot}
                onChange={(event) => setSelectedSlot(event.target.value as SlotKey)}
              >
                {SLOT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">cinemaId</Label>
                <Input
                  value={cinemaId}
                  onChange={(event) => setCinemaId(event.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">auditoriumId</Label>
                <Input
                  value={auditoriumId}
                  onChange={(event) => setAuditoriumId(event.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Use cinemaId para CINEMA_COVER e auditoriumId para AUDITORIUM_IMAGE.
            </div>
            <div className="space-y-3">
              {slotsByKey.map((group) => (
                <div key={group.slot} className="space-y-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">{group.label}</div>
                  {group.items.length === 0 && (
                    <div className="text-xs text-gray-500">Sem imagem selecionada</div>
                  )}
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-800/60 rounded-lg p-3">
                      <div className="w-14 h-14 bg-gray-700 rounded-md overflow-hidden flex items-center justify-center">
                        {item.asset?.url ? (
                          <Image
                            src={item.asset.url}
                            alt={item.asset.alt || 'preview'}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No image</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{item.asset?.title || item.asset?.fileName || 'Sem titulo'}</div>
                        <div className="text-xs text-gray-500">
                          {item.cinemaId ? `cinemaId: ${item.cinemaId}` : ''}
                          {item.auditoriumId ? ` auditoriumId: ${item.auditoriumId}` : ''}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="text-xs"
                        onClick={() => handleClearSlot(item.slot, item.cinemaId, item.auditoriumId)}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Biblioteca de imagens</CardTitle>
        </CardHeader>
        <CardContent>
          {assets.length === 0 && (
            <div className="text-sm text-gray-500">Nenhum asset enviado.</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-gray-800/70 border border-gray-700 rounded-lg overflow-hidden">
                <div className="aspect-video bg-gray-700 flex items-center justify-center overflow-hidden">
                  <Image
                    src={asset.url}
                    alt={asset.alt || asset.fileName}
                    width={640}
                    height={360}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-gray-700 text-gray-200">
                      {asset.mimeType}
                    </Badge>
                    <span className="text-xs text-gray-500">{formatBytes(asset.size)}</span>
                  </div>
                  <div className="text-sm text-white truncate">{asset.title || asset.fileName}</div>
                  {asset.alt && <div className="text-xs text-gray-500 truncate">alt: {asset.alt}</div>}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-red-600 hover:bg-red-700"
                      onClick={() => handleSelectSlot(asset.id)}
                    >
                      Usar no slot
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleDeleteAsset(asset.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
