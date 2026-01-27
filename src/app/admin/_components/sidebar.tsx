'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Image as ImageIcon,
  Film,
  Building2,
  Calendar,
  Armchair,
  ShoppingCart,
  Users,
  Tag,
  DollarSign,
  BarChart3,
  Settings,
  UserCog,
  ClipboardList,
} from 'lucide-react'

type AdminInfo = {
  id: string
  name: string
  email: string
  role: string
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Imagens', href: '/admin/images', icon: ImageIcon },
  { name: 'Pedidos', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Sessões', href: '/admin/sessions', icon: Calendar },
  { name: 'Preços', href: '/admin/prices', icon: DollarSign },
  { name: 'Cinemas', href: '/admin/cinemas', icon: Building2 },
  { name: 'Salas', href: '/admin/auditoriums', icon: Armchair },
  { name: 'Filmes', href: '/admin/movies', icon: Film },
  { name: 'Fila de Espera', href: '/admin/waitlist', icon: ClipboardList },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Promoções', href: '/admin/promotions', icon: Tag },
  { name: 'Relatórios', href: '/admin/reports', icon: BarChart3 },
]

const adminNavigation = [
  { name: 'Administradores', href: '/admin/admins', icon: UserCog },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
]

export function AdminSidebar({ admin }: { admin: AdminInfo }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">
            Riviera <span className="text-red-500">Admin</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="mb-4">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Menu Principal
          </p>
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-red-600/10 text-red-500 border border-red-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.name}
            </Link>
          ))}
        </div>

        {/* Admin only navigation */}
        {(admin.role === 'SUPER_ADMIN' || admin.role === 'ADMIN') && (
          <div className="pt-4 border-t border-gray-800">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Administração
            </p>
            {adminNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-red-600/10 text-red-500 border border-red-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
            {admin.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{admin.name}</p>
            <p className="text-xs text-gray-500 truncate">{admin.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
