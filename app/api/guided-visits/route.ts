import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { getFirebaseAdminFirestore } from "../../../lib/firebaseAdmin";
import { GUIDED_VISITS_COLLECTION, type GuidedVisitRequest } from "../../../lib/guides";
import { getRequestErrorResponse, getVerifiedUser, requireGuide } from "../../../lib/requestAuth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const destinationSlug = request.nextUrl.searchParams.get("destination");
    const collection = getFirebaseAdminFirestore().collection(GUIDED_VISITS_COLLECTION);

    if (destinationSlug) {
      if (!/^[a-z0-9-]{1,100}$/.test(destinationSlug)) {
        return Response.json({ error: "El destino solicitado no es válido." }, { status: 400 });
      }
      const snapshot = await collection.where("destinationSlug", "==", destinationSlug).get();
      const reservedVisits = snapshot.docs.map((document) => ({
        date: document.get("date"),
        time: document.get("time"),
      }));
      return Response.json({ reservedVisits }, { headers: { "Cache-Control": "no-store" } });
    }

    const user = await getVerifiedUser(request);
    let documents;
    if (user.guide === true) {
      requireGuide(user);
      const requestedStatus = request.nextUrl.searchParams.get("status");
      const snapshot = await collection.get();
      documents = snapshot.docs.filter((document) => {
        const data = document.data();
        if (requestedStatus === "accepted") {
          return data.status === "accepted" && data.acceptedBy?.uid === user.uid;
        }
        return data.status === "pending";
      });
    } else {
      const byUid = await collection.where("requesterUid", "==", user.uid).get();
      const byEmail = await collection
        .where("requesterEmail", "==", user.email!.trim().toLowerCase())
        .get();
      documents = Array.from(
        new Map([...byUid.docs, ...byEmail.docs].map((document) => [document.id, document])).values(),
      );
    }
    const requests = documents
      .map((document) => ({ ...document.data(), id: document.id }) as GuidedVisitRequest)
      .sort((left, right) =>
        `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
      );
    return Response.json({ requests }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getVerifiedUser(request);
    const payload: unknown = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return Response.json({ error: "Los datos de la solicitud no son válidos." }, { status: 400 });
    }

    const body = payload as Record<string, unknown>;
    const destinationSlug = typeof body.destinationSlug === "string" ? body.destinationSlug.trim() : "";
    const destinationTitle = typeof body.destinationTitle === "string" ? body.destinationTitle.trim() : "";
    const requesterName = typeof body.requesterName === "string" ? body.requesterName.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const time = typeof body.time === "string" ? body.time : "";
    const reunionLocation = typeof body.reunionLocation === "string" ? body.reunionLocation.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const today = new Date().toISOString().slice(0, 10);
    const parsedDate = new Date(`${date}T00:00:00Z`);
    const isValidDate =
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !Number.isNaN(parsedDate.getTime()) &&
      parsedDate.toISOString().slice(0, 10) === date;

    if (
      !/^[a-z0-9-]{1,100}$/.test(destinationSlug) ||
      !destinationTitle || destinationTitle.length > 160 ||
      !requesterName || requesterName.length > 120 ||
      !isValidDate || date <= today ||
      !/^(09|1[0-7]):00$/.test(time) ||
      !reunionLocation || reunionLocation.length > 300 ||
      !message || message.length > 1500 ||
      typeof body.returnToMeeting !== "boolean" ||
      typeof body.finishAtDestination !== "boolean"
    ) {
      return Response.json({ error: "Completa todos los datos de la visita con valores válidos." }, { status: 400 });
    }

    const visitId = createHash("sha256")
      .update(`${destinationSlug}|${date}|${time}`)
      .digest("hex");
    const visitRef = getFirebaseAdminFirestore()
      .collection(GUIDED_VISITS_COLLECTION)
      .doc(visitId);
    const visit: Omit<GuidedVisitRequest, "id"> = {
      destinationSlug,
      destinationTitle,
      requesterName,
      requesterEmail: user.email!.trim().toLowerCase(),
      requesterUid: user.uid,
      date,
      time,
      reunionLocation,
      returnToMeeting: body.returnToMeeting,
      finishAtDestination: body.finishAtDestination,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const created = await getFirebaseAdminFirestore().runTransaction(async (transaction) => {
      const existing = await transaction.get(visitRef);
      if (existing.exists) {
        return false;
      }
      transaction.create(visitRef, visit);
      return true;
    });
    if (!created) {
      return Response.json({ error: "Ese horario ya fue reservado. Elige otro disponible." }, { status: 409 });
    }

    return Response.json({ request: { id: visitId, ...visit } }, { status: 201 });
  } catch (error) {
    return getRequestErrorResponse(error);
  }
}
