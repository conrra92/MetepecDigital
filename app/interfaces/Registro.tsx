"use client";

import Image from "next/image";
import Link from "next/link";
import AppHeader from "./AppHeader";
import { useGoogleSignIn } from "./useGoogleSignIn";

export default function Registro() {
  const { signInWithGoogle, isGoogleLoading } = useGoogleSignIn();

  return (
    <main className="register-page">
      <AppHeader active="inicio" />

      <section className="register-shell" aria-label="Registro de usuario">
        <aside className="register-story-panel">
          <Image
            src="/detalle-arbol-vida.png"
            alt=""
            fill
            priority
            sizes="(max-width: 760px) 100vw, 390px"
          />
          <div className="register-brand-copy">
            <h1>Metepec Digital</h1>
            <p>
              Conecta la magia artesanal del Árbol de la Vida y camina por el
              corazón cultural del Estado de México.
            </p>
          </div>

          <blockquote>
            <span aria-hidden="true">“</span>
            <p>
              La alfarería no es solo barro, es la historia de nuestras manos.
            </p>
            <cite>Artesano local, Metepec</cite>
          </blockquote>
        </aside>

        <article className="register-form-card">
          <div className="register-heading">
            <h2>Crea tu cuenta</h2>
            <p>Únete a la comunidad digital de nuestro pueblo mágico.</p>
          </div>

          <form className="register-form" action="#">
            <label>
              Nombre completo
              <input type="text" placeholder="Ana Pérez" autoComplete="name" />
            </label>

            <label>
              Correo electrónico
              <input
                type="email"
                placeholder="ana@ejemplo.com"
                autoComplete="email"
              />
            </label>

            <div className="register-two-cols">
              <label>
                Contraseña
                <input
                  type="password"
                  placeholder="Contraseña"
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirmar
                <input
                  type="password"
                  placeholder="Confirmar"
                  autoComplete="new-password"
                />
              </label>
            </div>

            <label className="terms-option">
              <input type="checkbox" />
              Acepto los Términos del Servicio y el Aviso de Privacidad de
              Metepec Digital.
            </label>

            <button className="register-submit" type="submit">
              Crear cuenta
              <span aria-hidden="true" />
            </button>
          </form>

          <div className="register-divider">
            <span />
            <p>o continúa con</p>
            <span />
          </div>

          <button
            className="register-google"
            type="button"
            onClick={() => signInWithGoogle()}
            disabled={isGoogleLoading}
          >
            <span aria-hidden="true">G</span>
            {isGoogleLoading ? "Conectando..." : "Google"}
          </button>

          <p className="register-login-link">
            ¿Ya tienes una cuenta? <Link href="/login">Inicia sesión</Link>
          </p>
        </article>
      </section>

      <footer className="register-mini-footer">
        <small>&copy; 2024 Metepec Digital. Desarrollado por Tecnología de Toluca</small>
      </footer>
    </main>
  );
}
