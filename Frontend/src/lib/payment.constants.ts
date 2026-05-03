import type { PaymentMethodOption } from "@/types/domain";

/**
 * Payment Flow Constants and Configuration
 * Sandbox/Test Mode - DO NOT USE REAL CREDENTIALS
 */

// Payment methods available in sandbox mode
export const PAYMENT_METHODS: Record<string, PaymentMethodOption> = {
  d17: {
    id: "D17",
    name: "D17 Mobile Money",
    icon: "phone",
    description: "Pay via D17 mobile money service",
  },
  bank_card: {
    id: "bank_card",
    name: "Bank Card",
    icon: "credit-card",
    description: "Pay via Visa, Mastercard, or local card",
  },
};

// Payment session configuration
export const PAYMENT_SESSION_CONFIG = {
  CHECKOUT_TIMEOUT_MS: 60 * 60 * 1000, // 1 hour
  SANDBOX_MODE: true,
  CURRENCY: "TND",
  CURRENCY_SYMBOL: "د.ت",
};

// Payment status definitions
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  Pending: "Awaiting Payment",
  Completed: "Paid",
  Failed: "Payment Failed",
};

// Request status flow
export const REQUEST_STATUS_FLOW = {
  initial: "Awaiting Payment",
  paid: "Paid",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
} as const;

// Payment reference format
export const PAYMENT_REFERENCE_PREFIX = "DIN";
export const PAYMENT_REFERENCE_FORMAT = (year: number, random: number) =>
  `${PAYMENT_REFERENCE_PREFIX}-${year}-${String(random).padStart(4, "0")}`;

// Sandbox payment simulation delays (ms)
export const SANDBOX_DELAYS = {
  SESSION_CREATION: 500,
  CHECKOUT_REDIRECT: 1000,
  PAYMENT_PROCESSING: 2000,
  SUCCESS_CONFIRMATION: 1500,
} as const;

// Notification templates
export const PAYMENT_NOTIFICATIONS = {
  SESSION_CREATED: {
    title: "Payment Session Created",
    message: "Your payment session is ready. Proceed to checkout.",
  },
  PAYMENT_INITIATED: {
    title: "Payment Processing",
    message: "Your payment is being processed. Please wait...",
  },
  PAYMENT_SUCCESS: {
    title: "Payment Successful",
    message: "Your payment has been confirmed. Request status updated to Paid.",
  },
  PAYMENT_FAILED: {
    title: "Payment Failed",
    message: "Your payment could not be processed. Please try again.",
  },
  SESSION_EXPIRED: {
    title: "Payment Session Expired",
    message: "Your payment session has expired. Please create a new one.",
  },
} as const;

// Security & validation
export const PAYMENT_VALIDATION = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 1000,
  ALLOW_DUPLICATE_PAYMENT_ATTEMPTS: false,
  SESSION_EXPIRY_MINUTES: 60,
} as const;

// Webhook simulation endpoints (for testing)
export const WEBHOOK_ENDPOINTS = {
  PAYMENT_CONFIRMED: "/api/webhooks/payment-confirmed",
  PAYMENT_FAILED: "/api/webhooks/payment-failed",
  SESSION_EXPIRED: "/api/webhooks/session-expired",
} as const;
