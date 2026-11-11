"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import { fetchWithFirebaseAuth } from "../../lib/firebaseClient";
import type { GuideProfile, GuidedVisitRequest } from "../../lib/guides";

async function readApiResponse<T>(response: Response, operation: string): Promise<T> {
  const body = await response.text();
  let result: unknown;

  try {
    result = JSON.parse(body);
  } catch {
    throw new Error(
      `${operation}: el servidor devolvió una respuesta que no es JSON (HTTP ${response.status}). Recarga la página y, si el problema continúa, vuelve a iniciar sesión.`,
    );
  }

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error(`${operation}: el servidor devolvió datos inesperados.`);
  }

  const payload = result as { error?: unknown };
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string" ? payload.error : `${operation} (HTTP ${response.status}).`,
    );
  }

  return result as T;
}

function formatVisitDate(date: string) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export default function GuideAcceptedTrips() {
  const [guide, setGuide] = useState<GuideProfile | null>(null);
  const [visits, setVisits] = useState<GuidedVisitRequest[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchWithFirebaseAuth("/api/guides/me", { cache: "no-store" }),
      fetchWithFirebaseAuth("/api/guided-visits?status=accepted", { cache: "no-store" }),
    ])
      .then(async ([profileResponse, visitsResponse]) => {
        const [profile, visitList] = await Promise.all([
          readApiResponse<{ guide: GuideProfile }>(profileResponse, "No se pudo cargar el perfil de guía"),
          readApiResponse<{ requests: GuidedVisitRequest[] }>(visitsResponse, "No se pudieron cargar los viajes aceptados"),
        ]);
        if (active) {
          setGuide(profile.guide);
          setVisits(visitList.requests);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar los viajes aceptados.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="guide-dashboard-page">
      <AppHeader active="inicio" />
      <section className="guide-dashboard-shell">
        {isLoading ? <p role="status">Cargando tus viajes aceptados...</p> : null}
        {error ? (
          <div className="guide-dashboard-error" role="alert">
            <h1>No se pudieron cargar tus viajes</h1>
            <p>{error}</p>
            <Link href="/login">Volver a iniciar sesión</Link>
          </div>
        ) : null}
        {!isLoading && !error && guide ? (
          <>
            <header className="guide-dashboard-heading">
              <div>
                <p>Panel de guía</p>
                <h1>Hola, {guide.name}</h1>
                <span>{guide.email}</span>
              </div>
              <div className="guide-dashboard-vehicle">
                <Image src={guide.vehiclePhotoUrl} alt={`Vehículo de ${guide.name}`} fill sizes="150px" unoptimized />
              </div>
            </header>
            <section className="guide-vehicle-details" aria-label="Datos del vehículo">
              <span><strong>Placa</strong>{guide.plate}</span>
              <span><strong>Modelo</strong>{guide.model}</span>
              <span><strong>Año</strong>{guide.vehicleYear}</span>
            </section>
            <nav className="guide-dashboard-tabs" aria-label="Secciones de guía">
              <Link href="/guia">Solicitudes disponibles</Link>
              <Link className="active" href="/guia/aceptados">Viajes aceptados</Link>
            </nav>
            <section className="guide-requests-section">
              <div className="guide-requests-title">
                <div>
                  <p>Tu agenda</p>
                  <h2>Viajes aceptados</h2>
                </div>
                <span>{visits.length}</span>
              </div>
              {visits.length === 0 ? (
                <p className="guide-requests-empty">Aún no has aceptado viajes.</p>
              ) : (
                <div className="guide-requests-list">
                  {visits.map((visit) => (
                    <article className="guide-request-card" key={visit.id}>
                      <div className="guide-request-heading">
                        <div>
                          <h3>{visit.destinationTitle}</h3>
                          <p>{formatVisitDate(visit.date)} · {visit.time} h</p>
                        </div>
                        <span className="guide-visit-status accepted">Aceptado</span>
                      </div>
                      <dl>
                        <div><dt>Solicitante</dt><dd>{visit.requesterName}</dd></div>
                        <div><dt>Correo</dt><dd><a href={`mailto:${visit.requesterEmail}`}>{visit.requesterEmail}</a></dd></div>
                        <div><dt>Punto de reunión</dt><dd>{visit.reunionLocation}</dd></div>
                        <div><dt>Regreso al punto</dt><dd>{visit.returnToMeeting ? "Sí" : "No"}</dd></div>
                        <div><dt>Fin del recorrido</dt><dd>{visit.finishAtDestination ? "En el destino" : "Por acordar"}</dd></div>
                      </dl>
                      <p className="guide-request-message">{visit.message}</p>
                      {visit.acceptedAt ? (
                        <p className="guide-request-accepted-by">
                          Aceptaste este viaje el {formatVisitDate(visit.acceptedAt.slice(0, 10))}.
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
