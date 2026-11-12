import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendApprovalEmail } from "../../../../../lib/approval-email";
import { databaseRequest, getSession, sameOrigin } from "../../../../../lib/portal";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

type Account = {
  user_id: string;
  email: string;
  business_name: string;
  contact_name: string;
  status: "approved";
};

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403, headers });
  }

  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
    if (!session.isAdmin) return NextResponse.json({ error: "Administrator access required." }, { status: 403, headers });

    const body = await request.json().catch(() => null);
    if (typeof body?.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId)) {
      return NextResponse.json({ error: "Choose a valid customer account." }, { status: 400, headers });
    }

    // Only approved accounts can receive a manual approval reminder.
    // The recipient must come from the database, not the request payload.
    const response = await databaseRequest(
      "customer_accounts?select=user_id,email,business_name,contact_name,status" +
        "&user_id=eq." + encodeURIComponent(body.userId) + "&status=eq.approved&limit=1",
      session.accessToken,
    );
    if (!response.ok) throw new Error("Account lookup failed");
    const accounts = (await response.json()) as Account[];
    const account = accounts[0];
    if (!account) {
      return NextResponse.json({ error: "Only approved customers can receive this email." }, { status: 409, headers });
    }

    await sendApprovalEmail(account, "brown-derby-approval-resend-" + randomUUID());
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) {
    console.error("Unable to resend customer approval notification:", error);
    return NextResponse.json({ error: "Approval email could not be sent. Please try again." }, { status: 502, headers });
  }
}
