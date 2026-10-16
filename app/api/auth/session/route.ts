import { NextResponse } from "next/server";
import { customerSnapshot, getSession, portalConfigured } from "../../../../lib/portal";

export const dynamic = "force-dynamic";

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
    approvalStatus: session.approvalStatus,
    pricingApproved: session.pricingApproved,
    isAdmin: session.isAdmin,
    user: {
      id: session.user.id,
      email: customer.email,
      businessName: customer.businessName,
      contactName: customer.contactName,
    },
  }, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
