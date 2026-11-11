"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type FormEvent } from "react";
import AppHeader from "./AppHeader";
import { fetchWithFirebaseAuth } from "../../lib/firebaseClient";
import {
  businessCategories,
  type BusinessApplication,
} from "../../lib/businessApplications";
import type { BusinessLocation } from "./BusinessLocationPicker";
import { isInsideMetepec } from "../../lib/metepecBoundary";

const BusinessLocationPicker = dynamic(() => import("./BusinessLocationPicker"), {
  ssr: false,
  loading: () => <div className="map-loading">Cargando mapa de Metepec...</div>,
});

type ApplicationForm = {
  businessName: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  hours: string;
};

const emptyForm: ApplicationForm = {
  businessName: "",
  category: "",
  description: "",
  address: "",
  phone: "",
  hours: "",
};

const statusLabels = {
  pending: "En revisión",
  approved: "Aprobada",
  rejected: "No aprobada",
} as const;

async function getApiError(response: Response) {
  const result = (await response.json()) as { error?: string };
  return result.error || "No se pudo completar la solicitud.";
}

export default function BusinessApplicationForm() {
  const [form, setForm] = useState(emptyForm);
  const [location, setLocation] = useState<BusinessLocation | null>(null);
  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successIsWarning, setSuccessIsWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadApplications = async () => {
    const response = await fetchWithFirebaseAuth("/api/business-applications", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await getApiError(response));
    }

    const result = (await response.json()) as {
      applications: BusinessApplication[];
    };
    setApplications(result.applications);
  };

  useEffect(() => {
    let active = true;

    fetchWithFirebaseAuth("/api/business-applications", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await getApiError(response));
        }

        return (await response.json()) as {
          applications: BusinessApplication[];
        };
      })
      .then((result) => {
        if (active) {
          setApplications(result.applications);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar tus solicitudes.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSuccessIsWarning(false);

    if (!location) {
      setError("Selecciona la ubicación del negocio en el mapa.");
      return;
    }

    if (!isInsideMetepec(location.latitude, location.longitude)) {
      setError("La ubicación seleccionada debe estar dentro del municipio de Metepec.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchWithFirebaseAuth("/api/business-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, location }),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response));
      }

      const result = (await response.json()) as {
        message: string;
        notificationWarning?: boolean;
      };
      setForm(emptyForm);
      setLocation(null);
      setSuccess(result.message);
      setSuccessIsWarning(Boolean(result.notificationWarning));
      await loadApplications();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar la solicitud.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="business-application-page">
      <AppHeader active="inicio" />
      <section className="business-application-shell">
        <header className="business-application-heading">
          <span className="admin-kicker">Metepec Digital</span>
          <h1>Solicita el alta de tu negocio</h1>
          <p>La ubicación debe quedar dentro del límite municipal marcado en el mapa.</p>
        </header>

        <article className="business-application-card">
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Nombre del negocio
              <input
                required
                maxLength={120}
                value={form.businessName}
                onChange={(event) => setForm((current) => ({ ...current, businessName: event.target.value }))}
              />
            </label>

            <label>
              Giro
              <select
                required
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="">Selecciona el giro</option>
                {businessCategories.map((category) => (
                  <option value={category} key={category}>{category}</option>
                ))}
              </select>
            </label>

            <label>
              Descripción del negocio
              <textarea
                required
                rows={4}
                maxLength={2000}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>

            <label>
              Dirección
              <input
                required
                maxLength={300}
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                placeholder="Calle, número, colonia"
              />
            </label>

            <label>
              Teléfono de contacto
              <input
                required
                type="tel"
                maxLength={40}
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>

            <label>
              Horario
              <input
                required
                maxLength={120}
                value={form.hours}
                onChange={(event) => setForm((current) => ({ ...current, hours: event.target.value }))}
                placeholder="Lunes a sábado, 9:00 a 18:00"
              />
            </label>

            <div className="business-location-field">
              <strong>Ubicación del negocio</strong>
              <p>Haz clic en el mapa o arrastra el marcador. El área azul delimita Metepec.</p>
              <BusinessLocationPicker location={location} onSelect={setLocation} />
              <small>
                {location
                  ? `Punto ${isInsideMetepec(location.latitude, location.longitude) ? "dentro" : "fuera"} de Metepec · ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
                  : "Aún no seleccionas un punto."}
              </small>
              <span className="boundary-attribution">
                Límite municipal: geoBoundaries, datos World Bank 2012, licencia CC BY 4.0.
              </span>
            </div>

            {error ? <p className="admin-status is-error" role="alert">{error}</p> : null}
            {success ? (
              <p
                className={`admin-status${successIsWarning ? " is-warning" : ""}`}
                role={successIsWarning ? "alert" : "status"}
              >
                {success}
              </p>
            ) : null}

            <button type="submit" className="admin-submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar solicitud"}
            </button>
          </form>
        </article>

        <section className="business-applications-list" aria-label="Estado de mis solicitudes">
          <h2>Mis solicitudes</h2>
          {isLoading ? <p>Cargando solicitudes...</p> : null}
          {!isLoading && applications.length === 0 ? (
            <p>Aún no has enviado solicitudes de negocio.</p>
          ) : null}
          {applications.map((application) => (
            <article key={application.id} className="business-application-status-card">
              <div>
                <strong>{application.businessName}</strong>
                <span className={`business-application-status ${application.status}`}>
                  {statusLabels[application.status]}
                </span>
              </div>
              {application.adminResponse ? (
                <p><strong>Respuesta de administración:</strong> {application.adminResponse}</p>
              ) : (
                <p>Administración revisará la solicitud y publicará aquí su respuesta.</p>
              )}
              {application.requesterNotificationStatus === "failed" ? (
                <p className="business-email-warning" role="alert">
                  No se pudo enviar la respuesta por correo. Consulta el mensaje de administración aquí o contacta al municipio.
                </p>
              ) : null}
              {application.requesterNotificationStatus === "sent" ? (
                <p className="business-email-sent" role="status">La respuesta también se envió a tu correo.</p>
              ) : null}
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
