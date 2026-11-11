import type { DocumentData } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { getFirebaseAdminFirestore } from "../../../lib/firebaseAdmin";
import { GUIDE_APPLICATIONS_COLLECTION, type GuideApplication } from "../../../lib/guides";
import { getRequestErrorResponse, getVerifiedUser, requireAdmin } from "../../../lib/requestAuth";

export const runtime = "nodejs";

function toApplication(id: string, data: DocumentData): GuideApplication {
  return {
    ...data,
    id,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : "",
    adminResponse: typeof data.adminResponse === "string" ? data.adminResponse : "",
  } as GuideApplication;
}

export async function GET(request: NextRequest) {
  try {
    requireAdmin(await getVerifiedUser(request));
    const snapshot = await getFirebaseAdminFirestore()
      .collection(GUIDE_APPLICATIONS_COLLECTION)
      .get();
    const applications = snapshot.docs
      .map((document) => toApplication(document.id, document.data()))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    return Response.json({ applications }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
