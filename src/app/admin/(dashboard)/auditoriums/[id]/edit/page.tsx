import { notFound } from 'next/navigation'
import { db } from '@/db'
import { auditoriums, assets, cinemas } from '@/db/schema'
import { asc, desc, eq } from 'drizzle-orm'
import { AuditoriumForm } from '../../_components/auditorium-form'

export const metadata = {
  title: 'Editar Sala | Admin Riviera',
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditAuditoriumPage({ params }: PageProps) {
  const { id } = await params

  const [auditorium] = await db
    .select()
    .from(auditoriums)
    .where(eq(auditoriums.id, id))
    .limit(1)

  if (!auditorium) {
    notFound()
  }

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
        <h1 className="text-2xl font-bold text-white">Editar Sala</h1>
        <p className="text-gray-400 text-sm mt-1">
          Ajuste informacoes e mapa de assentos
        </p>
      </div>

      <AuditoriumForm cinemas={cinemasRows} assets={assetsRows} initialData={auditorium} />
    </div>
  )
}
