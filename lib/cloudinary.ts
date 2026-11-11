import { createHash, randomUUID } from "node:crypto";

export type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";

export function getImageBufferFromDataUrl(
  value: unknown,
  allowedTypes: readonly SupportedImageType[],
  maxSizeBytes: number,
) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || !allowedTypes.includes(match[1] as SupportedImageType)) {
    return null;
  }

  const bytes = Buffer.from(match[2], "base64");
  if (
    bytes.length === 0 ||
    bytes.length > maxSizeBytes ||
    bytes.toString("base64") !== match[2] ||
    !isValidImageBuffer(bytes, match[1] as SupportedImageType)
  ) {
    return null;
  }

  return { bytes, contentType: match[1] as SupportedImageType };
}

export function isValidImageBuffer(bytes: Buffer, contentType: SupportedImageType) {
  switch (contentType) {
    case "image/png":
      return bytes.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/webp":
      return bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP";
  }
}

export async function uploadImageToCloudinary(
  bytes: Buffer,
  contentType: SupportedImageType,
  folder: string,
) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Falta configurar Cloudinary en el servidor.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = randomUUID();
  const signedParameters = { folder, public_id: publicId, timestamp };
  const signatureBase = Object.entries(signedParameters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const signature = createHash("sha1")
    .update(`${signatureBase}${apiSecret}`)
    .digest("hex");
  const formData = new FormData();
  formData.set("file", new Blob([new Uint8Array(bytes)], { type: contentType }), publicId);
  formData.set("api_key", apiKey);
  formData.set("timestamp", String(timestamp));
  formData.set("folder", folder);
  formData.set("public_id", publicId);
  formData.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!response.ok) {
    console.error("Cloudinary image upload failed", { status: response.status });
    throw new Error("No se pudo guardar la imagen en Cloudinary.");
  }

  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("secure_url" in result) ||
    typeof result.secure_url !== "string"
  ) {
    throw new Error("Cloudinary devolvió una respuesta de imagen no válida.");
  }

  return result.secure_url;
}

export async function uploadDataUrlToCloudinary(
  value: string,
  allowedTypes: readonly SupportedImageType[],
  maxSizeBytes: number,
  folder: string,
) {
  const image = getImageBufferFromDataUrl(value, allowedTypes, maxSizeBytes);
  if (!image) {
    throw new Error("La imagen no es válida.");
  }

  return uploadImageToCloudinary(image.bytes, image.contentType, folder);
}

export function isCloudinaryImageUrl(value: unknown) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    return url.protocol === "https:" &&
      url.hostname === "res.cloudinary.com" &&
      Boolean(cloudName) &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`) &&
      /^\/[A-Za-z0-9_-]+\/image\/upload\/[A-Za-z0-9_./-]+$/.test(url.pathname);
  } catch {
    return false;
  }
}
