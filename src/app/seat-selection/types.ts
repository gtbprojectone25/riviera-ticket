export type TicketType = 'VIP' | 'STANDARD';

export type SeatType = 'VIP' | 'STANDARD' | 'WHEELCHAIR' | 'GAP';

export type Ticket = {
  id: string;
  name: string;
  type: TicketType;
  price: number;
  assignedSeatId?: string;
};

export type SeatStatus = 'AVAILABLE' | 'HELD' | 'SOLD';

export type Seat = {
  id: string;
  row: string;
  number: number;
  type: SeatType;
  status: SeatStatus;
  heldUntil?: string | null;
  heldByCartId?: string | null;
};

export type Row = {
  label: string;
  seats: Seat[];
};
