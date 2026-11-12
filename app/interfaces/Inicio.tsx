"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import AppHeader from "./AppHeader";
import {
  isAdminEmail,
  isGmailEmail,
} from "./adminData";
import {
  defaultBusinessDestinations,
  fetchPublishedBusinessDestinations,
  mergeDestinations,
  readStoredBusinessDestinations,
  sortDestinationsByAverageRating,
  getDestinationAverageRating,
  getDestinationByOwnerEmail,
  type DestinationItem,
  upsertStoredBusinessDestination,
} from "./destinosData";
import { fetchWithFirebaseAuth } from "../../lib/firebaseClient";
import { isMetepecEmail } from "../../lib/businessApplications";

const categories = [
  { label: "Turisticos", value: "turistico", icon: "📍" },
  { label: "Historicos", value: "historico", icon: "🏛️" },
  { label: "Artesanias", value: "artesanias", icon: "🧵" },
  { label: "Gastronomia", value: "gastronomia", icon: "🍽️" },
];

const reviews = [
  {
    initials: "RM",
    name: "Ricardo M.",
    text: "Seleccion curada de los puntos mas emblematicos e historicos para visitar en Metepec.",
  },
  {
    initials: "LG",
    name: "Laura G.",
    text: "Seleccion curada de los puntos mas emblematicos e historicos para visitar en Metepec.",
  },
  {
    initials: "AS",
    name: "Andres S.",
    text: "Seleccion curada de los puntos mas emblematicos e historicos para visitar en Metepec.",
  },
  {
    initials: "VP",
    name: "Valeria P.",
    text: "Seleccion curada de los puntos mas emblematicos e historicos para visitar en Metepec.",
  },
];

type HomeReview = {
  id: string;
  initials: string;
  name: string;
  text: string;
  rating: number;
};

const HOME_COMMENTS_STORAGE_KEY = "metepec-home-comments";

