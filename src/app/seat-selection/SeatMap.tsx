"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, X } from 'lucide-react';
import type { Row } from './types';

// Cores exatas do design
const COLORS = {
  standard: '#4AA7F5',    // Azul Claro
  vip: '#7658F6',         // Roxo
  selected: '#FF7513',    // Laranja
  unavailable: '#1F2937', // Cinza escuro (ocupado)
  wheelchair: '#2563EB',  // Azul Royal
  gap: 'transparent',
};

type SeatMapProps = {
  rows: Row[];
  selectedSeats: string[];
  onSeatClick: (row: string, number: string | number, id: string) => void;
  allowedTypes: string[];
  maxSelectable: number;
  readOnly?: boolean; // Para checkout
};

export function SeatMap({ rows, selectedSeats, onSeatClick, allowedTypes, readOnly = false }: SeatMapProps) {
  // Estado do Zoom
  const [scale, setScale] = useState(1);
  
  // Estados para drag/pan
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Ajuste inicial de escala para caber na tela
  useEffect(() => {
    if (containerRef.current && wrapperRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const mapWidth = 650; // Largura aproximada do mapa
      if (containerWidth < mapWidth) {
        const initialScale = Math.max(containerWidth / mapWidth, 0.5);
        setScale(initialScale);
      }
    }
  }, []);

  // Listeners globais para drag
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y
      });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, startPos]);

  const handleZoom = (direction: 'in' | 'out') => {
    setScale(prev => {
      if (direction === 'in') return Math.min(prev + 0.1, 1.8); 
      return Math.max(prev - 0.1, 0.6); 
    });
  };

  // Handlers para drag/pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Apenas botão esquerdo
    // Permitir drag mesmo em readOnly para visualização
    setIsDragging(true);
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setStartPos({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - startPos.x,
      y: touch.clientY - startPos.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  function getSeatStyle(type: string, status: string, isSelected: boolean, isAllowed: boolean) {
    if (type === 'GAP') return { background: 'transparent', border: 'none' };
    
    if (status === 'occupied' || (!readOnly && !isAllowed)) {
        return { background: COLORS.unavailable, cursor: 'not-allowed' };
    }

    if (isSelected) {
        return { 
            background: COLORS.selected, 
            color: 'white'
        };
    }

    if (type === 'VIP') return { background: COLORS.vip };
    if (type === 'WHEELCHAIR') return { background: COLORS.wheelchair };
    
    return { background: COLORS.standard };
  }

  const columnNumbers = Array.from({ length: 25 }, (_, i) => i + 1);

  return (
    <div className="w-full flex flex-col gap-6">
      
      {/* --- CABEÇALHO DE CONTROLE (Choose your accent + Zoom) --- */}
      {!readOnly && (
        <div className="flex items-center justify-between px-2">
          <div>
              <h3 className="text-white font-medium text-base">Choose your accent</h3>
              <p className="text-xs text-gray-500 mt-0.5">Tap the buttons to zoom</p>
          </div>
          
          {/* Controles de Zoom */}
          <div className="flex items-center bg-[#171C20] rounded-full p-1 border border-white/10">
              <button 
                  type="button"
                  onClick={() => handleZoom('out')}
                  className="p-2 text-white hover:text-gray-300 active:scale-90 transition w-10 h-10 flex items-center justify-center"
              >
                  <Minus size={18} />
              </button>
              <div className="w-px h-4 bg-white/10 mx-1"></div>
              <button 
                  type="button"
                  onClick={() => handleZoom('in')}
                  className="p-2 text-white hover:text-gray-300 active:scale-90 transition w-10 h-10 flex items-center justify-center"
              >
                  <Plus size={18} />
              </button>
          </div>
        </div>
      )}

      {/* --- ÁREA DO MAPA --- */}
      <div 
        ref={containerRef}
        className="relative w-full overflow-hidden"
        onMouseLeave={handleMouseUp}
      >
          
          {/* Scroll Area com drag/pan */}
          <div 
            className="w-full overflow-hidden flex justify-center pb-10 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ userSelect: 'none', touchAction: 'none' }}
          >
              
              {/* Wrapper com Zoom e Pan */}
              <div 
                  ref={wrapperRef}
                  style={{ 
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
                      transformOrigin: 'top center',
                      transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                  }}
                  className="flex flex-col items-center min-w-[350px]"
              >
                  {/* TELA / SCREEN */}
                  <div className="mb-12 flex flex-col items-center opacity-80 select-none w-full max-w-[320px]">
                      <span className="text-[8px] font-bold text-gray-400 mb-1 tracking-widest uppercase">SCREEN</span>
                      {/* Curva da tela estilo Figma */}
                      <div className="w-full h-8 relative overflow-hidden">
                           <div className="absolute top-0 left-[-10%] right-[-10%] h-[200%] border-t-4 border-gray-600 rounded-[50%] opacity-50 shadow-[0_-4px_10px_rgba(255,255,255,0.1)]"></div>
                      </div>
                      <span className="text-[6px] text-gray-500 -mt-4 tracking-[0.2em] uppercase">FRONT OF THEATER</span>
                  </div>

                  {/* GRID */}
                  <div className="flex flex-col gap-1.5 select-none">
                      {/* Header Numérico */}
                      <div className="flex gap-1 ml-[26px] mb-1">
                          {columnNumbers.map(num => (
                              <div key={num} className="w-5 h-5 flex items-center justify-center bg-[#27272a] rounded-[4px] text-[7px] font-bold text-gray-400">
                                  {num}
                              </div>
                          ))}
                      </div>

                      {/* Fileiras */}
                      {rows.map((row) => (
                          <div key={row.label} className="flex items-center gap-1.5">
                              {/* Label da Fileira (A, B, C...) */}
                              <div className="w-5 h-5 flex items-center justify-center bg-[#27272a] rounded-[4px] text-[8px] font-bold text-gray-400">
                                  {row.label}
                              </div>
                              
                              {/* Assentos */}
                              <div className="flex gap-1">
                                  {row.seats.map((seat) => {
                                      if (seat.type === 'GAP') return <div key={seat.id} className="w-5 h-5" />;

                                      const isSelected = selectedSeats.includes(seat.id);
                                      const isTypeAllowed = readOnly || allowedTypes.includes(seat.type) || (seat.type === 'WHEELCHAIR' && allowedTypes.includes('STANDARD'));
                                      const isAvailable = seat.status === 'available' && (readOnly || isTypeAllowed);
                                      const style = getSeatStyle(seat.type, seat.status, isSelected, isAvailable);

                                      return (
                                          <button
                                              key={seat.id}
                                              type="button"
                                              disabled={readOnly || !isAvailable}
                                              onClick={() => !readOnly && onSeatClick(row.label, seat.number, seat.id)}
                                              style={style}
                                              className={`
                                                  w-5 h-5 rounded-[4px] flex items-center justify-center 
                                                  transition-all duration-200 relative
                                                  ${!readOnly && isAvailable ? 'hover:brightness-110' : ''}
                                                  ${isSelected ? 'z-10' : ''}
                                                  ${readOnly ? 'cursor-default' : ''}
                                              `}
                                          >
                                              {seat.status === 'occupied' ? (
                                                  <X size={12} className="text-gray-500/50" strokeWidth={4} />
                                              ) : seat.type === 'WHEELCHAIR' ? (
                                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white/80">
                                                      <path d="M14 4c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zM8.5 11c-.83 0-1.5.67-1.5 1.5S7.67 14 8.5 14h1.15l-2.09 3.63c-.23.4-.64.66-1.1.72l-2.46.31v2l2.31-.29c1.46-.18 2.72-.99 3.44-2.22l2.36-4.1H14c1.1 0 2 .9 2 2v5h2v-5c0-2.21-1.79-4-4-4H9.36l-.86-2H8.5z"/>
                                                  </svg>
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
    </div>
  );
}
