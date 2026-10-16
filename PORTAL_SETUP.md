# Customer portal configuration

The customer portal uses Supabase for email/password authentication and order storage,
and Resend for transactional order email.

Required Vercel environment variables:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- RESEND_API_KEY
- ORDER_EMAIL_FROM (for example: Brown Derby Wholesale <csr@brownderby.ca>)
- ORDER_EMAIL_TO (defaults to csr@brownderby.ca if omitted)
- NEXT_PUBLIC_SITE_URL (production site URL)

In Supabase **Authentication → URL Configuration**, set **Site URL** to
`https://brownderby.ca` and add these exact **Redirect URLs**:

- `https://brownderby.ca/reset-password`
- `https://brownderby.ca/login?confirmed=1`

Hosted account emails use these production destinations. Development emails use
`NEXT_PUBLIC_SITE_URL` when set, otherwise `http://localhost:3000`.

Security design:

- Customer passwords are never stored or processed by the Brown Derby database.
  Supabase Auth handles password hashing, login rate limits, email verification,
  recovery tokens, and authentication.
- Session tokens are kept in Secure, HttpOnly, SameSite=Lax cookies.
- The Supabase anonymous key is used only with the signed-in customer's access
  token; no service-role key is required by the website.
- Row Level Security independently restricts every order and order-item operation
  to records owned by the authenticated customer's UUID.
- Every order API request verifies the authenticated Supabase user before database
  access, and the database re-checks ownership through RLS.
- Product descriptions/prices are taken from the server-side Brown Derby catalog,
  never trusted from browser-submitted values.
- Submitted orders are retained as immutable history. Customers can create an
  editable reorder copy instead of silently changing an order that has already
  been emailed to Brown Derby.

After Supabase is connected, run supabase/schema.sql in its SQL editor.


## Account approval

Apply `supabase/account-approval.sql` after the base schema. New and existing
accounts default to pending. The confirmed owner account `csr@brownderby.ca`
is enrolled separately in `private.portal_admins` by a trusted database operator;
registration and editable user metadata cannot assign administrator access.

Sign in as the owner at `/account` and use **Customer approvals** to approve,
decline, or revoke access. Pricing and order APIs check fresh database approval
on each request. Restrictive database policies also block pending/declined users
from reading historical order prices through direct Supabase REST access.
Customers must confirm their email and be approved. Refreshing the catalog or
account page picks up an approval immediately without signing out.

The review operation records administrator, decision, and timestamp in the private
audit table. Customers cannot update approval records or promote themselves.
No service-role key is used. No approval emails are sent automatically.

Validation: `npm run check`, `npm run build`, and
`node scripts/check-account-approval.mjs`. The integration check uses a local
Auth/Data API fixture, with no customer credentials or external emails. Run
`supabase/test-account-approval.sql` against the database to test actual RLS,
self-approval denial, admin approval/revocation, and audit records; all test data
and decisions are rolled back.
