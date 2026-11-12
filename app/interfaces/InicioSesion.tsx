"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import AppHeader from "./AppHeader";
import { isAdminEmail, isGmailEmail } from "./adminData";
import { useGoogleSignIn } from "./useGoogleSignIn";
import { getFirebaseAuth } from "../../lib/firebaseClient";
import { isMetepecEmail } from "../../lib/businessApplications";

export default function InicioSesion() {
  const router = useRouter();
  const { signInWithGoogle, isGoogleLoading } = useGoogleSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleManualLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    try {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        normalizedEmail,
        password,
      );
      const signedInEmail = credential.user.email?.trim().toLowerCase() ?? normalizedEmail;
      const tokenResult = await credential.user.getIdTokenResult(true);
      const isGuide = tokenResult.claims.guide === true;
      if (
        !isGuide &&
        !isAdminEmail(signedInEmail) &&
        !isMetepecEmail(signedInEmail) &&
        !isGmailEmail(signedInEmail)
      ) {
        await signOut(getFirebaseAuth());
        window.alert("Inicia sesión con una cuenta @gmail.com, una cuenta institucional @metepec.mx o una cuenta registrada como guía.");
        return;
      }

      window.localStorage.setItem(
        "metepec-session",
        JSON.stringify({ email: signedInEmail, provider: "password", ...(isGuide ? { role: "guide" } : {}) }),
      );
      window.dispatchEvent(new Event("sessionchange"));
      router.push(
        isGuide
          ? "/guia"
          : isAdminEmail(signedInEmail)
          ? "/admin"
          : isMetepecEmail(signedInEmail)
            ? "/mi-destino"
            : "/",
      );
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "auth/user-disabled"
      ) {
        window.alert("Tu solicitud para ser guía sigue pendiente de aprobación. Te avisaremos por correo cuando administración tome una decisión.");
        return;
      }
      window.alert("No se pudo iniciar sesión. Verifica tus datos y que la cuenta esté registrada en Firebase.");
    }
  };

  return (
    <main className="login-page login-form-page">
      <AppHeader active="inicio" />

      <section className="login-panel-wrap" aria-label="Inicio de sesion">
        <article className="login-form-card">
          <div className="login-form-heading">
            <h1>Metepec Digital</h1>
            <p>
              Inicia sesión como usuario, administrador, responsable de destino o guía de recorridos.
            </p>
          </div>

          <form className="access-form" onSubmit={handleManualLogin}>
            <label>
              Correo electronico
              <input
                type="email"
                placeholder="tu@correo.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label>
              Contrasena
              <span className="password-field">
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  placeholder="Contrasena"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  aria-label={isPasswordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
                  aria-pressed={isPasswordVisible}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                >
                  <span aria-hidden="true" />
                </button>
              </span>
            </label>

            <div className="form-options">
              <label className="remember-option">
                <input type="checkbox" />
                Recordarme
              </label>
              <a href="#">Olvidaste tu contrasena?</a>
            </div>

            <button className="login-submit" type="submit">
              Entrar
              <span aria-hidden="true" />
            </button>
          </form>

          <div className="divider">
            <span />
            <p>o continua con</p>
            <span />
          </div>

          <button
            className="google-button"
            type="button"
            onClick={() => signInWithGoogle()}
            disabled={isGoogleLoading}
          >
            <span aria-hidden="true">G</span>
            {isGoogleLoading ? "Conectando..." : "Google"}
          </button>

          <p className="create-account">
            No tienes una cuenta? <Link href="/registro">Crear cuenta nueva</Link>
          </p>
          <p className="create-account">
            ¿Quieres ofrecer recorridos? <Link href="/registro-guia">Date de alta como guía</Link>
          </p>
        </article>

        <aside className="login-tradition-card">
          <Image
            src="/detalle-arbol-vida.png"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 320px"
          />
          <div>
            <h2>Vive la Tradicion</h2>
            <p>
              Recorre la raiz cultural de Metepec, conoce sus artesanos y
              descubre la historia viva del Arbol de la Vida.
            </p>
          </div>
        </aside>
      </section>

      <footer className="login-mini-footer">
        <small>&copy; 2024 Metepec Digital. Desarrollado por Tecnologia de Toluca</small>
      </footer>
    </main>
  );
}
