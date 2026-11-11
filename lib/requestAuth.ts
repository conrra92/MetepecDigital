import type { DecodedIdToken } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { getFirebaseAdminAuth } from "./firebaseAdmin";
import { ADMIN_EMAIL, isMetepecEmail } from "./businessApplications";

export class RequestAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function getVerifiedUser(request: NextRequest): Promise<DecodedIdToken> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!token) {
    throw new RequestAuthError("Inicia sesión con Google para continuar.", 401);
  }

  const auth = getFirebaseAdminAuth();
  try {
    const user = await auth.verifyIdToken(token);

    const isAdminAccount = user.email?.trim().toLowerCase() === ADMIN_EMAIL;
    if (
      !user.email ||
      (!user.email_verified && !isAdminAccount && !isMetepecEmail(user.email) && user.guide !== true)
    ) {
      throw new RequestAuthError("Se requiere una cuenta con correo verificado.", 403);
    }

    return user;
  } catch (error) {
    if (error instanceof RequestAuthError) {
      throw error;
    }

    throw new RequestAuthError("La sesión expiró. Vuelve a iniciar sesión.", 401);
  }
}

export function requireAdmin(user: DecodedIdToken) {
  if (user.email?.trim().toLowerCase() !== ADMIN_EMAIL) {
    throw new RequestAuthError("Esta acción está reservada para administración.", 403);
  }
}

export function requireDestinationOwner(user: DecodedIdToken) {
  if (!isMetepecEmail(user.email)) {
    throw new RequestAuthError("Esta acción requiere la cuenta institucional asignada al destino.", 403);
  }
}

export function requireGuide(user: DecodedIdToken) {
  if (user.guide !== true) {
    throw new RequestAuthError("Esta acción está reservada para guías registrados.", 403);
  }
}

export function getRequestErrorResponse(error: unknown) {
  if (error instanceof RequestAuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("Protected API error", error);
  return Response.json(
    { error: "No se pudo procesar la solicitud. Inténtalo de nuevo más tarde." },
    { status: 500 },
  );
}
