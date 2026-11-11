"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "../../lib/firebaseClient";
import { isAdminEmail } from "./adminData";
import { isMetepecEmail } from "../../lib/businessApplications";

type AppHeaderProps = {
  active?: "inicio" | "destinos" | "mapa";
};

type SessionProfile = {
  email: string;
  provider: "google" | "password" | "manual";
  role?: string;
};

const SESSION_STORAGE_KEY = "metepec-session";

const navItems = [
  { id: "inicio", label: "Inicio", href: "/" },
  { id: "destinos", label: "Destinos", href: "/destinos" },
  { id: "mapa", label: "Mapa", href: "/mapa" },
];

export default function AppHeader({ active = "inicio" }: AppHeaderProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [sessionProfile, setSessionProfile] = useState<SessionProfile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const readSession = () => {
      const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

      if (!storedSession) {
        setSessionProfile(null);
        return;
      }

      try {
        setSessionProfile(JSON.parse(storedSession) as SessionProfile);
      } catch {
        setSessionProfile(null);
      }
    };

    readSession();

    window.addEventListener("storage", readSession);
    window.addEventListener("focus", readSession);

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("storage", readSession);
      window.removeEventListener("focus", readSession);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    setIsMenuOpen(false);

    try {
      await signOut(getFirebaseAuth());
    } catch (error) {
      console.error("Could not sign out of Firebase Authentication", error);
    } finally {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.dispatchEvent(new Event("sessionchange"));
      setSessionProfile(null);
      router.replace("/");
      router.refresh();
    }
  };

  const isGuide = sessionProfile?.role === "guide";
  const visibleNavItems = isGuide
    ? [{ id: "inicio", label: "Panel de guía", href: "/guia" }]
    : sessionProfile && isMetepecEmail(sessionProfile.email)
    ? [{ id: "inicio", label: "Mi destino", href: "/mi-destino" }]
    : navItems;
  const homeHref = isGuide
    ? "/guia"
    : sessionProfile && isMetepecEmail(sessionProfile.email)
    ? "/mi-destino"
    : "/";
  const isAdmin = sessionProfile ? isAdminEmail(sessionProfile.email) : false;

  return (
    <header className="site-header">
      <Link className="site-brand" href={homeHref} aria-label="Metepec Digital">
        <span className="brand-icon" aria-hidden="true" />
        <span>Metepec Digital</span>
      </Link>

      <nav className="main-nav" aria-label="Navegacion principal">
        {visibleNavItems.map((item) => (
          <Link
            className={item.id === active ? "active" : ""}
            href={item.href}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="auth-actions" ref={menuRef}>
        {sessionProfile ? (
          <div className="auth-menu-wrap">
            <button
              className="session-avatar"
              type="button"
              aria-label={`Sesion iniciada con ${sessionProfile.email}`}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              title={sessionProfile.email}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              <span className="session-avatar-icon" aria-hidden="true">
                <span className="session-avatar-head" />
                <span className="session-avatar-body" />
              </span>
            </button>

            {isMenuOpen ? (
              <div
                className="session-menu-backdrop"
                role="presentation"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="session-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                  <div className="session-menu-header">
                    <span className="session-menu-badge">
                      {isAdmin ? "Información de administrador" : isGuide ? "Información de guía" : "Información de usuario"}
                    </span>
                    <p>{sessionProfile.email}</p>
                  </div>

                  {isAdmin ? (
                    <>
                      <Link
                        className="session-menu-business-link"
                        href="/admin#solicitudes-de-negocio"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Ver solicitudes de negocio
                      </Link>
                      <Link
                        className="session-menu-business-link"
                        href="/admin/destinos"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Alta de destinos
                      </Link>
                      <Link
                        className="session-menu-business-link"
                        href="/admin/guias"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Solicitudes de guía
                      </Link>
                    </>
                  ) : isGuide ? (
                    <>
                      <Link
                        className="session-menu-business-link"
                        href="/guia"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Solicitudes de viaje
                      </Link>
                      <Link
                        className="session-menu-business-link"
                        href="/guia/aceptados"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Viajes aceptados
                      </Link>
                    </>
                  ) : isMetepecEmail(sessionProfile.email) ? (
                    <Link
                      className="session-menu-business-link"
                      href="/mi-destino"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Administrar mi destino
                    </Link>
                  ) : (
                    <>
                      <Link
                        className="session-menu-business-link"
                        href="/mis-viajes"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Mis viajes
                      </Link>
                      <Link
                        className="session-menu-business-link"
                        href="/solicitar-negocio"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Solicitar alta de negocio
                      </Link>
                    </>
                  )}

                  <button className="session-logout" type="button" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Link className="login-link" href="/login">
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}
