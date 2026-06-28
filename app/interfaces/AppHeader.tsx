import Link from "next/link";

type AppHeaderProps = {
  active?: "inicio" | "destinos";
};

const navItems = [
  { id: "inicio", label: "Inicio", href: "/" },
  { id: "destinos", label: "Destinos", href: "/destinos" },
  { id: "mapa", label: "Mapa", href: "#" },
  { id: "favoritos", label: "Favoritos", href: "#" },
];

export default function AppHeader({ active = "inicio" }: AppHeaderProps) {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label="Metepec Digital">
        <span className="brand-icon" aria-hidden="true" />
        <span>Metepec Digital</span>
      </Link>

      <nav className="main-nav" aria-label="Navegacion principal">
        {navItems.map((item) => (
          <Link
            className={item.id === active ? "active" : ""}
            href={item.href}
            key={item.id}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="auth-actions">
        <Link className="login-link" href="/login">
          Iniciar sesión
        </Link>
        <Link className="signup-button" href="/registro">
          Registrarse
        </Link>
        <Link className="session-avatar" href="/login" aria-label="Sesion iniciada como usuario r">
          r
        </Link>
      </div>
    </header>
  );
}
