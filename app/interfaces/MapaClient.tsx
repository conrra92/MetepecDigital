"use client";

import dynamic from "next/dynamic";

type MapaClientDestination = {
  id: string;
  slug: string;
  title: string;
  neighborhood: string;
  category?: string;
  coordinates?: { x?: number; y?: number };
  location?: { latitude: number; longitude: number };
};

const MapaLeaflet = dynamic(() => import("./MapaLeaflet"), {
  ssr: false,
  loading: () => <div className="map-loading">Cargando mapa de Metepec...</div>,
});

export default function MapaClient({ destinations }: { destinations: MapaClientDestination[] }) {
  return <MapaLeaflet destinations={destinations} />;
}
