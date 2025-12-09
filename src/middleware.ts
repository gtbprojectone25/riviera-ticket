/**
 * Next.js Middleware
 * Protege rotas admin e gerencia autenticação
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rotas do Admin
  if (pathname.startsWith('/admin')) {
    // Rotas públicas do admin (login)
    const publicAdminRoutes = ['/admin/login', '/admin/forgot-password']
    
    if (publicAdminRoutes.some(route => pathname === route)) {
      // Se já está logado, redireciona para dashboard
      const adminSession = request.cookies.get('admin_session')?.value
      if (adminSession) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
      return NextResponse.next()
    }

    // Verificar cookie de sessão admin
    const adminSession = request.cookies.get('admin_session')?.value
    
    if (!adminSession) {
      // Redirecionar para login
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('returnUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Proteger rotas admin
    '/admin/:path*',
  ],
}
