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

  if (!accessToken || !password) {
    return NextResponse.json(
      { error: "Enter a new password." },
      { status: 400 }
    );
  }

  const response = await authRequest("/user", {
    method: "PUT",
    headers: { Authorization: "Bearer " + accessToken },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    const weakPassword =
      response.status === 422 ||
      details?.code === "weak_password" ||
      details?.error_code === "weak_password";

    return NextResponse.json(
      {
        error: weakPassword
          ? details?.message || details?.msg || "This password does not meet the account security requirements."
          : "This reset link is invalid or has expired.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
