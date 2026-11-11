export type DestinationComment = {
  id: string;
  author: string;
  text: string;
  rating: number;
};

export type DestinationCategory =
  | "turistico"
  | "historico"
  | "artesanias"
  | "gastronomia";

export type DestinationCoordinates = {
  x: number;
  y: number;
};

export type DestinationItem = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string[];
  address: string;
  contactPhone?: string;
  neighborhood: string;
  hours: string;
  entryFee: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
  photos: string[];
  photoDescriptions?: Record<string, string>;
  requesterEmail?: string;
  comments: DestinationComment[];
  ownerType: "negocio";
  ownerEmail?: string;
  category?: DestinationCategory;
  coordinates?: DestinationCoordinates;
  location?: {
    latitude: number;
    longitude: number;
  };
};

export function getDestinationByOwnerEmail(email: string, destinations: DestinationItem[]) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.includes("@")) {
    return undefined;
  }

  return destinations.find(
    (destination) => destination.ownerEmail?.trim().toLowerCase() === normalizedEmail,
  );
}

export function getDestinationAverageRating(destination: DestinationItem) {
  if (destination.comments.length === 0) {
    return destination.rating;
  }

  const totalRating = destination.comments.reduce(
    (sum, comment) => sum + comment.rating,
    0,
  );

  return totalRating / destination.comments.length;
}

export function sortDestinationsByAverageRating(destinations: DestinationItem[]) {
  return [...destinations].sort((left, right) => {
    const rightAverage = getDestinationAverageRating(right);
    const leftAverage = getDestinationAverageRating(left);

    if (rightAverage !== leftAverage) {
      return rightAverage - leftAverage;
    }

    return right.reviewsCount - left.reviewsCount;
  });
}

export const BUSINESS_DESTINATIONS_STORAGE_KEY = "metepec-business-destinations";

export async function fetchPublishedBusinessDestinations() {
  const response = await fetch("/api/businesses", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("No se pudieron cargar los negocios aprobados.");
  }

  const result = (await response.json()) as { businesses: DestinationItem[] };
  return result.businesses;
}

