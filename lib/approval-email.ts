type ApprovalEmailAccount = {
  user_id: string;
  email: string;
  business_name: string;
  contact_name: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

export function buildApprovalEmail(account: ApprovalEmailAccount) {
  const name = account.contact_name.trim() || account.business_name.trim() || "there";
  const greeting = "Hello " + name + ",";
  const loginUrl = "https://brownderby.ca/login";
  const subject = "Your Brown Derby Wholesale account is approved";
  const html = [
    '<!doctype html><html><body style="margin:0;padding:0;background:#f4e8cf;font-family:Arial,Helvetica,sans-serif;color:#2a1a12">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4e8cf;padding:32px 12px"><tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#fffaf0;border:1px solid #dec8a8;border-radius:18px;overflow:hidden">',
    '<tr><td style="background:#442414;padding:24px 32px;text-align:center;border-bottom:4px solid #c4934f">',
    '<div style="font-family:Georgia,serif;font-size:27px;letter-spacing:.04em;color:#fffaf0">BROWN DERBY</div>',
    '<div style="margin-top:4px;font-size:12px;font-weight:bold;letter-spacing:.18em;color:#c4934f">WHOLESALE</div></td></tr>',
    '<tr><td style="padding:40px 38px 34px">',
    '<div style="font-size:12px;font-weight:bold;letter-spacing:.12em;color:#9a4b2c;text-transform:uppercase">Customer portal</div>',
    '<h1 style="margin:10px 0 16px;font-family:Georgia,serif;font-size:31px;line-height:1.2;font-weight:normal;color:#2a1a12">Your account is approved</h1>',
    '<p style="font-size:16px;line-height:1.65;color:#655247">' + escapeHtml(greeting) + '</p>',
    '<p style="font-size:16px;line-height:1.65;color:#655247">Your Brown Derby Wholesale customer account has been approved. You can now sign in to view wholesale pricing and place orders on our website.</p>',
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:10px;background:#6a3a21">',
    '<a href="' + loginUrl + '" style="display:inline-block;padding:14px 23px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold">Sign in to your account</a>',
    '</td></tr></table>',
    '<p style="margin:26px 0 0;font-size:14px;line-height:1.65;color:#655247">If you have not yet confirmed your email address, please complete that step before signing in. If you forgot your password, select <strong>Forgot your password?</strong> on the sign-in page.</p>',
    '<p style="margin:18px 0 0;font-size:14px;line-height:1.65;color:#655247">Questions? Contact us at <a href="mailto:csr@brownderby.ca" style="color:#6a3a21">csr@brownderby.ca</a>.</p>',
    '</td></tr>',
    '<tr><td style="padding:22px 38px;background:#f7edd9;border-top:1px solid #dec8a8;font-size:12px;line-height:1.65;color:#655247">',
    '<strong style="color:#442414">Brown Derby Wholesale</strong><br>22 Hardy Avenue, Grand Falls-Windsor, NL A2A 2P9<br>',
    '(709) 489-2299 &nbsp;·&nbsp; csr@brownderby.ca<br>Monday–Friday, 8:00 AM–5:00 PM',
    '</td></tr></table>',
    '<div style="max-width:620px;margin:14px auto 0;font-size:11px;line-height:1.5;color:#806f63;text-align:center">This is an automated customer account notification from Brown Derby Wholesale.</div>',
    '</td></tr></table></body></html>',
  ].join("");

  const text = [
    greeting,
    "",
    "Your Brown Derby Wholesale customer account has been approved.",
    "You can now sign in to view wholesale pricing and place orders:",
    loginUrl,
    "",
    "If you have not confirmed your email address, please do so before signing in.",
    "You can reset your password using the Forgot your password? link on the sign-in page.",
    "",
    "Questions? Contact csr@brownderby.ca.",
    "Brown Derby Wholesale",
  ].join("\n");

  return { subject, html, text };
}

export async function sendApprovalEmail(account: ApprovalEmailAccount, idempotencyKey: string) {
  if (!process.env.RESEND_API_KEY || !process.env.ORDER_EMAIL_FROM) {
    throw new Error("Approval email delivery is not configured.");
  }
  const message = buildApprovalEmail(account);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.ORDER_EMAIL_FROM,
      to: [account.email],
      reply_to: "csr@brownderby.ca",
      ...message,
    }),
  });

  if (!response.ok) {
    throw new Error("Approval notification was rejected by the email provider (" + response.status + ").");
  }
}
