'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Bell, LogOut, Search, MessageCircle } from 'lucide-react'

type AdminInfo = {
  id: string
  name: string
  email: string
  role: string
}

export function AdminHeader({ admin }: { admin: AdminInfo }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [supportPendingCount, setSupportPendingCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) {
      router.push(`/admin/orders?search=${encodeURIComponent(q)}`)
    } else {
      router.push('/admin/orders')
    }
  }

  useEffect(() => {
    fetch('/api/admin/support/count')
      .then((r) => r.ok ? r.json() : { pendingCount: 0 })
      .then((data: { pendingCount?: number }) => setSupportPendingCount(data.pendingCount ?? 0))
      .catch(() => setSupportPendingCount(0))
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    if (notificationsOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [notificationsOpen])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const res = await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' })
      if (res.ok) {
        // Recarregar a página para garantir que o cookie foi removido e a sessão sumiu
        window.location.href = '/admin/login'
        return
      }
      router.push('/admin/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/admin/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="h-16 bg-gray-900/50 backdrop-blur-sm border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar pedidos, sessões, usuários..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((o) => !o)}
            className="relative p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5" />
            {supportPendingCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {supportPendingCount > 99 ? '99+' : supportPendingCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-gray-700 bg-gray-900 shadow-xl py-1 z-50">
              <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Notificações</p>
              <Link
                href="/admin/support"
                onClick={() => setNotificationsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <MessageCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="flex-1">
                  {supportPendingCount > 0
                    ? `${supportPendingCount} chamado(s) de suporte pendente(s)`
                    : 'Suporte ao cliente'}
                </span>
              </Link>
              {supportPendingCount === 0 && (
                <p className="px-3 py-2 text-xs text-gray-500">Nenhum chamado pendente.</p>
              )}
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3 pl-4 border-l border-gray-700">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{admin.name}</p>
            <p className="text-xs text-gray-500">{admin.email}</p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
