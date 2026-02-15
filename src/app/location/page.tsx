'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

import { cinemas as cinemasData, type Cinema } from "@/data/cinemas"
import { useBookingStore } from '@/stores/booking'
import { MapModal } from "@/app/location/_components/MapModal"

type Status = 'idle' | 'loading' | 'success' | 'empty' | 'error'
type CinemaSearchApiItem = {
    id: string
    name: string
    city: string
    state: string
    country?: string
    isIMAX?: boolean
    format?: string
    formats?: string[]
    address?: string
    zipCode?: string
    latitude?: number
    lat?: number
    longitude?: number
    lng?: number
}

export default function LocationPage() {
    const router = useRouter()

    const [selectedState, setSelectedState] = useState('')
    const [selectedCity, setSelectedCity] = useState('')

    const [cinemas, setCinemas] = useState<Cinema[]>([])
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<Status>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const [showMapModal, setShowMapModal] = useState(false)
    const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 })

    const setCinemaStore = useBookingStore((s) => s.setCinema)

    const states = [...new Set(cinemasData.map(c => c.state))]
    const cities = selectedState
        ? [...new Set(cinemasData.filter(c => c.state === selectedState).map(c => c.city))]
        : []

    const handleFindNearest = () => {
        setLoading(true)
        setStatus('loading')
        setErrorMessage(null)

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const userLoc = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }
                setMapCenter(userLoc)
                setShowMapModal(true)
                setLoading(false)
                setStatus('idle')
            },
            () => {
                setLoading(false)
                setStatus('error')
                setErrorMessage('Não foi possível obter sua localização.')
            }
        )
    }

    const handleApply = async () => {
        setLoading(true)
        setStatus('loading')
        setErrorMessage(null)

        try {
            const params = new URLSearchParams()
            if (selectedState) params.set('state', selectedState)
            if (selectedCity) params.set('city', selectedCity)

            let list: Cinema[] = []
            const response = await fetch(`/api/cinemas/search?${params.toString()}`)

            if (response.ok) {
                const data = await response.json() as { cinemas?: CinemaSearchApiItem[] }
                list = (data.cinemas ?? []).map((c) => ({
                    id: c.id,
                    name: c.name,
                    city: c.city,
                    state: c.state,
                    country: c.country ?? 'USA',
                    isIMAX: typeof c.isIMAX === 'boolean' ? c.isIMAX : true,
                    format: c.format ?? (Array.isArray(c.formats) ? c.formats[0] : undefined),
                    address: c.address,
                    zipCode: c.zipCode,
                    lat: c.latitude ?? c.lat ?? 0,
                    lng: c.longitude ?? c.lng ?? 0,
                })) as Cinema[]
            }

            if (list.length === 0) {
                list = cinemasData.filter(
                    (c) => c.state === selectedState && c.city === selectedCity
                )
            }

            setCinemas(list)
            setStatus(list.length > 0 ? 'success' : 'empty')
        } catch (error) {
            const fallback = cinemasData.filter(
                (c) => c.state === selectedState && c.city === selectedCity
            )
            setCinemas(fallback)
            setStatus(fallback.length > 0 ? 'success' : 'error')
            if (fallback.length === 0) {
                setErrorMessage(error instanceof Error ? error.message : 'Erro ao buscar cinemas')
            }
        } finally {
            setLoading(false)
        }
    }

    function handleWatchHere(cinemaId: string) {
        const cinema = cinemas.find((c) => c.id === cinemaId) || cinemasData.find((c) => c.id === cinemaId)
        if (!cinema) return

        setCinemaStore(cinema)
        router.push("/ticket-selection")
    }

    return (
        <div className="min-h-screen text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col min-h-screen">
                <div className="flex-1 flex items-start justify-center p-4 pt-6">
                    <div className="w-full max-w-sm space-y-6 relative rounded-xl p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]">

                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-bold text-white drop-shadow-lg">The Odyssey</h1>
                            <Badge variant="secondary" className="bg-gray-700/80 text-white border border-gray-600">
                                Pre-order
                            </Badge>
                        </div>

                        <hr className="border-gray-700" />

                        <h2 className="text-sm font-medium text-gray-200">Where to watch</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-medium">State</label>
                                <Select value={selectedState} onValueChange={setSelectedState}>
                                    <SelectTrigger className="w-full bg-gray-900/80 border-gray-600 text-gray-300">
                                        <SelectValue placeholder="Select a state" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#121212] border-gray-700 text-gray-200">
                                        {states.map((st) => (
                                            <SelectItem key={st} value={st}>{st}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs text-gray-400 font-medium">City</label>
                                <Select
                                    value={selectedCity}
                                    onValueChange={setSelectedCity}
                                    disabled={!selectedState}
                                >
                                    <SelectTrigger className="w-full bg-gray-900/80 border-gray-600 text-gray-300">
                                        <SelectValue placeholder="Select a city" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#121212] border-gray-700 text-gray-200">
                                        {cities.map((city) => (
                                            <SelectItem key={city} value={city}>{city}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button
                            onClick={handleFindNearest}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Find nearest location"} 
                        </Button>

                        <Button
                            onClick={handleApply}
                            disabled={(!selectedState || !selectedCity) || loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold"
                        >
                            <span className="inline-flex items-center gap-2">
                                {loading && (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                                )}
                                {loading ? "Loading..." : "Apply"}
                            </span>
                        </Button>

                        <hr className="border-gray-700" />

                        {status === 'success' && (
                            <p className="text-sm text-gray-300 mb-4">
                                {cinemas.length} rooms were found with tickets still available
                            </p>
                        )}

                        {status === 'empty' && (
                            <p className="text-sm text-gray-400 mb-4">
                                No rooms were found with tickets still available
                            </p>
                        )}

                        {status === 'error' && (
                            <p className="text-sm text-red-400 mb-4">
                                {errorMessage || 'Failed to load cinemas'}
                            </p>
                        )}

                        <div className="space-y-3">
                            {cinemas.map((cinema, index) => (
                                <Card
                                    key={cinema.id}
                                    className="bg-gray-900/80 border-gray-700"
                                >
                                    <CardContent className="pt-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-semibold text-white text-lg leading-tight">
                                                    {cinema.name}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-1 font-extralight">
                                                    {cinema.address || `${cinema.city}, ${cinema.state} ${cinema.zipCode || ''}`}
                                                </p>
                                            </div>

                                            <div className="text-right flex items-center gap-1">
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-gray-700/80 text-white border-amber-50"
                                                >
                                                    <span className="text-white font-light text-sm">
                                                        {index === 0 ? "9.7" : "9.2"}/10
                                                    </span>
                                                </Badge>
                                                <div className="text-xs text-gray-500">
                                                    {index === 0
                                                        ? "Extraordinary 2.987 reviews"
                                                        : "Extraordinary 1.112 reviews"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                                                onClick={() => handleWatchHere(cinema.id)}
                                            >
                                                Watch Here
                                            </Button>

                                            <Button
                                                variant="outline"
                                                className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white text-sm font-semibold px-6"
                                                onClick={() => {
                                                    setMapCenter({ lat: cinema.lat, lng: cinema.lng });
                                                    setShowMapModal(true);
                                                }}
                                            >
                                                Map
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <MapModal
                open={showMapModal}
                onClose={() => setShowMapModal(false)}
                center={mapCenter}
            />
        </div>
    )
}
