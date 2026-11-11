"use client";

import L from "leaflet";
import { MapContainer, Marker, Polygon, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { METEPEC_BOUNDARY, type MetepecCoordinate } from "../../lib/metepecBoundary";

export type BusinessLocation = {
  latitude: number;
  longitude: number;
};

function MapClickHandler({ onSelect }: { onSelect: (location: BusinessLocation) => void }) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

const locationIcon = L.divIcon({
  className: "business-location-marker",
  html: '<span aria-hidden="true"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function BusinessLocationPicker({
  location,
  onSelect,
}: {
  location: BusinessLocation | null;
  onSelect: (location: BusinessLocation) => void;
}) {
  const handleMarkerDrag = (event: L.LeafletEvent) => {
    const position = (event.target as L.Marker).getLatLng();
    onSelect({ latitude: position.lat, longitude: position.lng });
  };

  const polygonPositions = METEPEC_BOUNDARY.map(
    ([latitude, longitude]: MetepecCoordinate) => [latitude, longitude] as [number, number],
  );

  return (
    <div className="business-location-map">
      <MapContainer
        center={[19.2575, -99.5735]}
        zoom={13}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polygon
          positions={polygonPositions}
          pathOptions={{
            color: "#2d5c9c",
            weight: 2,
            fillColor: "#93c5fd",
            fillOpacity: 0.16,
          }}
        />
        <MapClickHandler onSelect={onSelect} />
        {location ? (
          <Marker
            position={[location.latitude, location.longitude]}
            icon={locationIcon}
            draggable
            eventHandlers={{ dragend: handleMarkerDrag }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
