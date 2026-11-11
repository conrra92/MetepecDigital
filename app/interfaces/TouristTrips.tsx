"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "./AppHeader";
import { fetchWithFirebaseAuth } from "../../lib/firebaseClient";
import type { GuidedVisitRequest } from "../../lib/guides";

type TripSection = {
  id: "pending" | "accepted" | "past";
  title: string;
  trips: GuidedVisitRequest[];
};

async function getApiError(response: Response) {
  const result = (await response.json()) as { error?: string };
  return result.error || "No se pudo cargar el historial de viajes.";
}

function getLocalDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function TouristTrips() {
  const [trips, setTrips] = useState<GuidedVisitRequest[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchWithFirebaseAuth("/api/guided-visits", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await getApiError(response));
        return (await response.json()) as { requests: GuidedVisitRequest[] };
      })
      .then((result) => {
        if (active) {
          setTrips(result.requests);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial de viajes.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo<TripSection[]>(() => {
    const today = getLocalDate();
    return [
      {
        id: "pending",
        title: "Pendientes",
        trips: trips.filter((trip) => trip.date >= today && trip.status === "pending"),
      },
      {
        id: "accepted",
        title: "Aceptados",
        trips: trips.filter((trip) => trip.date >= today && trip.status === "accepted"),
      },
      {
        id: "past",
        title: "Pasados",
        trips: trips.filter((trip) => trip.date < today),
      },
    ];
  }, [trips]);

  return (
    <main className="guide-dashboard-page">
      <AppHeader active="inicio" />
      <section className="guide-dashboard-shell tourist-trips-shell">
        <header className="guide-dashboard-heading">
          <div>
            <p>Tu cuenta</p>
            <h1>Mis viajes</h1>
            <span>Consulta tus recorridos pendientes, aceptados y pasados.</span>
          </div>
        </header>
        {isLoading ? <p role="status">Cargando tus viajes...</p> : null}
        {error ? (
          <div className="guide-dashboard-error" role="alert">
            <h2>No se pudo cargar tu historial</h2>
            <p>{error}</p>
            <Link href="/login">Volver a iniciar sesión</Link>
          </div>
        ) : null}
        {!isLoading && !error ? sections.map((section) => (
          <section className="tourist-trip-section" key={section.id}>
            <div className="tourist-trip-section-heading">
              <h2>{section.title}</h2>
              <span>{section.trips.length}</span>
            </div>
            {section.trips.length === 0 ? (
              <p className="guide-requests-empty">No tienes viajes en esta sección.</p>
            ) : (
              <div className="guide-requests-list">
                {section.trips.map((trip) => (
                  <article className="guide-request-card" key={trip.id}>
                    <div className="guide-request-heading">
                      <div>
                        <h3>{trip.destinationTitle}</h3>
                        <p>
                          {new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" })
                            .format(new Date(`${trip.date}T12:00:00Z`))} · {trip.time} h
                        </p>
                      </div>
                      <span className={`guide-visit-status ${trip.date < getLocalDate() ? "past" : trip.status}`}>
                        {trip.date < getLocalDate() ? "Pasado" : trip.status === "accepted" ? "Aceptado" : "Pendiente"}
                      </span>
                    </div>
                    <dl>
                      <div><dt>Punto de reunión</dt><dd>{trip.reunionLocation}</dd></div>
                      <div><dt>Regreso al punto</dt><dd>{trip.returnToMeeting ? "Sí" : "No"}</dd></div>
                      <div><dt>Fin del recorrido</dt><dd>{trip.finishAtDestination ? "En el destino" : "Por acordar"}</dd></div>
                    </dl>
                    {trip.message ? <p className="guide-request-message">{trip.message}</p> : null}
                    {trip.status === "accepted" && trip.acceptedBy ? (
                      <div className="tourist-trip-guide">
                        <strong>Guía que aceptó</strong>
                        <span>{trip.acceptedBy.name}</span>
                        <a href={`mailto:${trip.acceptedBy.email}`}>{trip.acceptedBy.email}</a>
                      </div>
                    ) : null}
                    <Link className="tourist-trip-destination" href={`/destinos/${trip.destinationSlug}`}>
                      Ver destino
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        )) : null}
      </section>
    </main>
  );
}
