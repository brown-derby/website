import { NextRequest, NextResponse } from "next/server";
import { databaseRequest, getSession, sameOrigin } from "../../../../lib/portal";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
    if (!session.isAdmin) return NextResponse.json({ error: "Administrator access required." }, { status: 403, headers });
    const response = await databaseRequest(
      "customer_accounts?select=user_id,email,business_name,contact_name,status,created_at,reviewed_at&order=created_at.desc",
      session.accessToken,
    );
    if (!response.ok) throw new Error("Account lookup failed");
    const accounts = await response.json();
    return NextResponse.json({ accounts: accounts.filter((a: { user_id: string }) => a.user_id !== session.user.id) }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to load customer accounts." }, { status: 503, headers });
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request." }, { status: 403, headers });
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
    if (!session.isAdmin) return NextResponse.json({ error: "Administrator access required." }, { status: 403, headers });
    const body = await request.json().catch(() => null);
    if (typeof body?.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId) ||
      !["approved", "declined", "pending"].includes(body?.decision)) {
      return NextResponse.json({ error: "Choose an account and a valid decision." }, { status: 400, headers });
    }
    const response = await databaseRequest("rpc/review_customer_account", session.accessToken, {
      method: "POST", body: JSON.stringify({ account_id: body.userId, decision: body.decision }),
    });
    if (!response.ok) throw new Error("Account review failed");
    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ error: "Unable to save approval. Please refresh and try again." }, { status: 503, headers });
  }
}
