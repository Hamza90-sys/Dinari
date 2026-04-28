export type UserRole = "user" | "admin";
export type RequestStatus = "Awaiting Payment" | "Paid" | "Processing" | "Completed" | "Failed";
export type PaymentStatus = "Completed" | "Failed" | "Pending";

export type Profile = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  balanceTnd: number;
  createdAt: string;
};

export type DinariRequest = {
  id: string;
  dbId: string;
  service: string;
  plan: string;
  email: string;
  notes?: string;
  status: RequestStatus;
  amountTND: number;
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string;
  paymentDate?: string;
  proofUrl?: string;
  adminNotes?: string;
  ownerEmail: string;
  ownerId: string;
};

export type DinariPayment = {
  id: string;
  dbId: string;
  requestId?: string;
  ownerId: string;
  ownerEmail?: string;
  amountTND: number;
  method: string;
  status: PaymentStatus;
  createdAt: string;
  proofUrl?: string;
};

export type DinariSubscription = {
  id: string;
  requestId: string;
  ownerId: string;
  service: string;
  plan: string;
  startDate: string;
  renewalDate: string;
  status: "Active" | "Cancelled";
};

export type DinariNotification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};