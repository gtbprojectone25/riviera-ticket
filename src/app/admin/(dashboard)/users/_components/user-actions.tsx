'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Ban, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface UserActionsProps {
  userId: string
  userName: string
}

export function UserActions({ userId, userName }: UserActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Falha ao excluir usuário')
      }

      toast.success("Usuário excluído", {
        description: `O usuário ${userName} foi removido com sucesso.`,
      })
      
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Erro", {
        description: error instanceof Error ? error.message : "Erro desconhecido",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/admin/users/${userId}`}>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <Eye className="w-4 h-4" />
        </Button>
      </Link>
      
      {/* Ban button placeholder - logic can be added later */}
      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-yellow-500">
        <Ban className="w-4 h-4" />
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-gray-900 border-gray-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta ação não pode ser desfeita. Isso excluirá permanentemente a conta de <span className="font-bold text-white">{userName}</span> e removerá seus dados dos nossos servidores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
