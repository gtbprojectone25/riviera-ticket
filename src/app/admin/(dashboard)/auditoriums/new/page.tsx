import { db } from '@/db'
import { assets, cinemas } from '@/db/schema'
import { asc, desc } from 'drizzle-orm'
import { AuditoriumForm } from '../_components/auditorium-form'

export const metadata = {
  title: 'Nova Sala | Admin Riviera',
}

export default async function NewAuditoriumPage() {
  const cinemasRows = await db
    .select({ id: cinemas.id, name: cinemas.name })
    .from(cinemas)
    .orderBy(asc(cinemas.name))

  const assetsRows = await db
    .select({ id: assets.id, title: assets.title, fileName: assets.fileName, url: assets.url })
    .from(assets)
    .orderBy(desc(assets.createdAt))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nova Sala</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure a sala e o mapa de assentos
        </p>
      </div>

      <AuditoriumForm cinemas={cinemasRows} assets={assetsRows} />
    </div>
  )
}
