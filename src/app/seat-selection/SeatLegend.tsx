import { X } from 'lucide-react';

export function SeatLegend() {
  return (
    <div className="w-full px-1 py-4">
      <h3 className="text-white font-medium mb-4 text-sm">Guia de acentos</h3>
      <div className="grid grid-cols-2 gap-y-3 gap-x-8">
        {/* Disponível Padrão */}
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-sm bg-[#4AA7F5]" />
          <span className="text-sm text-gray-300">Disponível Padrão</span>
        </div>

        {/* Indisponível */}
        <div className="flex items-center gap-3">
          <X className="w-5 h-5 text-[#DC2626] font-bold" strokeWidth={3} />
          <span className="text-sm text-gray-300">Indisponível</span>
        </div>

        {/* Disponível VIP */}
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-sm bg-[#6D28D9]" />
          <span className="text-sm text-gray-300">Disponível VIP</span>
        </div>

        {/* Cadeira de Rodas */}
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-sm bg-[#3B82F6] flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
              <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-1 5h2l.6 3h3.2a1 1 0 0 1 0 2h-2.7l.8 4.1a3.5 3.5 0 1 1-2 .4l-.9-4.5-1.7 1.1a1 1 0 0 1-1.4-.3l-1-1.6a1 1 0 1 1 1.7-1l.5.8 2.5-1.5-.6-3Z"/>
            </svg>
          </span>
          <span className="text-sm text-gray-300">Preferencial</span>
        </div>

        {/* Selecionado */}
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-sm bg-[#F59E0B]" />
          <span className="text-sm text-gray-300">Selecionado</span>
        </div>

        {/* Reservado (HOLD) */}
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-sm bg-[#6B7280]" />
          <span className="text-sm text-gray-300">Reservado</span>
        </div>
      </div>
    </div>
  );
}
