# Brown Derby website → Sage Intacct Sales Orders (without the Sage API)

**Status:** CSV preparation is implemented for an administrator. **Direct Sage posting is deliberately not activated.** The first live import must be verified manually before configuring unattended Windows UI automation.

## What happens

1. A customer submits a website order. The website stores the submitted items, quantities and per-unit prices in Supabase.
2. At \`https://brownderby.ca/account\`, an authorized administrator opens **Sage Intacct integration**.
3. An approved portal account must be linked to a verified Sage Customer ID. Suggested email/business-name matches are **not** automatically accepted.
4. The administrator chooses a **Due/Ship date**, checks older orders in Sage, and downloads one Sales Order CSV.
5. The first download reserves the order in the database and stores the exact CSV bytes. If the download is lost, **Download same CSV again** retrieves the original file rather than regenerating it with updated prices/customer data.
6. An authorized staff member imports that CSV through Sage Intacct's Order Entry transaction import screen. No Sage API is used.
7. After verifying the actual Sales Order in Sage, the administrator enters the Sage document number in the website and chooses **Mark imported**.

A CSV being **exported** is **not evidence of an import**. The website reports an order as confirmed only when staff record the actual Sage document number after verifying it. The web order reference is \`WEB-\` followed by the full UUID without hyphens; it is a traceable reference, **not** a Sage-enforced idempotency key.

## Before the first test

- Export a **current** Order Entry transaction CSV template from the Brown Derby company in Sage: **Order Entry → All → Transactions → Sales Orders → Import → Download template** (menu names depend on permissions/configuration). Compare its field/header list with \`lib/intacct-template.ts\`. Sage templates can change.
- Confirm the exact Order Entry transaction definition name is **Sales Order**. The CSV is generated as **Draft**, never **Post**.
- Confirm Order Entry document auto-numbering allows a blank \`DOCUMENTNO\`. Otherwise configure numbering or adapt the exporter *before* importing.
- Confirm the appropriate \`GLPOSTINGDATE\`, \`EXCHRATEDATE\`, tax/surcharge, \`REVREC_TEMPLATE\`, \`LOCATIONID\`, and kit/lot/serial fields for the configured transaction definition. Conditional fields may be mandatory for Brown Derby even if optional in the generic template.
- Confirm warehouse **WH001**, unit **Each**, and that all website product IDs correspond exactly to Intacct Item IDs.
- Do not treat the \`DATEDUE\` field as a payment-terms calculation. For Order Entry the Sage label is **Due Date/Ship Date**. The administrator chooses this explicitly; **TERMNAME** stays the customer's exact mapped Sage term (e.g., \`NET7\`).
- Verify Sage's tax and unit pricing results in the Draft against the website submission before accepting the import.
- Orders submitted **before Nov 23, 2026 00:00 Newfoundland standard time** are considered historical. Check Sage by customer/date/items for any manually entered matching orders, then explicitly acknowledge the duplicate review before exporting. Historical orders are **never** silently auto-queued.

## One-order pilot checklist

1. Use one new approved test account with a **confirmed** Sage customer mapping; keep it a low-risk non-sensitive order.
2. Submit the website order. Save its website order UUID and the original submitted item/price/quantity summary.
3. In **/account → Sage Intacct integration**, confirm that exact order appears in the order queue. Set the correct Due/Ship date and download its CSV.
4. Open the CSV as plain text (do **not** resave it in Excel) and verify \`TRANSACTIONTYPE\`, \`CUSTOMER_ID\`, \`LINE\`, \`ITEMID\`, \`QUANTITY\`, \`UNIT\`, \`WAREHOUSEID\`, \`PRICE\`, \`TERMNAME\`, \`DATEDUE\`, \`STATE\`, and \`REFERENCENO\`.
5. Sign in to Sage Intacct and import the one CSV. Review the import response; if there is an error or ambiguous result, **search Sage for the website reference and customer before any retry**. Do not post/re-import blindly.
6. Open the created Draft Sales Order. Verify correct customer, date, item counts, quantities, pricing, line notes, tax treatment, total, and that Sage numbering is correct.
7. Only after that verification, enter the real Sage Sales Order number in the website and select **Mark imported**. Confirm the order no longer offers an import.
8. Test download recovery on a **different unimported** test order: download once, choose **Download same CSV again**, and confirm byte-for-byte equality without importing twice.

**Production activation gate:** one verified pilot and agreement on tax, document numbering, shipping date, and exception handling.

## Windows-based automation after the pilot

The planned no-API implementation is a dedicated Windows desktop automation (for example, Microsoft Power Automate Desktop) using a properly authorized signed-in Sage session:

- Retrieve a single ready website CSV from the admin queue, not customer email.
- Check Sage for an existing order with the same external reference **before** importing.
- Upload the frozen CSV using the visible Sage Intacct Order Entry interface.
- Wait for the import result, open the resulting Draft Sales Order, and verify required header/line values.
- Record the verified Sage document number against that website order; raise a visible exception if any step fails.
- Require manual reconciliation after timeouts or ambiguous upload responses. Never automatically submit the same CSV twice just because a UI automation timed out.
- Keep operating-system credentials out of scripts, browser source and the GitHub repository; use Windows Credential Manager and MFA.

**Do not configure unattended desktop clicks until actual Sage screens, fields and confirmation signals have been captured and tested.** The website must never report \`imported\` solely because a CSV was downloaded or a file dialog was dismissed.

## Technical details

- Current code: \`lib/intacct.ts\`, \`app/api/admin/intacct/route.ts\`, \`app/account/IntacctAdmin.tsx\`.
- Initial DB integration: \`supabase/intacct-integration.sql\`.
- Apply the additive \`supabase/intacct-export-safety.sql\` migration **before** deploying the updated admin route.
- CSV tests: \`npm run check:intacct\` (asserts 139-column header, independent Due/Ship date, terms, quantity, prices, draft state, notes, and invalid inputs).
- Import source of truth: the order record and the byte-for-byte CSV snapshot, linked to a unique website UUID.
- The admin-only CSV contains sensitive commercial/customer information. It must not be publicly published or logged.

Official Sage reference: https://www.intacct.com/ia/docs/en_US/help_action/More/Uploading_Data/OrderEntry/import-OE-transactions.htm
