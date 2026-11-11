import AppHeader from "../interfaces/AppHeader";
import MapaInteractivo from "../interfaces/MapaInteractivo";

export default function MapaPage() {
  return (
    <main className="map-page">
      <AppHeader active="mapa" />
      <MapaInteractivo />
    </main>
  );
}
