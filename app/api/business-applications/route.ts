import { FieldValue } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import { NextRequest } from "next/server";
import {
  BUSINESS_APPLICATIONS_COLLECTION,
  businessCategories,
  type BusinessApplication,
} from "../../../lib/businessApplications";
import { getFirebaseAdminFirestore } from "../../../lib/firebaseAdmin";
import {
  getRequestErrorResponse,
  getVerifiedUser,
  requireAdmin,
} from "../../../lib/requestAuth";
import { isInsideMetepec } from "../../../lib/metepecBoundary";
import {
  emailFailureNotice,
  getAdminNotificationsEmail,
  newBusinessApplicationEmailContent,
  sendEmail,
} from "../../../lib/email";

export const runtime = "nodejs";

function toApplication(
  id: string,
  data: DocumentData,
): BusinessApplication {
  const createdAt =
    data.createdAt && typeof data.createdAt.toDate === "function"
      ? data.createdAt.toDate().toISOString()
      : new Date(0).toISOString();

  return {
    id,
    businessName: data.businessName,
    category: data.category,
    description: data.description,
    address: data.address,
    phone: data.phone,
    hours: data.hours,
    location: data.location,
    requesterEmail: data.requesterEmail,
    requesterName: data.requesterName,
    status: data.status,
    adminResponse: data.adminResponse ?? "",
    adminNotificationStatus: data.adminNotificationStatus,
    requesterNotificationStatus: data.requesterNotificationStatus,
    createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedUser(request);
    const firestore = getFirebaseAdminFirestore();
    const collection = firestore.collection(BUSINESS_APPLICATIONS_COLLECTION);
    const isAdmin = user.email?.trim().toLowerCase() === "admin@admin.com";
    if (isAdmin) {
      requireAdmin(user);
    }
    const snapshot = isAdmin
      ? await collection.get()
      : await collection.where("requesterUid", "==", user.uid).get();
    const applications = snapshot.docs
      .map((document) => toApplication(document.id, document.data()))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return Response.json({ applications });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return Response.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const businessName = typeof input.businessName === "string" ? input.businessName.trim() : "";
    const category = typeof input.category === "string" ? input.category.trim() : "";
    const description = typeof input.description === "string" ? input.description.trim() : "";
    const address = typeof input.address === "string" ? input.address.trim() : "";
    const phone = typeof input.phone === "string" ? input.phone.trim() : "";
    const hours = typeof input.hours === "string" ? input.hours.trim() : "";
    const location = input.location as { latitude?: unknown; longitude?: unknown } | undefined;
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);

    if (
      !businessName ||
      businessName.length > 120 ||
      !businessCategories.includes(category as (typeof businessCategories)[number]) ||
      !description ||
      description.length > 2000 ||
      !address ||
      address.length > 300 ||
      !phone ||
      phone.length > 40 ||
      !hours ||
      hours.length > 120
    ) {
      return Response.json(
        { error: "Completa los datos del negocio con valores válidos." },
        { status: 400 },
      );
    }

    if (!isInsideMetepec(latitude, longitude)) {
      return Response.json(
        { error: "La ubicación seleccionada debe estar dentro del municipio de Metepec." },
        { status: 400 },
      );
    }

    const firestore = getFirebaseAdminFirestore();
    const collection = firestore.collection(BUSINESS_APPLICATIONS_COLLECTION);
    const previousApplications = await collection
      .where("requesterUid", "==", user.uid)
      .get();

    if (previousApplications.docs.some((document) => document.get("status") === "pending")) {
      return Response.json(
        { error: "Ya tienes una solicitud pendiente de revisión." },
        { status: 409 },
      );
    }

    const requesterEmail = user.email?.trim().toLowerCase();
    if (!requesterEmail) {
      return Response.json({ error: "No se encontró un correo válido para la solicitud." }, { status: 400 });
    }
    const requesterName = typeof user.name === "string" ? user.name : requesterEmail;
    const application = {
      businessName,
      category,
      description,
      address,
      phone,
      hours,
      location: { latitude, longitude },
      requesterUid: user.uid,
      requesterEmail,
      requesterName,
      status: "pending",
      adminResponse: "",
      createdAt: FieldValue.serverTimestamp(),
    };
    const document = await collection.add(application);

    let notificationWarning = "";
    try {
      await sendEmail({
        to: getAdminNotificationsEmail(),
        ...newBusinessApplicationEmailContent({
          businessName,
          category,
          description,
          address,
          phone,
          hours,
          requesterName,
          requesterEmail,
        }),
      });
      await document.update({ adminNotificationStatus: "sent" });
    } catch (error) {
      console.error("Could not send new business application email", error);
      notificationWarning = ` La solicitud quedó guardada, pero ${emailFailureNotice(error)}`;
      await document.update({ adminNotificationStatus: "failed" });
    }

    return Response.json(
      {
        applicationId: document.id,
        message: `Tu solicitud fue enviada a administración.${notificationWarning}`,
        notificationWarning: Boolean(notificationWarning),
      },
      { status: 201 },
    );
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
