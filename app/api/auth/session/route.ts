import { NextResponse } from "next/server";
import { customerSnapshot, getSession, portalConfigured } from "../../../../lib/portal";

export async function GET() {
  if (!portalConfigured()) {
    return NextResponse.json({ configured: false, authenticated: false });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ configured: true, authenticated: false }, { status: 401 });
  }

  const customer = customerSnapshot(session.user);
  return NextResponse.json({
    configured: true,
    authenticated: true,
    user: {
      id: session.user.id,
      email: customer.email,
      businessName: customer.businessName,
      contactName: customer.contactName,
    },
  });
}
