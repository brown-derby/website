import { NextRequest, NextResponse } from "next/server";
import { databaseRequest, getSession, sameOrigin } from "../../../../lib/portal";
import { generateIntacctOrderCsv, parseCustomerExport, type ExportOrder, type IntacctCustomer } from "../../../../lib/intacct";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };

async function adminSession() {
  const session = await getSession();
  if (!session || !session.isAdmin) return null;
  return session;
}

async function readRows<T>(path: string, token: string): Promise<T[]> {
  const response = await databaseRequest(path, token);
  if (!response.ok) throw new Error("Unable to access Intacct integration data.");
  return await response.json() as T[];
}

async function rpc(path: string, token: string, data: Record<string, unknown>) {
  const response = await databaseRequest("rpc/" + path, token, {
    method: "POST", body: JSON.stringify(data)
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (/23505|duplicate key/i.test(detail)) {
      throw new Error("This order has already been exported. Check Intacct before trying again.");
    }
    throw new Error("Unable to save the change. Please check the data and try again.");
  }
  return response;
}

export async function GET() {
  const session = await adminSession();
  if (!session) {
    return NextResponse.json({ error: "Administrator access required." }, {
      status: 403, headers: privateHeaders,
    });
  }
  try {
    const token = session.accessToken;
    const [accounts, customers, orders, exports] = await Promise.all([
      readRows("customer_accounts?select=user_id,email,business_name,contact_name,status,intacct_customer_id&order=business_name.asc&limit=2000", token),
      readRows<IntacctCustomer>("intacct_customers?select=customer_id,customer_name,term_name,email,secondary_email,city,province,postal_code&order=customer_name.asc&limit=5000", token),
      readRows<ExportOrder>("orders?select=id,user_id,status,submitted_at,notes,customer_business_name,order_items(product_id,product_name,quantity,unit_price,item_notes)&status=eq.submitted&order=submitted_at.desc&limit=300", token),
      readRows("intacct_order_exports?select=order_id,customer_id,reference_no,exported_at,imported_at,intacct_document_no&limit=1000", token),
    ]);
    return NextResponse.json({ accounts, customers, orders, exports }, { headers: privateHeaders });
  } catch {
    return NextResponse.json({ error: "Could not load Intacct admin data. The database migration may not be installed." }, {
      status: 503, headers: privateHeaders,
    });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403, headers: privateHeaders });
  }
  const session = await adminSession();
  if (!session) {
    return NextResponse.json({ error: "Administrator access required." }, {
      status: 403, headers: privateHeaders,
    });
  }
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body.action !== "string") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers: privateHeaders });
    }
    const token = session.accessToken;

    if (body.action === "importCustomers") {
      if (typeof body.csv !== "string") throw new Error("Upload a customer CSV export.");
      const parsed = parseCustomerExport(body.csv);
      let processed = 0;
      for (let start = 0; start < parsed.length; start += 500) {
        const response = await rpc("admin_upsert_intacct_customers", token, {
          rows: parsed.slice(start, start + 500)
        });
        processed += Number(await response.json());
      }
      return NextResponse.json({ imported: processed }, { headers: privateHeaders });
    }

    if (body.action === "saveMatch") {
      if (typeof body.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.userId) ||
          (body.customerId !== null && (typeof body.customerId !== "string" || body.customerId.length > 21))) {
        throw new Error("Choose a valid website account and Intacct customer.");
      }
      await rpc("admin_set_intacct_customer", token, {
        account_id: body.userId, customer_id: body.customerId
      });
      return NextResponse.json({ ok: true }, { headers: privateHeaders });
    }

    if (body.action === "confirmImport") {
      if (typeof body.orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.orderId) ||
          typeof body.documentNo !== "string" || !body.documentNo.trim()) {
        throw new Error("Enter the order and its actual Intacct document number.");
      }
      await rpc("admin_confirm_intacct_import", token, {
        target_order_id: body.orderId, document_no: body.documentNo.trim()
      });
      return NextResponse.json({ ok: true }, { headers: privateHeaders });
    }

    if (body.action === "exportOrder") {
      if (typeof body.orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.orderId)) {
        throw new Error("Choose a valid website order.");
      }
      const orderRows = await readRows<ExportOrder>(
        "orders?select=id,user_id,status,submitted_at,notes,order_items(product_id,product_name,quantity,unit_price,item_notes)&id=eq." +
          encodeURIComponent(body.orderId) + "&status=eq.submitted&limit=1", token
      );
      const order = orderRows[0];
      if (!order) throw new Error("Submitted website order not found.");
      const accountRows = await readRows<{ intacct_customer_id: string | null; status: string }>(
        "customer_accounts?select=intacct_customer_id,status&user_id=eq." +
          encodeURIComponent(order.user_id) + "&limit=1", token
      );
      const account = accountRows[0];
      if (account?.status !== "approved" || !account.intacct_customer_id) {
        throw new Error("Match this approved website account to an Intacct customer first.");
      }
      const customerRows = await readRows<IntacctCustomer>(
        "intacct_customers?select=customer_id,customer_name,term_name,email,secondary_email,city,province,postal_code&customer_id=eq." +
          encodeURIComponent(account.intacct_customer_id) + "&limit=1", token
      );
      if (!customerRows[0]) throw new Error("Matched Intacct customer is missing.");
      // Validate and build before reserving. Only one download per order is allowed.
      const csv = generateIntacctOrderCsv(order, customerRows[0]);
      await rpc("admin_reserve_intacct_export", token, { target_order_id: order.id });
      return new NextResponse(csv, {
        status: 200,
        headers: {
          ...privateHeaders,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=BrownDerby-WebOrder-" +
            order.id.slice(0, 8) + ".csv",
        },
      });
    }

    return NextResponse.json({ error: "Unknown action." }, {
      status: 400, headers: privateHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete request.";
    return NextResponse.json({ error: message }, {
      status: /already been exported/.test(message) ? 409 : 400, headers: privateHeaders,
    });
  }
}
