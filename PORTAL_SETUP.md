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
