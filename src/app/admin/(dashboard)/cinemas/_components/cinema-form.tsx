'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type CinemaData = {
  id?: string
  name: string
  city: string
  state: string
  country: string
  isIMAX: boolean
  format: string
  lat: number
  lng: number
  address: string
  zipCode: string
}

type Props = {
  initialData?: CinemaData
  isEditing?: boolean
}

export function CinemaForm({ initialData, isEditing = false }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<CinemaData>(
    initialData || {
      name: '',
      city: '',
      state: '',
      country: 'BR',
      isIMAX: true,
      format: 'IMAX 70mm',
      lat: 0,
      lng: 0,
      address: '',
      zipCode: '',
    }
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        isEditing ? `/api/admin/cinemas/${initialData?.id}` : '/api/admin/cinemas',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao salvar cinema')
        return
      }

      router.push('/admin/cinemas')
      router.refresh()
    } catch (err) {
      console.error('Error saving cinema:', err)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-6">
        {/* Nome */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">Nome do Cinema *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: AMC Lincoln Square"
              className="bg-gray-700/50 border-gray-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="id" className="text-gray-300">ID (slug)</Label>
            <Input
              id="id"
              value={formData.id || generateSlug(formData.name)}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              placeholder="amc-lincoln-square"
              className="bg-gray-700/50 border-gray-600 text-white"
              disabled={isEditing}
            />
          </div>
        </div>

        {/* Localização */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city" className="text-gray-300">Cidade *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="São Paulo"
              className="bg-gray-700/50 border-gray-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state" className="text-gray-300">Estado *</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="SP"
              className="bg-gray-700/50 border-gray-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country" className="text-gray-300">País</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="BR"
              className="bg-gray-700/50 border-gray-600 text-white"
            />
          </div>
        </div>

        {/* Endereço */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address" className="text-gray-300">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, bairro"
              className="bg-gray-700/50 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode" className="text-gray-300">CEP</Label>
            <Input
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              placeholder="00000-000"
              className="bg-gray-700/50 border-gray-600 text-white"
            />
          </div>
        </div>

        {/* Coordenadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="lat" className="text-gray-300">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lng" className="text-gray-300">Longitude</Label>
            <Input
              id="lng"
              type="number"
              step="any"
              value={formData.lng}
              onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
              className="bg-gray-700/50 border-gray-600 text-white"
            />
          </div>
        </div>

        {/* Formato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format" className="text-gray-300">Formato</Label>
            <select
              id="format"
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
            >
              <option value="IMAX 70mm">IMAX 70mm</option>
              <option value="IMAX Digital">IMAX Digital</option>
              <option value="IMAX Laser">IMAX Laser</option>
              <option value="Standard">Standard</option>
              <option value="Dolby Cinema">Dolby Cinema</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">IMAX?</Label>
            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.isIMAX}
                  onChange={() => setFormData({ ...formData, isIMAX: true })}
                  className="text-red-500"
                />
                <span className="text-white">Sim</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.isIMAX}
                  onChange={() => setFormData({ ...formData, isIMAX: false })}
                  className="text-red-500"
                />
                <span className="text-white">Não</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href="/admin/cinemas">
          <Button type="button" variant="ghost" className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <Button
          type="submit"
          className="bg-red-600 hover:bg-red-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? 'Atualizar' : 'Cadastrar'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
