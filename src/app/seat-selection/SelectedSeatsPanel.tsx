import { X } from 'lucide-react';

type Ticket = {
  id: string;
  name: string;
  type: string;
  assignedSeatId?: string;
};

interface SelectedSeatsPanelProps {
  tickets: Ticket[];
  onRemoveSeat: (id: string) => void;
}

export function SelectedSeatsPanel({ tickets, onRemoveSeat }: SelectedSeatsPanelProps) {
  return (
    <div className="space-y-3 pb-32 px-1">
      <p className="text-xs text-gray-500 mb-4">Tap on the ticket and then choose the seat</p>
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-center justify-between bg-[#171C20] border border-white/5 rounded-2xl px-4 py-3"
        >
          <div className="flex flex-col text-left">
            <span className="text-white font-medium text-base">
              {ticket.name}
            </span>
            {/* Opcional: mostrar tipo se quiser, mas na imagem só aparece o nome Ticket Premium X */}
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-[#2A2A2A] text-gray-200 text-xs font-medium px-3 py-1.5 rounded-full min-w-[50px] text-center border border-white/5">
              {ticket.assignedSeatId ? ticket.assignedSeatId : 'Select'}
            </span>
            <button
              className="flex items-center justify-center w-6 h-6 rounded-full bg-[#2A2A2A] hover:bg-[#333] transition-colors border border-white/5"
              onClick={() => onRemoveSeat(ticket.id)}
              aria-label="Remover assento"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
