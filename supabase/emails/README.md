# Brown Derby Auth Email Branding

The source-controlled templates in this folder are intended for Supabase Authentication.

## Confirm signup
Subject: **Confirm your Brown Derby customer account**

Use `confirm-signup.html` for Authentication → Email Templates → Confirm signup.

## Reset password
Subject: **Reset your Brown Derby customer portal password**

Use `recovery.html` for Authentication → Email Templates → Reset password / Recovery.

## Production mail delivery through Resend

Configure Authentication → SMTP Settings / Custom SMTP with the Resend SMTP credentials for the verified `brownderby.ca` domain. Use a Brown Derby sender such as:

- Sender name: Brown Derby Wholesale
- Sender address: accounts@brownderby.ca (or another verified brownderby.ca address)

Do not commit SMTP passwords or API keys to the repository.
