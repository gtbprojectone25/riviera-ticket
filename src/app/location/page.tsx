'use client'

import { useState } from 'react'
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
import { AnimatedBackground } from '@/components/animated-background'
import { Clock } from 'lucide-react'

// Interfaces para International Showtimes API
interface Cinema {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode: string
    latitude: number
    longitude: number
    distance?: number
    formats: string[] // IMAX, 4DX, Dolby, etc.
}

export default function LocationPage() {
    const [selectedState, setSelectedState] = useState('')
    const [selectedCity, setSelectedCity] = useState('')
    const [cinemas, setCinemas] = useState<Cinema[]>([])
    const [loading, setLoading] = useState(false)
    const [showLoadingModal, setShowLoadingModal] = useState(false)
    const [userLocation, setUserLocation] = useState<{
        lat: number
        lng: number
    } | null>(null)

    const states = [
        'Nova York',
        'Califórnia',
        'Texas',
        'São Paulo',
        'Rio de Janeiro'
    ]

    const cities = {
        'Nova York': ['Brooklyn', 'Manhattan', 'Queens', 'Bronx'],
        'Califórnia': ['Los Angeles', 'São Francisco', 'San Diego'],
        'Texas': ['Houston', 'Dallas', 'Austin'],
        'São Paulo': ['São Paulo', 'Campinas', 'Santos'],
        'Rio de Janeiro': ['Rio de Janeiro', 'Niterói', 'Petrópolis']
    }

    // Função para obter localização do usuário
    const getUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    })
                    // Setar Nova York e Brooklyn como default para demonstração
                    setSelectedState('Nova York')
                    setSelectedCity('Brooklyn')
                },
                (error) => {
                    console.error('Erro ao obter localização:', error)
                    // Setar Nova York e Brooklyn como default mesmo com erro
                    setSelectedState('Nova York')
                    setSelectedCity('Brooklyn')
                },
            )
        } else {
            // Navegador não suporta geolocalização, setar defaults
            setSelectedState('Nova York')
            setSelectedCity('Brooklyn')
        }
    }

    // Função para buscar cinemas IMAX próximos
    const searchCinemas = async () => {
        setLoading(true)
        setShowLoadingModal(true)

        try {
            // Simular delay de carregamento
            await new Promise((resolve) => setTimeout(resolve, 2000))

            // Fallback para dados de demonstração
            setCinemas([
                {
                    id: '1',
                    name: 'Roxy Cinema',
                    address: '234 W 42nd St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10036',
                    latitude: 40.7736,
                    longitude: -73.9844,
                    distance: 2.5,
                    formats: ['IMAX', '3D', 'Dolby Atmos'],
                },
                {
                    id: '2',
                    name: 'Bella UCI Center',
                    address: '11 Fulton St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10038',
                    latitude: 40.7589,
                    longitude: -73.9851,
                    distance: 3.2,
                    formats: ['IMAX', '4DX', 'Dolby Atmos', 'ScreenX'],
                },
                {
                    id: '3',
                    name: 'Roxy Cinema',
                    address: '234 W 42nd St',
                    city: 'New York',
                    state: 'NY',
                    zipCode: '10036',
                    latitude: 40.7736,
                    longitude: -73.9844,
                    distance: 2.5,
                    formats: ['IMAX', '3D', 'Dolby Atmos'],
                },
            ])

            setLoading(false)
            setShowLoadingModal(false)
        } catch (error) {
            console.error('Erro ao buscar cinemas:', error)
            // Em caso de erro, ainda mostrar os dados de demonstração
            setCinemas([
                {
                    id: 'demo-1',
                    name: 'Cinema IMAX Demo',
                    address: 'Endereço de Demonstração',
                    city: selectedCity || 'Cidade',
                    state: selectedState || 'Estado',
                    zipCode: '00000-000',
                    latitude: 0,
                    longitude: 0,
                    distance: 5.0,
                    formats: ['IMAX', '3D', 'Dolby Atmos'],
                },
            ])
            setLoading(false)
            setShowLoadingModal(false)
        }
    }

    const handleApply = () => {
        searchCinemas()
    }

    const handleFindNearest = () => {
        getUserLocation()
        // A busca real é acionada após a localização ser obtida (ou defaults definidos)
        // Se a localização for obtida síncronamente (ou defaults), searchCinemas pode ser chamada aqui.
        // Para simplificar, vou chamá-la diretamente após um pequeno timeout para simular.
        setTimeout(() => {
            searchCinemas()
        }, 500) // Pequeno delay para a localização ser processada
    }

    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Content */}
            <div className="relative z-10 flex flex-col min-h-screen">


                {/* Conteúdo Principal Centralizado */}
                <div className="flex-1 flex items-start justify-center p-4 pt-8">

                    {' '}
                    {/* Alinhar no topo com mais padding */}
                    <div
                        className="w-full max-w-sm space-y-6 relative rounded-2xl p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]"
                    >

                        {/* Alerta Informativo no Topo */}
                        <div className="w-full bg-[#0266FC] p-1 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-white shrink-0 mr-2" />
                            <p className="text-white text-xs font-light text-center">
                                To guarantee your place, finish within 10:00 minutes (only 4 per
                                session).
                            </p>
                        </div>

                        {/* Título e Badge (sempre visíveis no topo da coluna de conteúdo) */}
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                                Die Odyssee
                            </h1>
                            <Badge
                                variant="secondary"
                                className="bg-gray-700/80 text-white px-3 py-1 rounded-full border border-gray-600"
                            >
                                Pre-order
                            </Badge>
                        </div>

                        
                        {/*quero uma linha */}
                        <hr className="border-gray-700 mb-4" />

                        {/* Renderização Condicional: Formulário ou Resultados */}
                        {cinemas.length === 0 ? (
                            // Tela inicial com formulário de seleção
                            <>
                                <div className="space-y-4">
                                    <h2 className="text-sm font-medium text-gray-200 mb-4">Where to watch</h2>

                                    <div className="space-y-3">
                                        {/* State Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400 font-medium">State</label>
                                            <Select value={selectedState} onValueChange={setSelectedState}>
                                                <SelectTrigger className="w-full bg-gray-900/80 border-gray-600 text-gray-300 h-10">
                                                    <SelectValue placeholder="Select an option" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {states.map((state) => (
                                                        <SelectItem key={state} value={state}>
                                                            {state}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* City Selector */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400 font-medium">City</label>
                                            <Select
                                                value={selectedCity}
                                                onValueChange={setSelectedCity}
                                                disabled={!selectedState}
                                            >
                                                <SelectTrigger className="w-full bg-gray-900/80 border-gray-600 text-gray-300 h-10">
                                                    <SelectValue placeholder="Select an option" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {selectedState && cities[selectedState as keyof typeof cities]?.map((city) => (
                                                        <SelectItem key={city} value={city}>
                                                            {city}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Buscar localização Button */}
                                    <Button
                                        onClick={handleFindNearest}
                                        className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 text-sm font-medium rounded-full border border-gray-600 mt-4"
                                        disabled={loading}
                                    >
                                        {loading ? 'Buscando...' : 'Buscar localização mais próxima'}
                                    </Button>

                                    {/* Apply Button */}
                                    <Button
                                        onClick={handleApply}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-semibold rounded-full mt-3"
                                        disabled={(!selectedState || !selectedCity) || loading}
                                    >
                                        {loading ? 'Aplicando...' : 'Apply'}
                                    </Button>
                                </div>
                                
                            </>
                        ) : (


                            // Tela de resultados - Adaptações para Imagem 2
                            <>
                                <p className="text-xs text-gray-400 mb-4">
                                    If necessary, change the display location and tap apply.
                                </p>

                                {/* Localização selecionada como tags */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* State Selector */}
                                    <div className="bg-[#1B1B1B] rounded-[10px] px-4 py-3 flex justify-between items-center">
                                        <span className="text-lg font-medium text-white">State</span>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-400"> Nova York</span>
                                            <span className="text-gray-400 text-lg">&gt;</span>
                                        </div>
                                    </div>

                                    {/* City Selector */}
                                    <div className="bg-[#1B1B1B] rounded-[10px] px-4 py-3 flex justify-between items-center">
                                        <span className="text-lg font-medium text-white">City</span>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-xs text-gray-400">Brooklyn</span>
                                            <span className="text-gray-400 text-lg">&gt;</span>
                                        </div>
                                    </div>
                                </div>


                                {/* Apply Button na tela de resultados */}
                                <Button
                                    onClick={handleApply}
                                    className="w-full rounded-[10px] px-4 py-6 text-white text-2xl font-semibold mb-4
                                    bg-[linear-gradient(to_top_right,#1D1D1D_100%,#1F1F1F_98%,#212121_97%,#272727_94%,#323232_88%,#494949_75%,#767676_50%,#777777_49%,#797979_48%,#7B7B7B_47%,#818181_44%,#8C8C8C_38%,#A3A3A3_25%,#D0D0D0_0%)]
                                    border border-white hover:opacity-90"
                                >
                                    Apply
                                </Button>

                                <hr className="border-gray-700 mb-4 pb-2 pt-2" />


                                {/* Contador de resultados */}
                                <p className="text-sm text-gray-300 mb-4">
                                    {cinemas.length} rooms were found with tickets still available
                                </p>

                                {/* Lista de Cinemas - Adaptações para Imagem 2 */}
                                <div className="space-y-3 mt-4">
                                    {cinemas.map((cinema, index) => (
                                        <Card
                                            key={cinema.id}
                                            className="bg-gray-900/80 border-gray-700 rounded-lg" // Arredondado
                                        >
                                            <CardContent className="p-4 gap">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-semibold text-white text-lg">
                                                            {cinema.name}
                                                        </h4>
                                                        <p className="text-xs text-gray-400 font-extralight">
                                                            {cinema.address}, {cinema.city}, {cinema.state}{' '}
                                                            {cinema.zipCode}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex items-center gap-1">
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-gray-700/80 text-white px-3 py-1 rounded-full  border-amber-50 "
                                                        >
                                                            <span className="text-white font-light text-sm">
                                                                {index === 0 ? '9.7' : index === 1 ? '9.2' : '9.7'}/10
                                                            </span>
                                                        </Badge>

                                                        <div>
                                                            <div className="text-xs text-gray-500">
                                                                {index === 0
                                                                    ? 'Extraordinary 2.987 reviews'
                                                                    : index === 1
                                                                        ? 'Extraordinary 1.112 reviews'
                                                                        : 'Extraordinary 2.987 reviews'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 mt-4">
                                                    <Button
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-sm font-semibold rounded-lg"
                                                        onClick={() => (window.location.href = '/ticket-selection')}
                                                    >
                                                        Watch Here
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="bg-blue-600 hover:bg-blue-700 border-blue-600 text-white py-3 px-6 text-sm font-semibold rounded-lg"
                                                        onClick={() => alert('Abrir popup com mapa')}
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

            {/* Modal de Loading (mantido) */}
            {showLoadingModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <Card className="bg-gray-900 border-gray-700 max-w-md w-full mx-4">
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                                <p className="text-white text-lg">
                                    We are looking for available rooms in your area.
                                </p>
                                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out animate-pulse"
                                        style={{ width: '70%' }}
                                    ></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}