import { NextRequest } from "next/server";
import { ADMIN_EMAIL, APPROVED_BUSINESSES_COLLECTION, isMetepecEmail } from "../../../../lib/businessApplications";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../../../../lib/firebaseAdmin";
import {
  getRequestErrorResponse,
  getVerifiedUser,
  requireAdmin,
  requireDestinationOwner,
  RequestAuthError,
} from "../../../../lib/requestAuth";
import { isCloudinaryImageUrl, uploadDataUrlToCloudinary } from "../../../../lib/cloudinary";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const MAX_PHOTO_DATA_LENGTH = 900_000;
const MAX_PHOTO_SIZE_BYTES = 650 * 1024;

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
  if (!match?.[1]) {
    return false;
  }

  const bytes = Buffer.from(match[1], "base64");
  const isPng = photo.startsWith("data:image/png;base64,") &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = photo.startsWith("data:image/jpeg;base64,") &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

  return bytes.length > 0 &&
    bytes.length <= MAX_PHOTO_SIZE_BYTES &&
    bytes.toString("base64") === match[1] &&
    (isPng || isJpeg);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getVerifiedUser(request);
    const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    if (!isAdmin) {
      requireDestinationOwner(user);
    }

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
    const { id } = await context.params;
    const destinationRef = getFirebaseAdminFirestore()
      .collection(APPROVED_BUSINESSES_COLLECTION)
      .doc(id);
    const destination = await destinationRef.get();

    if (!destination.exists) {
      return Response.json({ error: "No se encontró el destino." }, { status: 404 });
    }

    if (isAdmin) {
      requireAdmin(user);
      const ownerEmail =
        typeof body.ownerEmail === "string" ? body.ownerEmail.trim().toLowerCase() : "";
      if (!isMetepecEmail(ownerEmail)) {
        return Response.json({ error: "Asigna una cuenta institucional @metepec.mx válida." }, { status: 400 });
      }

      const auth = getFirebaseAdminAuth();
      const ownerAccount = await auth.getUserByEmail(ownerEmail).catch((error: unknown) => {
        if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
          throw new RequestAuthError("Crea primero la cuenta del establecimiento en Firebase Authentication.", 400);
        }
        throw error;
      });
      if (!ownerAccount.providerData.some((provider) => provider.providerId === "password")) {
        throw new RequestAuthError("La cuenta asignada debe tener habilitado el proveedor Correo/contraseña.", 400);
      }

      const existingOwner = await getFirebaseAdminFirestore()
        .collection(APPROVED_BUSINESSES_COLLECTION)
        .where("ownerEmail", "==", ownerEmail)
        .limit(2)
        .get();
      if (existingOwner.docs.some((document) => document.id !== id)) {
        throw new RequestAuthError("Esta cuenta ya está asignada a otro destino.", 409);
      }

      await destinationRef.update({ ownerEmail });
      return Response.json({ message: `La cuenta ${ownerEmail} quedó asignada a este destino.` });
    }

    const shortDescription =
      typeof body.shortDescription === "string" ? body.shortDescription.trim() : "";
    const description = body.description;
    const entryFee = typeof body.entryFee === "string" ? body.entryFee.trim() : "";
    const photos = body.photos;
    const photoDescriptions = body.photoDescriptions;

    if (
      !shortDescription ||
      shortDescription.length > 180 ||
      !Array.isArray(description) ||
      description.length === 0 ||
      description.length > 10 ||
      description.some((item) => typeof item !== "string" || !item.trim() || item.length > 2000) ||
      !entryFee ||
      entryFee.length > 120 ||
      !Array.isArray(photos) ||
      photos.length === 0 ||
      photos.length > 10 ||
      photos.some((photo) => !isValidDestinationPhoto(photo) || photo.length > MAX_PHOTO_DATA_LENGTH) ||
      photos.reduce<number>(
        (total, photo) => total + (typeof photo === "string" ? photo.length : 0),
        0,
      ) > MAX_PHOTO_DATA_LENGTH ||
      (photoDescriptions !== undefined &&
        (!photoDescriptions ||
          typeof photoDescriptions !== "object" ||
          Array.isArray(photoDescriptions) ||
          Object.keys(photoDescriptions).some((key) => !/^\d+$/.test(key)) ||
          Object.values(photoDescriptions).some(
            (value) => typeof value !== "string" || value.length > 200,
          )))
    ) {
      return Response.json(
        { error: "Revisa la descripción, el precio y las fotos del destino." },
        { status: 400 },
      );
    }

    if (destination.get("ownerEmail")?.trim().toLowerCase() !== user.email?.trim().toLowerCase()) {
      throw new RequestAuthError("Esta cuenta no está asignada para modificar este destino.", 403);
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

    await destinationRef.update({
      shortDescription,
      description: description.map((item: string) => item.trim()),
      entryFee,
      photos: storedPhotos,
      photoDescriptions: photoDescriptions ?? {},
      updatedAt: new Date().toISOString(),
    });

    return Response.json({ message: "Cambios guardados en el destino." });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
