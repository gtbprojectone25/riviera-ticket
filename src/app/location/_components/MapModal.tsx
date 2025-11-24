'use client';

import { cinemas } from "@/data/cinemas";
import { GoogleMap, Marker, useJsApiLoader, MarkerClusterer } from "@react-google-maps/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  center: { lat: number; lng: number };
};

export function MapModal({ open, onClose, center }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY! ,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 bg-black">
  <VisuallyHidden>
    <DialogTitle>Mapa de Cinemas IMAX</DialogTitle>
  </VisuallyHidden>

  <div className="relative w-full h-[400px] rounded-lg overflow-hidden">
    {isLoaded && (
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={5}
        options={{
          disableDefaultUI: true,
          gestureHandling: "greedy",
        }}
      >
        <MarkerClusterer>
          {(clusterer) => (
            <>
              {cinemas.map((cinema) => (
                <Marker
                  key={cinema.id}
                  position={{ lat: cinema.lat, lng: cinema.lng }}
                  clusterer={clusterer}
                  label={{
                    text: cinema.name,
                    className:
                      "text-xs font-bold bg-black/80 text-white px-2 py-1 rounded",
                  }}
                />
              ))}
            </>
          )}
        </MarkerClusterer>
      </GoogleMap>
    )}
  </div>

  <Button className="mt-4 w-full" onClick={onClose}>
    Fechar
  </Button>
</DialogContent>
    </Dialog>
  );
}
