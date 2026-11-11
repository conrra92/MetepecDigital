import { NextRequest } from "next/server";
import {
  APPROVED_BUSINESSES_COLLECTION,
  BUSINESS_APPLICATIONS_COLLECTION,
  isMetepecEmail,
  type BusinessApplicationStatus,
} from "../../../../lib/businessApplications";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../../../../lib/firebaseAdmin";
import {
  getRequestErrorResponse,
  getVerifiedUser,
  requireAdmin,
  RequestAuthError,
} from "../../../../lib/requestAuth";
import {
  businessApplicationDecisionEmailContent,
  emailFailureNotice,
  sendEmail,
} from "../../../../lib/email";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireExistingDestinationAccount(email: string) {
  const auth = getFirebaseAdminAuth();

  try {
    const user = await auth.getUserByEmail(email);
    if (!user.providerData.some((provider) => provider.providerId === "password")) {
      throw new RequestAuthError(
        "La cuenta asignada debe tener habilitado el proveedor Correo/contraseña de Firebase.",
        400,
      );
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "auth/user-not-found") {
      throw new RequestAuthError(
        "Antes de aprobar, el administrador debe crear esta cuenta @metepec.mx en Firebase Authentication.",
        400,
      );
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getVerifiedUser(request);
    requireAdmin(user);

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
    const status = input.status;
    const adminResponse =
      typeof input.adminResponse === "string" ? input.adminResponse.trim() : "";
    const destinationEmail =
      typeof input.destinationEmail === "string" ? input.destinationEmail.trim().toLowerCase() : "";

    if (
      (status !== "approved" && status !== "rejected") ||
      !adminResponse ||
      adminResponse.length > 2000 ||
      (status === "approved" && !isMetepecEmail(destinationEmail))
    ) {
      return Response.json(
        {
          error: status === "approved"
            ? "Para aprobar, asigna una cuenta @metepec.mx creada en Firebase y escribe una respuesta de hasta 2000 caracteres."
            : "Selecciona un resultado y escribe una respuesta de hasta 2000 caracteres.",
        },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const firestore = getFirebaseAdminFirestore();
    const applicationRef = firestore
      .collection(BUSINESS_APPLICATIONS_COLLECTION)
      .doc(id);
    const applicationSnapshot = await applicationRef.get();

    if (!applicationSnapshot.exists) {
      return Response.json({ error: "No se encontró la solicitud." }, { status: 404 });
    }

    const application = applicationSnapshot.data();
    if (application?.status !== "pending") {
      return Response.json(
        { error: "La solicitud ya fue evaluada y no puede volver a procesarse." },
        { status: 409 },
      );
    }

    if (status === "approved") {
      await requireExistingDestinationAccount(destinationEmail);
      const existingDestinationAccount = await getFirebaseAdminFirestore()
        .collection(APPROVED_BUSINESSES_COLLECTION)
        .where("ownerEmail", "==", destinationEmail)
        .limit(1)
        .get();
      if (!existingDestinationAccount.empty) {
        throw new RequestAuthError("Esta cuenta ya está asignada a otro destino.", 409);
      }

      const slug = `${application.businessName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60)}-${id.slice(0, 8)}`;
      const categoryMap: Record<string, string> = {
        "Alojamiento": "turistico",
        "Artesanías": "artesanias",
        "Cultura": "historico",
        "Gastronomía": "gastronomia",
        "Servicios": "turistico",
        "Otro": "turistico",
      };

      await firestore
        .collection(APPROVED_BUSINESSES_COLLECTION)
        .doc(id)
        .set({
          id,
          slug,
          title: application.businessName,
          shortDescription: application.description.slice(0, 180),
          description: [application.description],
          address: application.address,
          contactPhone: application.phone,
          neighborhood: application.address,
          hours: application.hours,
          entryFee: "Por confirmar",
          rating: 0,
          reviewsCount: 0,
          tags: [application.category],
          photos: ["/metepec-hero.png"],
          comments: [],
          ownerType: "negocio",
          ownerEmail: destinationEmail,
          requesterEmail: application.requesterEmail,
          location: application.location,
          category: categoryMap[application.category] ?? "turistico",
          publishedAt: new Date().toISOString(),
        });
    }

    await applicationRef.update({
      status: status as BusinessApplicationStatus,
      adminResponse,
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.email,
    });

    let notificationWarning = "";
    try {
      const requesterEmail =
        typeof application?.requesterEmail === "string" ? application.requesterEmail : "";
      if (!requesterEmail) {
        throw new RequestAuthError("No se encontró el correo del solicitante para enviar la respuesta.", 400);
      }
      await sendEmail({
        to: requesterEmail,
        ...businessApplicationDecisionEmailContent(
          application?.businessName ?? "tu negocio",
          status,
          adminResponse,
          status === "approved" ? destinationEmail : "",
        ),
      });
      await applicationRef.update({ requesterNotificationStatus: "sent" });
    } catch (error) {
      console.error("Could not send business application decision email", error);
      notificationWarning = ` ${emailFailureNotice(error)}`;
      await applicationRef.update({ requesterNotificationStatus: "failed" });
    }

    return Response.json({
      message: status === "approved"
        ? `Solicitud aprobada y publicada. La cuenta ${destinationEmail} quedó asignada para modificar este destino.${notificationWarning}`
        : `Solicitud rechazada.${notificationWarning}`,
      notificationWarning: Boolean(notificationWarning),
    });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
