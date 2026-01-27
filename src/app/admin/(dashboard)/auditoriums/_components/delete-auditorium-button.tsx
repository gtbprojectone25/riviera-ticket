'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type DeleteAuditoriumButtonProps = {
  auditoriumId: string
}

export function DeleteAuditoriumButton({ auditoriumId }: DeleteAuditoriumButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    const confirmed = window.confirm('Remover esta sala? Esta acao nao pode ser desfeita.')
    if (!confirmed) return

    setIsDeleting(true)

    const res = await fetch(`/api/admin/auditoriums/${auditoriumId}`, {
      method: 'DELETE',
    })

    setIsDeleting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Erro ao remover sala')
      return
    }

    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-gray-400 hover:text-red-500"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  )
}
