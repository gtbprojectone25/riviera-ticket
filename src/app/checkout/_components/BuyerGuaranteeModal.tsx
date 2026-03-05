
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'

interface BuyerGuaranteeModalProps {
  open: boolean
  onClose: () => void
}

export function BuyerGuaranteeModal({
  open,
  onClose,
}: BuyerGuaranteeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>Riviera’s Buyer Guarantee</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <div className="space-y-4 text-gray-300">
          <p>
            Our Buyer Guarantee ensures that you can purchase tickets with
            confidence. We are committed to providing a secure and transparent
            experience for all our users.
          </p>
          <h3 className="font-semibold text-lg text-white">
            Key Features of Our Guarantee:
          </h3>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Secure Transactions:</strong> All payments are processed
              through a secure gateway to protect your financial information.
            </li>
            <li>
              <strong>Authentic Tickets:</strong> We verify all sellers to
              ensure that you receive authentic tickets for your event.
            </li>
            <li>
              <strong>Timely Delivery:</strong> Your tickets will be delivered
              in time for the event, either electronically or via mail.
            </li>
            <li>
              <strong>Full Refunds:</strong> You are entitled to a full refund
              if your event is canceled and not rescheduled.
            </li>
            <li>
              <strong>Customer Support:</strong> Our support team is available
              to assist you with any issues or questions you may have.
            </li>
          </ul>
          <p>
            For more details, please review our full terms of service or
            contact our support team.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
