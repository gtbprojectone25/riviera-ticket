export type TicketType = 'VIP' | 'STANDARD';

export type SeatType = 'VIP' | 'STANDARD' | 'WHEELCHAIR' | 'GAP';

export type Ticket = {
  id: string;
  name: string;
  type: TicketType;
  price: number;
  assignedSeatId?: string;
};

export type Seat = {
  id: string;
  row: string;
  number: number;
  type: SeatType;
  status: 'available' | 'occupied';
};

export type Row = {
  label: string;
  seats: Seat[];
};
