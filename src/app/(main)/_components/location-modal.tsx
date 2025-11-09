'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { X, AlertTriangle, CheckCircle, MapPin } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface LocationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LocationModal({ isOpen, onClose }: LocationModalProps) {
  const [step, setStep] = useState(1)
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  if (!isOpen) return null

  const cinemas = [
    {
      name: 'Roxy Cinema',
      location: 'São Paulo - SP',
      distance: '4.7 km',
      showtimes: ['14:00', '17:30', '21:00']
    },
    {
      name: 'Bella UCI Center',
      location: 'São Paulo - SP', 
      distance: '6.2 km',
      showtimes: ['15:30', '19:00', '22:30']
    }
  ]

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">BLOCKBUSTER</h2>
        <div className="text-blue-400 font-bold">IMAX</div>
        <h3 className="text-lg font-semibold text-white mt-4">Die Odyssee</h3>
        <div className="text-gray-400 text-sm">Premium</div>
      </div>

      {/* Info Cards */}
      <div className="space-y-4">
        <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-300">
            <p className="font-medium mb-1">Você está na fila de compra!</p>
            <p className="text-gray-400">
              Aguarde sua vez para comprar os ingressos. Você tem 10 minutos para completar a compra.
            </p>
          </div>
        </div>

        <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-300">
            <p className="font-medium mb-1">Localização automática ativada</p>
            <p className="text-gray-400">
              Encontramos cinemas próximos à sua localização atual para uma melhor experiência.
            </p>
          </div>
        </div>

        <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-300">
            <p className="font-medium mb-1">Reserva garantida por 10 minutos</p>
            <p className="text-gray-400">
              Seus assentos ficam reservados durante o processo de compra.
            </p>
          </div>
        </div>
      </div>

      <Button 
        onClick={() => setStep(2)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        Continuar
      </Button>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">BLOCKBUSTER</h2>
        <div className="text-blue-400 font-bold">IMAX</div>
      </div>

      <h3 className="text-lg font-semibold text-white">Die Odyssee</h3>
      
      {/* Warning */}
      <Alert className="bg-yellow-600/20 border-yellow-600/30">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <AlertDescription className="text-yellow-200">
          Você tem apenas 8 min e 47 seg para completar sua compra. 
          Após esse tempo, os ingressos serão liberados para outros compradores.
        </AlertDescription>
      </Alert>

      {/* Location Search */}
      <div className="space-y-4">
        <h4 className="text-white font-medium">Where to watch</h4>
        
        <div className="space-y-2">
          <label className="text-sm text-gray-400">State</label>
          <Input 
            placeholder="Select a state"
            className="bg-gray-800 border-gray-600 text-white"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">City</label>
          <Input 
            placeholder="Select a city"
            className="bg-gray-800 border-gray-600 text-white"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          />
        </div>

        <Button 
          variant="outline"
          className="w-full border-gray-600 text-white hover:bg-gray-800 flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Buscar localização mais próxima
        </Button>

        <Button 
          onClick={() => setStep(3)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Apply
        </Button>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">BLOCKBUSTER</h2>
        <div className="text-blue-400 font-bold">IMAX</div>
      </div>

      <h3 className="text-lg font-semibold text-white">Die Odyssee</h3>

      {/* Cinema List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-white font-medium">6 cinemas were found with cinema 1&2 available</h4>
        </div>

        {cinemas.map((cinema, index) => (
          <Card key={index} className="bg-gray-800 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h5 className="text-white font-medium">{cinema.name}</h5>
                  <p className="text-gray-400 text-sm">{cinema.distance}</p>
                </div>
                <div className="text-gray-400 text-sm">{cinema.location}</div>
              </div>
              
              <div className="flex gap-2 mb-3">
                {cinema.showtimes.map((time, timeIndex) => (
                  <Button
                    key={timeIndex}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-white hover:bg-gray-700"
                  >
                    {time}
                  </Button>
                ))}
              </div>

              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                asChild
              >
                <Link href="/ticket-selection">
                  Watch Here
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              {step === 1 && 'Localização'}
              {step === 2 && 'Selecionar Estado'}
              {step === 3 && 'Cinemas Disponíveis'}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </CardContent>
      </Card>
    </div>
  )
}