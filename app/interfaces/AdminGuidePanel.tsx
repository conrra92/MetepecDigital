"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import { ADMIN_SESSION_EMAIL, isAdminEmail } from "./adminData";
import { fetchWithFirebaseAuth } from "../../lib/firebaseClient";
import type { GuideApplication, GuideProfile } from "../../lib/guides";

function readSessionEmail() {
  const rawSession = window.localStorage.getItem("metepec-session");
  if (!rawSession) return "";

  try {
    return (JSON.parse(rawSession) as { email?: string }).email?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

async function getApiError(response: Response) {
  const result = (await response.json()) as { error?: string };
  return result.error || "No se pudo completar la operación.";
}

export default function AdminGuidePanel() {
  const [sessionEmail, setSessionEmail] = useState("");
  const [guideProfiles, setGuideProfiles] = useState<GuideProfile[]>([]);
  const [applications, setApplications] = useState<GuideApplication[]>([]);
  const [applicationResponses, setApplicationResponses] = useState<Record<string, string>>({});
  const [activeApplicationId, setActiveApplicationId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsWarning, setMessageIsWarning] = useState(false);

  useEffect(() => {
    const sync = () => setSessionEmail(readSessionEmail());
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("sessionchange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("sessionchange", sync);
    };
  }, []);

  const isAdmin = isAdminEmail(sessionEmail);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    Promise.all([
      fetchWithFirebaseAuth("/api/guides", { cache: "no-store" }),
      fetchWithFirebaseAuth("/api/guide-applications", { cache: "no-store" }),
    ])
      .then(async ([guidesResponse, applicationsResponse]) => {
        if (!guidesResponse.ok) throw new Error(await getApiError(guidesResponse));
        if (!applicationsResponse.ok) throw new Error(await getApiError(applicationsResponse));
        const [guideResult, applicationResult] = await Promise.all([
          guidesResponse.json() as Promise<{ guideProfiles: GuideProfile[] }>,
          applicationsResponse.json() as Promise<{ applications: GuideApplication[] }>,
        ]);
        return { ...guideResult, ...applicationResult };
      })
      .then((result) => {
        if (active) {
          setGuideProfiles(result.guideProfiles);
          setApplications(result.applications);
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las guías.");
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleApplicationDecision = async (
    application: GuideApplication,
    status: "approved" | "rejected",
  ) => {
    setActiveApplicationId(application.id);
    setError("");
    setMessage("");
    setMessageIsWarning(false);
    try {
      const response = await fetchWithFirebaseAuth(`/api/guide-applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminResponse: applicationResponses[application.id] ?? "",
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        notificationWarning?: boolean;
      };
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la solicitud.");

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? {
                ...item,
                status,
                adminResponse: applicationResponses[application.id] ?? "",
              }
            : item,
        ),
      );
      if (status === "approved") {
        const refreshedGuides = await fetchWithFirebaseAuth("/api/guides", { cache: "no-store" });
        if (refreshedGuides.ok) {
          const guideResult = (await refreshedGuides.json()) as {
            guideProfiles: GuideProfile[];
          };
          setGuideProfiles(guideResult.guideProfiles);
        }
      }
      setMessage(result.message || "La solicitud se actualizó.");
      setMessageIsWarning(Boolean(result.notificationWarning));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la solicitud.");
    } finally {
      setActiveApplicationId("");
    }
  };

  if (!isAdmin) {
    return (
      <main className="admin-page">
        <AppHeader active="inicio" />
        <section className="admin-guard-card">
          <h1>Acceso restringido</h1>
          <p>Esta zona solo está disponible para <strong>{ADMIN_SESSION_EMAIL}</strong>.</p>
          <Link href="/login" className="admin-back-link">Volver a iniciar sesión</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page admin-catalog-page">
      <AppHeader active="inicio" />
      <div className="admin-catalog-content">
        <section className="admin-hero">
          <div>
            <span className="admin-kicker">Panel administrativo</span>
            <h1>Solicitudes de guía</h1>
            <p>Revisa solicitudes y consulta las cuentas de guía creadas.</p>
          </div>
        </section>
        <section className="admin-grid admin-grid-single">
          <article className="admin-card">
            {error ? <p className="admin-status is-error" role="alert">{error}</p> : null}
            {message ? (
              <p
                className={`admin-status${messageIsWarning ? " is-warning" : ""}`}
                role={messageIsWarning ? "alert" : "status"}
              >
                {message}
              </p>
            ) : null}
            <div className="admin-list">
              <h3>Solicitudes</h3>
              <p className="admin-empty">Al aprobar, se activa la cuenta y se envía un correo al solicitante. Al rechazar, se elimina la cuenta deshabilitada.</p>
              {applications.length === 0 ? (
                <p className="admin-empty">Aún no hay solicitudes para revisar.</p>
              ) : (
                applications.map((application) => (
                  <article key={application.id} className="guide-application-card">
                    <div className="guide-application-photo">
                      <Image src={application.vehiclePhotoUrl} alt={`Vehículo de ${application.name}`} fill sizes="160px" unoptimized />
                    </div>
                    <div className="guide-application-content">
                      <div className="guide-application-heading">
                        <div>
                          <strong>{application.name}</strong>
                          <span>{application.email}</span>
                          <span>{application.plate} · {application.model} · {application.vehicleYear}</span>
                        </div>
                        <span className={`guide-application-status ${application.status}`}>
                          {application.status === "pending"
                            ? "Pendiente"
                            : application.status === "processing"
                              ? "En revisión"
                              : application.status === "approved"
                                ? "Aprobada"
                                : "Rechazada"}
                        </span>
                      </div>
                      {application.status === "pending" ? (
                        <>
                          <label>
                            Mensaje para el solicitante (opcional)
                            <textarea
                              rows={2}
                              maxLength={2000}
                              value={applicationResponses[application.id] ?? ""}
                              onChange={(event) =>
                                setApplicationResponses((current) => ({
                                  ...current,
                                  [application.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                          <div className="guide-application-actions">
                            <button
                              className="admin-submit"
                              type="button"
                              disabled={activeApplicationId !== ""}
                              onClick={() => void handleApplicationDecision(application, "approved")}
                            >
                              {activeApplicationId === application.id ? "Procesando..." : "Aprobar cuenta"}
                            </button>
                            <button
                              className="guide-application-reject"
                              type="button"
                              disabled={activeApplicationId !== ""}
                              onClick={() => void handleApplicationDecision(application, "rejected")}
                            >
                              Rechazar solicitud
                            </button>
                          </div>
                        </>
                      ) : application.adminResponse ? (
                        <p className="guide-application-response">{application.adminResponse}</p>
                      ) : null}
                      {application.status !== "pending" && application.requesterNotificationStatus === "failed" ? (
                        <p className="admin-status is-warning" role="alert">
                          La decisión quedó guardada, pero no se pudo enviar el correo a {application.email}. Verifica Resend.
                        </p>
                      ) : null}
                      {application.status !== "pending" && application.requesterNotificationStatus === "sent" ? (
                        <p className="admin-status" role="status">Correo de decisión enviado a {application.email}.</p>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
            <div className="admin-list">
              <h3>Guías que crearon una cuenta</h3>
              {guideProfiles.length === 0 ? (
                <p className="admin-empty">Aún no hay cuentas de guía registradas.</p>
              ) : (
                guideProfiles.map((profile) => (
                  <article key={profile.uid} className="admin-guide-item">
                    <div className="admin-guide-photo">
                      <Image src={profile.vehiclePhotoUrl} alt={`Vehículo de ${profile.name}`} fill sizes="96px" unoptimized />
                    </div>
                    <div>
                      <strong>{profile.name}</strong>
                      <span>{profile.email}</span>
                      <span>{profile.plate} · {profile.model} · {profile.vehicleYear}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </article>
        </section>
        <div className="admin-return-links">
          <Link href="/admin">Volver al panel administrativo</Link>
          <Link href="/admin/destinos">Ir a alta de destinos</Link>
        </div>
      </div>
    </main>
  );
}
