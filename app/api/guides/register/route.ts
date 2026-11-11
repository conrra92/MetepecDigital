import type { NextRequest } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../../../../lib/firebaseAdmin";
import { GUIDE_APPLICATIONS_COLLECTION } from "../../../../lib/guides";
import { isValidImageBuffer, uploadImageToCloudinary } from "../../../../lib/cloudinary";
import {
  emailFailureNotice,
  getAdminNotificationsEmail,
  newGuideApplicationEmailContent,
  sendEmail,
} from "../../../../lib/email";
import { getRequestErrorResponse, RequestAuthError } from "../../../../lib/requestAuth";

export const runtime = "nodejs";

const MAX_PHOTO_SIZE_BYTES = 650 * 1024;
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export async function POST(request: NextRequest) {
  let createdUid = "";
  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const plate = String(formData.get("plate") ?? "").trim().toUpperCase();
    const model = String(formData.get("model") ?? "").trim();
    const vehicleYear = Number(formData.get("vehicleYear"));
    const photo = formData.get("vehiclePhoto");

    if (
      !name || name.length > 120 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      password.length < 8 || password.length > 128 ||
      !/^[A-Z0-9 -]{3,15}$/.test(plate) ||
      !model || model.length > 100 ||
      !Number.isInteger(vehicleYear) || vehicleYear < 1980 || vehicleYear > new Date().getFullYear() + 1
    ) {
      return Response.json({ error: "Revisa los datos del guía y de su vehículo." }, { status: 400 });
    }

    if (!(photo instanceof File) || !SUPPORTED_IMAGE_TYPES.includes(photo.type as typeof SUPPORTED_IMAGE_TYPES[number])) {
      return Response.json({ error: "Sube una foto JPG, PNG o WebP del vehículo." }, { status: 400 });
    }
    if (photo.size === 0 || photo.size > MAX_PHOTO_SIZE_BYTES) {
      return Response.json({ error: "La foto del vehículo no debe superar 650 KB." }, { status: 400 });
    }

    const imageBytes = Buffer.from(await photo.arrayBuffer());
    if (!isValidImageBuffer(imageBytes, photo.type as typeof SUPPORTED_IMAGE_TYPES[number])) {
      return Response.json({ error: "El archivo no contiene una imagen válida." }, { status: 400 });
    }

    const firestore = getFirebaseAdminFirestore();
    const applications = firestore.collection(GUIDE_APPLICATIONS_COLLECTION);
    const pendingApplication = await applications
      .where("email", "==", email)
      .where("status", "in", ["pending", "processing"])
      .limit(1)
      .get();
    if (!pendingApplication.empty) {
      throw new RequestAuthError("Ya existe una solicitud pendiente para ese correo electrónico.", 409);
    }

    const auth = getFirebaseAdminAuth();
    const existing = await auth.getUserByEmail(email).catch((error: unknown) => {
      if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
        return null;
      }
      throw error;
    });
    if (existing) {
      throw new RequestAuthError("Ya existe una cuenta con ese correo electrónico.", 409);
    }

    const vehiclePhotoUrl = await uploadImageToCloudinary(
      imageBytes,
      photo.type as typeof SUPPORTED_IMAGE_TYPES[number],
      "metepec/guides",
    );
    const account = await auth.createUser({ email, password, displayName: name, disabled: true });
    createdUid = account.uid;
    const application = {
      uid: account.uid,
      email,
      name,
      plate,
      vehicleYear,
      model,
      vehiclePhotoUrl,
      status: "pending" as const,
      adminResponse: "",
      createdAt: new Date().toISOString(),
    };
    await applications.add(application);
    createdUid = "";

    let notificationWarning = "";
    try {
      await sendEmail({
        to: getAdminNotificationsEmail(),
        ...newGuideApplicationEmailContent(name, email, plate, model, vehicleYear),
      });
    } catch (error) {
      console.error("Could not send new guide application email", error);
      notificationWarning = ` La solicitud quedó guardada, pero ${emailFailureNotice(error)}`;
    }

    return Response.json({
      message: `Tu solicitud quedó registrada y está pendiente de aprobación.${notificationWarning}`,
      notificationWarning: Boolean(notificationWarning),
    }, { status: 201 });
  } catch (error) {
    if (createdUid) {
      await getFirebaseAdminAuth().deleteUser(createdUid).catch((rollbackError: unknown) => {
        console.error("Could not roll back incomplete guide registration", rollbackError);
      });
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "auth/email-already-exists"
    ) {
      return Response.json({ error: "Ya existe una cuenta con ese correo electrónico." }, { status: 409 });
    }
    return getRequestErrorResponse(error);
  }
}
