
**Role:** Act as a senior full-stack Next.js developer.

**Project Update: Complete User Flow Redesign**
The current flow needs to be fully replaced with the new flow below. Implement this end-to-end in a professional manner without breaking anything already working.

**New Flow:**
```
User Fills Form → VIN Verification Page → Paddle Checkout Opens → 
Payment Captured → Send Report Link to Email (14-day token) → 
Redirect to Full Report Preview Page
```
---

**Step 1 — VIN Verification Page** `(/check-vin)`
- After form submission, redirect user to a new route `/check-vin`
- On this page, fetch the car report from ClearVIN API using the user's VIN
- **Render only the first page details of the report**
- Below the first page details, show a **"Get Full Report — $49"** button
- When clicked, **open the Paddle checkout page directly here** — do NOT redirect to any pricing page
- Capture the payment from the user via Paddle checkout

**Step 2 — Post Payment Delivery**
- After payment is successfully captured:
  1. Generate a **secure report preview link** with a **14-day token expiry**
  2. Send this report preview link to the **user's email** — no attachments, just the link
  3. Email should be friendly, confirming payment and providing the report link
  4. Token must remain valid for **14 days (2 weeks)** so user can open the link later
  5. Immediately **redirect the user to the report preview page**

**Step 3 — Report Preview Page**
- Render the **full report** on this page
- Provide a **Download Report** button
- The same page must also be accessible via the **email link** within the 14-day token window
---

**Requirements:**
- Create the new `/check-vin` route and page
- Implement first page only vs full report rendering logic
- Integrate Paddle checkout to open inline — no redirects
- Generate secure time-limited tokens (14-day expiry) for report preview links
- Send report preview link via email after payment capture
- If email fails, handle silently — do not block the user flow
- Proper error handling at every step
Review the full existing codebase first, understand the current flow, then implement the complete new flow cleanly and professionally.