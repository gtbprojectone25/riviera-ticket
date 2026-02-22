'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Send } from 'lucide-react'

type Ticket = {
  id: string
  userId: string | null
  subject: string
  category: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
  userEmail: string | null
  userName: string | null
  userSurname: string | null
}

type Message = {
  id: string
  ticketId: string
  sender: string
  message: string
  createdAt: string
}

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Aberto',
  IN_REVIEW: 'Em análise',
  RESOLVED: 'Resolvido',
}

const CATEGORY_LABEL: Record<string, string> = {
  BUG: 'Bug / Erro',
  QUESTION: 'Dúvida',
  FINANCIAL: 'Financeiro',
  SUGGESTION: 'Sugestão',
}

type Props = { ticketId: string }

export function SupportTicketDetailClient({ ticketId }: Props) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = (await res.json()) as { ticket: Ticket; messages: Message[] }
      setTicket(data.ticket)
      setMessages(data.messages)
    } catch {
      setTicket(null)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    load()
  }, [load])

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = reply.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      if (!res.ok) throw new Error('Failed to send')
      const newMsg = (await res.json()) as Message
      setMessages((prev) => [...prev, newMsg])
      setReply('')
    } catch {
      // erro silencioso ou toast
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED') => {
    if (!ticket || updatingStatus) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setTicket((prev) => (prev ? { ...prev, status } : null))
    } catch {
      // erro
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-400">
        Chamado não encontrado.
        <Link href="/admin/support" className="block mt-4 text-red-400 hover:text-red-300">
          Voltar à lista
        </Link>
      </div>
    )
  }

  const clientName = [ticket.userName, ticket.userSurname].filter(Boolean).join(' ') || ticket.userEmail || 'Cliente'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/support"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <h1 className="text-xl font-bold text-white truncate max-w-md">{ticket.subject}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className={
              ticket.status === 'OPEN'
                ? 'bg-amber-500/20 text-amber-400'
                : ticket.status === 'RESOLVED'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-blue-500/20 text-blue-400'
            }
          >
            {STATUS_LABEL[ticket.status] ?? ticket.status}
          </Badge>
          <span className="text-gray-500 text-sm">
            {CATEGORY_LABEL[ticket.category] ?? ticket.category}
          </span>
          <div className="flex gap-1">
            {(['OPEN', 'IN_REVIEW', 'RESOLVED'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={ticket.status === s ? 'default' : 'outline'}
                className="border-gray-600 text-gray-300"
                disabled={updatingStatus || ticket.status === s}
                onClick={() => handleStatusChange(s)}
              >
                {STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <p className="text-gray-400 text-sm">
            <strong className="text-white">Cliente:</strong> {clientName}
            {ticket.userEmail && (
              <>
                {' · '}
                <a href={`mailto:${ticket.userEmail}`} className="text-red-400 hover:underline">
                  {ticket.userEmail}
                </a>
              </>
            )}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            <strong className="text-white">Aberto em:</strong>{' '}
            {format(new Date(ticket.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
          {ticket.description && (
            <div className="mt-3 p-3 rounded-lg bg-gray-800/50 text-gray-300 text-sm whitespace-pre-wrap">
              {ticket.description}
            </div>
          )}
        </div>

        <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">Nenhuma mensagem ainda.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  m.sender === 'admin'
                    ? 'bg-red-500/20 text-white'
                    : 'bg-gray-800 text-gray-300'
                }`}
              >
                <p className="text-xs opacity-80 mb-0.5">
                  {m.sender === 'admin' ? 'Admin' : clientName} ·{' '}
                  {format(new Date(m.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                </p>
                <p className="text-sm whitespace-pre-wrap">{m.message}</p>
              </div>
            </div>
          ))}
        </div>

        {ticket.status !== 'RESOLVED' && (
          <form onSubmit={handleSendReply} className="p-4 border-t border-gray-800">
            <div className="flex gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Digite sua resposta..."
                rows={2}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                maxLength={5000}
                disabled={sending}
              />
              <Button type="submit" disabled={sending || !reply.trim()} size="icon" className="shrink-0">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
