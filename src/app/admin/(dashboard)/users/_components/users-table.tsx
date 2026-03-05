import { db } from '@/db'
import { users, tickets } from '@/db/schema'
import { desc, eq, count } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { User } from 'lucide-react'
import { UserActions } from './user-actions'
import { isTransientDbError } from '@/lib/db-error'

type UserRow = typeof users.$inferSelect

type UserWithTickets = UserRow & {
  ticketsCount: number
}

async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  const maxAttempts = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isTransientDbError(error) || attempt === maxAttempts) break
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt))
    }
  }

  throw lastError
}

async function getUsers(): Promise<{ users: UserWithTickets[]; unavailable: boolean }> {
  let allUsers: UserRow[] = []

  try {
    allUsers = (await withDbRetry(() =>
      db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(50),
    )) as UserRow[]
  } catch (error) {
    if (isTransientDbError(error)) {
      console.error('UsersTable DB unavailable:', error)
      return { users: [], unavailable: true }
    }
    throw error
  }

  const enrichedUsers: UserWithTickets[] = await Promise.all(
    allUsers.map(async (user: UserRow) => {
      const [ticketsCount] = await withDbRetry(() =>
        db
          .select({ count: count() })
          .from(tickets)
          .where(eq(tickets.userId, user.id)),
      )

      return {
        ...user,
        ticketsCount: ticketsCount?.count || 0,
      }
    }),
  )

  return { users: enrichedUsers, unavailable: false }
}

export async function UsersTable() {
  const { users: allUsers, unavailable } = await getUsers()

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Verificado
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Ingressos
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Cadastro
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {unavailable ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-yellow-400">
                  Banco temporariamente indisponivel. Tente novamente em instantes.
                </td>
              </tr>
            ) : allUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Nenhum usuario encontrado
                </td>
              </tr>
            ) : (
              allUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {user.name} {user.surname}
                        </p>
                        <p className="text-xs text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300">{user.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      className={
                        user.emailVerified
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                      }
                    >
                      {user.emailVerified ? 'Verificado' : 'Pendente'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white">{user.ticketsCount}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300">
                      {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <UserActions userId={user.id} userName={`${user.name} ${user.surname}`} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
