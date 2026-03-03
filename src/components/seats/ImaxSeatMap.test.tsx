import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ImaxSeatMap } from './ImaxSeatMap'

describe('ImaxSeatMap sold seats', () => {
  it('renders SOLD seats as disabled with lock icon and prevents click', () => {
    const onSeatToggle = vi.fn()

    render(
      <ImaxSeatMap
        rows={[
          {
            label: 'A',
            seats: [
              { id: 'db-sold', seatId: 'A1', row: 'A', number: 1, type: 'STANDARD', status: 'SOLD' },
              { id: 'db-free', seatId: 'A2', row: 'A', number: 2, type: 'STANDARD', status: 'AVAILABLE' },
            ],
          },
        ]}
        selectedSeatIds={[]}
        onSeatToggle={onSeatToggle}
        allowedTypes={['STANDARD']}
        maxSelectable={4}
      />,
    )

    const soldButton = screen.getByRole('button', { name: /Seat A1 unavailable/i })
    expect(soldButton).toBeDisabled()
    expect(soldButton.querySelector('svg.lucide-lock')).not.toBeNull()
    fireEvent.click(soldButton)
    expect(onSeatToggle).not.toHaveBeenCalled()

    const freeButton = screen.getByRole('button', { name: /Seat A2 available/i })
    expect(freeButton).not.toBeDisabled()
    fireEvent.click(freeButton)
    expect(onSeatToggle).toHaveBeenCalledWith('db-free')
  })
})

