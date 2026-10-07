import { NextRequest, NextResponse } from "next/server";
import {
  authRequest,
  portalConfigured,
  sameOrigin,
} from "../../../../lib/portal";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }
  if (!portalConfigured()) {
    return NextResponse.json({ error: "Password recovery is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (email) {
    const redirectTo = request.nextUrl.origin + "/reset-password";
    await authRequest("/recover?redirect_to=" + encodeURIComponent(redirectTo), {
      method: "POST",
      body: JSON.stringify({ email }),
    }).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has an account, a password reset message will be sent.",
  });
}
