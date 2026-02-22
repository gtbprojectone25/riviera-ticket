import { SupportTicketsClient } from './_components/support-tickets-client'

export const metadata = {
  title: 'Suporte | Admin Riviera',
}

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Suporte ao cliente</h1>
        <p className="text-gray-400 text-sm mt-1">
          Atendimento e respostas aos chamados dos clientes
        </p>
      </div>
      <SupportTicketsClient />
    </div>
  )
}
