import { X } from 'lucide-react';
import type { Ticket, Seat } from './types';

interface SelectedSeatsPanelProps {
  tickets: Ticket[];
  seats?: Seat[];
  onRemoveSeat: (id: string, seatId?: string) => void;
}

export function SelectedSeatsPanel({ tickets, seats = [], onRemoveSeat }: SelectedSeatsPanelProps) {
  const getSeatLabel = (id?: string) => {
    if (!id) return 'Select'
    const seat = seats.find((s) => s.id === id)
    return seat?.seatId ?? seat?.seat_id ?? id
  }

  return (
    <div className="space-y-3 pb-32 px-1">
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-center justify-between bg-[#171C20] border border-white/5 rounded-2xl px-4 py-3"
        >
          <div className="flex flex-col text-left">
            <span className="text-white font-medium text-base">
              {ticket.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-[#2A2A2A] text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full min-w-[50px] text-center border border-white/5">
              {getSeatLabel(ticket.assignedSeatId)}
            </span>
            <button
              className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2A2A2A] hover:bg-[#333] transition-colors border border-white/5"
              onClick={() => onRemoveSeat(ticket.id, ticket.assignedSeatId)}
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