export default function Inicio() {
  const pathname = usePathname();
  const [sessionEmail, setSessionEmail] = useState("");
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");
  const [userReviews, setUserReviews] = useState<HomeReview[]>([]);
  const [destinations, setDestinations] = useState<DestinationItem[]>(defaultBusinessDestinations);
  const [isDestinationLoading, setIsDestinationLoading] = useState(true);
  const [destinationLoadError, setDestinationLoadError] = useState("");
  const [ownerEditForm, setOwnerEditForm] = useState({
    shortDescription: "",
    description: "",
    entryFee: "",
    photos: [] as Array<{ src: string; description: string }>,
  });
  const [ownerPhotoDescription, setOwnerPhotoDescription] = useState("");
  const [ownerEditMessage, setOwnerEditMessage] = useState("");
  const lastSyncedOwnerDestinationRef = useRef<string | null>(null);
  const [activeHomeCategories, setActiveHomeCategories] = useState<Record<string, boolean>>({
    turistico: true,
    historico: true,
    artesanias: true,
    gastronomia: true,
  });

  useEffect(() => {
    const readSessionEmail = () => {
      const rawSession = window.localStorage.getItem("metepec-session");

      if (!rawSession) {
        setSessionEmail("");
        setIsSessionLoaded(true);
        return;
      }

      try {
        const parsed = JSON.parse(rawSession) as { email?: string };
        setSessionEmail(parsed.email?.toLowerCase() ?? "");
      } catch {
        setSessionEmail("");
      } finally {
        setIsSessionLoaded(true);
      }
    };

    const readStoredComments = () => {
      const rawComments = window.localStorage.getItem(HOME_COMMENTS_STORAGE_KEY);

      if (!rawComments) {
        setUserReviews([]);
        return;
      }

      try {
        const parsed = JSON.parse(rawComments) as HomeReview[];
        setUserReviews(Array.isArray(parsed) ? parsed : []);
      } catch {
        setUserReviews([]);
      }
    };

    const readStoredDestinations = () => {
      const localDestinations = readStoredBusinessDestinations();
      setIsDestinationLoading(true);
      setDestinations(
        mergeDestinations(defaultBusinessDestinations, localDestinations),
      );

      fetchPublishedBusinessDestinations()
        .then((publishedDestinations) => {
          setDestinations(
            mergeDestinations(
              mergeDestinations(defaultBusinessDestinations, publishedDestinations),
              localDestinations,
            ),
          );
          setDestinationLoadError("");
        })
        .catch((cause: unknown) => {
          setDestinationLoadError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar los negocios aprobados.",
          );
        })
        .finally(() => {
          setIsDestinationLoading(false);
        });
    };

    readSessionEmail();
    readStoredComments();
    readStoredDestinations();

    window.addEventListener("storage", readSessionEmail);
    window.addEventListener("focus", readSessionEmail);
    window.addEventListener("storage", readStoredComments);
    window.addEventListener("focus", readStoredComments);
    window.addEventListener("storage", readStoredDestinations);
    window.addEventListener("focus", readStoredDestinations);

    return () => {
      window.removeEventListener("storage", readSessionEmail);
      window.removeEventListener("focus", readSessionEmail);
      window.removeEventListener("storage", readStoredComments);
      window.removeEventListener("focus", readStoredComments);
      window.removeEventListener("storage", readStoredDestinations);
      window.removeEventListener("focus", readStoredDestinations);
    };
  }, []);

  const canComment = isGmailEmail(sessionEmail);
  const isAdmin = isAdminEmail(sessionEmail);
  const isMetepecStaff = isMetepecEmail(sessionEmail);
  const managedDestination = useMemo(
    () => {
      if (!isMetepecStaff) {
        return undefined;
      }

      return getDestinationByOwnerEmail(sessionEmail, destinations);
    },
    [destinations, isMetepecStaff, sessionEmail],
  );
  const isMetepecOwner = Boolean(managedDestination);

  const handleOwnerLocationUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!managedDestination) {
      setOwnerEditMessage("No tienes un destino asociado para editar.");
      return;
    }

    const nextDescription = ownerEditForm.description
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    const nextPhotoDescriptions = ownerEditForm.photos
      .filter((photo) => photo.src)
      .map((photo) => photo.description.trim() || "Foto del establecimiento");
    const photoDescriptions = Object.fromEntries(
      nextPhotoDescriptions.map((description, index) => [String(index), description]),
    );

    const updatedDestination: DestinationItem = {
      ...managedDestination,
      ownerEmail: managedDestination.ownerEmail ?? managedDestination.requesterEmail ?? sessionEmail,
      requesterEmail: managedDestination.requesterEmail ?? sessionEmail,
      shortDescription: ownerEditForm.shortDescription.trim() || managedDestination.shortDescription,
      description: nextDescription.length > 0 ? nextDescription : managedDestination.description,
      photos: ownerEditForm.photos.length > 0 ? ownerEditForm.photos.map((photo) => photo.src) : managedDestination.photos,
      photoDescriptions: Object.keys(photoDescriptions).length > 0
        ? photoDescriptions
        : managedDestination.photoDescriptions,
      entryFee: ownerEditForm.entryFee.trim() || managedDestination.entryFee,
    };

    setOwnerEditMessage("");
    try {
      const response = await fetchWithFirebaseAuth(`/api/businesses/${managedDestination.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortDescription: updatedDestination.shortDescription,
          description: updatedDestination.description,
          entryFee: updatedDestination.entryFee,
          photos: updatedDestination.photos,
          photoDescriptions: updatedDestination.photoDescriptions ?? {},
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error || "No se pudieron guardar los cambios.");
      }

      upsertStoredBusinessDestination(updatedDestination);
      setDestinations((current) =>
        current.map((destination) =>
          destination.id === updatedDestination.id ? updatedDestination : destination,
        ),
      );
      setOwnerEditMessage("Cambios guardados.");
    } catch (cause) {
      setOwnerEditMessage(
        cause instanceof Error ? cause.message : "No se pudieron guardar los cambios.",
      );
    }
  };

  const handleOwnerPhotoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const hasAllowedExtension = /\.(?:jpe?g|png)$/i.test(file.name);
    if (
      !hasAllowedExtension ||
      (file.type !== "" && file.type !== "image/jpeg" && file.type !== "image/png")
    ) {
      setOwnerEditMessage("Solo se permiten imágenes JPG, JPEG o PNG.");
      input.value = "";
      return;
    }

    if (file.size > 650 * 1024) {
      setOwnerEditMessage("Cada imagen debe pesar máximo 650 KB.");
      input.value = "";
      return;
    }

    const currentPhotoSize = ownerEditForm.photos.reduce(
      (total, photo) => total + photo.src.length,
      0,
    );
    if (currentPhotoSize + Math.ceil(file.size * 4 / 3) > 900_000) {
      setOwnerEditMessage("El tamaño total de las imágenes no debe superar 900 KB.");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setOwnerEditMessage("No se pudo leer la imagen. Inténtalo de nuevo.");
        input.value = "";
        return;
      }

      setOwnerEditForm((current) => {
        const fallbackDescription = ownerPhotoDescription.trim() || `Foto del establecimiento ${current.photos.length + 1}`;

        return {
          ...current,
          photos: [
            ...current.photos,
            {
              src: String(reader.result ?? ""),
              description: fallbackDescription,
            },
          ],
        };
      });
      setOwnerPhotoDescription("");
      input.value = "";
      setOwnerEditMessage("");
    };
    reader.onerror = () => {
      setOwnerEditMessage("No se pudo leer la imagen. Inténtalo de nuevo.");
      input.value = "";
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!managedDestination) {
      lastSyncedOwnerDestinationRef.current = null;
      return;
    }

    if (lastSyncedOwnerDestinationRef.current === managedDestination.slug) {
      return;
    }

    lastSyncedOwnerDestinationRef.current = managedDestination.slug;
    setOwnerEditForm({
      shortDescription: managedDestination.shortDescription,
      description: managedDestination.description.join("\n\n"),
      entryFee: managedDestination.entryFee,
      photos: managedDestination.photos.map((photo, index) => ({
        src: photo,
        description:
          managedDestination.photoDescriptions?.[String(index)] ??
          managedDestination.photoDescriptions?.[photo] ??
          `Foto del establecimiento ${index + 1}`,
      })),
    });
  }, [managedDestination]);

  const allReviews = useMemo(
    () => [
      ...userReviews,
      ...reviews.map((review) => ({
        id: `seed-${review.name}`,
        initials: review.initials,
        name: review.name,
        text: review.text,
        rating: 5,
      })),
    ],
    [userReviews],
  );

  const topDestinations = useMemo(() => {
    const filtered = destinations.filter((destination) => {
      const categoryKey = destination.category ?? "turistico";
      return activeHomeCategories[categoryKey] ?? true;
    });

    return sortDestinationsByAverageRating(filtered).slice(0, 3);
  }, [activeHomeCategories, destinations]);

  const toggleHomeCategory = (category: string) => {
    setActiveHomeCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  };

  const handleSubmitComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canComment) {
      setCommentError("Solo cuentas con dominio gmail.com pueden comentar.");
      return;
    }

    const trimmedText = commentText.trim();

    if (!trimmedText) {
      setCommentError("Escribe un comentario antes de publicarlo.");
      return;
    }

    const shortName = sessionEmail.split("@")[0] || "Usuario";
    const initials = shortName.slice(0, 2).toUpperCase();

    const newReview: HomeReview = {
      id: `home-${Date.now()}`,
      initials,
      name: sessionEmail,
      text: trimmedText,
      rating: 5,
    };

    const updatedReviews = [newReview, ...userReviews];
    setUserReviews(updatedReviews);
    window.localStorage.setItem(
      HOME_COMMENTS_STORAGE_KEY,
      JSON.stringify(updatedReviews),
    );

    setCommentText("");
    setCommentError("");
  };

  if (pathname === "/mi-destino") {
    if (!isSessionLoaded || isDestinationLoading) {
      return (
        <main className="admin-page">
          <AppHeader active="inicio" />
          <section className="admin-guard-card" role="status">
            <h1>Cargando destino</h1>
            <p>Estamos verificando tu cuenta y la información asignada.</p>
          </section>
        </main>
      );
    }

    if (!isMetepecStaff || !managedDestination) {
      return (
        <main className="admin-page">
          <AppHeader active="inicio" />
          <section className="admin-guard-card">
            <h1>
              {destinationLoadError
                ? "No se pudo cargar el destino"
                : sessionEmail
                  ? "Acceso restringido"
                  : "Inicia sesión"}
            </h1>
            <p>
              {destinationLoadError
                ? destinationLoadError
                : !sessionEmail
                  ? "Inicia sesión con la cuenta @metepec.mx asignada a tu destino para modificar su información."
                  : !isMetepecStaff
                    ? "Solo las cuentas institucionales @metepec.mx asignadas pueden modificar un destino."
                    : "Esta cuenta @metepec.mx todavía no está asignada a un destino. Contacta al administrador."}
            </p>
            <Link href="/login" className="admin-back-link">
              {sessionEmail ? "Volver al inicio" : "Ir a iniciar sesión"}
            </Link>
          </section>
        </main>
      );
    }
  }

  return (
    <main className="home-page">
      <AppHeader active="inicio" />

      {!isMetepecOwner && !isAdmin ? (
        <section className="hero-section" aria-label="Inicio Metepec Digital">
          <Image
            className="hero-image"
            src="/metepec-hero.png"
            alt=""
            aria-hidden="true"
            fill
            priority
            sizes="100vw"
          />
          <div className="hero-content">
            <h1>Explora Metepec de forma inteligente y digital</h1>
            <p>
              Descubre artesanias, cultura y recorridos turisticos en un solo
              lugar con la mejor tecnologia para tu viaje.
            </p>

            <form className="search-card" action="#">
              <label className="search-field">
                <span aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Buscar destinos, talleres o barrios..."
                  aria-label="Buscar destinos, talleres o barrios"
                />
              </label>
              <button type="submit">Explorar destinos</button>
            </form>
          </div>
        </section>
      ) : null}

      {isMetepecOwner && managedDestination ? (
        <section style={{ width: "100%", padding: "0 1.25rem 1.5rem" }} aria-label="Editar destino de propietario">
          <article style={{ width: "100%", maxWidth: "100%", padding: "1.5rem", borderRadius: "20px", background: "#ffffff", border: "1px solid rgba(15, 23, 42, 0.08)", boxShadow: "0 14px 30px rgba(15, 23, 42, 0.08)" }}>
            <div className="admin-card-header">
              <h2>Mi establecimiento</h2>
              <p>Actualiza la información exclusiva de {managedDestination.title}.</p>
            </div>

            <form className="admin-form" onSubmit={handleOwnerLocationUpdate}>
              <div className="owner-destination-editor-grid">
                <div>
                  <label>
                    Resumen breve
                    <input
                      type="text"
                      value={ownerEditForm.shortDescription}
                      onChange={(event) =>
                        setOwnerEditForm((current) => ({
                          ...current,
                          shortDescription: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Descripción
                    <textarea
                      rows={5}
                      value={ownerEditForm.description}
                      onChange={(event) =>
                        setOwnerEditForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Precio de entrada
                    <input
                      type="text"
                      value={ownerEditForm.entryFee}
                      onChange={(event) =>
                        setOwnerEditForm((current) => ({
                          ...current,
                          entryFee: event.target.value,
                        }))
                      }
                      placeholder="Ej. $80 MXN"
                    />
                  </label>

                  <label>
                    Descripción de la foto a subir
                    <input
                      type="text"
                      value={ownerPhotoDescription}
                      onChange={(event) => setOwnerPhotoDescription(event.target.value)}
                      placeholder="Ej. Fachada principal del establecimiento"
                    />
                  </label>

                  <label>
                    Fotos del establecimiento
                    <input
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                      onChange={handleOwnerPhotoUpload}
                    />
                    <small>Formatos permitidos: JPG, JPEG y PNG. Máximo 650 KB por imagen.</small>
                  </label>
                </div>

                <div>
                  {ownerEditForm.photos.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                      {ownerEditForm.photos.map((photo, index) => (
                        <div
                          key={`${photo.src}-${index}`}
                          style={{
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            borderRadius: "12px",
                            padding: "0.7rem",
                            background: "#f8fafc",
                          }}
                        >
                          <div style={{ position: "relative", width: "100%", height: "180px", borderRadius: "10px", overflow: "hidden" }}>
                            <Image src={photo.src} alt={photo.description || `Foto ${index + 1}`} fill sizes="500px" />
                          </div>
                          <label style={{ display: "block", marginTop: "0.7rem", color: "#334155", fontSize: "0.8rem", fontWeight: 600 }}>
                            Descripción de la foto
                            <input
                              type="text"
                              value={photo.description}
                              onChange={(event) =>
                                setOwnerEditForm((current) => ({
                                  ...current,
                                  photos: current.photos.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, description: event.target.value }
                                      : item,
                                  ),
                                }))
                              }
                              style={{ marginTop: "0.35rem" }}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "#475569", opacity: 0.8 }}>Aún no hay fotos cargadas.</p>
                  )}
                </div>
              </div>

              {ownerEditMessage ? <p className="admin-status">{ownerEditMessage}</p> : null}

              <button type="submit" className="admin-submit">
                Guardar cambios
              </button>

              <div style={{ marginTop: "1.25rem", borderTop: "1px solid rgba(15, 23, 42, 0.08)", paddingTop: "1.25rem" }}>
                <div className="admin-card-header" style={{ marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0 }}>Comentarios de usuarios</h3>
                  <p style={{ margin: 0 }}>Reseñas recientes recibidas en este establecimiento.</p>
                </div>

                {managedDestination.comments.length > 0 ? (
                  <div style={{ display: "grid", gap: "0.9rem" }}>
                    {managedDestination.comments.map((comment) => (
                      <article
                        key={comment.id}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid rgba(15, 23, 42, 0.08)",
                          borderRadius: "14px",
                          padding: "0.9rem 1rem",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                          <strong style={{ color: "#0f172a" }}>{comment.author}</strong>
                          <span aria-label={`Calificación ${comment.rating} de 5`} style={{ color: "#f59e0b", letterSpacing: "0.08em" }}>
                            {"★".repeat(comment.rating)}{comment.rating < 5 ? "☆".repeat(5 - comment.rating) : ""}
                          </span>
                        </div>
                        <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>{comment.text}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#475569" }}>Aún no hay comentarios de usuarios para este establecimiento.</p>
                )}
              </div>
            </form>
          </article>
        </section>
      ) : null}

      {isAdmin ? (
        <section className="admin-grid admin-management-links" aria-label="Catálogos administrativos">
          <Link href="/admin/destinos" className="admin-card admin-management-card">
            <div className="admin-card-header">
              <h2>Alta de destinos turísticos</h2>
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
      ) : null}

      {!isMetepecOwner ? (
        <section className="places-section">
          {destinationLoadError ? (
            <p className="destinations-load-error" role="alert">{destinationLoadError}</p>
          ) : null}
          <div className="category-tabs" aria-label="Filtros de busqueda">
            {categories.map((category) => (
              <button
                className={`category-filter ${activeHomeCategories[category.value] ? "is-active" : "is-disabled"}`}
                type="button"
                key={category.value}
                data-filter={category.value}
                aria-pressed={activeHomeCategories[category.value]}
                onClick={() => toggleHomeCategory(category.value)}
              >
                <span aria-hidden="true">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>

          <div className="section-title-row">
            <div>
              <h2>Destinos mejor calificados</h2>
              <p>
                Los tres destinos con mejor promedio de calificacion entre los usuarios.
              </p>
            </div>
            <Link href="/destinos">Ver todos</Link>
          </div>

          <div className="places-grid">
            {topDestinations.map((destination) => (
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
        </section>
      ) : null}

      {canComment ? (
        <section className="reviews-section">
          <h2>Comentarios</h2>
          <div className="reviews-grid">
            {allReviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-author">
                  <span>{review.initials}</span>
                  <div>
                    <strong>{review.name}</strong>
                    <p className="stars" aria-label={`Calificacion de ${review.rating} estrellas`}>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <span
                          key={`${review.id}-${idx}`}
                          className={idx < review.rating ? "is-filled" : "is-empty"}
                        />
                      ))}
                    </p>
                  </div>
                </div>
                <p>{review.text}</p>
              </article>
            ))}
          </div>

          <div className="home-comment-box">
            <h3>Comparte tu experiencia</h3>
            <form className="destination-comment-form" onSubmit={handleSubmitComment}>
              <p className="comment-session">Sesion activa: {sessionEmail}</p>
              <label>
                Tu comentario
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Escribe tu experiencia en Metepec"
                  rows={4}
                />
              </label>

              {commentError ? <p className="comment-error">{commentError}</p> : null}

              <button type="submit">Publicar comentario</button>
            </form>
          </div>
        </section>
      ) : null}

      <footer className="site-footer">
        <div>
          <h2>Metepec Digital</h2>
          <p>
            Seleccion curada de los puntos mas emblematicos e historicos para
            visitar en Metepec.
          </p>
          <small>&copy; 2024 Metepec Digital. Desarrollado por Tecnologia de Toluca</small>
        </div>

        <nav aria-label="Empresa">
          <strong>Empresa</strong>
          <a href="#">Acerca de Metepec</a>
          <a href="#">Contacto</a>
        </nav>

        <nav aria-label="Legal">
          <strong>Legal</strong>
          <a href="#">Aviso de privacidad</a>
          <a href="#">Terminos del servicio</a>
        </nav>
      </footer>
    </main>
  );
}
