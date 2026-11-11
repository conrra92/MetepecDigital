export const GUIDES_COLLECTION = "alta de guias";

export type GuideRecord = {
  id: string;
  name: string;
  age: number;
  gender: string;
  photoUrl?: string;
  photoDataUrl?: string;
  createdAt: string;
};

export const GUIDE_PROFILES_COLLECTION = "guideProfiles";
export const GUIDED_VISITS_COLLECTION = "guidedVisitRequests";
export const GUIDE_APPLICATIONS_COLLECTION = "guideApplications";

export type GuideApplicationStatus = "pending" | "processing" | "approved" | "rejected";

export type GuideApplication = {
  id: string;
  uid: string;
  email: string;
  name: string;
  plate: string;
  vehicleYear: number;
  model: string;
  vehiclePhotoUrl: string;
  status: GuideApplicationStatus;
  adminResponse: string;
  requesterNotificationStatus?: "sent" | "failed";
  createdAt: string;
};

export type GuideProfile = {
  uid: string;
  email: string;
  name: string;
  plate: string;
  vehicleYear: number;
  model: string;
  vehiclePhotoUrl: string;
  createdAt: string;
};

export type GuidedVisitRequest = {
  id: string;
  destinationSlug: string;
  destinationTitle: string;
  requesterName: string;
  requesterEmail: string;
  date: string;
  time: string;
  reunionLocation: string;
  returnToMeeting: boolean;
  finishAtDestination: boolean;
  message: string;
  status: "pending" | "accepted";
  acceptedBy?: {
    uid: string;
    name: string;
    email: string;
  };
  acceptedAt?: string;
  requesterUid?: string;
  createdAt: string;
};
