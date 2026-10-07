import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  authRequest,
  clearSessionCookies,
  sameOrigin,
} from "../../../../lib/portal";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  if (accessToken) {
    await authRequest("/logout", {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken },
    }).catch(() => null);
  }

  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
