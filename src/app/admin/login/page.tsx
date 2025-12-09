import { AdminLoginForm } from './_components/login-form'

export const metadata = {
  title: 'Admin Login | Riviera Ticket',
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Riviera <span className="text-red-500">Admin</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Painel de Gerenciamento
          </p>
        </div>

        {/* Card de Login */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">
            Acesso Administrativo
          </h2>
          
          <AdminLoginForm />
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-8">
          © 2025 Riviera Ticket. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}
