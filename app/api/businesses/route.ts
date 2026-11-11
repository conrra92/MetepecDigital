import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { APPROVED_BUSINESSES_COLLECTION } from "../../../lib/businessApplications";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../../../lib/firebaseAdmin";
import {
  getRequestErrorResponse,
  getVerifiedUser,
  requireAdmin,
  RequestAuthError,
} from "../../../lib/requestAuth";
import { isMetepecEmail } from "../../../lib/businessApplications";
import { isCloudinaryImageUrl, uploadDataUrlToCloudinary } from "../../../lib/cloudinary";

export const runtime = "nodejs";
const MAX_PHOTO_SIZE_BYTES = 650 * 1024;
const MAX_PHOTO_DATA_LENGTH = 900_000;

function isValidDestinationPhoto(photo: unknown): photo is string {
  if (typeof photo !== "string") {
    return false;
  }
  if (photo.startsWith("/") && !photo.startsWith("//") && !photo.includes("\\")) {
    return true;
  }
  if (isCloudinaryImageUrl(photo)) {
    return true;
  }
  const match = photo.match(/^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match?.[1] || photo.length > MAX_PHOTO_DATA_LENGTH) {
    return false;
  }
  const bytes = Buffer.from(match[1], "base64");
  const validPng = photo.startsWith("data:image/png;base64,") &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const validJpeg = photo.startsWith("data:image/jpeg;base64,") &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length > 0 &&
    bytes.length <= MAX_PHOTO_SIZE_BYTES &&
    bytes.toString("base64") === match[1] &&
    (validPng || validJpeg);
}

