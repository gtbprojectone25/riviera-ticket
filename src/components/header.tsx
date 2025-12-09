'use client'

import { Button } from '@/components/ui/button'
import Link from "next/link";
import { cn } from '@/lib/utils'
import { useRouter, usePathname } from 'next/navigation'
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
  const pathname = usePathname()

  // Esconde o header em p�ginas de auth ou conta
  const hiddenPrefixes = ['/account']
  if (pathname && hiddenPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }


  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
      className
    )}>
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo Section */}
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2 cursor-pointer">
            <Image
              src="/riviera-logo.ico"
              alt="Riviera Logo"
              width={100}
              height={100}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-2 mr-24 ">
          {/** Esconde o botão SIGN IN nessas rotas */}
          {!['/account', '/register', '/login'].some((p) => pathname.startsWith(p)) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:text-white/80 font-extrabold cursor-pointer"
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
          )}
        </div>

        {/* IMAX Logo - absolute right corner */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Image
              src="/logo-imax.png"
              alt="IMAX Logo"
              width={70}
              height={70}
              className="object-contain "
            />
        </div>
      </div>
    </header>
  )
}



