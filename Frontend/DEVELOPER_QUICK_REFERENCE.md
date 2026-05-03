# Payment System - Developer Quick Reference

## 🔍 Quick Lookup Guide

### Services
```typescript
// Payment Session Management
import { paymentSessionService } from '@/services/payment-session.service'
await paymentSessionService.createSession({ requestId, requestCode, userId, amount })
await paymentSessionService.getSession(sessionId)
await paymentSessionService.generateCheckoutUrl(sessionId)

// Webhook Simulation
import { webhookService } from '@/services/webhook.service'
await webhookService.simulatePaymentSuccess(session)
await webhookService.simulatePaymentFailure(session, reason)
webhookService.on('payment.confirmed', handler)

// Payment Utilities
import { canPayRequest, isRequestPaid, formatPaymentAmount } from '@/lib/payment.utils'
canPayRequest(request) // boolean
isRequestPaid(request) // boolean
formatPaymentAmount(100, 'TND') // "100.00 TND"
```

### Components
```typescript
// Status Badges
import { PaymentStatusBadge, PaymentSessionStatusBadge } from '@/components/payment'
<PaymentStatusBadge status="Completed" />
<PaymentSessionStatusBadge status="active" />

// Payment Reference
import { PaymentReference } from '@/components/payment'
<PaymentReference reference="DIN-2026-4521" copyable />
```

### Types
```typescript
import type {
  PaymentSession,
  PaymentStatus,
  PaymentSessionStatus,
  PaymentMethodType,
  DinariRequest,
  DinariPayment,
} from '@/types/domain'
```

## 🛣️ Routes

```
/checkout?session=<sessionId>      - Checkout page
/payment-success?reference=<ref>   - Success confirmation
/payment-failed?reference=<ref>    - Failure page
```

## 📊 Database Tables

```sql
-- Payment Sessions (Checkout sessions)
payment_sessions (
  id, request_id, user_id, payment_reference,
  status, amount_tnd, expires_at, metadata
)

-- Payment Events (Audit trail)
payment_events (
  id, payment_id, session_id, event_type,
  status, metadata
)

-- Enhanced Tables
payments: +payment_reference, +session_id, +payment_method_type
requests: +payment_reference, +last_payment_attempt_at, +payment_attempts
```

## 🎯 Common Tasks

### Create Payment Session
```typescript
const session = await paymentSessionService.createSession({
  requestId: request.dbId,
  requestCode: request.id,
  userId: user.id,
  amount: request.amountTND,
})

const checkoutUrl = await paymentSessionService.generateCheckoutUrl(session.id)
navigate(checkoutUrl)
```

### Handle Successful Payment
```typescript
try {
  await webhookService.simulatePaymentSuccess(session)
  navigate(`/payment-success?reference=${session.paymentReference}`)
} catch (err) {
  toast.error(err.message)
}
```

### Get Payment Status
```typescript
const session = await paymentSessionService.getSession(sessionId)
if (!session) {
  // Session not found
}

const isValid = session.status === 'active' && 
                new Date(session.expiresAt) > new Date()
```

### List User's Payments
```typescript
const payments = await paymentsService.list(false, userId)
payments.map(p => ({
  reference: p.paymentReference,
  amount: p.amountTND,
  status: p.status,
}))
```

## 🔒 Security Checklist

When modifying payment code:
- [ ] Verify user ownership of request
- [ ] Check request status is "Awaiting Payment"
- [ ] Validate payment amount
- [ ] Verify session hasn't expired
- [ ] Use RLS for database queries
- [ ] Log all payment events
- [ ] Handle errors gracefully

## ⚠️ Common Mistakes to Avoid

❌ Don't: Skip user ownership verification
✅ Do: Always check `request.ownerId === user.id`

❌ Don't: Allow payments on non-"Awaiting Payment" requests
✅ Do: Check `request.status === 'Awaiting Payment'`

❌ Don't: Store payment references in client code
✅ Do: Always fetch from database

❌ Don't: Ignore session expiration
✅ Do: Call `verifySession()` before use

❌ Don't: Create multiple payment sessions for same request
✅ Do: Check existing sessions first

❌ Don't: Update request status directly
✅ Do: Let webhook service handle status updates

## 🧪 Testing Code Snippets

### Test Successful Payment
```typescript
// Simulate user flow
const session = await paymentSessionService.createSession({...})
await webhookService.simulatePaymentSuccess(session)
// Verify: request.status === 'Paid', payment created, notification created
```

### Test Failed Payment
```typescript
const session = await paymentSessionService.createSession({...})
await webhookService.simulatePaymentFailure(session, 'Insufficient funds')
// Verify: request.status === 'Awaiting Payment', payment record created with 'Failed'
```

