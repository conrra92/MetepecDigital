"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "./AppHeader";
import {
  defaultBusinessDestinations,
  fetchPublishedBusinessDestinations,
  getDestinationAverageRating,
  mergeDestinations,
  readStoredBusinessDestinations,
  sortDestinationsByAverageRating,
  type DestinationItem,
} from "./destinosData";

export default function DestinosLista() {
  const [destinations, setDestinations] = useState<DestinationItem[]>(defaultBusinessDestinations);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const syncDestinations = () => {
      const storedDestinations = readStoredBusinessDestinations();
      setDestinations(
        mergeDestinations(defaultBusinessDestinations, storedDestinations),
      );

      fetchPublishedBusinessDestinations()
        .then((publishedDestinations) => {
          setDestinations(
            mergeDestinations(
              mergeDestinations(defaultBusinessDestinations, publishedDestinations),
              storedDestinations,
            ),
          );
          setLoadError("");
        })
        .catch((cause: unknown) => {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los negocios aprobados.",
          );
        });
    };

    syncDestinations();

    window.addEventListener("storage", syncDestinations);
    window.addEventListener("focus", syncDestinations);

    return () => {
      window.removeEventListener("storage", syncDestinations);
      window.removeEventListener("focus", syncDestinations);
    };
  }, []);

  const sortedDestinations = useMemo(
    () => sortDestinationsByAverageRating(destinations),
    [destinations],
  );

  return (
    <main className="destination-page destinations-index-page">
      <AppHeader active="destinos" />

      <section className="places-section" aria-label="Destinos registrados por negocios">
        <div className="section-title-row">
          <div>
            <h2>Destinos dados de alta</h2>
            <p>
              Catalogo de destinos creados por usuarios de negocios en Metepec.
            </p>
          </div>
        </div>

        {loadError ? <p className="destinations-load-error" role="alert">{loadError}</p> : null}

        {sortedDestinations.length === 0 ? (
          <p className="destinations-empty">
            Aun no hay destinos registrados por negocios.
          </p>
        ) : (
          <div className="places-grid">
            {sortedDestinations.map((destination) => (
              <article className="place-card" key={destination.id}>
                <div className="place-image">
                  <Image
                    src={destination.photos[0] ?? "/metepec-hero.png"}
                    alt={destination.title}
                    fill
                    sizes="(max-width: 760px) 100vw, 31vw"
                  />
                  <span className="rating-badge">
                    {getDestinationAverageRating(destination).toFixed(1)}
                  </span>
                </div>

                <div className="place-body">
                  <h3>{destination.title}</h3>
                  <div className="tag-row">
                    {destination.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <p className="destination-card-summary">{destination.shortDescription}</p>
                  <Link href={`/destinos/${destination.slug}`} className="place-card-link">
                    Ver mas
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}