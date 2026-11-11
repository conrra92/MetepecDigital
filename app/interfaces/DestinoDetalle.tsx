"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "./AppHeader";
import { fetchWithFirebaseAuth } from "../../lib/firebaseClient";
import { isGmailEmail } from "./adminData";
import {
  defaultBusinessDestinations,
  fetchPublishedBusinessDestinations,
  getDestinationAverageRating,
  mergeDestinations,
  readStoredBusinessDestinations,
  upsertStoredBusinessDestination,
  type DestinationItem,
} from "./destinosData";

type DestinoDetalleProps = {
  slug: string;
};

const galleryLayouts = [
  "destination-photo-main",
  "destination-photo-hands",
  "destination-photo-facade",
  "destination-photo-museum",
];

const GUIDED_VISIT_STORAGE_KEY = "metepec-guided-visits";

const getDateOptions = () => {
  const startDate = new Date();
  const utcStart = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate() + 2,
  ));

  return Array.from({ length: 14 }, (_, index) => {
    const current = new Date(utcStart);
    current.setUTCDate(utcStart.getUTCDate() + index);
    return current.toISOString().slice(0, 10);
  });
};

const getTimeOptions = () =>
  Array.from({ length: 9 }, (_, index) => {
    const hour = 9 + index;
    return `${String(hour).padStart(2, "0")}:00`;
  });

const readReservedGuidedVisits = () => {
  if (typeof window === "undefined") {
    return {} as Record<string, Array<{ date: string; time: string }>>;
  }

  try {
    const stored = window.localStorage.getItem(GUIDED_VISIT_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, Array<{ date: string; time: string }>>) : {};
  } catch {
    return {} as Record<string, Array<{ date: string; time: string }>>;
  }
};

