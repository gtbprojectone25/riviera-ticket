'use client'

import { useState, useEffect } from 'react'
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
import { Clock } from 'lucide-react'

import { cinemas as cinemasData } from "@/data/cinemas"
import { useBookingStore } from '@/stores/booking'
import { MapModal } from "@/app/location/_components/MapModal"

// --- Interface corrigida ---
interface Cinema {
    id: string
    name: string
    city: string
    state: string
    address?: string
    zipCode?: string
    lat: number
    lng: number
    formats?: string[]
    isIMAX?: boolean
}

export default function LocationPage() {
    const router = useRouter()
    const TOTAL_TIME = 5

    // --- Estados ---
    const [, setTimeLeft] = useState(TOTAL_TIME)
    const [loadingProgress, setLoadingProgress] = useState(98)

    const [selectedState, setSelectedState] = useState('')
    const [selectedCity, setSelectedCity] = useState('')

    const [cinemas, setCinemas] = useState<Cinema[]>([])
    const [loading, setLoading] = useState(false)
    const [showLoadingModal, setShowLoadingModal] = useState(false)

    const [showMapModal, setShowMapModal] = useState(false)
    const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 })

    const setCinemaStore = useBookingStore((s) => s.setCinema)

    // --- Lógica de filtro de Estados e Cidades ---
    const states = [...new Set(cinemasData.map(c => c.state))]
    const cities = selectedState
        ? [...new Set(cinemasData.filter(c => c.state === selectedState).map(c => c.city))]
        : []

    // --- Loading animado + redirect ---
    useEffect(() => {
        if (!showLoadingModal) return;

        let time = TOTAL_TIME;
        let progress = 95;

        const interval = setInterval(() => {
            time -= 1;
            progress = Math.min(progress + (100 - 95) / TOTAL_TIME, 100);

            setTimeLeft(time);
            setLoadingProgress(progress);

            if (time <= 0) {
                clearInterval(interval);
                setShowLoadingModal(false);
                router.push("/ticket-selection");
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [showLoadingModal, router]);

    // --- Buscar pelo GPS ---
    const handleFindNearest = () => {
        setLoading(true)

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const userLoc = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }
                setMapCenter(userLoc)
                setShowMapModal(true)
                setLoading(false)
                // Simula encontrar cinemas
                setShowLoadingModal(true)
            },
            () => {
                setLoading(false)
                setShowLoadingModal(true)
            }
        )
    }

    // --- Apply filtrando cinemas reais ---
    const handleApply = () => {
        setLoading(true)

        setTimeout(() => {
            // Lógica real de filtro
            const filtered = cinemasData.filter(
                (c) => c.state === selectedState && c.city === selectedCity
            )

            // Se não encontrar nada exato, mostra todos (para demo não ficar vazia)
            // Pode remover o "|| cinemasData" se quiser filtro estrito
            setCinemas(filtered.length > 0 ? filtered : cinemasData)

            setLoading(false)
        }, 600)
    }

    // --- Watch Here ---
    function handleWatchHere(cinemaId: string) {
        const cinema = cinemasData.find((c) => c.id === cinemaId)
        if (!cinema) return

        setCinemaStore(cinema)
        router.push("/ticket-selection")
    }

    return (
        <div className="min-h-screen text-white relative overflow-hidden bg-black/60">
            <div className="relative z-10 flex flex-col min-h-screen">
                <div className="flex-1 flex items-start justify-center p-4 pt-8">

                    {/* Container Principal com o Gradiente do Code A */}
                    <div className="w-full max-w-sm space-y-6 relative rounded-2xl p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]">

                        {/* Urgency Banner */}
                        <div className="w-full bg-[#0266FC] p-3 flex items-center justify-center rounded-lg">
                            <Clock className="h-4 w-4 text-white shrink-0 mr-2" />
                            <p className="text-white text-xs font-medium text-center">
                                To guarantee your place, finish within 10:00 minutes.
                            </p>
                        </div>

                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-white drop-shadow-lg">The Odyssey</h1>
                            <Badge variant="secondary" className="bg-gray-700/80 text-white px-3 py-1 rounded-full border border-gray-600">
                                Pre-order
                            </Badge>
                        </div>

                        <hr className="border-gray-700 mb-4" />

                        {/* --- Form antes de buscar (TELA 1) --- */}
                        {cinemas.length === 0 && !showLoadingModal ? (
                            <>
                                <h2 className="text-sm font-medium text-gray-200 mb-4">Where to watch</h2>

                                <div className="space-y-3">
                                    {/* State */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 font-medium">State</label>
                                        <Select value={selectedState} onValueChange={setSelectedState}>
                                            <SelectTrigger className="w-full bg-gray-900/80 border-gray-600 text-gray-300 h-10">
                                                <SelectValue placeholder="Select a state" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#121212] border-gray-700 text-gray-200">
                                                {states.map((st) => (
                                                    <SelectItem key={st} value={st}>{st}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* City */}
                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 font-medium">City</label>
                                        <Select
                                            value={selectedCity}
                                            onValueChange={setSelectedCity}
                                            disabled={!selectedState}
                                        >
                                            <SelectTrigger className="w-full bg-gray-900/80 border-gray-600 text-gray-300 h-10">
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
                                    className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 text-sm font-medium rounded-full border border-gray-600 mt-4"
                                    disabled={loading}
                                >
                                    {loading ? "Buscando..." : "Buscar localização mais próxima"}
                                </Button>

                                <Button
                                    onClick={handleApply}
                                    disabled={(!selectedState || !selectedCity) || loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold rounded-full mt-3"
                                >
                                    {loading ? "Aplicando..." : "Apply"}
                                </Button>
                            </>
                        ) : (
                            // --- TELA 2: RESULTADOS (Aqui adicionei o que faltava do Code A) ---
                            <>
                                <p className="text-xs text-gray-400 mb-4">
                                    If necessary, change the display location and tap apply.
                                </p>

                                {/* Grid de Localização Selecionada */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-[#1B1B1B] rounded-[10px] px-4 py-3 flex justify-between items-center">
                                        <span className="text-lg font-medium text-white">State</span>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-400 truncate max-w-[60px]">{selectedState || "GPS"}</span>
                                            <span className="text-gray-400 text-lg">&gt;</span>
                                        </div>
                                    </div>

                                    <div className="bg-[#1B1B1B] rounded-[10px] px-4 py-3 flex justify-between items-center">
                                        <span className="text-lg font-medium text-white">City</span>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-400 truncate max-w-[60px]">{selectedCity || "Local"}</span>
                                            <span className="text-gray-400 text-lg">&gt;</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Botão Grande de Apply na tela de resultados */}
                                <Button
                                    onClick={handleApply}
                                    className="w-full rounded-[10px] px-4 py-6 text-white text-2xl font-semibold mb-4
                                    bg-[linear-gradient(to_top_right,#1D1D1D_100%,#1F1F1F_98%,#212121_97%,#272727_94%,#323232_88%,#494949_75%,#767676_50%,#777777_49%,#797979_48%,#7B7B7B_47%,#818181_44%,#8C8C8C_38%,#A3A3A3_25%,#D0D0D0_0%)]
                                    border border-white hover:opacity-90"
                                >
                                    Apply
                                </Button>

                                <hr className="border-gray-700 mb-4 pb-2 pt-2" />

                                <p className="text-sm text-gray-300 mb-4">
                                    {cinemas.length} rooms were found with tickets still available
                                </p>

                                {/* Lista de cinemas */}
                                <div className="space-y-3 mt-4">
                                    {loading && <p className="text-gray-400">Updating...</p>}

                                    {cinemas.map((cinema, index) => (
                                        <Card
                                            key={cinema.id}
                                            className="bg-gray-900/80 border-gray-700 rounded-lg"
                                        >
                                            <CardContent className="p-4">
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
                                                            className="bg-gray-700/80 text-white px-3 py-1 rounded-full border-amber-50"
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

                                                <div className="flex gap-3 mt-4">
                                                    <Button
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-semibold rounded-lg"
                                                        onClick={() => handleWatchHere(cinema.id)}
                                                    >
                                                        Watch Here
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white py-3 px-6 text-sm font-semibold rounded-lg"
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
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Modal Loader --- */}
            {showLoadingModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
                    <Card className="bg-[#0D0D0D] border border-gray-700 rounded-2xl shadow-xl max-w-md w-full mx-4">
                        <CardContent className="p-6 text-center space-y-4">
                            <p className="text-white text-lg">
                                We are looking for available rooms in your area.
                            </p>
                            <div className="w-full bg-gray-800 rounded-full h-2 mt-3 overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 rounded-full transition-all duration-500 animate-pulse"
                                    style={{ width: `${loadingProgress}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* --- MAP MODAL --- */}
            <MapModal
                open={showMapModal}
                onClose={() => setShowMapModal(false)}
                center={mapCenter}
            />
        </div>
    )
}
