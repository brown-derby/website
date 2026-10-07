import { NextRequest, NextResponse } from "next/server";
import {
  authRequest,
  portalConfigured,
  sameOrigin,
  setSessionCookies,
} from "../../../../lib/portal";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }
  if (!portalConfigured()) {
    return NextResponse.json({ error: "Customer registration is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const businessName =
    typeof body?.businessName === "string" ? body.businessName.trim().slice(0, 160) : "";
  const contactName =
    typeof body?.contactName === "string" ? body.contactName.trim().slice(0, 160) : "";

  if (!email || !businessName || password.length < 12) {
    return NextResponse.json(
      { error: "Enter a business name, valid email, and a password of at least 12 characters." },
      { status: 400 }
    );
  }

  const redirectTo = request.nextUrl.origin + "/login?confirmed=1";
  const auth = await authRequest("/signup?redirect_to=" + encodeURIComponent(redirectTo), {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: {
        business_name: businessName,
        contact_name: contactName,
      },
    }),
  });

  if (!auth.ok) {
    const details = await auth.json().catch(() => null);
    return NextResponse.json(
      { error: details?.msg || details?.message || "Unable to create the account." },
      { status: auth.status >= 400 && auth.status < 500 ? auth.status : 502 }
    );
  }

  const payload = await auth.json();

  if (payload.access_token && payload.refresh_token) {
    await setSessionCookies(payload);
    return NextResponse.json({ ok: true, signedIn: true });
  }

  return NextResponse.json({
    ok: true,
    signedIn: false,
    message: "Check your email to confirm your account, then sign in.",
  });
}
