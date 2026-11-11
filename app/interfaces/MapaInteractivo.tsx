"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MapaClient from "./MapaClient";
import {
  defaultBusinessDestinations,
  fetchPublishedBusinessDestinations,
  mergeDestinations,
  readStoredBusinessDestinations,
} from "./destinosData";

const getDestinations = () =>
  mergeDestinations(defaultBusinessDestinations, readStoredBusinessDestinations());

const categoryOrder = ["turistico", "historico", "artesanias", "gastronomia"] as const;

const categoryMeta = {
  turistico: { label: "Turisticos", icon: "📍" },
  historico: { label: "Historicos", icon: "🏛️" },
  artesanias: { label: "Artesanias", icon: "🧵" },
  gastronomia: { label: "Gastronomia", icon: "🍽️" },
} as const;

const categoryStyles: Record<string, { color: string; icon: string }> = {
  turistico: { color: "#dc7d39", icon: "📍" },
  historico: { color: "#6b4d3b", icon: "🏛️" },
  artesanias: { color: "#9a6b43", icon: "🧵" },
  gastronomia: { color: "#b15d3d", icon: "🍽️" },
};

export default function MapaInteractivo() {
  const [destinations, setDestinations] = useState(getDestinations);
  const [destinationLoadError, setDestinationLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(destinations[0]?.id ?? null);
  const [activeCategories, setActiveCategories] = useState<Record<string, boolean>>({
    turistico: true,
    historico: true,
    artesanias: true,
    gastronomia: true,
  });

  useEffect(() => {
    let active = true;
    fetchPublishedBusinessDestinations()
      .then((published) => {
        if (active) {
          setDestinations(
            mergeDestinations(
              mergeDestinations(defaultBusinessDestinations, published),
              readStoredBusinessDestinations(),
            ),
          );
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setDestinationLoadError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los negocios aprobados.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredDestinations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return destinations.filter((destination) => {
      const categoryKey = destination.category ?? "turistico";
      const matchesCategory = activeCategories[categoryKey] ?? true;
      const haystack = [
        destination.title,
        destination.neighborhood,
        destination.shortDescription,
        destination.tags.join(" "),
        destination.category ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategories, searchTerm, destinations]);

  const highlightDestination =
    filteredDestinations.find((destination) => destination.id === selectedId) ??
    filteredDestinations[0] ??
    null;

  const toggleCategory = (category: string) => {
    setActiveCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  };

  return (
    <section className="map-page-shell" aria-label="Mapa completo de Metepec">
      <header className="map-page-header">
        <p className="map-page-kicker">Explora Metepec</p>
        <h1>Mapa completo de Metepec</h1>
        <p className="map-page-summary">
          Vista realista del municipio con calles, rutas y destinos clave usando un mapa
          gratuito y compatible con OpenStreetMap.
        </p>
      </header>

      <div className="map-page-grid">
        <div className="map-panel">
          <div className="map-search-row">
            <label className="map-search" aria-label="Buscar destinos en el mapa">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar destino, barrio o calle"
              />
            </label>
          </div>

          <div className="map-legend" aria-label="Leyenda del mapa de Metepec">
            {categoryOrder.map((key) => (
              <button
                type="button"
                key={key}
                className={`map-legend-item ${activeCategories[key] ? "is-active" : "is-disabled"}`}
                onClick={() => toggleCategory(key)}
                aria-pressed={activeCategories[key]}
              >
                <span aria-hidden="true">{categoryMeta[key].icon}</span>
                {categoryMeta[key].label}
              </button>
            ))}
          </div>

          <div className="leaflet-map-wrap">
            <MapaClient destinations={filteredDestinations} />
          </div>
        </div>

        <aside className="map-places-panel" aria-label="Listado de destinos del mapa">
          <h2>Destinos en el mapa</h2>
          <div className="map-places-list">
            {filteredDestinations.map((destination) => {
              const style = categoryStyles[destination.category ?? "turistico"];
              const isSelected = highlightDestination?.id === destination.id;

              return (
                <Link
                  key={destination.id}
                  href={`/destinos/${destination.slug}`}
                  className={`map-list-item ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSelectedId(destination.id)}
                >
                  <span className="map-list-badge" style={{ background: style.color, color: "#fff" }} aria-hidden="true">
                    {style.icon}
                  </span>
                  <span className="map-list-copy">
                    <strong>{destination.title}</strong>
                    <small>{destination.neighborhood}</small>
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
      {destinationLoadError ? (
        <p className="destinations-load-error" role="alert">{destinationLoadError}</p>
      ) : null}
    </section>
  );
}
