"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import AppHeader from "./AppHeader";

const MAX_PHOTO_SIZE_BYTES = 650 * 1024;

export default function GuideRegistration() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [plate, setPlate] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [model, setModel] = useState("");
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoPreviewUrl = useRef("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [submittedWarning, setSubmittedWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
    };
  }, []);

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
      photoPreviewUrl.current = "";
      setPhotoPreview("");
      setVehiclePhoto(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("La foto debe estar en formato JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError("La foto del vehículo no debe superar 650 KB.");
      event.target.value = "";
      return;
    }
    if (photoPreviewUrl.current) URL.revokeObjectURL(photoPreviewUrl.current);
    photoPreviewUrl.current = URL.createObjectURL(file);
    setPhotoPreview(photoPreviewUrl.current);
    setVehiclePhoto(file);
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!vehiclePhoto || !acceptedTerms) {
      setError("Sube la foto del vehículo y acepta los términos para continuar.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("email", email);
      formData.set("password", password);
      formData.set("plate", plate);
      formData.set("vehicleYear", vehicleYear);
      formData.set("model", model);
      formData.set("vehiclePhoto", vehiclePhoto);

      const response = await fetch("/api/guides/register", { method: "POST", body: formData });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        notificationWarning?: boolean;
      };
      if (!response.ok) {
        throw new Error(result.error || "No se pudo crear la cuenta de guía.");
      }
      setSubmittedMessage(result.message || "Tu solicitud quedó registrada y está pendiente de aprobación.");
      setSubmittedWarning(Boolean(result.notificationWarning));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo completar el registro. Inicia sesión con tu correo si la cuenta ya fue creada.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="register-page">
      <AppHeader active="inicio" />
      <section className="register-shell guide-register-shell" aria-label="Registro de guía">
        <aside className="register-story-panel">
          <Image
            src="/detalle-arbol-vida.png"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 365px"
          />
          <div className="register-brand-copy">
            <h1>Conduce nuevas historias</h1>
            <p>Regístrate como guía para recibir solicitudes de recorridos por Metepec.</p>
          </div>
          <blockquote>
            <span aria-hidden="true">“</span>
            <p>Comparte la cultura de Metepec con cada recorrido.</p>
            <cite>Metepec Digital</cite>
          </blockquote>
        </aside>

        <article className="register-form-card">
          <div className="register-heading">
            <h2>Alta de guía</h2>
            <p>Crea tu cuenta y registra los datos de tu vehículo.</p>
          </div>
          {submittedMessage ? (
            <div
              className={`guide-registration-success${submittedWarning ? " is-warning" : ""}`}
              role={submittedWarning ? "alert" : "status"}
            >
              <h3>Solicitud enviada</h3>
              <p>{submittedMessage}</p>
              <p>Te enviaremos por correo la decisión de administración. Podrás iniciar sesión en el panel cuando tu solicitud sea aprobada.</p>
              <Link href="/login">Ir a iniciar sesión</Link>
            </div>
          ) : <form className="register-form guide-register-form" onSubmit={handleSubmit}>
            <label>
              Nombre de guía
              <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </label>
            <label>
              Correo electrónico
              <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            </label>
            <div className="register-two-cols">
              <label>
                Contraseña
                <input required type="password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
              </label>
              <label>
                Confirmar contraseña
                <input required type="password" minLength={8} maxLength={128} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" />
              </label>
            </div>
            <div className="register-two-cols">
              <label>
                Placa
                <input required maxLength={15} value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} />
              </label>
              <label>
                Año del vehículo
                <input required type="number" min="1980" max={new Date().getFullYear() + 1} value={vehicleYear} onChange={(event) => setVehicleYear(event.target.value)} />
              </label>
            </div>
            <label>
              Modelo del vehículo
              <input required maxLength={100} value={model} onChange={(event) => setModel(event.target.value)} />
            </label>
            <label>
              Foto del vehículo (JPG, PNG o WebP; máximo 650 KB)
              <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
            </label>
            {photoPreview ? (
              <div className="guide-vehicle-preview">
                <Image
                  className="guide-vehicle-preview-image"
                  src={photoPreview}
                  alt="Vista previa del vehículo"
                  width={160}
                  height={110}
                  unoptimized
                />
              </div>
            ) : null}
            <label className="terms-option">
              <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
              Acepto los Términos del Servicio y el Aviso de Privacidad de Metepec Digital.
            </label>
            {error ? <p className="guide-form-error" role="alert">{error}</p> : null}
            <button className="register-submit" type="submit" disabled={isLoading}>
              {isLoading ? "Creando cuenta..." : "Crear cuenta de guía"}
            </button>
          </form>}
          {!submittedMessage ? <p className="register-login-link">
            ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
          </p> : null}
        </article>
      </section>
      <footer className="register-mini-footer">
        <small>&copy; 2024 Metepec Digital. Desarrollado por Tecnología de Toluca</small>
      </footer>
    </main>
  );
}
