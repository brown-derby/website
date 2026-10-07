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
    return NextResponse.json({ error: "Customer login is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const auth = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!auth.ok) {
    return NextResponse.json(
      { error: "The email or password was not accepted." },
      { status: 401 }
    );
  }

  const payload = await auth.json();
  await setSessionCookies(payload);

  return NextResponse.json({
    ok: true,
    user: {
      id: payload.user?.id,
      email: payload.user?.email,
      businessName: payload.user?.user_metadata?.business_name || "",
      contactName: payload.user?.user_metadata?.contact_name || "",
    },
  });
}
