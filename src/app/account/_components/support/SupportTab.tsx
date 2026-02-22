'use client'

import { useState } from 'react'
import { Plus, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSupportTickets } from '@/hooks/use-support-tickets'
import { TicketList } from './TicketList'
import { TicketDetails } from './TicketDetails'
import { CreateTicketModal } from './CreateTicketModal'
import type { SupportTicket, TicketMessage } from '@/db/schema'

type Props = {
  token: string | null
}

type View =
  | { kind: 'list' }
  | { kind: 'detail'; ticket: SupportTicket; messages: TicketMessage[]; detailLoading: boolean }

export function SupportTab({ token }: Props) {
  const { tickets, status, error, createTicket, fetchTicket, sendMessage, reload } =
    useSupportTickets(token, true)

  const [view, setView] = useState<View>({ kind: 'list' })
  const [showCreate, setShowCreate] = useState(false)

  const handleSelect = async (ticket: SupportTicket) => {
    setView({ kind: 'detail', ticket, messages: [], detailLoading: true })
    try {
      const data = await fetchTicket(ticket.id)
      setView({ kind: 'detail', ticket: data.ticket, messages: data.messages, detailLoading: false })
    } catch {
      setView({ kind: 'list' })
    }
  }

  const handleSendMessage = async (msg: string) => {
    if (view.kind !== 'detail') return
    const saved = await sendMessage(view.ticket.id, msg)
    setView((prev) =>
      prev.kind === 'detail'
        ? { ...prev, messages: [...prev.messages, saved] }
        : prev,
    )
  }

  const handleCreate = async (data: { subject: string; category: string; description: string }) => {
    await createTicket(data)
  }

  return (
    <div className="relative z-10 pt-2 space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {view.kind === 'detail' ? 'Ticket details' : 'Support'}
        </h2>
        <div className="flex items-center gap-2">
          {view.kind === 'list' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void reload()}
              className="text-gray-400 hover:text-white"
              aria-label="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
          {view.kind === 'list' && (
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Open ticket
            </Button>
          )}
        </div>
      </div>

      {/* List view */}
      {view.kind === 'list' && (
        <>
          {status === 'loading' && (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {status === 'success' && (
            <TicketList tickets={tickets} onSelect={(t) => void handleSelect(t)} />
          )}
        </>
      )}

      {/* Detail view */}
      {view.kind === 'detail' && (
        <TicketDetails
          ticket={view.ticket}
          messages={view.messages}
          loading={view.detailLoading}
          onBack={() => setView({ kind: 'list' })}
          onSendMessage={handleSendMessage}
        />
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}
