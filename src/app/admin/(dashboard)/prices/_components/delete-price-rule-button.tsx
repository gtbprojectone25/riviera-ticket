'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DeletePriceRuleButton({ ruleId }: { ruleId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    const confirmed = window.confirm('Remover esta regra de preco?')
    if (!confirmed) return

    setIsDeleting(true)

    const res = await fetch(`/api/admin/price-rules/${ruleId}`, {
      method: 'DELETE',
    })

    setIsDeleting(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Erro ao remover regra')
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
