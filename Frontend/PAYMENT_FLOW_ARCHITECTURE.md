# Payment Flow Architecture - Dinari

## Overview

This document outlines the complete payment flow architecture for Dinari, a fintech SaaS web application. The system is designed as a **production-ready sandbox implementation** that can be easily integrated with real payment providers like Konnect and Flouci.

## Architecture Layers

### 1. **Payment Session Management**
- **Service**: `services/payment-session.service.ts`
- **Responsibility**: Manages payment session lifecycle
- **Key Functions**:
  - Create payment sessions for requests
  - Generate unique payment references (format: `DIN-YYYY-XXXX`)
  - Track session status and expiration
  - Verify session validity before checkout

### 2. **Webhook Simulation Service**
- **Service**: `services/webhook.service.ts`
- **Responsibility**: Simulates payment provider webhooks
- **Key Functions**:
  - Emit payment confirmed events
  - Emit payment failure events
  - Handle session expiration
  - Record payment events for audit trail
  - Event subscription system for testing

### 3. **UI Layer**

#### Checkout Page (`pages/CheckoutPage.tsx`)
- Professional hosted-style checkout interface
- Sandbox mode banner and controls
- Payment method selection (D17, Bank Card)
- Simulate successful/failed payment buttons
- Session validation and ownership checks
- Order summary sidebar

#### Payment Success Page (`pages/PaymentSuccess.tsx`)
- Confirmation message and details
- Payment reference and request ID display
- Receipt download functionality
- Next steps information
- Back to dashboard CTA

#### Payment Failed Page (`pages/PaymentFailed.tsx`)
- Clear error messaging
- Failure reason display
- Troubleshooting guide
- Retry payment button
- Support contact information

### 4. **Component Layer**

#### PaymentStatusBadge Component
- Visual status indicators for payments
- Statuses: Paid, Failed, Pending
- PaymentSessionStatusBadge for session tracking

#### PaymentReference Component
- Display and copy payment reference
- Copyable to clipboard with toast notification

#### Request Details Dialog (Enhanced)
- Added "Pay Now" button
- Initiates payment session creation
- Redirects to checkout page
- Loading and error states

## Database Schema

### New Tables

#### `payment_sessions`
```sql
- id (UUID, PK)
- request_id (UUID, FK)
- user_id (UUID, FK)
- payment_reference (TEXT UNIQUE)
- session_id (TEXT UNIQUE)
- checkout_url (TEXT)
- status (TEXT: pending|active|completed|cancelled|expired)
- amount_tnd (NUMERIC)
- expires_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
- metadata (JSONB)
```

#### `payment_events` (Audit Trail)
```sql
- id (UUID, PK)
- payment_id (UUID, FK)
- session_id (UUID, FK)
- event_type (TEXT)
- status (TEXT)
- metadata (JSONB)
- created_at (TIMESTAMPTZ)
```

### Enhanced Tables

#### `payments` (Added Columns)
- `payment_reference` (TEXT UNIQUE)
- `payment_method_type` (TEXT)
- `session_id` (TEXT UNIQUE)
- `sandbox_status` (TEXT)

#### `requests` (Added Columns)
- `payment_reference` (TEXT)
- `last_payment_attempt_at` (TIMESTAMPTZ)
- `payment_attempts` (INTEGER)

## Payment Flow Diagram

```
User Creates Request
        ↓
User Clicks "Pay Now" Button
        ↓
Payment Session Created (DIN-2026-XXXX)
        ↓
Redirect to Checkout Page (session query param)
        ↓
User Selects Payment Method
        ↓
Simulate Successful/Failed Payment
        ↓
Webhook Event Triggered
        ↓
Request Status Updated
        ↓
Redirect to Success/Failed Page
        ↓
Notifications Created
        ↓
Dashboard & Admin Panel Updated
```

## Type Definitions

### PaymentSession
```typescript
{
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
}
```

### PaymentStatus
```typescript
type PaymentStatus = "Completed" | "Failed" | "Pending";
```

### PaymentSessionStatus
```typescript
type PaymentSessionStatus = "pending" | "active" | "completed" | "cancelled" | "expired";
```

### PaymentMethodType
```typescript
type PaymentMethodType = "D17" | "bank_card" | "sandbox";
```

## Constants & Configuration

### Payment Methods
```typescript
PAYMENT_METHODS: {
  d17: {
    id: "D17",
    name: "D17 Mobile Money",
    icon: "phone",
  },
  bank_card: {
    id: "bank_card",
    name: "Bank Card",
    icon: "credit-card",
  },
}
```

### Timeouts & Delays
```typescript
CHECKOUT_TIMEOUT_MS: 3600000 (1 hour)
SESSION_CREATION: 500ms
CHECKOUT_REDIRECT: 1000ms
PAYMENT_PROCESSING: 2000ms
SUCCESS_CONFIRMATION: 1500ms
```

### Payment Reference Format
```
DIN-{YEAR}-{4-DIGIT-RANDOM}
Example: DIN-2026-4521
```

## Security & Validation

### Row-Level Security (RLS)

#### payment_sessions
- Users can only view/create/update their own sessions
- Admins can view all sessions

