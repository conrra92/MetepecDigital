import { getFirebaseAdminFirestore } from "../../../lib/firebaseAdmin";
import {
  GUIDE_PROFILES_COLLECTION,
  GUIDES_COLLECTION,
  type GuideProfile,
  type GuideRecord,
} from "../../../lib/guides";
import { getImageBufferFromDataUrl, uploadImageToCloudinary } from "../../../lib/cloudinary";
import {
  getVerifiedUser,
  getRequestErrorResponse,
  requireAdmin,
} from "../../../lib/requestAuth";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const MAX_PHOTO_SIZE_BYTES = 650 * 1024;
const MAX_PHOTO_DATA_URL_LENGTH = 900_000;

export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedUser(request);
    requireAdmin(user);

    const firestore = getFirebaseAdminFirestore();
    const [snapshot, profileSnapshot] = await Promise.all([
      firestore.collection(GUIDES_COLLECTION).get(),
      firestore.collection(GUIDE_PROFILES_COLLECTION).get(),
    ]);
    const guides = snapshot.docs
      .map((document) => ({ ...document.data(), id: document.id }) as GuideRecord)
      .sort((left, right) =>
        String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")),
      );
    const guideProfiles = profileSnapshot.docs
      .map((document) => ({ ...document.data(), uid: document.id }) as GuideProfile)
      .sort((left, right) =>
        String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")),
      );

    return Response.json({ guides, guideProfiles }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser(request);
    requireAdmin(user);

    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Los datos de la guía no son válidos." }, { status: 400 });
    }

    const body = payload as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const gender = typeof body.gender === "string" ? body.gender.trim() : "";
    const age = typeof body.age === "number" ? body.age : Number.NaN;
    const photoDataUrl =
      typeof body.photoDataUrl === "string" ? body.photoDataUrl : "";

    if (!name || name.length > 120 || !gender || gender.length > 80) {
      return Response.json(
        { error: "El nombre y el género son obligatorios y deben ser válidos." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(age) || age < 1 || age > 120) {
      return Response.json({ error: "La edad debe estar entre 1 y 120 años." }, { status: 400 });
    }

    const image = photoDataUrl.length <= MAX_PHOTO_DATA_URL_LENGTH
      ? getImageBufferFromDataUrl(
          photoDataUrl,
          ["image/jpeg", "image/png", "image/webp"],
          MAX_PHOTO_SIZE_BYTES,
        )
      : null;
    if (!image) {
      return Response.json(
        { error: "La foto debe ser JPG, PNG o WebP y no superar 650 KB." },
        { status: 400 },
      );
    }

    const photoUrl = await uploadImageToCloudinary(
      image.bytes,
      image.contentType,
      "metepec/guides",
    );
    const guideData = {
      name,
      age,
      gender,
      photoUrl,
      createdAt: new Date().toISOString(),
    };
    const document = await getFirebaseAdminFirestore()
      .collection(GUIDES_COLLECTION)
      .add(guideData);

    return Response.json(
      { guide: { id: document.id, ...guideData } satisfies GuideRecord },
      { status: 201 },
    );
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
