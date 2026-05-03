/**
 * Payment Utility Functions
 * Common helpers for payment operations across the application
 */

import type { DinariRequest, PaymentStatus, PaymentSessionStatus } from "@/types/domain";
import { PAYMENT_SESSION_CONFIG } from "./payment.constants";

/**
 * Check if a request can be paid
 */
export function canPayRequest(request: DinariRequest): boolean {
  return request.status === "Awaiting Payment";
}

/**
 * Check if a request is already paid
 */
export function isRequestPaid(request: DinariRequest): boolean {
  return request.status === "Paid" || request.status === "Processing" || request.status === "Completed";
}

/**
 * Check if a request payment failed
 */
export function isRequestFailed(request: DinariRequest): boolean {
  return request.status === "Failed";
}

/**
 * Format payment amount for display
 */
export function formatPaymentAmount(amount: number, currency: string = PAYMENT_SESSION_CONFIG.CURRENCY): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Format payment reference for display
 */
export function formatPaymentReference(reference: string): string {
  return reference.toUpperCase();
}

/**
 * Check if payment session is still valid
 */
export function isSessionValid(
  status: PaymentSessionStatus,
  expiresAt: string | Date
): boolean {
  const validStatuses: PaymentSessionStatus[] = ["pending", "active"];
  const isValidStatus = validStatuses.includes(status);
  const isNotExpired = new Date(expiresAt) > new Date();
  return isValidStatus && isNotExpired;
}

/**
 * Check if payment session is expired
 */
export function isSessionExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt) <= new Date();
}

/**
 * Calculate time remaining until session expires
 */
export function getSessionTimeRemaining(expiresAt: string | Date): {
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) {
    return { minutes: 0, seconds: 0, isExpired: true };
  }

  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return { minutes, seconds, isExpired: false };
}

/**
 * Format session time remaining for display
 */
export function formatSessionTimeRemaining(expiresAt: string | Date): string {
  const { minutes, seconds, isExpired } = getSessionTimeRemaining(expiresAt);

  if (isExpired) return "Expired";
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Get payment status label for display
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    Completed: "Paid",
    Failed: "Failed",
    Pending: "Pending",
  };
  return labels[status] || status;
}

/**
 * Get payment session status label for display
 */
export function getSessionStatusLabel(status: PaymentSessionStatus): string {
  const labels: Record<PaymentSessionStatus, string> = {
    pending: "Pending",
    active: "Active",
    completed: "Completed",
    cancelled: "Cancelled",
    expired: "Expired",
  };
  return labels[status] || status;
}

/**
 * Generate a unique transaction ID for reference
 */
export function generateTransactionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(
  amount: number,
  minAmount: number = 1,
  maxAmount: number = 1000
): { valid: boolean; error?: string } {
  if (amount < minAmount) {
    return { valid: false, error: `Minimum amount is ${minAmount} TND` };
  }

  if (amount > maxAmount) {
    return { valid: false, error: `Maximum amount is ${maxAmount} TND` };
  }

  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  return { valid: true };
}

/**
 * Check if two payment references are the same
 */
export function isSamePaymentReference(ref1: string, ref2: string): boolean {
  return ref1.toUpperCase() === ref2.toUpperCase();
}

/**
 * Extract year from payment reference (DIN-YYYY-XXXX format)
 */
export function getPaymentReferenceYear(reference: string): number | null {
  const match = reference.match(/DIN-(\d{4})-/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Check if payment is from current year
 */
export function isCurrentYearPayment(reference: string): boolean {
  const year = getPaymentReferenceYear(reference);
  const currentYear = new Date().getFullYear();
  return year === currentYear;
}

/**
 * Format payment method name
 */
export function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    D17: "D17 Mobile Money",
    bank_card: "Bank Card",
    sandbox: "Sandbox (Test)",
    card: "Credit/Debit Card",
    wallet: "Digital Wallet",
  };
  return methodMap[method] || method;
}

/**
 * Get payment type icon class name
 */
export function getPaymentMethodIcon(method: string): string {
  const iconMap: Record<string, string> = {
    D17: "phone",
    bank_card: "credit-card",
    sandbox: "flask",
    card: "credit-card",
    wallet: "wallet",
  };
  return iconMap[method] || "receipt";
}

/**
 * Calculate total paid amount from payment array
 */
export function calculateTotalPaid(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

/**
 * Calculate average payment amount
 */
export function calculateAveragePayment(amounts: number[]): number {
  if (amounts.length === 0) return 0;
  return calculateTotalPaid(amounts) / amounts.length;
}

/**
 * Check if user can retry payment for a request
 */
export function canRetryPayment(
  request: DinariRequest,
  maxAttempts: number = 3
): boolean {
  if (!canPayRequest(request)) return false;
  // Would need payment_attempts field in DinariRequest for full validation
  return true;
}

/**
 * Get user-friendly error message for payment errors
 */
export function getPaymentErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    INSUFFICIENT_FUNDS: "You have insufficient funds to complete this payment.",
    CARD_DECLINED: "Your card was declined. Please check your card details.",
    NETWORK_ERROR: "Network error occurred. Please try again.",
    SESSION_EXPIRED: "Your payment session has expired. Please create a new payment session.",
    INVALID_AMOUNT: "The payment amount is invalid.",
    INVALID_SESSION: "Payment session is invalid or not found.",
    UNAUTHORIZED: "You are not authorized to access this payment.",
    REQUEST_NOT_FOUND: "The request could not be found.",
  };

  return errorMessages[errorCode] || "An error occurred processing your payment. Please try again.";
}
