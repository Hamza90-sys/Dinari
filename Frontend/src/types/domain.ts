export type UserRole = "user" | "admin";
export type RequestStatus = "Awaiting Payment" | "Paid" | "Processing" | "Completed" | "Failed";
export type PaymentStatus = "Completed" | "Failed" | "Pending";
export type PaymentSessionStatus = "pending" | "active" | "completed" | "cancelled" | "expired";
export type PaymentMethodType = "D17" | "bank_card" | "sandbox";
export type AccountAccessType = "existing" | "new";
export type PreferredContactMethod = "Phone Call" | "WhatsApp" | "SMS";
export type PaymentRequestStatus = "pending" | "approved" | "rejected";
export type WalletTransactionType = "top_up" | "service_purchase" | "refund" | "adjustment";

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
  accountAccessType?: AccountAccessType;
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
  phoneNumber?: string;
  preferredContactMethod?: PreferredContactMethod;
};

export type PaymentRequest = {
  id: string;
  userId: string;
  ownerEmail?: string;
  amountTND: number;
  method: string;
  transactionReference?: string;
  screenshotUrl?: string;
  note?: string;
  status: PaymentRequestStatus;
  adminNote?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
};

export type WalletTransaction = {
  id: string;
  userId: string;
  amountTND: number;
  balanceBefore: number;
  balanceAfter: number;
  type: WalletTransactionType;
  requestId?: string;
  paymentRequestId?: string;
  description?: string;
  createdAt: string;
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
  paymentReference?: string;
  sessionId?: string;
};

export type PaymentSession = {
  id: string;
  requestId: string;
  userId: string;
  paymentReference: string;
  sessionId?: string;
  checkoutUrl?: string;
  status: PaymentSessionStatus;
  amountTnd: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
};

export type PaymentMethodOption = {
  id: PaymentMethodType;
  name: string;
  icon: string;
  description: string;
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