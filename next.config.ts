import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  // conserva el resto de tu configuración aquí
};

export default nextConfig;