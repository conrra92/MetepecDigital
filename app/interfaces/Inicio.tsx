import Image from "next/image";
import AppHeader from "./AppHeader";

const categories = [
  { label: "Artesanias", value: "artesanias", icon: "craft" },
  { label: "Cultura", value: "cultura", icon: "culture" },
  { label: "Historia", value: "historia", icon: "history" },
  { label: "Zona", value: "zona", icon: "zone" },
  { label: "Precio", value: "precio", icon: "price" },
];

const places = [
  {
    title: "Iglesia del Calvario",
    tags: ["Cultura", "Historia", "Panoramico"],
    image: "calvario",
  },
  {
    title: "Museo del Barro",
    tags: ["Museo", "Artesania", "Educativo"],
    image: "museum",
  },
  {
    title: "Taller de Artesania",
    tags: ["Taller", "Artesania", "Local"],
    image: "workshop",
  },
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

export default function Inicio() {
  return (
    <main className="home-page">
      <AppHeader active="inicio" />

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

      <section className="places-section">
        <div className="category-tabs" aria-label="Filtros de busqueda">
          {categories.map((category) => (
            <button
              className="category-filter"
              type="button"
              key={category.value}
              data-filter={category.value}
              aria-pressed="false"
            >
              <span
                className={`filter-icon filter-icon-${category.icon}`}
                aria-hidden="true"
              />
              {category.label}
            </button>
          ))}
        </div>

        <div className="section-title-row">
          <div>
            <h2>Lugares mas visitados</h2>
            <p>
              Seleccion curada de los puntos mas emblematicos e historicos para
              visitar en Metepec.
            </p>
          </div>
          <a href="#">Ver todos</a>
        </div>

        <div className="places-grid">
          {places.map((place) => (
            <article className="place-card" key={place.title}>
              <div className={`place-image place-image-${place.image}`}>
                {place.image === "calvario" ? (
                  <Image
                    src="/metepec-hero.png"
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, 31vw"
                  />
                ) : null}
                <span className="rating-badge">4.9</span>
              </div>
              <div className="place-body">
                <h3>{place.title}</h3>
                <div className="tag-row">
                  {place.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <button type="button">Ver mas</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="reviews-section">
        <h2>Comentarios</h2>
        <div className="reviews-grid">
          {reviews.map((review) => (
            <article className="review-card" key={review.name}>
              <div className="review-author">
                <span>{review.initials}</span>
                <div>
                  <strong>{review.name}</strong>
                  <p className="stars" aria-label="Calificacion de cinco estrellas">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </p>
                </div>
              </div>
              <p>{review.text}</p>
            </article>
          ))}
        </div>
      </section>

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
