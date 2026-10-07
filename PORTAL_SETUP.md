# Customer portal configuration

The customer portal uses Supabase for email/password authentication and order storage,
and Resend for transactional order email.

Required Vercel environment variables:

- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- ORDER_EMAIL_FROM (for example: Brown Derby Orders <orders@brownderby.ca>)
- ORDER_EMAIL_TO (defaults to csr@brownderby.ca if omitted)
- NEXT_PUBLIC_SITE_URL (production site URL)

Security design:

- Customer passwords are never stored or processed by the Brown Derby database.
  Supabase Auth handles password hashing, login rate limits, email verification,
  recovery tokens, and authentication.
- Session tokens are kept in Secure, HttpOnly, SameSite=Lax cookies.
- Service-role/database and Resend credentials are server-only environment variables.
- Browser users cannot query the order tables directly. RLS is enabled and direct
  anon/authenticated table access is revoked.
- Every order API request verifies the authenticated Supabase user and scopes data
  access to that user's UUID.
- Product descriptions/prices are taken from the server-side Brown Derby catalog,
  never trusted from browser-submitted values.
- Submitted orders are retained as immutable history. Customers can create an
  editable reorder copy instead of silently changing an order that has already
  been emailed to Brown Derby.

After Supabase is connected, run supabase/schema.sql in its SQL editor.
