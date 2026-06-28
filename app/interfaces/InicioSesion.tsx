import Image from "next/image";
import Link from "next/link";
import AppHeader from "./AppHeader";

export default function InicioSesion() {
  return (
    <main className="login-page login-form-page">
      <AppHeader active="inicio" />

      <section className="login-panel-wrap" aria-label="Inicio de sesion">
        <article className="login-form-card">
          <div className="login-form-heading">
            <h1>Metepec Digital</h1>
            <p>
              Bienvenido de nuevo. Ingresa tus datos para acceder.
            </p>
          </div>

          <form className="access-form" action="#">
            <label>
              Correo electronico
              <input
                type="email"
                placeholder="tu@correo.com"
                autoComplete="email"
              />
            </label>

            <label>
              Contrasena
              <span className="password-field">
                <input
                  type="password"
                  placeholder="Contrasena"
                  autoComplete="current-password"
                />
                <button type="button" aria-label="Mostrar contrasena">
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

          <button className="google-button" type="button">
            <span aria-hidden="true">G</span>
            Google
          </button>

          <p className="create-account">
            No tienes una cuenta? <Link href="/registro">Crear cuenta nueva</Link>
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
