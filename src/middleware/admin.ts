/**
 * Admin Middleware
 * Protege todas as rotas /admin/*
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function adminMiddleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Rotas públicas do admin (login)
  const publicAdminRoutes = ['/admin/login', '/admin/forgot-password']
  
  if (publicAdminRoutes.some(route => pathname.startsWith(route))) {
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
  
  return NextResponse.next()
}

// Configuração para usar no middleware.ts principal
export const adminConfig = {
  matcher: '/admin/:path*',
}