### Test Session Expiration
```typescript
const session = await paymentSessionService.createSession({...})
// Wait for expiration
const isValid = await paymentSessionService.verifySession(session.id)
// Should return: { valid: false, reason: 'Session has expired' }
```

## 📱 UI Component Quick Guide

### Payment Status Badge
```tsx
import { PaymentStatusBadge } from '@/components/payment'

// For payments
<PaymentStatusBadge status="Completed" />  // Green badge "Paid"
<PaymentStatusBadge status="Failed" />     // Red badge "Failed"
<PaymentStatusBadge status="Pending" />    // Amber badge "Pending"

// For sessions
<PaymentSessionStatusBadge status="active" />    // Blue
<PaymentSessionStatusBadge status="completed" /> // Green
<PaymentSessionStatusBadge status="expired" />   // Gray
```

### Payment Reference Display
```tsx
import { PaymentReference } from '@/components/payment'

<PaymentReference 
  reference="DIN-2026-4521" 
  copyable={true}           // Shows copy button
  className="inline-block"
/>
```

## 🔧 Configuration Reference

```typescript
// From payment.constants.ts
PAYMENT_SESSION_CONFIG.CHECKOUT_TIMEOUT_MS  // 1 hour
PAYMENT_METHODS                              // D17, Bank Card
SANDBOX_DELAYS.PAYMENT_PROCESSING            // 2000ms
PAYMENT_VALIDATION.MIN_AMOUNT                // 1 TND
PAYMENT_VALIDATION.MAX_AMOUNT                // 1000 TND
```

## 📋 Database Query Examples

```sql
-- Find payment session
SELECT * FROM payment_sessions 
WHERE payment_reference = 'DIN-2026-4521'

-- Get request payment status
SELECT status, payment_reference 
FROM requests 
WHERE request_code = 'REQ-001'

-- Get all payments for user
SELECT * FROM payments 
WHERE user_id = '<user-id>'
ORDER BY created_at DESC

-- Audit trail for payment
SELECT * FROM payment_events 
WHERE payment_id = '<payment-id>'
ORDER BY created_at

-- Find expired sessions
SELECT * FROM payment_sessions 
WHERE expires_at < now() 
AND status IN ('pending', 'active')
```

## 🐛 Debugging Tips

### Check Browser Console
```javascript
// Access payment session from window
window.__paymentSession

// Log payment service calls
console.log('Session created:', session)
```

### Check Database
```sql
-- Verify session exists
SELECT * FROM payment_sessions WHERE id = '<session-id>'

-- Check payment created
SELECT * FROM payments WHERE payment_reference = '<ref>'

-- View audit trail
SELECT * FROM payment_events ORDER BY created_at DESC LIMIT 10
```

### Common Error Messages
| Error | Cause | Solution |
|-------|-------|----------|
| Session not found | Expired or invalid | Create new session |
| Not authorized | Different user | Verify ownership |
| Request not awaiting | Already paid | Check status first |
| Session expired | Over 1 hour old | Create new session |
| Invalid amount | Outside bounds | Validate amount |

## 🚀 Performance Tips

1. **Cache payment sessions**
   - Don't refetch same session repeatedly
   - Store in React state or React Query

2. **Use indices**
   - payment_reference lookups use index
   - user_id filtering optimized

3. **Lazy load details**
   - Load only when needed
   - Don't fetch all users' payments

4. **Batch operations**
   - Update multiple records together
   - Reduce database round trips

## 📚 Additional Resources

- **Architecture**: See `PAYMENT_FLOW_ARCHITECTURE.md`
- **Implementation**: See `IMPLEMENTATION_GUIDE.md`
- **Deployment**: See `DEPLOYMENT_CHECKLIST.md`
- **Main README**: See `README_PAYMENT_SYSTEM.md`

## 🔗 Integration Examples

### With Konnect
```typescript
// services/konnect.service.ts
export const konnectService = {
  async createPaymentLink(session: PaymentSession) {
    const response = await fetch('https://api.konnect.me/...', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KONNECT_KEY}` },
      body: JSON.stringify({
        amount: session.amountTnd,
        reference: session.paymentReference,
      }),
    })
    return response.json().checkout_url
  },
}
```

### With Flouci
```typescript
// services/flouci.service.ts
export const flouciService = {
  async createPaymentLink(session: PaymentSession) {
    // Similar pattern to Konnect
  },
}
```

---

**Last Updated**: May 2, 2026
**Quick Reference Version**: 1.0
