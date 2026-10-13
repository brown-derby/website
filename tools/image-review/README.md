# Brown Derby product image review

This is a private local review desk, separate from the public website. Every current catalog item has a queue row. Research proposals never become approvals automatically. Manufacturer candidates are prepared in recorded batches; remaining items are explicitly marked as needing research.

## Open and resume

Python 3.10 or later is required; no third-party Python libraries are needed. Double-click `Open Review Desk.cmd` to launch or resume. The server stays hidden and the desk opens in your browser. Double-click `Close Review Desk.cmd` to stop it without losing decisions. You can also run `python review.py serve` in this folder, then open the printed local address and use Ctrl+C to close it. Decisions persist in `state/review.sqlite3`; cached image bytes live in `state/assets/`.

Search by exact item ID or name, filter by status/category, and navigate 25-item pages. Click the image to inspect the original snapshot. The sticky **Add** button above the product saves one explicit approval immediately and advances to the next ready item. There is no second verification screen or batch approval. The product sheet and approved list in `exports/` update after each decision. The named **Replace approved image** action explicitly approves a replacement while retaining the previous decision in history. Rejections use a reason form.

**Choose another image** uploads a PNG/JPEG/WebP proposal for the selected exact product ID. Uploading preserves existing approvals. Candidates are immutable; corrected metadata or images must be a new proposal. A visual Add decision records image approval, not a claim of licensing permission or proof that uncertain research fields were independently resolved. Source, uncertainty and usage notes remain factual and visible. Legacy verification-form approvals remain valid.

## Import or extend research

The user confirmed the current `data/products.json` catalog as the inventory source on October 13, 2026. `inventory.json` is a price-free snapshot with IDs stored as strings. It must cover the complete active inventory, because imports mark omitted IDs inactive. Regenerate this snapshot from the authoritative catalog before importing changed inventory:

`python review.py init --inventory inventory.json`

Name/category changes invalidate old candidate revisions and withhold old approvals from new exports, preserving the audit history. Reappearing products also require re-verification. A new proposal is needed for the revised row. No SKU normalization, deduplication, inferred brand, or automatic matching takes place.

Add explicitly researched entries to `candidates.json`; each needs the exact `product_id`, a unique `candidate_id`, source metadata, and a `match` entry for SKU, brand, name, flavour, size, format and case pack. Use matched/unknown/ambiguous/mismatch/not_applicable with factual detail. `python review.py seed` caches these HTTPS images as pending proposals. It does not approve. Downloads may need source-specific access; the desktop first batch already contains cached files. Existing candidate IDs cannot be rewritten.

## Product sheet and website sync

The Export product sheet button produces all inventory rows with the **exact original product ID and name**, approval status, and approved image/audit fields. It contains no prices. Import `product_id` as Text in Excel to retain leading zeros. It is a companion image sheet, since there is no separate original workbook in the available artifacts. Do not overwrite pricing columns with this export.

To produce file exports, run `python review.py export`. To stage only currently approved images into a website checkout:

`python review.py sync --website PATH_TO_WEBSITE`

This checks each approval against the destination master ID AND exact name, verifies the reviewed bytes' SHA-256, copies only immutable approved files to `public/product-images/`, and writes `data/approved-product-images.json`. Replacements additionally require `--replace EXACT_PRODUCT_ID` and a recorded human approval of that exact prior candidate. The command refuses mismatches and changed existing files before touching the website. Existing website entries absent from this queue's approvals are preserved; removal is not automatic. Sync does not push, merge or deploy.

The website renders approved images from this separate manifest. The public manifest contains no candidate research or prices. Run `npm run check:images`, `npm run check`, `npm run build`, and `npm run check:seo`; then use the existing GitHub pull request/merge and Vercel deployment workflow. Approval in the local desk does **not** immediately publish or modify a remote workbook. Sync and release remain explicit staged steps. Verify the live deployment after release. No production database/schema or pricing configuration is changed.

## Persistence and limitations

Back up the SQLite database **and** the `state/assets` directory together; the Back up decisions button exports the database only. Do not sync an open database via a consumer cloud drive; use the backup button or stop the server first. The server binds only to 127.0.0.1, validates Host/Origin, requires a same-origin CSRF token for every mutation, and serves only the app and content-addressed image assets. Keep it local. It is a single-computer review desk, not a multi-user hosted admin system.

SQLite audit records and immutable candidates guard against accidental changes through the app, not malicious editing by someone with direct filesystem access. Stale browser decisions and repeated submissions are refused. Image bytes are rechecked on approval and export. User names are self-entered, not authenticated identities. No live manufacturer URL is used by the public website.

The complete inventory image search remains in progress. The initial batches use manufacturer pages and supporting case lists. SKU relationships and packaging versions remain marked uncertain; source availability is not proof of reuse rights. Continue in recorded batches. There is no automated background search, approval, or publishing job.

## Verification

`python -m unittest discover -s tools/image-review -p test_review.py` from the website root exercises decisions, persistence, SKU/name binding, image tampering, inventory changes, replacements and export/sync gates using temporary synthetic fixtures only.
