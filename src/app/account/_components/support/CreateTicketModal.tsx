'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Category = 'BUG' | 'QUESTION' | 'FINANCIAL' | 'SUGGESTION'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'BUG', label: 'Bug / Error' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'FINANCIAL', label: 'Financial' },
  { value: 'SUGGESTION', label: 'Suggestion' },
]

type Props = {
  onClose: () => void
  onSubmit: (data: { subject: string; category: string; description: string }) => Promise<void>
}

export function CreateTicketModal({ onClose, onSubmit }: Props) {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<Category>('QUESTION')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({ subject: subject.trim(), category, description: description.trim() })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const modal = (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ">
      <div className="w-full max-w-lg bg-[#0d1117] border border-gray-800 rounded-2xl shadow-2xl relative z-10 cursor-pointer">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white cursor-pointer">Open a ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject" className="text-gray-300 text-sm">
              Subject <span className="text-red-400">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              maxLength={200}
              required
              className="bg-[#1F2933] border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category" className="text-gray-300 text-sm">
              Category <span className="text-red-400">*</span>
            </Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-md border border-gray-700 bg-[#1F2933] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-gray-300 text-sm">
              Description <span className="text-red-400">*</span>
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows={5}
              maxLength={5000}
              required
              className="w-full rounded-md border border-gray-700 bg-[#1F2933] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
            <p className="text-xs text-gray-600 text-right">{description.length}/5000</p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !description.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Open ticket'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted || typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
