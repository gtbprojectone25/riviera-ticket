import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value / 100)
}

export function formatCurrencyForDisplay(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value / 100)
}

export type TimeRemaining = {
  minutes: number
  seconds: number
  expired: boolean
}

export function getTimeRemaining(targetTimeMs: number): TimeRemaining {
  const now = Date.now()
  const diffMs = Math.max(0, targetTimeMs - now)
  const totalSeconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return {
    minutes,
    seconds,
    expired: diffMs <= 0,
  }
}
