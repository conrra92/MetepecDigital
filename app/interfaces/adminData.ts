import type { DestinationItem } from "./destinosData";

export const ADMIN_SESSION_EMAIL = "admin@admin.com";

export const destinationCategories = [
  { label: "Artesanias", value: "artesanias" },
  { label: "Cultura", value: "cultura" },
  { label: "Historia", value: "historia" },
  { label: "Precio", value: "precio" },
];

export type AdminDestinationInput = {
  name: string;
  location: string;
  categories: string[];
  requesterEmail: string;
};

export function isAdminEmail(email: string) {
  return email.trim().toLowerCase() === ADMIN_SESSION_EMAIL;
}

export function isGmailEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@gmail.com");
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "destino";
}

export function createAdminDestination(input: AdminDestinationInput): DestinationItem {
  const normalizedCategories = input.categories.length > 0 ? input.categories : ["cultura"];
  const slugBase = slugify(input.name);
  const email = input.requesterEmail.trim();

  return {
    id: `admin-${Date.now()}`,
    slug: `${slugBase}-${Date.now()}`,
    title: input.name.trim(),
    shortDescription: `Destino registrado por ${email}`,
    description: [
      `Destino turístico dado de alta por administración para la solicitud de ${email}.`,
      `Ubicado en ${input.location.trim()} y clasificado como ${normalizedCategories.join(", ")}.`,
    ],
    address: input.location.trim(),
    neighborhood: input.location.trim(),
    hours: "Por confirmar",
    entryFee: "Por confirmar",
    rating: 0,
    reviewsCount: 0,
    tags: normalizedCategories,
    photos: ["/metepec-hero.png"],
    comments: [],
    ownerType: "negocio",
    ownerEmail: email,
    requesterEmail: email,
  };
}
