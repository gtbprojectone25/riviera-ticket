'use client';

import { X } from 'lucide-react';

interface Seat {
  id: string;
  type: 'STANDARD' | 'VIP';
}

interface SelectedSeatsPanelProps {
  selectedSeats: Seat[];
  onRemoveSeat: (seatId: string) => void;
  totalTickets: number;
}

const SelectedSeatsPanel = ({ selectedSeats, onRemoveSeat, totalTickets }: SelectedSeatsPanelProps) => {
  const getTicketName = (type: 'STANDARD' | 'VIP', index: number) => {
    return type === 'VIP' ? `Ticket Premium ${index + 1}` : `Ticket Standard ${index + 1}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 rounded-t-2xl">
      <div className="container mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Selected Seats</h3>
          <span className="text-sm text-gray-400">{selectedSeats.length} of {totalTickets} seats</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {selectedSeats.map((seat, index) => (
            <div
              key={seat.id}
              className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3"
            >
              <div>
                <p className="text-sm font-bold text-white">
                  {getTicketName(seat.type, index)}
                </p>
                <p className="text-xs text-gray-300">{seat.id}</p>
              </div>
              <button
                onClick={() => onRemoveSeat(seat.id)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ))}
          {Array.from({ length: totalTickets - selectedSeats.length }).map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 p-3"
            >
              <p className="text-sm text-gray-500">(Select)</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectedSeatsPanel;
