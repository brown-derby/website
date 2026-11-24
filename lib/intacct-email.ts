/** Only called after the authenticated admin route reserves a new frozen export. */
export type CsvEmailStatus = "accepted" | "failed" | "unknown";

export async function sendIntacctCsvEmail(input: {
  orderId: string;
  customerId: string;
  shipDate: string;
  csv: string;
}, request: typeof fetch = fetch): Promise<CsvEmailStatus> {
  const from = process.env.ORDER_EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;
  if (!from || !apiKey) return "failed";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.orderId)) return "failed";
  const reference = "WEB-" + input.orderId.replace(/-/g, "");
  const shortId = input.orderId.slice(0, 8).toUpperCase();
  try {
    const response = await request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": "brown-derby-intacct-csv-" + input.orderId,
      },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        from,
        to: ["csr@brownderby.ca"],
        subject: "Website order " + shortId + " — Sage Intacct CSV",
        text: [
          "The Sage Intacct Sales Order CSV for website order " + shortId + " is attached.",
          "",
          "Reference: " + reference,
          "Sage customer ID: " + input.customerId,
          "Due/Ship date: " + input.shipDate,
          "",
          "This is the exact file reserved for the Windows automation. It is an internal backup, not an additional order or confirmation of import.",
          "Do not import it manually unless the automation is stopped and the WEB reference has been reconciled in Sage.",
        ].join("\n"),
        attachments: [{ filename: reference + ".csv", content: Buffer.from(input.csv, "utf8").toString("base64"), content_type: "text/csv" }],
      }),
    });
    return response.ok ? "accepted" : (response.status >= 500 || response.status === 409 ? "unknown" : "failed");
  } catch {
    // A transport failure does not prove the provider did not accept the email.
    return "unknown";
  }
}
