import { NextRequest, NextResponse } from "next/server";
import { getDraftForUser, updateDraftNotes } from "../../../../lib/order-server";
import { getSession, portalConfigured, sameOrigin } from "../../../../lib/portal";

export async function GET() {
  if (!portalConfigured()) {
    return NextResponse.json({ error: "Customer portal is not configured." }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const order = await getDraftForUser(session.user.id, session.accessToken);
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unable to load the draft order." }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 2000) : "";

  try {
    const order = await updateDraftNotes(
      session.user.id,
      session.accessToken,
      notes
    );
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unable to save order notes." }, { status: 502 });
  }
}
