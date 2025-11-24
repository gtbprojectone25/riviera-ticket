'use client'

import { Button } from '@/components/ui/button'

interface SessionTime {
  id: string
  time: string
  selected: boolean
}

interface SessionSelectorProps {
  sessions: SessionTime[]
  onSessionSelect: (sessionId: string) => void
}

export function SessionSelector({ sessions, onSessionSelect }: SessionSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Choose the session time</h3>
      <div className="grid grid-cols-3 gap-3">
        {sessions.map((session) => (
          <Button
            key={session.id}
            variant={session.selected ? "default" : "outline"}
            className={`py-3 text-sm font-medium rounded-lg ${
              session.selected 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-900 border-gray-700 text-white hover:bg-gray-800'
            }`}
            onClick={() => onSessionSelect(session.id)}
          >
            {session.time}
          </Button>
        ))}
      </div>
    </div>
  )
}