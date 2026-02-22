export const metadata = {
  title: 'Filmes | Admin Riviera',
}

export default function MoviesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Filmes</h1>
        <p className="text-gray-400 text-sm mt-1">
          Gestão de filmes e programação
        </p>
      </div>
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-gray-400">
        Esta seção está em desenvolvimento. Em breve você poderá gerenciar os filmes aqui.
      </div>
    </div>
  )
}
