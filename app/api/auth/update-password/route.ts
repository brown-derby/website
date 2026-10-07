import { NextRequest, NextResponse } from "next/server";
import { authRequest, portalConfigured, sameOrigin } from "../../../../lib/portal";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }
  if (!portalConfigured()) {
    return NextResponse.json({ error: "Password recovery is not configured yet." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const accessToken =
    typeof body?.accessToken === "string" ? body.accessToken : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!accessToken || password.length < 12) {
    return NextResponse.json(
      { error: "Use a password of at least 12 characters." },
      { status: 400 }
    );
  }

  const response = await authRequest("/user", {
    method: "PUT",
    headers: { Authorization: "Bearer " + accessToken },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
