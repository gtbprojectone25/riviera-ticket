'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Send, CircleDot, Clock, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SupportTicket, TicketMessage } from '@/db/schema'

const STATUS_CONFIG = {
  OPEN: { label: 'Open', icon: CircleDot, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  IN_REVIEW: { label: 'In review', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  RESOLVED: { label: 'Resolved', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
}

const CATEGORY_LABEL: Record<string, string> = {
  BUG: 'Bug / Error',
  QUESTION: 'Question',
  FINANCIAL: 'Financial',
  SUGGESTION: 'Suggestion',
}

type Props = {
  ticket: SupportTicket
  messages: TicketMessage[]
  loading: boolean
  onBack: () => void
  onSendMessage: (msg: string) => Promise<void>
}

export function TicketDetails({ ticket, messages, loading, onBack, onSendMessage }: Props) {
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) return
    setSending(true)
    setError(null)
    try {
      await onSendMessage(reply.trim())
      setReply('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const cfg = STATUS_CONFIG[ticket.status]
  const Icon = cfg.icon
  const isResolved = ticket.status === 'RESOLVED'

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="mt-0.5 text-gray-400 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-base leading-snug">{ticket.subject}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
            <span>#{ticket.id.slice(0, 8)}</span>
            <span>·</span>
            <span>{CATEGORY_LABEL[ticket.category] ?? ticket.category}</span>
            <span>·</span>
            <span>Opened {new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0 ${cfg.bg} ${cfg.color}`}>
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* Messages */}
      <div className="rounded-xl border border-gray-800 bg-[#111827] p-4 space-y-4 max-h-96 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">No messages yet.</p>
        )}
        {!loading && messages.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                isUser
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-[#1F2933] text-gray-200 rounded-bl-none border border-gray-700'
              }`}>
                <p className="whitespace-pre-wrap wrap-break-word">{msg.message}</p>
                <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500'} text-right`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {new Date(msg.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      {isResolved ? (
        <p className="text-center text-sm text-gray-500 py-2">
          This ticket is resolved. Open a new ticket if you need further help.
        </p>
      ) : (
        <form onSubmit={handleSend} className="space-y-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write your reply..."
            rows={3}
            maxLength={5000}
            className="w-full rounded-xl border border-gray-700 bg-[#1F2933] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
          />
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={sending || !reply.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
