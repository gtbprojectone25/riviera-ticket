import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes
 * @param inputs - Class values to merge
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency to USD
 * @param amount - Amount in cents
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100)
}

/**
 * Format number with pt-BR separators
 * @param value - Integer/decimal number
 * @returns Formatted number (e.g. 2610 -> "2.610")
 */
export function formatNumberPtBR(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

/**
 * Generate a random string for IDs
 * @param length - Length of the string
 * @returns Random string
 */
export function generateId(length: number = 8): string {
  return Math.random().toString(36).substring(2, length + 2)
}

/**
 * Validate if a seat ID is valid format
 * @param seatId - Seat identifier (e.g., "A1", "B12")
 * @returns Boolean indicating validity
 */
export function isValidSeatId(seatId: string): boolean {
  const seatPattern = /^[A-Z]\d{1,2}$/
  return seatPattern.test(seatId)
}

/**
 * Calculate time remaining in minutes and seconds
 * @param targetTime - Target timestamp
 * @returns Object with minutes and seconds
 */
export function getTimeRemaining(targetTime: number) {
  const now = Date.now()
  const difference = targetTime - now
  
  if (difference <= 0) {
    return { minutes: 0, seconds: 0, expired: true }
  }
  
  const minutes = Math.floor(difference / (1000 * 60))
  const seconds = Math.floor((difference % (1000 * 60)) / 1000)
  
  return { minutes, seconds, expired: false }
}
