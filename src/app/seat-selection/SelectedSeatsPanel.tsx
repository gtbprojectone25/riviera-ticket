import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="px-4 pb-24 space-y-3">
      <p className="text-xs text-gray-400 mb-2">Tap on the ticket and then choose the seat</p>
      {tickets.map((ticket) => (
        <div
          key={ticket.id}
          className="flex items-center justify-between bg-gradient-to-b from-gray-800/80 to-gray-900/80 border border-gray-700 rounded-xl px-4 py-3 mb-2"
        >
          <div className="flex flex-col text-left">
            <span className="text-white font-medium text-base">
              {ticket.name}
            </span>
            <span className="text-xs text-gray-400">{ticket.type === 'VIP' ? 'VIP' : 'Standard'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white text-base min-w-[40px] text-center">
              {ticket.assignedSeatId ? ticket.assignedSeatId : 'Select'}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full hover:bg-gray-700"
              onClick={() => onRemoveSeat(ticket.id)}
              aria-label="Remover assento"
            >
              <X className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