export async function GET() {
  try {
    const snapshot = await getFirebaseAdminFirestore()
      .collection(APPROVED_BUSINESSES_COLLECTION)
      .get();
    const businesses = snapshot.docs
      .map((document) => document.data())
      .sort((left, right) =>
        String(right.publishedAt ?? "").localeCompare(String(left.publishedAt ?? "")),
      );

    return Response.json({ businesses }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser(request);
    requireAdmin(user);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Los datos del destino no son válidos." }, { status: 400 });
    }

    const body = payload as Record<string, unknown>;
    const legacy = body.destination && typeof body.destination === "object" && !Array.isArray(body.destination)
      ? body.destination as Record<string, unknown>
      : {};
    const titleValue = body.name ?? legacy.title;
    const addressValue = body.location ?? legacy.address;
    const ownerEmailValue = body.ownerEmail ?? legacy.ownerEmail ?? legacy.requesterEmail;
    const tagsValue = body.categories ?? legacy.tags;
    const title = typeof titleValue === "string" ? titleValue.trim() : "";
    const address = typeof addressValue === "string" ? addressValue.trim() : "";
    const ownerEmail = typeof ownerEmailValue === "string" ? ownerEmailValue.trim().toLowerCase() : "";
    const tags = Array.isArray(tagsValue)
      ? tagsValue.filter((tag): tag is string => typeof tag === "string").slice(0, 10)
      : [];
    const shortDescription =
      typeof legacy.shortDescription === "string" && legacy.shortDescription.trim()
        ? legacy.shortDescription.trim().slice(0, 180)
        : `Destino turístico de ${title}.`;
    const description = Array.isArray(legacy.description) &&
      legacy.description.length > 0 &&
      legacy.description.length <= 10 &&
      legacy.description.every((line) => typeof line === "string" && line.trim() && line.length <= 2000)
      ? legacy.description.map((line: string) => line.trim())
      : [`Destino turístico ubicado en ${address}.`];
    const photos = Array.isArray(legacy.photos) &&
      legacy.photos.length > 0 &&
      legacy.photos.length <= 10 &&
      legacy.photos.every(isValidDestinationPhoto) &&
      legacy.photos.reduce((total: number, photo: string) => total + photo.length, 0) <= MAX_PHOTO_DATA_LENGTH
      ? legacy.photos
      : ["/metepec-hero.png"];
    const photoDescriptions = legacy.photoDescriptions &&
      typeof legacy.photoDescriptions === "object" &&
      !Array.isArray(legacy.photoDescriptions) &&
      Object.keys(legacy.photoDescriptions).every((key) => /^\d+$/.test(key)) &&
      Object.values(legacy.photoDescriptions).every((value) => typeof value === "string" && value.length <= 200)
      ? legacy.photoDescriptions
      : {};

    if (
      !title ||
      title.length > 120 ||
      !address ||
      address.length > 300 ||
      !isMetepecEmail(ownerEmail) ||
      (Array.isArray(tagsValue) && tagsValue.some((tag) => typeof tag !== "string"))
    ) {
      return Response.json(
        { error: "Completa un nombre y una ubicación válidos, y asigna una cuenta @metepec.mx." },
        { status: 400 },
      );
    }
    if (
      legacy.photos !== undefined &&
      (!Array.isArray(legacy.photos) ||
        legacy.photos.length === 0 ||
        legacy.photos.length > 10 ||
        !legacy.photos.every(isValidDestinationPhoto) ||
        legacy.photos.reduce((total: number, photo: string) => total + photo.length, 0) > MAX_PHOTO_DATA_LENGTH)
    ) {
      return Response.json(
        { error: "Las imágenes existentes deben ser JPG, JPEG o PNG válidos y no superar el límite permitido." },
        { status: 400 },
      );
    }

    const auth = getFirebaseAdminAuth();
    const destinationAccount = await auth.getUserByEmail(ownerEmail).catch((error: unknown) => {
      if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
        throw new RequestAuthError("Crea primero la cuenta del establecimiento en Firebase Authentication.", 400);
      }
      throw error;
    });

    if (!destinationAccount.providerData.some((provider) => provider.providerId === "password")) {
      throw new RequestAuthError("La cuenta asignada debe tener habilitado el proveedor Correo/contraseña.", 400);
    }

    const firestore = getFirebaseAdminFirestore();
    const collection = firestore.collection(APPROVED_BUSINESSES_COLLECTION);
    const existingOwner = await collection.where("ownerEmail", "==", ownerEmail).limit(1).get();
    if (!existingOwner.empty) {
      throw new RequestAuthError("Esta cuenta ya está asignada a otro destino.", 409);
    }

    const id = randomUUID();
    const slugBase = title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "destino";
    const requestedSlug = typeof legacy.slug === "string" &&
      /^[a-z0-9-]{1,100}$/.test(legacy.slug)
      ? legacy.slug
      : "";
    const slug = requestedSlug || `${slugBase}-${id.slice(0, 8)}`;
    if (!(await collection.where("slug", "==", slug).limit(1).get()).empty) {
      throw new RequestAuthError("Ya existe un destino con este identificador en Firebase.", 409);
    }
    const storedPhotos = await Promise.all(
      photos.map((photo: string) =>
        photo.startsWith("data:image/")
          ? uploadDataUrlToCloudinary(
              photo,
              ["image/jpeg", "image/png"],
              MAX_PHOTO_SIZE_BYTES,
              "metepec/destinations",
            )
          : photo,
      ),
    );
    const business = {
      id,
      slug,
      title,
      shortDescription,
      description,
      address,
      neighborhood: address,
      hours: typeof legacy.hours === "string" ? legacy.hours.slice(0, 120) : "Por confirmar",
      entryFee: typeof legacy.entryFee === "string" ? legacy.entryFee.slice(0, 120) : "Por confirmar",
      rating: 0,
      reviewsCount: 0,
      tags: tags.length > 0 ? tags : ["Cultura"],
      photos: storedPhotos,
      photoDescriptions,
      comments: [],
      ownerType: "negocio",
      ownerEmail,
      category: "turistico",
      publishedAt: new Date().toISOString(),
    };

    await collection.doc(id).create(business);
    return Response.json({ business }, { status: 201 });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
