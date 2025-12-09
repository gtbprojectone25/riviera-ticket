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
          <X className="w-5 h-5 text-gray-500 font-bold" strokeWidth={3} />
          <span className="text-sm text-gray-300">Indisponível</span>
        </div>

        {/* Disponível VIP */}
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-sm bg-[#7658F6]" />
          <span className="text-sm text-gray-300">Disponível VIP</span>
        </div>

        {/* Cadeira de Rodas */}
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-sm bg-[#2563EB]" />
          <span className="text-sm text-gray-300">Cadeira de Rodas</span>
        </div>

        {/* Selecionado */}
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 rounded-sm bg-[#FF7513]" />
          <span className="text-sm text-gray-300">Selecionado</span>
        </div>
      </div>
    </div>
  );
}
