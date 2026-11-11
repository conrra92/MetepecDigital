"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import { ADMIN_SESSION_EMAIL, isAdminEmail } from "./adminData";
import { fetchWithFirebaseAuth } from "../../lib/firebaseClient";
import {
  isMetepecEmail,
  type BusinessApplication,
  type BusinessApplicationStatus,
} from "../../lib/businessApplications";

function readSessionEmail() {
  if (typeof window === "undefined") {
    return "";
  }

  const rawSession = window.localStorage.getItem("metepec-session");

  if (!rawSession) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawSession) as { email?: string };
    return parsed.email?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

async function readApiError(response: Response) {
  const result = (await response.json()) as { error?: string };
  return result.error || "No se pudo completar la operación.";
}

export default function AdminPanel() {
  const [sessionEmail, setSessionEmail] = useState("");
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [applicationResponses, setApplicationResponses] = useState<Record<string, string>>({});
  const [destinationAccessEmails, setDestinationAccessEmails] = useState<Record<string, string>>({});
  const [applicationError, setApplicationError] = useState("");
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationMessageIsWarning, setApplicationMessageIsWarning] = useState(false);
  const [applicationActionId, setApplicationActionId] = useState<string | null>(null);
  useEffect(() => {
    const syncSession = () => setSessionEmail(readSessionEmail());

    syncSession();

    window.addEventListener("focus", syncSession);
    window.addEventListener("storage", syncSession);
    window.addEventListener("sessionchange", syncSession);

    return () => {
      window.removeEventListener("focus", syncSession);
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("sessionchange", syncSession);
    };
  }, []);

  const isAdmin = isAdminEmail(sessionEmail);

  useEffect(() => {
    if (!isAdmin || window.location.hash !== "#solicitudes-de-negocio") {
      return;
    }

    document
      .getElementById("solicitudes-de-negocio")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let active = true;
    fetchWithFirebaseAuth("/api/business-applications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        return (await response.json()) as { applications: BusinessApplication[] };
      })
      .then((result) => {
        if (active) {
          setApplications(result.applications);
          setApplicationError("");
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setApplicationError(
            cause instanceof Error ? cause.message : "No se pudieron cargar las solicitudes.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const refreshApplications = async () => {
    const response = await fetchWithFirebaseAuth("/api/business-applications", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const result = (await response.json()) as { applications: BusinessApplication[] };
    setApplications(result.applications);
  };

  const handleApplicationDecision = async (
    application: BusinessApplication,
    status: Extract<BusinessApplicationStatus, "approved" | "rejected">,
  ) => {
    const adminResponse = applicationResponses[application.id]?.trim() ?? "";
    const destinationEmail = destinationAccessEmails[application.id]?.trim().toLowerCase() ?? "";
    if (!adminResponse) {
      setApplicationError("Escribe una respuesta para el solicitante antes de evaluar.");
      return;
    }
    if (status === "approved" && !isMetepecEmail(destinationEmail)) {
      setApplicationError("Asigna una cuenta @metepec.mx creada previamente en Firebase para aprobar el destino.");
      return;
    }

    setApplicationError("");
    setApplicationMessage("");
    setApplicationMessageIsWarning(false);
    setApplicationActionId(application.id);

    try {
      const response = await fetchWithFirebaseAuth(
        `/api/business-applications/${application.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, adminResponse, destinationEmail }),
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const result = (await response.json()) as {
        message: string;
        notificationWarning?: boolean;
      };
      setApplicationMessage(result.message);
      setApplicationMessageIsWarning(Boolean(result.notificationWarning));
      await refreshApplications();
    } catch (cause) {
      setApplicationError(
        cause instanceof Error ? cause.message : "No se pudo evaluar la solicitud.",
      );
    } finally {
      setApplicationActionId(null);
    }
  };

  if (!isAdmin) {
    return (
      <main className="admin-page">
        <AppHeader active="inicio" />
        <section className="admin-guard-card">
          <h1>Acceso restringido</h1>
          <p>Esta zona solo está disponible para <strong>{ADMIN_SESSION_EMAIL}</strong>.</p>
          <Link href="/login" className="admin-back-link">
            Volver a iniciar sesión
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <AppHeader active="inicio" />

      <section className="admin-hero">
        <div>
          <span className="admin-kicker">Panel administrativo</span>
          <h1>Administración de Metepec Digital</h1>
          <p>Selecciona un catálogo para gestionar destinos o guías desde su propia interfaz.</p>
        </div>
      </section>

      <section className="admin-grid admin-management-links" aria-label="Catálogos administrativos">
        <Link href="/admin/destinos" className="admin-card admin-management-card">
          <div className="admin-card-header">
            <h2>Alta de destinos</h2>
            <p>Registrar y consultar los destinos turísticos.</p>
          </div>
          <span>Administrar destinos →</span>
        </Link>
        <Link href="/admin/guias" className="admin-card admin-management-card">
          <div className="admin-card-header">
            <h2>Solicitudes de guía</h2>
            <p>Revisar solicitudes y consultar las cuentas de guía creadas.</p>
          </div>
          <span>Revisar guías →</span>
        </Link>
      </section>

      <section
        className="admin-application-section"
        id="solicitudes-de-negocio"
        aria-label="Solicitudes de alta de negocio"
      >
        <div className="admin-card-header">
          <h2>Solicitudes de alta de negocio</h2>
          <p>Revisa la ubicación, responde al solicitante y aprueba o rechaza cada negocio.</p>
        </div>

        {applicationError ? <p className="admin-status is-error" role="alert">{applicationError}</p> : null}
        {applicationMessage ? (
          <p
            className={`admin-status${applicationMessageIsWarning ? " is-warning" : ""}`}
            role={applicationMessageIsWarning ? "alert" : "status"}
          >
            {applicationMessage}
          </p>
        ) : null}
        {applications.length === 0 && !applicationError ? (
          <p className="admin-empty">No hay solicitudes de negocio.</p>
        ) : null}

        <div className="admin-business-applications">
          {applications.map((application) => (
            <article key={application.id} className="admin-business-application">
              <div className="admin-business-application-heading">
                <div>
                  <h3>{application.businessName}</h3>
                  <span>{application.category} · {application.requesterEmail}</span>
                </div>
                <strong className={`business-application-status ${application.status}`}>
                  {application.status === "pending"
                    ? "Pendiente"
                    : application.status === "approved"
                      ? "Aprobada"
                      : "Rechazada"}
                </strong>
              </div>

              <p>{application.description}</p>
              {application.adminNotificationStatus === "failed" ? (
                <p className="admin-status is-warning" role="alert">
                  No se pudo enviar el aviso de esta solicitud por correo. Revisa Resend; la solicitud sigue disponible en este panel.
                </p>
              ) : null}
              {application.adminNotificationStatus === "sent" ? (
                <p className="admin-status" role="status">Aviso de nueva solicitud enviado por correo.</p>
              ) : null}
              <dl className="admin-business-details">
                <div><dt>Dirección</dt><dd>{application.address}</dd></div>
                <div><dt>Teléfono</dt><dd>{application.phone}</dd></div>
                <div><dt>Horario</dt><dd>{application.hours}</dd></div>
                <div>
                  <dt>Ubicación</dt>
                  <dd>
                    {application.location.latitude.toFixed(5)}, {application.location.longitude.toFixed(5)} ·{" "}
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${application.location.latitude}&mlon=${application.location.longitude}#map=17/${application.location.latitude}/${application.location.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver en mapa
                    </a>
                  </dd>
                </div>
              </dl>

              {application.status === "pending" ? (
                <div className="admin-application-review">
                  <label>
                    Respuesta para el solicitante
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={applicationResponses[application.id] ?? ""}
                      onChange={(event) =>
                        setApplicationResponses((current) => ({
                          ...current,
                          [application.id]: event.target.value,
                        }))
                      }
                      placeholder="Escribe la respuesta que verá en su cuenta..."
                    />
                  </label>
                  <label>
                    Cuenta institucional del destino
                    <input
                      type="email"
                      required
                      value={destinationAccessEmails[application.id] ?? ""}
                      onChange={(event) =>
                        setDestinationAccessEmails((current) => ({
                          ...current,
                          [application.id]: event.target.value,
                        }))
                      }
                      placeholder="encargado@metepec.mx"
                    />
                    <small>
                      Créala primero en Firebase Authentication con contraseña. Solo esa cuenta podrá modificar este destino.
                    </small>
                  </label>
                  <div className="admin-application-actions">
                    <button
                      type="button"
                      className="admin-submit"
                      disabled={applicationActionId === application.id}
                      onClick={() => handleApplicationDecision(application, "approved")}
                    >
                      Aprobar y asignar acceso
                    </button>
                    <button
                      type="button"
                      className="admin-application-reject"
                      disabled={applicationActionId === application.id}
                      onClick={() => handleApplicationDecision(application, "rejected")}
                    >
                      Rechazar solicitud
                    </button>
                  </div>
                </div>
              ) : (
                <p className="admin-application-response">
                  <strong>Respuesta enviada:</strong> {application.adminResponse}
                </p>
              )}

            </article>
          ))}
        </div>
      </section>
    </main>
  );
}