export default function DestinoDetalle({ slug }: DestinoDetalleProps) {
  const [sessionEmail, setSessionEmail] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentRating, setNewCommentRating] = useState(5);
  const [commentError, setCommentError] = useState("");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [guidedVisitForm, setGuidedVisitForm] = useState({
    name: "",
    email: "",
    date: "",
    time: "",
    reunionLocation: "",
    returnToMeeting: false,
    finishAtDestination: false,
    message: "",
  });
  const [guidedVisitStatus, setGuidedVisitStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [reservedGuidedVisits, setReservedGuidedVisits] = useState<Record<string, Array<{ date: string; time: string }>>>({});
  const [destinations, setDestinations] = useState<DestinationItem[]>(defaultBusinessDestinations);
  const [isDestinationsLoading, setIsDestinationsLoading] = useState(true);
  const [destinationLoadError, setDestinationLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const syncReservedGuidedVisits = () => {
      if (active) {
        setReservedGuidedVisits(readReservedGuidedVisits());
      }
    };
    const syncRemoteGuidedVisits = async () => {
      try {
        const response = await fetch(`/api/guided-visits?destination=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error || "No se pudieron consultar los horarios reservados.");
        }
        const result = (await response.json()) as {
          reservedVisits: Array<{ date: string; time: string }>;
        };
        if (active) {
          setReservedGuidedVisits((current) => ({
            ...current,
            [slug]: Array.from(
              new Map(
                [...(current[slug] ?? []), ...result.reservedVisits]
                  .map((slot) => [`${slot.date}|${slot.time}`, slot] as const),
              ).values(),
            ),
          }));
        }
      } catch (cause) {
        if (active) {
          setGuidedVisitStatus({
            type: "error",
            text: cause instanceof Error ? cause.message : "No se pudieron consultar los horarios reservados.",
          });
        }
      }
    };
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
          if (active) {
            setIsDestinationsLoading(false);
          }
        });
    };

    window.addEventListener("storage", syncReservedGuidedVisits);
    window.addEventListener("focus", syncReservedGuidedVisits);
    Promise.resolve().then(syncReservedGuidedVisits);
    void syncRemoteGuidedVisits();
    syncDestinations();

    window.addEventListener("storage", syncDestinations);
    window.addEventListener("focus", syncDestinations);

    const readSessionEmail = () => {
      const rawSession = window.localStorage.getItem("metepec-session");

      if (!rawSession) {
        setSessionEmail("");
        return;
      }

      try {
        const parsed = JSON.parse(rawSession) as { email?: string };
        setSessionEmail(parsed.email?.toLowerCase() ?? "");
      } catch {
        setSessionEmail("");
      }
    };

    readSessionEmail();
    window.addEventListener("storage", readSessionEmail);
    window.addEventListener("focus", readSessionEmail);

    return () => {
      active = false;
      window.removeEventListener("storage", syncReservedGuidedVisits);
      window.removeEventListener("focus", syncReservedGuidedVisits);
      window.removeEventListener("storage", syncDestinations);
      window.removeEventListener("focus", syncDestinations);
      window.removeEventListener("storage", readSessionEmail);
      window.removeEventListener("focus", readSessionEmail);
    };
  }, [slug]);

  const destination = useMemo(
    () => destinations.find((item) => item.slug === slug),
    [destinations, slug],
  );

  const canComment = isGmailEmail(sessionEmail);

  const dateOptions = useMemo(() => {
    if (!destination) {
      return [];
    }

    const timeValues = getTimeOptions();
    return getDateOptions().filter((date) =>
      timeValues.some((time) => {
        const reservations = reservedGuidedVisits[destination.slug] ?? [];
        return !reservations.some((slot) => slot.date === date && slot.time === time);
      }),
    );
  }, [destination, reservedGuidedVisits]);

  const timeOptions = useMemo(() => {
    if (!destination) {
      return [];
    }

    if (!guidedVisitForm.date) {
      return getTimeOptions();
    }

    const reservations = reservedGuidedVisits[destination.slug] ?? [];
    return getTimeOptions().filter(
      (time) => !reservations.some((slot) => slot.date === guidedVisitForm.date && slot.time === time),
    );
  }, [destination, guidedVisitForm.date, reservedGuidedVisits]);

  if (!destination && isDestinationsLoading) {
    return (
      <main className="destination-page">
        <AppHeader active="destinos" />
        <section className="destination-shell">
          <p className="destinations-empty">Cargando información del negocio...</p>
        </section>
      </main>
    );
  }

  if (!destination) {
    return (
      <main className="destination-page">
        <AppHeader active="destinos" />
        <section className="destination-shell">
          <article className="destination-detail destination-not-found">
            <h1>Destino no encontrado</h1>
            <p>
              {destinationLoadError || "No encontramos ese destino o fue eliminado."}
            </p>
            <Link href="/destinos" className="destination-back-link">
              Volver a destinos
            </Link>
          </article>
        </section>
      </main>
    );
  }

  const photoList = destination.photos.length > 0
    ? destination.photos
    : ["/metepec-hero.png"];

  const galleryPhotos = galleryLayouts.map((layoutClass, index) => ({
    layoutClass,
    src: photoList[index] ?? photoList[index % photoList.length],
  }));

  const selectedPhoto =
    selectedPhotoIndex === null ? null : galleryPhotos[selectedPhotoIndex] ?? null;

  const getPhotoDescription = (src: string, index: number) => {
    const storedDescription =
      destination.photoDescriptions?.[String(index)] ?? destination.photoDescriptions?.[src];
    return storedDescription?.trim() || destination.shortDescription;
  };

  const handleSelectPhoto = (index: number) => setSelectedPhotoIndex(index);

  const handlePreviousPhoto = () => {
    if (selectedPhotoIndex === null) {
      return;
    }

    setSelectedPhotoIndex(
      selectedPhotoIndex === 0 ? galleryPhotos.length - 1 : selectedPhotoIndex - 1,
    );
  };

  const handleNextPhoto = () => {
    if (selectedPhotoIndex === null) {
      return;
    }

    setSelectedPhotoIndex(
      selectedPhotoIndex === galleryPhotos.length - 1 ? 0 : selectedPhotoIndex + 1,
    );
  };

  const handleSubmitComment = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canComment) {
      setCommentError("Solo las cuentas con dominio gmail.com pueden comentar.");
      return;
    }

    const trimmedComment = newCommentText.trim();

    if (!trimmedComment) {
      setCommentError("Escribe un comentario antes de enviarlo.");
      return;
    }

    const safeRating = Math.max(0, Math.min(5, newCommentRating));

    const updatedComments = [
      {
        id: `c-${Date.now()}`,
        author: sessionEmail,
        text: trimmedComment,
        rating: safeRating,
      },
      ...destination.comments,
    ];

    const averageRating =
      updatedComments.reduce((sum, comment) => sum + comment.rating, 0) /
      updatedComments.length;

    const updatedDestination: DestinationItem = {
      ...destination,
      reviewsCount: destination.reviewsCount + 1,
      rating: Number(averageRating.toFixed(1)),
      comments: updatedComments,
    };

    setDestinations((current) =>
      current.map((item) => (item.slug === updatedDestination.slug ? updatedDestination : item)),
    );

    upsertStoredBusinessDestination(updatedDestination);
    setNewCommentText("");
    setNewCommentRating(5);
    setCommentError("");
  };

  const handleGuidedVisitSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const hasRequiredFields =
      guidedVisitForm.name.trim() &&
      guidedVisitForm.email.trim() &&
      guidedVisitForm.date &&
      guidedVisitForm.time &&
      guidedVisitForm.reunionLocation.trim() &&
      guidedVisitForm.message.trim();

    if (!hasRequiredFields) {
      setGuidedVisitStatus({
        type: "error",
        text: "Completa nombre, correo, fecha, hora, ubicación de reunión y el detalle de la visita guiada.",
      });
      return;
    }

    const reservations = reservedGuidedVisits[destination.slug] ?? [];
    const isSlotTaken = reservations.some(
      (slot) => slot.date === guidedVisitForm.date && slot.time === guidedVisitForm.time,
    );

    if (isSlotTaken) {
      setGuidedVisitStatus({
        type: "error",
        text: "Ese horario ya fue reservado por otra persona. Elige otro disponible.",
      });
      return;
    }

    try {
      const response = await fetchWithFirebaseAuth("/api/guided-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationSlug: destination.slug,
          destinationTitle: destination.title,
          requesterName: guidedVisitForm.name,
          requesterEmail: guidedVisitForm.email,
          date: guidedVisitForm.date,
          time: guidedVisitForm.time,
          reunionLocation: guidedVisitForm.reunionLocation,
          returnToMeeting: guidedVisitForm.returnToMeeting,
          finishAtDestination: guidedVisitForm.finishAtDestination,
          message: guidedVisitForm.message,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "No se pudo enviar la solicitud.");
      }

      const nextReserved = {
        ...reservedGuidedVisits,
        [destination.slug]: [
          ...(reservedGuidedVisits[destination.slug] ?? []),
          { date: guidedVisitForm.date, time: guidedVisitForm.time },
        ],
      };
      window.localStorage.setItem(GUIDED_VISIT_STORAGE_KEY, JSON.stringify(nextReserved));
      setReservedGuidedVisits(nextReserved);
      setGuidedVisitStatus({
        type: "success",
        text: `Solicitud enviada para ${destination.title}. Te contactaremos pronto para confirmar tu visita guiada.`,
      });
    } catch (cause) {
      setGuidedVisitStatus({
        type: "error",
        text: cause instanceof Error ? cause.message : "No se pudo enviar la solicitud.",
      });
      return;
    }
    setGuidedVisitForm({
      name: "",
      email: "",
      date: "",
      time: "",
      reunionLocation: "",
      returnToMeeting: false,
      finishAtDestination: false,
      message: "",
    });
  };

  return (
    <main className="destination-page">
      <AppHeader active="destinos" />

      <section className="destination-shell">
        <div className="destination-gallery">
          {galleryPhotos.map((photo, index) => (
            <button
              type="button"
              className={`destination-photo ${photo.layoutClass} destination-photo-button`}
              key={`${photo.src}-${index}`}
              onClick={() => handleSelectPhoto(index)}
              aria-label={`Ampliar imagen ${index + 1} de ${destination.title}`}
            >
              <Image
                src={photo.src}
                alt={`${destination.title} fotografia ${index + 1}`}
                fill
                priority={index === 0}
                sizes="(max-width: 900px) 100vw, 48vw"
              />
            </button>
          ))}
        </div>

        {selectedPhoto ? (
          <div className="destination-photo-modal-backdrop" onClick={() => setSelectedPhotoIndex(null)}>
            <div
              className="destination-photo-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Vista ampliada de la imagen"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="destination-photo-modal-close"
                onClick={() => setSelectedPhotoIndex(null)}
                aria-label="Cerrar vista ampliada"
              >
                ×
              </button>

              <button type="button" className="destination-photo-modal-arrow destination-photo-modal-arrow-left" onClick={handlePreviousPhoto} aria-label="Ver imagen anterior">
                ‹
              </button>

              <div className="destination-photo-modal-frame">
                <Image
                  src={selectedPhoto.src}
                  alt={destination.title}
                  fill
                  sizes="90vw"
                />
              </div>

              <button type="button" className="destination-photo-modal-arrow destination-photo-modal-arrow-right" onClick={handleNextPhoto} aria-label="Ver imagen siguiente">
                ›
              </button>

              <p className="destination-photo-modal-description">
                {selectedPhoto
                  ? getPhotoDescription(selectedPhoto.src, selectedPhotoIndex ?? 0)
                  : destination.shortDescription}
              </p>
            </div>
          </div>
        ) : null}

        <section className="destination-content-grid">
          <article className="destination-detail">
            <div className="destination-title-row">
              <div>
                <h1>{destination.title}</h1>
                <p>{destination.address}, {destination.neighborhood}</p>
              </div>
              <div className="destination-rating">
                <strong>{getDestinationAverageRating(destination).toFixed(1)}</strong>
                <span>({destination.reviewsCount} resenas)</span>
              </div>
            </div>

            <div className="detail-section">
              <h2>Informacion del destino</h2>
              {destination.description.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="detail-tabs" aria-label="Temas del destino">
              {destination.tags.map((tag) => (
                <button type="button" key={tag}>
                  {tag}
                </button>
              ))}
            </div>

            {canComment ? (
              <>
                <div className="detail-section">
                  <h2>Comentarios de usuarios</h2>
                  {destination.comments.length === 0 ? (
                    <p>Aun no hay comentarios para este destino.</p>
                  ) : (
                    <div className="destination-comments-grid">
                      {destination.comments.map((comment) => (
                        <article className="review-card" key={comment.id}>
                          <div className="review-author">
                            <span>{comment.author.slice(0, 2).toUpperCase()}</span>
                            <div>
                              <strong>{comment.author}</strong>
                              <p className="stars" aria-label={`Calificacion de ${comment.rating} estrellas`}>
                                {Array.from({ length: 5 }).map((_, idx) => (
                                  <span
                                    key={`${comment.id}-${idx}`}
                                    className={idx < comment.rating ? "is-filled" : "is-empty"}
                                  />
                                ))}
                              </p>
                            </div>
                          </div>
                          <p>{comment.text}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="detail-section comment-form-section">
                  <h2>Deja tu comentario</h2>
                  <form className="destination-comment-form" onSubmit={handleSubmitComment}>
                    <p className="comment-session">Sesion activa: {sessionEmail}</p>
                    <label>
                      Tu comentario
                      <textarea
                        value={newCommentText}
                        onChange={(event) => setNewCommentText(event.target.value)}
                        placeholder="Escribe tu experiencia sobre este destino"
                        rows={4}
                      />
                    </label>

                    <label>
                      Calificacion (0 a 5)
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={newCommentRating}
                        onChange={(event) => setNewCommentRating(Number(event.target.value))}
                      />
                    </label>

                    {commentError ? <p className="comment-error">{commentError}</p> : null}

                    <button type="submit">Publicar comentario</button>
                  </form>
                </div>
              </>
            ) : null}
          </article>

          <aside className="location-card">
            <h2>Ubicacion y Horarios</h2>
            <div className="mini-map" aria-label="Mapa de ubicacion">
              <span className="map-pin" />
            </div>

            <div className="location-list">
              <div>
                <span className="location-icon location-icon-pin" />
                <p>
                  <strong>{destination.neighborhood}</strong>
                  {destination.address}
                </p>
              </div>
              <div>
                <span className="location-icon location-icon-clock" />
                <p>
                  <strong>Horario</strong>
                  {destination.hours}
                </p>
              </div>
              {destination.contactPhone ? (
                <div>
                  <span className="location-icon location-icon-pin" />
                  <p>
                    <strong>Contacto</strong>
                    <a href={`tel:${destination.contactPhone}`}>{destination.contactPhone}</a>
                  </p>
                </div>
              ) : null}
              <div>
                <span className="location-icon location-icon-ticket" />
                <p>
                  <strong>Entrada</strong>
                  {destination.entryFee}
                </p>
              </div>
            </div>

            {sessionEmail ? (
              <div className="guided-visit-card">
                <h3>Solicitar visita guiada</h3>
                <form className="guided-visit-form" onSubmit={handleGuidedVisitSubmit}>
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={guidedVisitForm.name}
                      onChange={(event) =>
                        setGuidedVisitForm((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Tu nombre"
                    />
                  </label>

                  <label>
                    Correo
                    <input
                      type="email"
                      value={guidedVisitForm.email}
                      onChange={(event) =>
                        setGuidedVisitForm((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="correo@ejemplo.com"
                    />
                  </label>

                  <div className="guided-visit-row">
                    <label>
                      Fecha deseada
                      <select
                        value={guidedVisitForm.date}
                        onChange={(event) =>
                          setGuidedVisitForm((current) => ({ ...current, date: event.target.value, time: "" }))
                        }
                      >
                        <option value="">Selecciona una fecha</option>
                        {dateOptions.map((date) => (
                          <option key={date} value={date}>
                            {new Intl.DateTimeFormat("es-MX", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              timeZone: "UTC",
                            }).format(new Date(`${date}T12:00:00Z`))}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Hora
                      <select
                        value={guidedVisitForm.time}
                        onChange={(event) =>
                          setGuidedVisitForm((current) => ({ ...current, time: event.target.value }))
                        }
                        disabled={!guidedVisitForm.date}
                      >
                        <option value="">Selecciona la hora</option>
                        {timeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    Ubicación de reunión
                    <input
                      type="text"
                      value={guidedVisitForm.reunionLocation}
                      onChange={(event) =>
                        setGuidedVisitForm((current) => ({ ...current, reunionLocation: event.target.value }))
                      }
                      placeholder="Ej. Plaza central, hotel, etc."
                    />
                  </label>

                  <label className="guided-visit-toggle">
                    <input
                      type="checkbox"
                      checked={guidedVisitForm.returnToMeeting}
                      onChange={(event) =>
                        setGuidedVisitForm((current) => ({
                          ...current,
                          returnToMeeting: event.target.checked,
                        }))
                      }
                    />
                    <span>Deseo que me regresen a la ubicación de reunión</span>
                  </label>

                  <label className="guided-visit-toggle">
                    <input
                      type="checkbox"
                      checked={guidedVisitForm.finishAtDestination}
                      onChange={(event) =>
                        setGuidedVisitForm((current) => ({
                          ...current,
                          finishAtDestination: event.target.checked,
                        }))
                      }
                    />
                    <span>El recorrido termina al dejarme en el destino</span>
                  </label>

                  <label>
                    Detalles de la visita
                    <textarea
                      rows={3}
                      value={guidedVisitForm.message}
                      onChange={(event) =>
                        setGuidedVisitForm((current) => ({ ...current, message: event.target.value }))
                      }
                      placeholder="Cuéntanos qué te gustaría conocer"
                    />
                  </label>

                  <button type="submit">Solicitar visita</button>

                  {guidedVisitStatus ? (
                    <p
                      className={
                        guidedVisitStatus.type === "success" ? "guided-visit-status success" : "guided-visit-status error"
                      }
                    >
                      {guidedVisitStatus.text}
                    </p>
                  ) : null}
                </form>
              </div>
            ) : null}
          </aside>
        </section>
      </section>
    </main>
  );
}
