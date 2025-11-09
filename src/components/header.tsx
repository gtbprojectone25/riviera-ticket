'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeaderProps {
  className?: string
}

/**
 * Main header component with logo and IMAX branding
 * Includes navigation and user authentication state
 */
export function Header({ className }: HeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-white">LOGO</span>
          </div>
        </div>

        {/* IMAX Branding */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Experience in</span>
            <div className="bg-blue-600 px-3 py-1 rounded">
              <span className="text-white font-bold text-sm">IMAX</span>
            </div>
          </div>
          
          {/* User Actions */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-white hover:text-white/80">
              Sign In
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Get Tickets
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}