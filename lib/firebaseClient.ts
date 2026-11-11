"use client";

import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ""}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
};

export function getFirebaseAuth() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error("La configuración de Firebase para el cliente está incompleta.");
  }

  const app =
    getApps().find((candidate) => candidate.name === "[DEFAULT]") ??
    initializeApp(firebaseConfig);

  return getAuth(app);
}

export async function getFirebaseIdToken() {
  const auth = getFirebaseAuth();
  await auth.authStateReady();

  if (!auth.currentUser) {
    throw new Error("Inicia sesión con tu cuenta de Firebase antes de continuar.");
  }

  const storedSession = window.localStorage.getItem("metepec-session");
  if (!storedSession) {
    throw new Error("Inicia sesión con tu cuenta de Firebase antes de continuar.");
  }

  let sessionEmail: string | undefined;
  try {
    sessionEmail = (JSON.parse(storedSession) as { email?: string }).email;
  } catch {
    throw new Error("La sesión local no es válida. Vuelve a iniciar sesión.");
  }

  if (auth.currentUser.email?.trim().toLowerCase() !== sessionEmail?.trim().toLowerCase()) {
    throw new Error("La cuenta de Firebase activa no coincide con la sesión. Cierra sesión y vuelve a entrar con la cuenta correcta.");
  }

  return auth.currentUser.getIdToken();
}

export async function fetchWithFirebaseAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = await getFirebaseIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
