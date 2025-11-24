'use client';

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBookingStore } from "@/stores/booking";
import { cinemas } from "@/data/cinemas";

export function LocationAutocomplete() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<typeof cinemas>([]);
  const setUserLocation = useBookingStore((s) => s.setUserLocation);

  // Simples autocomplete de cidades
  function handleSearch() {
    const filtered = cinemas.filter(
      (c) =>
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        c.name.toLowerCase().includes(query.toLowerCase())
    );
    setResults(filtered);
  }

  function handleSelect(cinema: typeof cinemas[0]) {
    setUserLocation({ lat: cinema.lat, lng: cinema.lng });
    setQuery(cinema.city);
    setResults([]);
  }

  return (
    <div className="space-y-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Digite cidade ou cinema"
        className="bg-black text-white"
      />
      <Button onClick={handleSearch} className="w-full">
        Buscar
      </Button>
      {results.length > 0 && (
        <div className="bg-black border border-gray-700 rounded-lg mt-2">
          {results.map((cinema) => (
            <div
              key={cinema.id}
              className="p-2 hover:bg-gray-800 cursor-pointer"
              onClick={() => handleSelect(cinema)}
            >
              <span className="font-bold">{cinema.name}</span>
              <span className="block text-xs text-gray-400">
                {cinema.city}, {cinema.state}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}