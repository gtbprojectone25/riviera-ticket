'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SupportTicket, TicketMessage } from '@/db/schema'

type Status = 'idle' | 'loading' | 'error' | 'success'

export type TicketDetail = {
  ticket: SupportTicket
  messages: TicketMessage[]
}

export function useSupportTickets(token: string | null, active: boolean) {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      setStatus('loading')
      setError(null)
      const res = await fetch('/api/support', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to load tickets')
      }
      const data = (await res.json()) as SupportTicket[]
      setTickets(data)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    }
  }, [token])

  useEffect(() => {
    if (!active || !token) return
    void load()
  }, [active, token, load])

  const createTicket = useCallback(
    async (payload: { subject: string; category: string; description: string }) => {
      if (!token) throw new Error('Not authenticated')
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({})) as { error?: string } & SupportTicket
      if (!res.ok) throw new Error(data.error ?? 'Failed to create ticket')
      await load()
      return data as SupportTicket
    },
    [token, load],
  )

  const fetchTicket = useCallback(
    async (id: string): Promise<TicketDetail> => {
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(`/api/support/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({})) as { error?: string } & TicketDetail
      if (!res.ok) throw new Error(data.error ?? 'Failed to load ticket')
      return data as TicketDetail
    },
    [token],
  )

  const sendMessage = useCallback(
    async (ticketId: string, message: string) => {
      if (!token) throw new Error('Not authenticated')
      const res = await fetch(`/api/support/${ticketId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      })
      const data = await res.json().catch(() => ({})) as { error?: string } & TicketMessage
      if (!res.ok) throw new Error(data.error ?? 'Failed to send message')
      return data as TicketMessage
    },
    [token],
  )

  return { tickets, status, error, createTicket, fetchTicket, sendMessage, reload: load }
}
