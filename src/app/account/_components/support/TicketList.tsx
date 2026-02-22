'use client'

import { ChevronRight, CircleDot, Clock, CheckCircle2 } from 'lucide-react'
import type { SupportTicket } from '@/db/schema'

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
  tickets: SupportTicket[]
  onSelect: (ticket: SupportTicket) => void
}

export function TicketList({ tickets, onSelect }: Props) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8 text-center space-y-2">
        <p className="text-gray-300 font-medium">No tickets yet</p>
        <p className="text-gray-500 text-sm">Open a ticket and our team will get back to you.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {tickets.map((ticket) => {
        const cfg = STATUS_CONFIG[ticket.status]
        const Icon = cfg.icon
        return (
          <li key={ticket.id}>
            <button
              onClick={() => onSelect(ticket)}
              className="w-full text-left rounded-xl border border-gray-800 bg-[#111827] hover:border-gray-600 hover:bg-[#161d2a] transition-colors p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-white font-medium truncate">{ticket.subject}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="text-gray-600">#{ticket.id.slice(0, 8)}</span>
                    <span>·</span>
                    <span>{CATEGORY_LABEL[ticket.category] ?? ticket.category}</span>
                    <span>·</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
