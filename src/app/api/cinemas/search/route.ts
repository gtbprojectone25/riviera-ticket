// API Route para buscar cinemas IMAX
// Arquivo: src/app/api/cinemas/search/route.ts

import { NextRequest, NextResponse } from 'next/server'

// Interfaces para International Showtimes API
interface CinemaApiResponse {
  id: string
  name: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  location: {
    latitude: number
    longitude: number
  }
  features: string[] // IMAX, 4DX, Dolby, etc.
  showtimes?: ShowtimeApiResponse[]
}

interface ShowtimeApiResponse {
  id: string
  movieId: string
  dateTime: string
  attributes: {
    format: string // IMAX, 3D, etc.
    language: string // EN, PT, etc.
    subtitles?: string
    audioDescription?: boolean
    screenType: string[] // Atmos, ScreenX, etc.
  }
}

interface SearchParams {
  lat?: string
  lng?: string
  radius?: string // em milhas
  city?: string
  state?: string
  zipCode?: string
  format?: string // IMAX, 4DX, Dolby
  movieId?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params: SearchParams = {
      lat: searchParams.get('lat') || undefined,
      lng: searchParams.get('lng') || undefined,
      radius: searchParams.get('radius') || '25',
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      zipCode: searchParams.get('zipCode') || undefined,
      format: searchParams.get('format') || 'IMAX',
      movieId: searchParams.get('movieId') || undefined,
    }

    // TODO: Substituir pela URL real da International Showtimes API
    const SHOWTIMES_API_KEY = process.env.SHOWTIMES_API_KEY
    const SHOWTIMES_BASE_URL = process.env.SHOWTIMES_BASE_URL || 'https://api.internationalshowtimes.com'
    
    if (!SHOWTIMES_API_KEY) {
      return NextResponse.json(
        { error: 'API key não configurada' },
        { status: 500 }
      )
    }

    // Construir URL da API
    const apiUrl = new URL(`${SHOWTIMES_BASE_URL}/v4/cinemas`)
    
    // Adicionar parâmetros de busca
    if (params.lat && params.lng) {
      apiUrl.searchParams.append('lat', params.lat)
      apiUrl.searchParams.append('lng', params.lng)
      apiUrl.searchParams.append('radius', params.radius!)
    }
    
    if (params.city) apiUrl.searchParams.append('city', params.city)
    if (params.state) apiUrl.searchParams.append('state', params.state)
    if (params.zipCode) apiUrl.searchParams.append('zipCode', params.zipCode)
    
    // Filtrar por formato IMAX
    if (params.format) {
      apiUrl.searchParams.append('features', params.format)
    }

    // Headers da requisição
    const headers = {
      'Authorization': `Bearer ${SHOWTIMES_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Riviera-Ticket-App/1.0'
    }

    // Fazer chamada para a API
    const response = await fetch(apiUrl.toString(), { headers })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Transformar dados da API para o formato esperado pelo frontend
    const cinemas = data.cinemas?.map((cinema: CinemaApiResponse) => ({
      id: cinema.id,
      name: cinema.name,
      address: cinema.address.street,
      city: cinema.address.city,
      state: cinema.address.state,
      zipCode: cinema.address.zipCode,
      latitude: cinema.location.latitude,
      longitude: cinema.location.longitude,
      distance: calculateDistance(
        params.lat ? parseFloat(params.lat) : 0,
        params.lng ? parseFloat(params.lng) : 0,
        cinema.location.latitude,
        cinema.location.longitude
      ),
      formats: cinema.features,
      showtimes: cinema.showtimes?.map(showtime => ({
        id: showtime.id,
        movieId: showtime.movieId,
        cinemaId: cinema.id,
        dateTime: showtime.dateTime,
        format: showtime.attributes.format,
        language: showtime.attributes.language,
        attributes: showtime.attributes.screenType
      })) || []
    })) || []

    return NextResponse.json({
      success: true,
      cinemas,
      count: cinemas.length,
      searchParams: params
    })

  } catch (error) {
    console.error('Erro na busca de cinemas:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Função auxiliar para calcular distância entre coordenadas
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Raio da Terra em milhas
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  return Math.round(distance * 10) / 10 // Arredondar para 1 casa decimal
}