export const defaultBusinessDestinations: DestinationItem[] = [
  {
    id: "dest-01",
    slug: "taller-arbol-de-la-vida",
    title: "Taller de Barro El Arbol de la Vida",
    shortDescription: "Taller artesanal con piezas iconicas de Metepec y visitas guiadas.",
    description: [
      "Dirigido por artesanos locales con decadas de experiencia, este taller mantiene viva la tradicion del barro en Metepec.",
      "Encontraras exhibiciones, demostraciones de modelado y venta directa de piezas elaboradas a mano.",
    ],
    address: "5 Calle Arrieros #24",
    neighborhood: "Barrio del Espiritu Santo, Metepec",
    hours: "Lunes a Sabado 10:00 AM - 6:00 PM",
    entryFee: "Entrada gratuita",
    rating: 4.9,
    reviewsCount: 128,
    tags: ["Artesania", "Cultura", "Taller"],
    photos: ["/detalle-arbol-vida.png", "/metepec-hero.png", "/detalle-arbol-vida.png"],
    comments: [
      {
        id: "c-01",
        author: "Laura G.",
        text: "Excelente experiencia para conocer el proceso artesanal y comprar piezas unicas.",
        rating: 5,
      },
      {
        id: "c-02",
        author: "Hector M.",
        text: "Muy buena atencion y explicaciones claras de cada tecnica.",
        rating: 4,
      },
    ],
    ownerType: "negocio",
    category: "artesanias",
  },
  {
    id: "dest-02",
    slug: "museo-del-barro-vivo",
    title: "Museo del Barro Vivo",
    shortDescription: "Espacio cultural con exposiciones, historia del barro y obras contemporaneas.",
    description: [
      "Un recorrido por la evolucion de la ceramica metepequense desde sus origenes hasta expresiones actuales.",
      "Cuenta con salas tematicas, visitas para escuelas y una tienda con productos de artesanos locales.",
    ],
    address: "Av. Estado de Mexico #113",
    neighborhood: "Centro de Metepec",
    hours: "Martes a Domingo 9:00 AM - 5:00 PM",
    entryFee: "$40 MXN",
    rating: 4.7,
    reviewsCount: 86,
    tags: ["Museo", "Historia", "Cultura"],
    photos: ["/metepec-hero.png", "/detalle-arbol-vida.png"],
    comments: [
      {
        id: "c-03",
        author: "Valeria P.",
        text: "Las salas estan muy bien cuidadas y la curaduria es super interesante.",
        rating: 5,
      },
      {
        id: "c-04",
        author: "Jorge R.",
        text: "Perfecto para visitar en familia, hay actividades para ninos.",
        rating: 4,
      },
    ],
    ownerType: "negocio",
    category: "historico",
    coordinates: { x: 58, y: 62 },
  },
  {
    id: "dest-03",
    slug: "casa-artesanal-los-soles",
    title: "Casa Artesanal Los Soles",
    shortDescription: "Tienda y taller de ceramica decorativa con envios nacionales.",
    description: [
      "Negocio familiar enfocado en piezas de decoracion y ediciones especiales por temporada.",
      "Ofrecen experiencias cortas para pintar barro y personalizar recuerdos para eventos.",
    ],
    address: "Calle Comonfort #52",
    neighborhood: "Cabecera Municipal, Metepec",
    hours: "Lunes a Domingo 11:00 AM - 7:00 PM",
    entryFee: "Acceso libre",
    rating: 4.8,
    reviewsCount: 64,
    tags: ["Tienda", "Artesania", "Experiencia"],
    photos: ["/detalle-arbol-vida.png", "/metepec-hero.png"],
    comments: [
      {
        id: "c-05",
        author: "Ricardo M.",
        text: "Muy buenos precios y piezas bien terminadas.",
        rating: 5,
      },
    ],
    ownerType: "negocio",
    category: "artesanias",
  },
  {
    id: "dest-04",
    slug: "parque-los-remedios",
    title: "Parque de los Remedios",
    shortDescription: "Espacio recreativo y panoramico para recorrer Metepec con vistas del valle.",
    description: [
      "Un punto ideal para caminar, tomar fotografias y disfrutar de la vista panoramica de Metepec.",
      "El parque combina jardines, bancas y accesos para familias y visitantes que buscan una experiencia tranquila.",
    ],
    address: "Avenida de los Remedios #15",
    neighborhood: "Colonia Centro, Metepec",
    hours: "Lunes a Domingo 7:00 AM - 9:00 PM",
    entryFee: "Acceso libre",
    rating: 4.8,
    reviewsCount: 72,
    tags: ["Turismo", "Naturaleza", "Panoramica"],
    photos: ["/metepec-hero.png", "/detalle-arbol-vida.png"],
    comments: [
      {
        id: "c-06",
        author: "Diana L.",
        text: "Muy buen lugar para caminar y disfrutar de una vista hermosa del municipio.",
        rating: 5,
      },
    ],
    ownerType: "negocio",
    category: "turistico",
    coordinates: { x: 34, y: 38 },
  },
  {
    id: "dest-05",
    slug: "centro-historico-metepec",
    title: "Centro Histórico de Metepec",
    shortDescription: "Recorrido por calles, arquitectura y tradiciones que narran la historia del municipio.",
    description: [
      "El centro conserva vestigios culturales y espacios emblematicos del desarrollo urbano de Metepec.",
      "Es una zona perfecta para caminar, observar arquitectura y conocer la historia del lugar.",
    ],
    address: "Plaza Principal #8",
    neighborhood: "Centro Histórico, Metepec",
    hours: "Lunes a Domingo 8:00 AM - 8:00 PM",
    entryFee: "Acceso libre",
    rating: 4.9,
    reviewsCount: 91,
    tags: ["Historia", "Arquitectura", "Cultura"],
    photos: ["/detalle-arbol-vida.png", "/metepec-hero.png"],
    comments: [
      {
        id: "c-07",
        author: "Sergio H.",
        text: "Un paseo muy recomendable para entender la historia del municipio y sus calles tradicionales.",
        rating: 5,
      },
    ],
    ownerType: "negocio",
    category: "historico",
    coordinates: { x: 52, y: 53 },
  },
  {
    id: "dest-06",
    slug: "mirador-del-valle",
    title: "Mirador del Valle",
    shortDescription: "Punto de observacion con vistas panoramicas y una experiencia turística memorable.",
    description: [
      "Este mirador ofrece una vista privilegiada del valle de Toluca y del municipio de Metepec.",
      "Es una excelente opcion para fotografiar el atardecer y disfrutar de un recorrido turístico relajado.",
    ],
    address: "Carretera al Mirador #44",
    neighborhood: "Lomas del Valle, Metepec",
    hours: "Lunes a Domingo 9:00 AM - 7:00 PM",
    entryFee: "$30 MXN",
    rating: 4.7,
    reviewsCount: 59,
    tags: ["Turismo", "Mirador", "Panoramica"],
    photos: ["/metepec-hero.png", "/detalle-arbol-vida.png"],
    comments: [
      {
        id: "c-08",
        author: "Fabiola N.",
        text: "Las vistas son impresionantes y el atardecer se siente inolvidable.",
        rating: 5,
      },
    ],
    ownerType: "negocio",
    category: "turistico",
    coordinates: { x: 74, y: 30 },
  },
];

export function mergeDestinations(base: DestinationItem[], extra: DestinationItem[]) {
  const map = new Map<string, DestinationItem>();

  for (const item of base) {
    map.set(item.slug, item);
  }

  for (const item of extra) {
    map.set(item.slug, item);
  }

  return Array.from(map.values());
}

export function readStoredBusinessDestinations() {
  if (typeof window === "undefined") {
    return [] as DestinationItem[];
  }

  const rawData = window.localStorage.getItem(BUSINESS_DESTINATIONS_STORAGE_KEY);

  if (!rawData) {
    return [] as DestinationItem[];
  }

  try {
    const parsed = JSON.parse(rawData) as DestinationItem[];

    if (!Array.isArray(parsed)) {
      return [] as DestinationItem[];
    }

    return parsed.filter((item) => item?.ownerType === "negocio" && Boolean(item.slug));
  } catch {
    return [] as DestinationItem[];
  }
}

export function upsertStoredBusinessDestination(destination: DestinationItem) {
  if (typeof window === "undefined") {
    return;
  }

  const stored = readStoredBusinessDestinations();
  const index = stored.findIndex((item) => item.slug === destination.slug);

  if (index >= 0) {
    stored[index] = destination;
  } else {
    stored.push(destination);
  }

  window.localStorage.setItem(
    BUSINESS_DESTINATIONS_STORAGE_KEY,
    JSON.stringify(stored),
  );
  window.dispatchEvent(new Event("storage"));
}

export function removeStoredBusinessDestination(slug: string) {
  if (typeof window === "undefined") {
    return;
  }

  const updated = readStoredBusinessDestinations().filter((destination) => destination.slug !== slug);
  window.localStorage.setItem(BUSINESS_DESTINATIONS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("storage"));
}