#### payment_events
- Users can view events for their own payments
- Admins can view all events

### Validation Rules
- Minimum amount: 1 TND
- Maximum amount: 1000 TND
- Session expiry: 60 minutes
- Ownership checks on all payment operations
- Request status validation (must be "Awaiting Payment")
- Prevent duplicate payment attempts (configurable)

## Integration Points for Real Providers

### To Add Konnect Integration:

1. Create `services/konnect.service.ts`:
```typescript
export const konnectService = {
  async createPaymentLink(session: PaymentSession) {
    // Use Konnect API to create payment link
    // Return checkout URL
  },
  
  async verifyWebhook(payload: unknown, signature: string) {
    // Verify Konnect signature
  },
};
```

2. Extend `webhookService`:
```typescript
webhookService.on('payment.confirmed', async (payload) => {
  if (payload.provider === 'konnect') {
    // Handle Konnect-specific logic
  }
});
```

3. Update checkout page to redirect to Konnect URL

### To Add Flouci Integration:

Similar pattern to Konnect:
1. Create `services/flouci.service.ts`
2. Register Flouci webhook handlers
3. Update checkout with provider selection

## API Endpoints (Future)

```
POST /api/payment-sessions
  Create a new payment session

GET /api/payment-sessions/:sessionId
  Fetch session details

POST /api/webhooks/payment-confirmed
  Handle payment confirmation webhook

POST /api/webhooks/payment-failed
  Handle payment failure webhook

GET /api/payments/:paymentReference
  Get payment details
```

## Error Handling

### Common Errors
- **Session Not Found**: Payment session doesn't exist or has expired
- **Ownership Verification Failed**: User doesn't own the request
- **Invalid Status**: Request is not awaiting payment
- **Session Expired**: Checkout timeout exceeded
- **Payment Processing Error**: Webhook simulation failed

### User-Facing Messages
- Clear, actionable error messages
- Toast notifications for feedback
- Troubleshooting guide on failure page
- Contact support link

## Testing & Simulation

### Sandbox Mode Features
1. Simulate Successful Payment
   - Immediately creates payment record
   - Updates request status to "Paid"
   - Creates notification
   - Triggers success page redirect

2. Simulate Failed Payment
   - Creates failed payment record
   - Keeps request in "Awaiting Payment"
   - Triggers failure page redirect
   - Shows failure reason

3. Session Management
   - Automatic expiration after 1 hour
   - Manual session cancellation
   - Expired session notifications

## Monitoring & Audit

### Payment Events Table
Tracks all payment-related events:
- `payment_confirmed`
- `payment_failed`
- `session_created`
- `session_expired`
- `payment_attempted`

### Metadata Tracking
Each event stores:
- Request code
- Amount
- Payment method
- Provider
- Timestamp
- User ID

## Performance Considerations

### Database Indices
```sql
- idx_payment_sessions_user_id
- idx_payment_sessions_request_id
- idx_payment_sessions_status
- idx_payment_sessions_payment_reference
- idx_payments_payment_reference
- idx_payments_session_id
- idx_payment_events_payment_id
```

### Caching Strategy
- Payment sessions cached for duration
- Request status cached with invalidation on payment
- Admin dashboard filters optimized with indices

## Future Enhancements

1. **Real Provider Integration**: Konnect, Flouci, Stripe
2. **Recurring Payments**: Subscription management
3. **Refund System**: Process refunds through providers
4. **Payment Analytics**: Dashboard with metrics
5. **Multi-Currency**: Support for additional currencies
6. **PCI Compliance**: For direct card handling (if needed)
7. **Rate Limiting**: Prevent abuse of payment API
8. **Idempotency**: Prevent duplicate transactions

## Files Created/Modified

### New Files
- `services/payment-session.service.ts`
- `services/webhook.service.ts`
- `pages/CheckoutPage.tsx`
- `pages/PaymentSuccess.tsx`
- `pages/PaymentFailed.tsx`
- `components/payment/PaymentStatusBadge.tsx`
- `components/payment/PaymentReference.tsx`
- `lib/payment.constants.ts`
- `migrations/2026-05-02_payment_flow.sql`

### Modified Files
- `src/types/domain.ts` (added payment types)
- `src/App.tsx` (added payment routes)
- `src/components/dashboard/RequestDetailsDialog.tsx` (added Pay Now button)
- `src/services/requests.service.ts` (added payment_reference field)

## Environment Configuration

### Development (.env.local)
```
VITE_PAYMENT_MODE=sandbox
VITE_API_BASE_URL=http://localhost:3000
```

### Production
```
VITE_PAYMENT_MODE=production
VITE_API_BASE_URL=https://api.dinari.app
VITE_KONNECT_API_KEY=***
VITE_FLOUCI_API_KEY=***
```

## Deployment Notes

1. Run database migration: `2026-05-02_payment_flow.sql`
2. Update environment variables
3. Deploy frontend with new routes
4. Test payment flow in sandbox
5. Enable provider webhooks in production

---

**Last Updated**: May 2, 2026
**Status**: Production-Ready Sandbox
**Maintainer**: Senior Full-Stack Engineer
