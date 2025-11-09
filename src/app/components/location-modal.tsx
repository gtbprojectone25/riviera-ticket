'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MapPin, ChevronLeft } from 'lucide-react'

interface LocationModalProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function LocationModal({ isOpen = false, onClose }: LocationModalProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  if (!isOpen) return null

  const handleSearch = async () => {
    setSearching(true)
    // placeholder for real search logic
    await new Promise((res) => setTimeout(res, 500))
    setSearching(false)
  }

  const mockCinemas = [
    { id: '1', name: 'Roxy Cinema', address: '291 W 4th St, New York, NY', slug: '/ticket-selection' },
    { id: '2', name: 'Bella UCI Center', address: '116 E 9th Ave, New York, NY', slug: '/ticket-selection' },
  ]

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4')}>
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              <CardTitle>Choose cinema location</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
              <ChevronLeft className="w-4 h-4 rotate-90" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Search city or address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full"
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSearch} disabled={!query || searching}>
                {searching ? 'Searching...' : 'Find cinemas'}
              </Button>
            </div>

            <div className="space-y-2">
              {mockCinemas.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-md bg-gray-800">
                  <div>
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-sm text-gray-400">{c.address}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        onClose?.()
                        router.push(c.slug)
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-gray-400">Selecting a cinema will close this modal and open the session page.</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}