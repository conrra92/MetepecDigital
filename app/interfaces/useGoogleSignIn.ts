"use client";

import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isGmailEmail } from "./adminData";
import { getFirebaseAuth } from "../../lib/firebaseClient";

type SessionProfile = {
  email: string;
  provider: "google";
};

const SESSION_STORAGE_KEY = "metepec-session";
function saveSessionProfile(router: ReturnType<typeof useRouter>, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  if (!isGmailEmail(normalizedEmail)) {
    window.alert("El acceso con Google es solo para usuarios finales con correo @gmail.com. Usa correo y contraseña para la cuenta institucional.");
    return false;
  }

  const sessionProfile: SessionProfile = {
    email: normalizedEmail,
    provider: "google",
  };

  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(sessionProfile),
  );
  window.dispatchEvent(new Event("sessionchange"));

  router.push("/");
  return true;
}

function getGoogleSignInErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    if (error.code === "auth/popup-closed-by-user") {
      return "Se canceló el inicio de sesión con Google.";
    }

    if (error.code === "auth/popup-blocked") {
      return "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes e inténtalo de nuevo.";
    }
  }

  if (error instanceof Error) {
    return `No se pudo iniciar sesión con Google: ${error.message}`;
  }

  return "No se pudo iniciar sesión con Google. Inténtalo de nuevo.";
}

export function useGoogleSignIn() {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const signInWithGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!email) {
        throw new Error("Google no devolvió un correo asociado a la cuenta.");
      }

      if (!isGmailEmail(email)) {
        window.alert("El acceso con Google es solo para usuarios finales con correo @gmail.com.");
        return false;
      }

      return saveSessionProfile(router, email);
    } catch (error) {
      window.alert(getGoogleSignInErrorMessage(error));
      return false;
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return {
    signInWithGoogle,
    isGoogleLoading,
  };
}