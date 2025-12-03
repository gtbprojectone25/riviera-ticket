"use client";

import { create } from "zustand";
import { Cinema } from "@/data/cinemas";

// Definindo o tipo do Ticket na Store para ser reutilizado
export type SelectedTicket = {
  id: string;
  name: string;
  price: number;
  amount: number;
  description?: string[];
};

// Tipo do Ticket com Assento (usado no checkout)
export type FinalizedTicket = {
    id: string; // ID único gerado
    name: string;
    type: string; // 'VIP' | 'STANDARD'
    price: number;
    assignedSeatId?: string;
};

type BookingState = {
  // Dados Geográficos e de Cinema
  selectedCinema: Cinema | null;
  userLocation: { lat: number; lng: number } | null;
  
  // Dados da Sessão e Compra
  selectedSessionId: string | null;
  selectedTickets: SelectedTicket[];
  
  // Tickets finalizados com assentos
  finalizedTickets: FinalizedTicket[];

  // Actions
  setCinema: (cinema: Cinema) => void;
  setUserLocation: (loc: { lat: number; lng: number }) => void;
  setSelectedSessionId: (id: string) => void;
  setSelectedTickets: (tickets: SelectedTicket[]) => void;
  setFinalizedTickets: (tickets: FinalizedTicket[]) => void;
};

export const useBookingStore = create<BookingState>((set) => ({
  selectedCinema: null,
  userLocation: null,
  selectedSessionId: null,
  selectedTickets: [],
  finalizedTickets: [],

  setCinema: (cinema) => set({ selectedCinema: cinema }),
  setUserLocation: (loc) => set({ userLocation: loc }),
  
  setSelectedSessionId: (id) => set({ selectedSessionId: id }),
  setSelectedTickets: (tickets) => set({ selectedTickets: tickets }),
  setFinalizedTickets: (tickets) => set({ finalizedTickets: tickets }),
}));
