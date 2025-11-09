'use client'

import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/page-container'
import { AuthForms } from './_components/auth-forms'

/**
 * Authentication page with login and registration forms
 * Handles user authentication flow
 */
export default function AuthPage() {
  const router = useRouter()

  const handleLoginSuccess = () => {
    // Redirect to ticket selection or previous page
    const returnUrl = new URLSearchParams(window.location.search).get('returnUrl')
    router.push(returnUrl || '/ticket-selection')
  }

  const handleRegisterSuccess = () => {
    // Redirect to ticket selection after successful registration
    router.push('/ticket-selection')
  }

  return (
    <PageContainer>
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to Riviera Ticket
            </h1>
            <p className="text-muted-foreground">
              Sign in or create an account to purchase your IMAX tickets
            </p>
          </div>

          <AuthForms
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
          />
        </div>
      </div>
    </PageContainer>
  )
}