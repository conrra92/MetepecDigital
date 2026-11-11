"use client";

import Link from "next/link";
import { MapContainer, Marker, Polygon, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { METEPEC_BOUNDARY } from "../../lib/metepecBoundary";

const categoryStyles: Record<string, { color: string; icon: string }> = {
  turistico: { color: "#dc7d39", icon: "📍" },
  historico: { color: "#6b4d3b", icon: "🏛️" },
  artesanias: { color: "#9a6b43", icon: "🧵" },
  gastronomia: { color: "#b15d3d", icon: "🍽️" },
};

type MapLeafletProps = {
  destinations: Array<{
    id: string;
    slug: string;
    title: string;
    neighborhood: string;
    category?: string;
    coordinates?: { x?: number; y?: number };
    location?: { latitude: number; longitude: number };
  }>;
};

const destinationCoordinates = (destination: MapLeafletProps["destinations"][number]) => {
  if (destination.location) {
    return [destination.location.latitude, destination.location.longitude] as [number, number];
  }

  const x = destination.coordinates?.x ?? 50;
  const y = destination.coordinates?.y ?? 50;

  return [19.214 + (y / 100) * 0.128, -99.645 + (x / 100) * 0.169] as [number, number];
};

const buildIcon = (category: string) =>
  L.divIcon({
    className: "custom-map-marker",
    html: `<span style="background:${categoryStyles[category]?.color ?? "#dc7d39"};color:white;border:2px solid rgba(255,255,255,0.9);box-shadow:0 8px 18px rgba(0,0,0,0.18);display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;font-size:14px;">${categoryStyles[category]?.icon ?? "📍"}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -26],
  });

export default function MapaLeaflet({ destinations }: MapLeafletProps) {
  return (
    <div className="leaflet-map-wrap">
      <MapContainer
        center={[19.2575, -99.5735]}
        zoom={13}
        scrollWheelZoom
        zoomControl
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Polygon
          positions={METEPEC_BOUNDARY}
          pathOptions={{
            color: "#2d5c9c",
            weight: 3,
            fillColor: "#93c5fd",
            fillOpacity: 0.15,
          }}
        />

        {destinations.map((destination) => (
          <Marker
            key={destination.id}
            position={destinationCoordinates(destination)}
            icon={buildIcon(destination.category ?? "turistico")}
          >
            <Popup>
              <div className="leaflet-popup">
                <strong>{destination.title}</strong>
                <span>{destination.neighborhood}</span>
                <Link href={`/destinos/${destination.slug}`}>Ver detalle</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
