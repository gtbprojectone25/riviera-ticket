import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';


export function SeatLegend() {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 mt-4 mb-2">
      <button
        className="flex items-center gap-2 text-sm font-medium text-white mb-2 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Guia de assentos
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-3 pb-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-[#4AA7F5] border border-gray-600" />
            <span className="text-xs text-white">Disponível Padrão</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-[#2A2A2A] border border-gray-600 flex items-center justify-center">
              <X className="w-3 h-3 text-gray-500" />
            </span>
            <span className="text-xs text-white">Indisponível</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-[#7658F6] border border-gray-600" />
            <span className="text-xs text-white">Disponível VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-[#0648B9] border border-gray-600" />
            <span className="text-xs text-white">Cadeira de Rodas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-4 h-4 rounded bg-[#FF7513] border border-gray-600" />
            <span className="text-xs text-white">Selecionado</span>
          </div>
        </div>
      )}
      <hr className="border-gray-700 mt-3" />
    </div>
  );
}
