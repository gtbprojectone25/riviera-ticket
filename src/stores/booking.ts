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

type BookingState = {
  // Dados Geográficos e de Cinema
  selectedCinema: Cinema | null;
  userLocation: { lat: number; lng: number } | null;
  
  // Dados da Sessão e Compra (NOVOS)
  selectedSessionId: string | null;
  selectedTickets: SelectedTicket[];

  // Actions
  setCinema: (cinema: Cinema) => void;
  setUserLocation: (loc: { lat: number; lng: number }) => void;
  setSelectedSessionId: (id: string) => void;
  setSelectedTickets: (tickets: SelectedTicket[]) => void;
};

export const useBookingStore = create<BookingState>((set) => ({
  selectedCinema: null,
  userLocation: null,
  selectedSessionId: null,
  selectedTickets: [],

  setCinema: (cinema) => set({ selectedCinema: cinema }),
  setUserLocation: (loc) => set({ userLocation: loc }),
  
  // Novas Actions
  setSelectedSessionId: (id) => set({ selectedSessionId: id }),
  setSelectedTickets: (tickets) => set({ selectedTickets: tickets }),
}));