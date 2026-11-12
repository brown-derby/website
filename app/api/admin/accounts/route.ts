import { NextRequest, NextResponse } from "next/server";
import { sendApprovalEmail } from "../../../../lib/approval-email";
import { databaseRequest, getSession, sameOrigin } from "../../../../lib/portal";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

type Account = {
  user_id: string;
  email: string;
  business_name: string;
  contact_name: string;
  status: "pending" | "approved" | "declined";
  reviewed_at: string | null;
};

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

    // Read the customer record using the server-verified administrator session.
    // Never accept a recipient email from the browser.
    const accountResponse = await databaseRequest(
      "customer_accounts?select=user_id,email,business_name,contact_name,status,reviewed_at" +
        "&user_id=eq." + encodeURIComponent(body.userId) + "&limit=1",
      session.accessToken,
    );
    if (!accountResponse.ok) throw new Error("Account lookup failed");
    const accounts = (await accountResponse.json()) as Account[];
    const account = accounts[0];
    if (!account) {
      return NextResponse.json({ error: "Customer account not found." }, { status: 404, headers });
    }

    // No new approval means no duplicate account-ready email.
    if (account.status === body.decision) {
      return NextResponse.json({ ok: true, unchanged: true, notification: "not_needed" }, { headers });
    }

    const response = await databaseRequest("rpc/review_customer_account", session.accessToken, {
      method: "POST", body: JSON.stringify({ account_id: body.userId, decision: body.decision }),
    });
    if (!response.ok) throw new Error("Account review failed");

    if (body.decision !== "approved") {
      return NextResponse.json({ ok: true, notification: "not_needed" }, { headers });
    }

    // The approval has been committed; a mail-provider failure must not undo it.
    // Tie the idempotency key to the preceding review to avoid duplicate sends
    // from overlapping approval requests without suppressing later reapprovals.
    const previousReview = account.reviewed_at
      ? String(Date.parse(account.reviewed_at))
      : "initial";
    const idempotencyKey = "brown-derby-approval-" + account.user_id + "-" + previousReview;
    try {
      await sendApprovalEmail(account, idempotencyKey);
      return NextResponse.json({ ok: true, notification: "sent" }, { headers });
    } catch (error) {
      console.error("Account approved, but notification email failed:", error);
      return NextResponse.json({ ok: true, notification: "failed" }, { headers });
    }
  } catch {
    return NextResponse.json({ error: "Unable to save approval. Please refresh and try again." }, { status: 503, headers });
  }
}
