'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth'
import Image from 'next/image'

interface HeaderProps {
  className?: string
}



/**
 * Main header component with logo and IMAX branding
 * Includes navigation and user authentication state
 */
export function Header({ className }: HeaderProps) {
  const router = useRouter()
  const { isAuthenticated, user, logout } = useAuth()

  const handleGetTickets = () => {
    if (isAuthenticated) {
      router.push('/my-tickets')
    } else {
      router.push('/auth')
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
      className
    )}>
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white">LOGO</span>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-2 mr-24">
          {isAuthenticated ? (
            <>
              <div className="text-sm text-gray-300">
                Olá, {user?.name}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:text-white/80"
                onClick={logout}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white hover:text-white/80"
              onClick={() => router.push('/auth')}
            >
              Sign In
            </Button>
          )}
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleGetTickets}
          >
            Get Tickets
          </Button>
        </div>

        {/* IMAX Logo - absolute right corner */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <Image 
            src="/logo-imax.png" 
            alt="IMAX Logo" 
            width={70}
            height={70}
            className="object-contain"
          />
        </div>
      </div>
    </header>
  )
}