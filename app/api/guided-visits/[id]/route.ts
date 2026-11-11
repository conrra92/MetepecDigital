import type { NextRequest } from "next/server";
import { getFirebaseAdminFirestore } from "../../../../lib/firebaseAdmin";
import { GUIDED_VISITS_COLLECTION, GUIDE_PROFILES_COLLECTION } from "../../../../lib/guides";
import {
  getRequestErrorResponse,
  getVerifiedUser,
  requireGuide,
  RequestAuthError,
} from "../../../../lib/requestAuth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getVerifiedUser(request);
    requireGuide(user);
    const { id } = await context.params;
    if (!/^[a-f0-9]{64}$/.test(id)) {
      return Response.json({ error: "La solicitud de viaje no es válida." }, { status: 400 });
    }

    const firestore = getFirebaseAdminFirestore();
    const visitRef = firestore.collection(GUIDED_VISITS_COLLECTION).doc(id);
    const profileRef = firestore.collection(GUIDE_PROFILES_COLLECTION).doc(user.uid);
    const acceptedVisit = await firestore.runTransaction(async (transaction) => {
      const [visitSnapshot, profileSnapshot] = await Promise.all([
        transaction.get(visitRef),
        transaction.get(profileRef),
      ]);
      if (!profileSnapshot.exists) {
        throw new RequestAuthError("No se encontró el perfil de guía asociado a esta cuenta.", 403);
      }
      if (!visitSnapshot.exists) {
        throw new RequestAuthError("No se encontró la solicitud de viaje.", 404);
      }
      if (visitSnapshot.get("status") !== "pending") {
        throw new RequestAuthError("Este viaje ya fue aceptado por otro guía o ya no está disponible.", 409);
      }

      const profile = profileSnapshot.data();
      if (!profile) {
        throw new RequestAuthError("No se encontró el perfil de guía asociado a esta cuenta.", 403);
      }
      const acceptedAt = new Date().toISOString();
      const acceptedBy = {
        uid: user.uid,
        name: profile.name,
        email: profile.email,
      };
      transaction.update(visitRef, { status: "accepted", acceptedBy, acceptedAt });
      return {
        id: visitSnapshot.id,
        ...visitSnapshot.data(),
        status: "accepted",
        acceptedBy,
        acceptedAt,
      };
    });

    return Response.json({ request: acceptedVisit, message: "Aceptaste el viaje." });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
