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

export default function GuideDashboard() {
  const [guide, setGuide] = useState<GuideProfile | null>(null);
  const [requests, setRequests] = useState<GuidedVisitRequest[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [acceptingRequestId, setAcceptingRequestId] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchWithFirebaseAuth("/api/guides/me", { cache: "no-store" }),
      fetchWithFirebaseAuth("/api/guided-visits", { cache: "no-store" }),
    ])
      .then(async ([profileResponse, requestsResponse]) => {
        const [profile, visitList] = await Promise.all([
          readApiResponse<{ guide: GuideProfile }>(profileResponse, "No se pudo cargar el perfil de guía"),
          readApiResponse<{ requests: GuidedVisitRequest[] }>(requestsResponse, "No se pudieron cargar las solicitudes"),
        ]);
        if (active) {
          setGuide(profile.guide);
          setRequests(visitList.requests);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar el panel de guía.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleAcceptVisit = async (visitId: string) => {
    setAcceptingRequestId(visitId);
    setError("");
    setActionMessage("");
    try {
      const response = await fetchWithFirebaseAuth(`/api/guided-visits/${visitId}`, {
        method: "PATCH",
      });
      const result = await readApiResponse<{
        message?: string;
        request?: GuidedVisitRequest;
      }>(response, "No se pudo aceptar el viaje");
      if (!result.request) throw new Error("El servidor no devolvió el viaje actualizado.");
      setRequests((current) => current.filter((request) => request.id !== visitId));
      setActionMessage(result.message || "Aceptaste el viaje.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo aceptar el viaje.");
    } finally {
      setAcceptingRequestId("");
    }
  };

  return (
    <main className="guide-dashboard-page">
      <AppHeader active="inicio" />
      <section className="guide-dashboard-shell">
        {isLoading ? <p role="status">Cargando tus solicitudes...</p> : null}
        {error ? (
          <div className="guide-dashboard-error" role="alert">
            <h1>No se pudo abrir el panel de guía</h1>
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
              <Link className="active" href="/guia">Solicitudes disponibles</Link>
              <Link href="/guia/aceptados">Viajes aceptados</Link>
            </nav>
            <section className="guide-requests-section">
              {actionMessage ? <p className="guide-action-message" role="status">{actionMessage}</p> : null}
              {error ? <p className="guide-dashboard-error" role="alert">{error}</p> : null}
              <div className="guide-requests-title">
                <div>
                  <p>Recorridos solicitados</p>
                  <h2>Solicitudes de viaje</h2>
                </div>
                <span>{requests.length}</span>
              </div>
              {requests.length === 0 ? (
                <p className="guide-requests-empty">Todavía no hay solicitudes de visita.</p>
              ) : (
                <div className="guide-requests-list">
                  {requests.map((visit) => (
                    <article className="guide-request-card" key={visit.id}>
                      <div className="guide-request-heading">
                        <div>
                          <h3>{visit.destinationTitle}</h3>
                          <p>{new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${visit.date}T12:00:00Z`))} · {visit.time} h</p>
                        </div>
                        <span className={`guide-visit-status ${visit.status}`}>
                            Pendiente
                        </span>
                      </div>
                      <dl>
                        <div><dt>Solicitante</dt><dd>{visit.requesterName}</dd></div>
                        <div><dt>Correo</dt><dd><a href={`mailto:${visit.requesterEmail}`}>{visit.requesterEmail}</a></dd></div>
                        <div><dt>Punto de reunión</dt><dd>{visit.reunionLocation}</dd></div>
                        <div><dt>Regreso al punto</dt><dd>{visit.returnToMeeting ? "Sí" : "No"}</dd></div>
                        <div><dt>Fin del recorrido</dt><dd>{visit.finishAtDestination ? "En el destino" : "Por acordar"}</dd></div>
                      </dl>
                      <p className="guide-request-message">{visit.message}</p>
                      {visit.date >= new Date().toISOString().slice(0, 10) ? (
                        <button
                          className="guide-accept-visit"
                          type="button"
                          disabled={acceptingRequestId !== ""}
                          onClick={() => void handleAcceptVisit(visit.id)}
                        >
                          {acceptingRequestId === visit.id ? "Aceptando..." : "Aceptar viaje"}
                        </button>
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
