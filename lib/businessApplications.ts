export const BUSINESS_APPLICATIONS_COLLECTION = "businessApplications";
export const APPROVED_BUSINESSES_COLLECTION = "approvedBusinesses";
export const ADMIN_EMAIL = "admin@admin.com";
export const METEPEC_EMAIL_DOMAIN = "@metepec.mx";

export function isMetepecEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase().endsWith(METEPEC_EMAIL_DOMAIN) ?? false;
}

export const businessCategories = [
  "Alojamiento",
  "Artesanías",
  "Cultura",
  "Gastronomía",
  "Servicios",
  "Otro",
] as const;

export type BusinessApplicationStatus = "pending" | "approved" | "rejected";

export type BusinessApplication = {
  id: string;
  businessName: string;
  category: string;
  description: string;
  address: string;
  phone: string;
  hours: string;
  location: {
    latitude: number;
    longitude: number;
  };
  requesterEmail: string;
  requesterName: string;
  status: BusinessApplicationStatus;
  adminResponse: string;
  adminNotificationStatus?: "sent" | "failed";
  requesterNotificationStatus?: "sent" | "failed";
  createdAt: string;
};
