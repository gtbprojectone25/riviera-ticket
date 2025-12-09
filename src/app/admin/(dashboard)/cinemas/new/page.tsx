import { CinemaForm } from '../_components/cinema-form'

export const metadata = {
  title: 'Novo Cinema | Admin Riviera',
}

export default function NewCinemaPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Novo Cinema</h1>
        <p className="text-gray-400 text-sm mt-1">
          Cadastre um novo cinema no sistema
        </p>
      </div>

      {/* Form */}
      <CinemaForm />
    </div>
  )
}
