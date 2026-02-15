import { Seat, SeatType } from './types';

export const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const rowsStandard = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const rowsVip = ['M', 'N', 'O'];
  const allRows = [...rowsStandard, ...rowsVip];

  allRows.forEach((row) => {
    const isVipRow = rowsVip.includes(row);
    const defaultType: SeatType = isVipRow ? 'VIP' : 'STANDARD';
    
    for (let i = 1; i <= 25; i++) {
      let seatType: SeatType = defaultType;
      let status: 'AVAILABLE' | 'SOLD' = 'AVAILABLE';

      if (isVipRow) {
        if (i >= 7 && i <= 18) {
            seatType = 'VIP';
        } else {
            seatType = 'GAP';
        }
      } 
      else {
          if (row === 'E') {
            if (i === 1 || i === 2) status = 'SOLD';
            else if (i === 3 || i === 4) seatType = 'STANDARD';
            else if (i === 5 || i === 6) seatType = 'WHEELCHAIR';
            else if (i >= 7 && i <= 10) seatType = 'GAP';
            else if (i >= 11 && i <= 14) seatType = 'WHEELCHAIR';
            else if (i === 15) seatType = 'GAP';
            else if (i === 16 || i === 17) seatType = 'STANDARD';
            else if (i >= 18) seatType = 'GAP';
          } 
          else if (row === 'F') {
            if (i === 21 || i === 22) seatType = 'WHEELCHAIR';
            else if (i === 23) seatType = 'GAP';
            else if (i === 24 || i === 25) seatType = 'WHEELCHAIR';
          } else if (row === 'O') {
            if (i > 8 && i < 18) seatType = 'GAP';
          }
      }

      seats.push({
        id: `${row}${i}`,
        row: row,
        number: i,
        type: seatType,
        status: status,
        seatId: ''
      });
    }
  });
  return seats;
};

export const INITIAL_SEATS = generateSeats();

