"use client";

import React, { useState } from 'react';
import { Plus, Minus, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { Row } from './types';

// Cores exatas do design
const COLORS = {
  standard: '#4AA7F5',    // Azul Claro
  vip: '#7658F6',         // Roxo
  selected: '#FF7513',    // Laranja
  unavailable: '#1F2937', // Cinza escuro (ocupado)
  wheelchair: '#2563EB',  // Azul Royal
  gap: 'transparent',
  labelBackground: '#27272a', // Fundo das letras
};

type SeatMapProps = {
  rows: Row[];
  selectedSeats: string[];
  onSeatClick: (row: string, number: string | number, id: string) => void;
  allowedTypes: string[];
  maxSelectable: number;
};

export function SeatMap({ rows, selectedSeats, onSeatClick, allowedTypes }: SeatMapProps) {
  // Estado do Acordeão (Aberto por padrão)
  const [isOpen, setIsOpen] = useState(true);
  // Estado do Zoom
  const [scale, setScale] = useState(1);

  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prev => {
      if (direction === 'in') return Math.min(prev + 0.1, 1.8); 
      return Math.max(prev - 0.1, 0.6); 
    });
  };

  function getSeatStyle(type: string, status: string, isSelected: boolean, isAllowed: boolean) {
    if (type === 'GAP') return { background: 'transparent', border: 'none' };
    
    if (status === 'occupied' || !isAllowed) {
        return { background: COLORS.unavailable, cursor: 'not-allowed' };
    }

    if (isSelected) {
        return { 
            background: COLORS.selected, 
            boxShadow: '0 0 8px rgba(255, 117, 19, 0.6)',
            color: 'white'
        };
    }

    if (type === 'VIP') return { background: COLORS.vip };
    if (type === 'WHEELCHAIR') return { background: COLORS.wheelchair };
    
    return { background: COLORS.standard };
  }

  const columnNumbers = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className="w-full flex flex-col gap-2">
      
      {/* --- CABEÇALHO DE CONTROLE (Botão + Zoom) --- */}
      <div className="flex items-center justify-between bg-[#121212] p-3 rounded-xl border border-gray-800">
        
        {/* Botão Guia de Assentos (Lado Esquerdo) */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-3 text-white hover:text-[#4AA7F5] transition-colors group focus:outline-none"
        >
          <div className={`p-1.5 rounded-md bg-[#1A1A1A] border border-gray-700 group-hover:border-[#4AA7F5] transition-all`}>
             {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold tracking-wide">Guia de assentos</span>
            <span className="text-[10px] text-gray-500 group-hover:text-gray-400">
              {isOpen ? 'Toque para recolher' : 'Toque para visualizar'}
            </span>
          </div>
        </button>

        {/* Controles de Zoom (Lado Direito - Só aparece se aberto) */}
        {isOpen && (
            <div className="flex items-center bg-[#1A1A1A] rounded-lg p-1 border border-gray-700 animate-in fade-in duration-300">
                <button 
                    type="button"
                    onClick={() => handleZoom('out')}
                    className="p-1.5 text-gray-400 hover:text-white active:scale-90 transition"
                >
                    <Minus size={14} />
                </button>
                <div className="w-px h-3 bg-gray-600 mx-1"></div>
                <button 
                    type="button"
                    onClick={() => handleZoom('in')}
                    className="p-1.5 text-gray-400 hover:text-white active:scale-90 transition"
                >
                    <Plus size={14} />
                </button>
            </div>
        )}
      </div>

      {/* --- ÁREA DO MAPA (Collapsible) --- */}
      {isOpen && (
        <div className="relative w-full h-[450px] bg-[#09090b] border border-[#4AA7F5]/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(74,167,245,0.1)] animate-in slide-in-from-top-2 duration-300">
            
            {/* Scroll Area */}
            <div className="w-full h-full overflow-auto flex justify-center pt-10 pb-20 cursor-grab active:cursor-grabbing scrollbar-hide">
                
                {/* Wrapper com Zoom */}
                <div 
                    style={{ 
                        transform: `scale(${scale})`, 
                        transformOrigin: 'top center',
                        transition: 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                    }}
                    className="flex flex-col items-center"
                >
                    {/* TELA / SCREEN */}
                    <div className="mb-10 flex flex-col items-center opacity-90 select-none">
                        <span className="text-[9px] font-bold text-gray-200 mb-1 tracking-widest uppercase">Screen</span>
                        <svg width="320" height="24" viewBox="0 0 320 24" className="fill-gray-600">
                            <path d="M10,24 Q160,4 310,24 L310,20 Q160,0 10,20 Z" opacity="0.8" />
                        </svg>
                        <span className="text-[7px] text-gray-500 mt-2 tracking-[0.2em] uppercase">Front of theater</span>
                    </div>

                    {/* GRID */}
                    <div className="flex flex-col gap-1.5 select-none">
                        {/* Header Numérico */}
                        <div className="flex gap-1 ml-[26px] mb-0.5">
                            {columnNumbers.map(num => (
                                <div key={num} className="w-5 h-5 flex items-center justify-center bg-[#27272a] rounded-[4px] text-[7px] font-bold text-gray-300">
                                    {num}
                                </div>
                            ))}
                        </div>

                        {/* Fileiras */}
                        {rows.map((row) => (
                            <div key={row.label} className="flex items-center gap-1.5">
                                <div className="w-5 h-5 flex items-center justify-center bg-[#27272a] rounded-[4px] text-[8px] font-bold text-gray-300">
                                    {row.label}
                                </div>
                                <div className="flex gap-1">
                                    {row.seats.map((seat) => {
                                        if (seat.type === 'GAP') return <div key={seat.id} className="w-5 h-5" />;

                                        const isSelected = selectedSeats.includes(seat.id);
                                        const isTypeAllowed = allowedTypes.includes(seat.type) || (seat.type === 'WHEELCHAIR' && allowedTypes.includes('STANDARD'));
                                        const isAvailable = seat.status === 'available' && isTypeAllowed;
                                        const style = getSeatStyle(seat.type, seat.status, isSelected, isAvailable);

                                        return (
                                            <button
                                                key={seat.id}
                                                type="button"
                                                disabled={!isAvailable}
                                                onClick={() => onSeatClick(row.label, seat.number, seat.id)}
                                                style={style}
                                                className={`
                                                    w-5 h-5 rounded-[4px] flex items-center justify-center 
                                                    transition-all duration-200 relative group
                                                    ${isAvailable ? 'hover:brightness-110 hover:scale-105' : ''}
                                                    ${isSelected ? 'z-10 scale-110' : ''}
                                                `}
                                            >
                                                {seat.status === 'occupied' ? (
                                                    <span className="text-[8px] leading-none text-gray-500 font-bold">✕</span>
                                                ) : seat.type === 'WHEELCHAIR' ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                                                        <path d="M14 4c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zM8.5 11c-.83 0-1.5.67-1.5 1.5S7.67 14 8.5 14h1.15l-2.09 3.63c-.23.4-.64.66-1.1.72l-2.46.31v2l2.31-.29c1.46-.18 2.72-.99 3.44-2.22l2.36-4.1H14c1.1 0 2 .9 2 2v5h2v-5c0-2.21-1.79-4-4-4H9.36l-.86-2H8.5z"/>
                                                    </svg>
                                                ) : isSelected ? (
                                                    <span className="text-[6px] font-bold text-white leading-none">{row.label}{seat.number}</span>
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}