import type { NextRequest } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../../../../lib/firebaseAdmin";
import {
  GUIDE_APPLICATIONS_COLLECTION,
  GUIDE_PROFILES_COLLECTION,
  type GuideApplicationStatus,
  type GuideProfile,
} from "../../../../lib/guides";
import {
  emailFailureNotice,
  guideApplicationEmailContent,
  sendEmail,
} from "../../../../lib/email";
import {
  getRequestErrorResponse,
  getVerifiedUser,
  requireAdmin,
  RequestAuthError,
} from "../../../../lib/requestAuth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getVerifiedUser(request);
    requireAdmin(admin);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "El cuerpo de la solicitud debe ser JSON válido." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Los datos enviados no son válidos." }, { status: 400 });
    }

    const body = payload as Record<string, unknown>;
    const status = body.status;
    const adminResponse = typeof body.adminResponse === "string" ? body.adminResponse.trim() : "";
    if (
      (status !== "approved" && status !== "rejected") ||
      adminResponse.length > 2000
    ) {
      return Response.json({ error: "Selecciona aprobar o rechazar y escribe una respuesta de hasta 2000 caracteres." }, { status: 400 });
    }

    const { id } = await context.params;
    const firestore = getFirebaseAdminFirestore();
    const applicationRef = firestore.collection(GUIDE_APPLICATIONS_COLLECTION).doc(id);
    const application = await firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(applicationRef);
      if (!snapshot.exists) {
        throw new RequestAuthError("No se encontró la solicitud de guía.", 404);
      }
      if (snapshot.get("status") !== "pending") {
        throw new RequestAuthError("La solicitud ya fue evaluada o está siendo procesada.", 409);
      }
      const data = snapshot.data();
      if (!data) {
        throw new RequestAuthError("No se encontraron los datos de la solicitud.", 404);
      }
      transaction.update(applicationRef, {
        status: "processing" satisfies GuideApplicationStatus,
        reviewedBy: admin.email,
        reviewedAt: new Date().toISOString(),
      });
      return data;
    });

    const auth = getFirebaseAdminAuth();
    const profileRef = firestore.collection(GUIDE_PROFILES_COLLECTION).doc(application.uid);
    if (status === "approved") {
      try {
        const account = await auth.getUser(application.uid);
        const profile: GuideProfile = {
          uid: application.uid,
          email: application.email,
          name: application.name,
          plate: application.plate,
          vehicleYear: application.vehicleYear,
          model: application.model,
          vehiclePhotoUrl: application.vehiclePhotoUrl,
          createdAt: application.createdAt,
        };
        await auth.setCustomUserClaims(account.uid, { guide: true });
        await profileRef.create(profile);
        await auth.updateUser(account.uid, { disabled: false });
        await applicationRef.update({
          status: "approved",
          adminResponse,
          reviewedAt: new Date().toISOString(),
        });
      } catch (error) {
        await auth.updateUser(application.uid, { disabled: true }).catch((rollbackError: unknown) => {
          console.error("Could not disable guide account after failed approval", rollbackError);
        });
        await auth.setCustomUserClaims(application.uid, {}).catch((rollbackError: unknown) => {
          console.error("Could not clear guide claims after failed approval", rollbackError);
        });
        await profileRef.delete().catch((rollbackError: unknown) => {
          console.error("Could not remove guide profile after failed approval", rollbackError);
        });
        await applicationRef.update({ status: "pending" }).catch((rollbackError: unknown) => {
          console.error("Could not restore pending guide application", rollbackError);
        });
        throw error;
      }
    } else {
      await applicationRef.update({
        status: "rejected",
        adminResponse,
        reviewedAt: new Date().toISOString(),
      });
    }

    let notificationWarning = "";
    if (status === "rejected") {
      await auth.deleteUser(application.uid).catch((error: unknown) => {
        console.error("Could not remove rejected guide account", error);
        notificationWarning = " La solicitud fue rechazada, pero no se pudo eliminar la cuenta deshabilitada.";
      });
    }

    try {
      const email = guideApplicationEmailContent(application.name, status, adminResponse);
      await sendEmail({
        to: application.email,
        ...email,
      });
    } catch (error) {
      console.error("Could not send guide application decision email", error);
      notificationWarning += ` ${emailFailureNotice(error)}`;
    }
    await applicationRef.update({
      requesterNotificationStatus: notificationWarning ? "failed" : "sent",
      requesterNotificationError: notificationWarning || "",
    });

    return Response.json({
      message: `${status === "approved" ? "Solicitud aprobada; la cuenta ya puede iniciar sesión." : "Solicitud rechazada."}${notificationWarning}`,
      notificationWarning: Boolean(notificationWarning),
    });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
