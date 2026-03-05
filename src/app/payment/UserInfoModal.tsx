'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface UserInfoModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string | undefined
  userEmail: string | undefined
}

export function UserInfoModal({ isOpen, onClose, userName, userEmail }: UserInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>User Information</DialogTitle>
          <DialogDescription className="text-gray-400">
            Here is the information associated with your account.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <div>
            <p className="text-sm text-gray-400">Name</p>
            <p className="text-lg font-semibold">{userName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Email</p>
            <p className="text-lg font-semibold">{userEmail}</p>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
