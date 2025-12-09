import { getAdminFromSession } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '../_components/sidebar'
import { AdminHeader } from '../_components/header'

export const metadata = {
  title: 'Admin | Riviera Ticket',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdminFromSession()
  
  if (!admin) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <AdminSidebar admin={admin} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-64">
        <AdminHeader admin={admin} />
        
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
