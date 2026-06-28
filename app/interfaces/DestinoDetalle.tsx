import Image from "next/image";
import AppHeader from "./AppHeader";

const gallery = [
  { kind: "main", className: "destination-photo-main" },
  { kind: "hands", className: "destination-photo-hands" },
  { kind: "facade", className: "destination-photo-facade" },
  { kind: "museum", className: "destination-photo-museum" },
];

const tabs = ["Patrimonio Cultural", "Piezas de Coleccion", "Talleres en Vivo"];

export default function DestinoDetalle() {
  return (
    <main className="destination-page">
      <AppHeader active="destinos" />

      <section className="destination-shell">
        <div className="destination-gallery">
          {gallery.map((item) => (
            <div className={`destination-photo ${item.className}`} key={item.kind}>
              {item.kind === "main" ? (
                <Image
                  src="/detalle-arbol-vida.png"
                  alt="Arbol de la Vida artesanal en barro"
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 48vw"
                />
              ) : null}
            </div>
          ))}
        </div>

        <section className="destination-content-grid">
          <article className="destination-detail">
            <div className="destination-title-row">
              <div>
                <h1>Taller de Barro &quot;El Arbol de la Vida&quot;</h1>
                <p>5 Calle Arrieros #24, Barrio del Espiritu Santo, Metepec</p>
              </div>
              <div className="destination-rating">
                <strong>4.9</strong>
                <span>(128 resenas)</span>
              </div>
            </div>

            <div className="detail-section">
              <h2>Sobre el Artesano</h2>
              <p>
                Dirigido por el Maestro Antonio Tiburcio Soteno, este taller es
                un santuario de la tradicion metepequense. Con mas de 40 anos
                de trayectoria, la familia Soteno ha perfeccionado la tecnica
                del &quot;Arbol de la Vida&quot;, creando piezas que hoy se exhiben
                en museos de Londres, Paris y Nueva York.
              </p>
              <p>
                Cada obra cuenta una historia unica, moldeada a mano y pintada
                con pigmentos naturales. Aqui podras conocer el proceso,
                explorar la historia del barro y ubicar el taller para planear
                tu visita.
              </p>
            </div>

            <div className="detail-tabs" aria-label="Temas del destino">
              {tabs.map((tab) => (
                <button type="button" key={tab}>
                  {tab}
                </button>
              ))}
            </div>
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
                  <strong>Barrio del Espiritu Santo</strong>
                  5 Calle Arrieros #24
                </p>
              </div>
              <div>
                <span className="location-icon location-icon-clock" />
                <p>
                  <strong>Lunes a Sabado</strong>
                  10:00 AM - 6:00 PM
                </p>
              </div>
              <div>
                <span className="location-icon location-icon-ticket" />
                <p>
                  <strong>Entrada</strong>
                  Gratuita
                </p>
              </div>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
