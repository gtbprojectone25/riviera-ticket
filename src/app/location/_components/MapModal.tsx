'use client';

import { cinemas } from "@/data/cinemas";
import { GoogleMap, Marker, useJsApiLoader, MarkerClustererF } from "@react-google-maps/api";
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
        <MarkerClustererF>
          {(clusterer) => (
            <>
              {cinemas.map((cinema) => (
                <Marker
                  key={cinema.id}
                  position={{ lat: cinema.lat, lng: cinema.lng }}
                  clusterer={clusterer}
                  options={getReadableMarkerOptions(cinema.name)}
                />
              ))}
            </>
          )}
        </MarkerClustererF>
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

function getReadableMarkerOptions(labelText: string): google.maps.MarkerOptions {
  const width = Math.min(260, Math.max(140, labelText.length * 7));
  const height = 36;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
  <rect x='0.5' y='0.5' rx='10' ry='10' width='${width - 1}' height='${height - 1}' fill='#0f172a' stroke='#0ea5e9' stroke-width='1.5'/>
</svg>`;

  const icon: google.maps.Icon = {
    url: `data:image/svg+xml;base64,${btoa(svg)}`,
    scaledSize: new google.maps.Size(width, height),
    labelOrigin: new google.maps.Point(width / 2, height / 2 + 1),
  };

  return {
    icon,
    label: {
      text: labelText,
      color: "#e2e8f0",
      fontWeight: "700",
      fontSize: "13px",
    },
    opacity: 0.97,
  };
}
