import type { NextRequest } from "next/server";
import { getFirebaseAdminFirestore } from "../../../../lib/firebaseAdmin";
import { GUIDE_PROFILES_COLLECTION, type GuideProfile } from "../../../../lib/guides";
import { getRequestErrorResponse, getVerifiedUser, requireGuide, RequestAuthError } from "../../../../lib/requestAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getVerifiedUser(request);
    requireGuide(user);
    const profile = await getFirebaseAdminFirestore()
      .collection(GUIDE_PROFILES_COLLECTION)
      .doc(user.uid)
      .get();
    if (!profile.exists) {
      throw new RequestAuthError("No se encontró el perfil asociado a esta cuenta de guía.", 404);
    }

    return Response.json(
      { guide: { ...profile.data(), uid: profile.id } as GuideProfile },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
