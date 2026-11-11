"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AppHeader from "./AppHeader";
import {
  ADMIN_SESSION_EMAIL,
  destinationCategories,
  isAdminEmail,
} from "./adminData";
import {
  defaultBusinessDestinations,
  fetchPublishedBusinessDestinations,
  mergeDestinations,
  readStoredBusinessDestinations,
  removeStoredBusinessDestination,
  sortDestinationsByAverageRating,
  type DestinationItem,
} from "./destinosData";
import { isMetepecEmail } from "../../lib/businessApplications";
import { fetchWithFirebaseAuth } from "../../lib/firebaseClient";

type DestinationFormState = {
  name: string;
  location: string;
  requesterEmail: string;
  categories: string[];
};

function readSessionEmail() {
  const rawSession = window.localStorage.getItem("metepec-session");
  if (!rawSession) return "";

  try {
    return (JSON.parse(rawSession) as { email?: string }).email?.toLowerCase() ?? "";
  } catch {
    return "";
  }
}

function readDestinationCatalog() {
  return sortDestinationsByAverageRating(
    mergeDestinations(defaultBusinessDestinations, readStoredBusinessDestinations()),
  );
}

export default function AdminDestinationPanel() {
  const [sessionEmail, setSessionEmail] = useState("");
  const [destinations, setDestinations] = useState<DestinationItem[]>(defaultBusinessDestinations);
  const [legacyDestinations, setLegacyDestinations] = useState<DestinationItem[]>([]);
  const [approvedDestinations, setApprovedDestinations] = useState<DestinationItem[]>([]);
  const [approvedDestinationsError, setApprovedDestinationsError] = useState("");
  const [isLoadingApprovedDestinations, setIsLoadingApprovedDestinations] = useState(false);
  const [message, setMessage] = useState("");
  const [assignmentEmails, setAssignmentEmails] = useState<Record<string, string>>({});
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [migrationEmails, setMigrationEmails] = useState<Record<string, string>>({});
  const [migrationMessage, setMigrationMessage] = useState("");
  const [activeMigrationSlug, setActiveMigrationSlug] = useState<string | null>(null);
  const [isSavingDestination, setIsSavingDestination] = useState(false);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [form, setForm] = useState<DestinationFormState>({
    name: "",
    location: "",
    requesterEmail: "",
    categories: [],
  });

  useEffect(() => {
    const sync = () => {
      setSessionEmail(readSessionEmail());
      setDestinations(readDestinationCatalog());
      setLegacyDestinations(readStoredBusinessDestinations());
    };

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
  const activeCategoryCount = useMemo(() => form.categories.length, [form.categories]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    const loadApprovedDestinations = async () => {
      setIsLoadingApprovedDestinations(true);
      try {
        const published = await fetchPublishedBusinessDestinations();
        if (active) {
          setApprovedDestinations(published);
          setApprovedDestinationsError("");
        }
      } catch (cause) {
        if (active) {
          setApprovedDestinationsError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los destinos aprobados por solicitudes.",
          );
        }
      } finally {
        if (active) setIsLoadingApprovedDestinations(false);
      }
    };

    void loadApprovedDestinations();
    window.addEventListener("focus", loadApprovedDestinations);
    return () => {
      active = false;
      window.removeEventListener("focus", loadApprovedDestinations);
    };
  }, [isAdmin]);

  const toggleCategory = (categoryValue: string) => {
    setForm((current) => ({
      ...current,
      categories: current.categories.includes(categoryValue)
        ? current.categories.filter((value) => value !== categoryValue)
        : [...current.categories, categoryValue],
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.location.trim() || !isMetepecEmail(form.requesterEmail)) {
      setMessage("Completa nombre, ubicación y asigna una cuenta @metepec.mx creada en Firebase.");
      return;
    }

    setIsSavingDestination(true);
    setMessage("");
    try {
      const response = await fetchWithFirebaseAuth("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          location: form.location,
          ownerEmail: form.requesterEmail,
          categories: form.categories,
        }),
      });
      const result = (await response.json()) as {
        business?: DestinationItem;
        error?: string;
      };
      if (!response.ok || !result.business) {
        throw new Error(result.error || "No se pudo registrar el destino.");
      }

      setApprovedDestinations((current) => [result.business!, ...current]);
      setDestinations((current) => sortDestinationsByAverageRating(
        mergeDestinations(current, [result.business!]),
      ));
      setMessage(`Destino dado de alta y asignado a ${form.requesterEmail}.`);
      setForm({ name: "", location: "", requesterEmail: "", categories: [] });
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo registrar el destino.");
    } finally {
      setIsSavingDestination(false);
    }
  };

  const handleAssignDestination = async (destination: DestinationItem) => {
    const ownerEmail = assignmentEmails[destination.id]?.trim().toLowerCase() ?? "";
    if (!isMetepecEmail(ownerEmail)) {
      setAssignmentMessage("La cuenta asignada debe terminar en @metepec.mx.");
      return;
    }

    setActiveAssignmentId(destination.id);
    setAssignmentMessage("");
    try {
      const response = await fetchWithFirebaseAuth(`/api/businesses/${destination.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerEmail }),
      });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(result.error || "No se pudo asignar la cuenta al destino.");
      }

      setApprovedDestinations((current) =>
        current.map((item) => item.id === destination.id ? { ...item, ownerEmail } : item),
      );
      setAssignmentMessage(result.message ?? `Cuenta asignada a ${destination.title}.`);
      setAssignmentEmails((current) => ({ ...current, [destination.id]: "" }));
    } catch (cause) {
      setAssignmentMessage(
        cause instanceof Error ? cause.message : "No se pudo asignar la cuenta al destino.",
      );
    } finally {
      setActiveAssignmentId(null);
    }
  };

  const handleMigrateDestination = async (destination: DestinationItem) => {
    const ownerEmail = (
      migrationEmails[destination.slug] ??
      destination.ownerEmail ??
      destination.requesterEmail ??
      ""
    ).trim().toLowerCase();
    if (!isMetepecEmail(ownerEmail)) {
      setMigrationMessage(`Asigna a ${destination.title} una cuenta @metepec.mx antes de transferirlo.`);
      return;
    }

    setActiveMigrationSlug(destination.slug);
    setMigrationMessage("");
    try {
      const response = await fetchWithFirebaseAuth("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerEmail, destination }),
      });
      const result = (await response.json()) as {
        business?: DestinationItem;
        error?: string;
      };
      if (!response.ok || !result.business) {
        throw new Error(result.error || "No se pudo transferir el destino a Firebase.");
      }

      removeStoredBusinessDestination(destination.slug);
      setLegacyDestinations((current) => current.filter((item) => item.slug !== destination.slug));
      setDestinations((current) => sortDestinationsByAverageRating(
        mergeDestinations(
          current.filter((item) => item.slug !== destination.slug),
          [result.business!],
        ),
      ));
      setApprovedDestinations((current) => [result.business!, ...current]);
      setMigrationMessage(`${destination.title} ya está en Firebase y asignado a ${ownerEmail}.`);
    } catch (cause) {
      setMigrationMessage(
        cause instanceof Error ? cause.message : "No se pudo transferir el destino a Firebase.",
      );
    } finally {
      setActiveMigrationSlug(null);
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
            <h1>Alta de destinos turísticos</h1>
            <p>Registra destinos en una interfaz independiente de la administración de guías.</p>
          </div>
        </section>
        <section className="admin-grid admin-grid-single">
          <article className="admin-card">
            <div className="admin-card-header">
              <h2>Registrar destino</h2>
              <p>Registra el destino y asígnalo a una cuenta institucional @metepec.mx creada en Firebase.</p>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label>
                Nombre del destino
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Museo del Barro Vivo"
                />
              </label>
              <label>
                Ubicación
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Av. Estado de México #113"
                />
              </label>
              <label>
                Cuenta institucional asignada al destino
                <input
                  type="email"
                  required
                  value={form.requesterEmail}
                  onChange={(event) => setForm((current) => ({ ...current, requesterEmail: event.target.value }))}
                  placeholder="encargado@metepec.mx"
                />
              </label>
              <div className="admin-chip-group" aria-label="Categorías de destino">
                <span>Categorías</span>
                <div>
                  {destinationCategories.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      className={form.categories.includes(category.value) ? "is-active" : ""}
                      onClick={() => toggleCategory(category.value)}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                <small>{activeCategoryCount} seleccionadas</small>
              </div>
              {message ? <p className="admin-status" role="status">{message}</p> : null}
              <button type="submit" className="admin-submit" disabled={isSavingDestination}>
                {isSavingDestination ? "Guardando..." : "Guardar destino"}
              </button>
            </form>
            <div className="admin-list">
              <h3>Destinos registrados</h3>
              {destinations.slice(0, 5).map((destination) => (
                <article key={destination.id} className="admin-list-item">
                  <strong>{destination.title}</strong>
                  <span>{destination.address}</span>
                  <small>{destination.tags.join(" · ") || "Sin categorías"}</small>
                </article>
              ))}
            </div>
            {legacyDestinations.length > 0 ? (
              <div className="admin-list">
                <h3>Destinos guardados en este navegador</h3>
                <p>
                  Transfiere los destinos anteriores a Firebase para que el encargado pueda abrirlos desde cualquier equipo.
                </p>
                {legacyDestinations.map((destination) => (
                  <article key={destination.slug} className="admin-list-item">
                    <strong>{destination.title}</strong>
                    <span>{destination.address}</span>
                    <label>
                      Cuenta institucional del establecimiento
                      <input
                        type="email"
                        value={migrationEmails[destination.slug] ?? destination.ownerEmail ?? destination.requesterEmail ?? ""}
                        onChange={(event) =>
                          setMigrationEmails((current) => ({
                            ...current,
                            [destination.slug]: event.target.value,
                          }))
                        }
                        placeholder="encargado@metepec.mx"
                      />
                    </label>
                    <button
                      type="button"
                      className="admin-submit"
                      disabled={activeMigrationSlug === destination.slug}
                      onClick={() => handleMigrateDestination(destination)}
                    >
                      {activeMigrationSlug === destination.slug ? "Transfiriendo..." : "Transferir a Firebase"}
                    </button>
                  </article>
                ))}
                {migrationMessage ? <p className="admin-status" role="status">{migrationMessage}</p> : null}
              </div>
            ) : null}
            <div className="admin-list">
              <h3>Destinos dados de alta en Firebase</h3>
              {isLoadingApprovedDestinations ? (
                <p className="admin-empty" role="status">Cargando destinos de Firebase...</p>
              ) : null}
              {approvedDestinationsError ? (
                <p className="admin-status is-error" role="alert">{approvedDestinationsError}</p>
              ) : null}
              {!isLoadingApprovedDestinations && !approvedDestinationsError && approvedDestinations.length === 0 ? (
                <p className="admin-empty">Aún no hay destinos registrados en Firebase.</p>
              ) : null}
              {approvedDestinations.map((destination) => (
                <article key={destination.id} className="admin-list-item">
                  <strong>{destination.title}</strong>
                  <span>{destination.address}</span>
                  <small>{destination.tags.join(" · ") || "Sin categorías"}</small>
                  {destination.ownerEmail ? <small>Cuenta asignada: {destination.ownerEmail}</small> : null}
                  <label>
                    Asignar o cambiar cuenta de acceso
                    <input
                      type="email"
                      value={assignmentEmails[destination.id] ?? ""}
                      onChange={(event) =>
                        setAssignmentEmails((current) => ({
                          ...current,
                          [destination.id]: event.target.value,
                        }))
                      }
                      placeholder="encargado@metepec.mx"
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-submit"
                    disabled={activeAssignmentId === destination.id}
                    onClick={() => handleAssignDestination(destination)}
                  >
                    {activeAssignmentId === destination.id ? "Asignando..." : "Asignar cuenta"}
                  </button>
                </article>
              ))}
              {assignmentMessage ? <p className="admin-status" role="status">{assignmentMessage}</p> : null}
            </div>
          </article>
        </section>
        <div className="admin-return-links">
          <Link href="/admin">Volver al panel administrativo</Link>
          <Link href="/admin/guias">Ir a alta de guías</Link>
        </div>
      </div>
    </main>
  );
}
