"""Local, persistent, human-only product image review. Python standard library."""
import argparse
import base64
import csv
import hashlib
import io
import json
import mimetypes
import re
import secrets
import sqlite3
import sys
import threading
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
FIELDS = ("sku", "brand", "product_name", "flavor", "size", "format", "case_pack")


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def image_extension(data):
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    raise ValueError("Upload a PNG, JPEG, or WebP image (SVG and HTML are not accepted).")


def https_url(value):
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Source links must be HTTPS URLs without credentials.")
    return value


class Queue:
    def __init__(self, folder):
        self.folder = Path(folder)
        self.folder.mkdir(parents=True, exist_ok=True)
        (self.folder / "assets").mkdir(exist_ok=True)
        self.path = self.folder / "review.sqlite3"
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS products(
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
                    revision INTEGER NOT NULL DEFAULT 1, active INTEGER NOT NULL DEFAULT 1,
                    approved_candidate TEXT, stale INTEGER NOT NULL DEFAULT 0);
                CREATE TABLE IF NOT EXISTS candidates(
                    id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id),
                    product_revision INTEGER NOT NULL, payload TEXT NOT NULL,
                    asset TEXT, sha256 TEXT, status TEXT NOT NULL DEFAULT 'pending',
                    created_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS events(
                    id TEXT PRIMARY KEY, product_id TEXT NOT NULL, candidate_id TEXT,
                    action TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
                CREATE INDEX IF NOT EXISTS candidates_product ON candidates(product_id);
                CREATE TRIGGER IF NOT EXISTS immutable_candidate BEFORE UPDATE OF
                    product_id,product_revision,payload,asset,sha256 ON candidates
                    BEGIN SELECT RAISE(ABORT,'Candidates are immutable; add a new proposal.'); END;
                CREATE TRIGGER IF NOT EXISTS immutable_event_update BEFORE UPDATE ON events
                    BEGIN SELECT RAISE(ABORT,'Audit events are immutable.'); END;
                CREATE TRIGGER IF NOT EXISTS immutable_event_delete BEFORE DELETE ON events
                    BEGIN SELECT RAISE(ABORT,'Audit events are immutable.'); END;
            """)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        try:
            with db:
                yield db
        finally:
            db.close()

    def event(self, db, pid, cid, action, payload):
        eid = str(uuid.uuid4())
        db.execute("INSERT INTO events VALUES(?,?,?,?,?,?)", (eid, pid, cid, action, json.dumps(payload), now()))
        return eid

    def inventory(self, rows):
        ids = [r["id"] for r in rows]
        if any(not isinstance(i, str) or not i for i in ids) or len(ids) != len(set(ids)):
            raise ValueError("Inventory requires unique, nonempty string IDs. Never coerce SKUs to numbers.")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            for row in rows:
                old = db.execute("SELECT * FROM products WHERE id=?", (row["id"],)).fetchone()
                if old and (old["name"] != row["name"] or old["category"] != row["category"]):
                    self.event(db, row["id"], old["approved_candidate"], "inventory_changed", dict(old))
                    db.execute("UPDATE products SET name=?,category=?,revision=revision+1,stale=1,active=1 WHERE id=?", (row["name"], row["category"], row["id"]))
                elif old:
                    if not old["active"]:
                        # Reappearing rows also require fresh verification.
                        db.execute("UPDATE products SET active=1,stale=1,revision=revision+1 WHERE id=?", (row["id"],))
                else:
                    db.execute("INSERT INTO products(id,name,category) VALUES(?,?,?)", (row["id"], row["name"], row["category"]))
            present = set(ids)
            for row in db.execute("SELECT * FROM products WHERE active=1").fetchall():
                if row["id"] not in present:
                    self.event(db, row["id"], None, "inventory_removed", dict(row))
                    db.execute("UPDATE products SET active=0,stale=1 WHERE id=?", (row["id"],))

    def add(self, pid, payload, data=None, candidate_id=None):
        payload = dict(payload)
        for key in ("source_url", "image_url"):
            if payload.get(key):
                https_url(payload[key])
        if not payload.get("source_type"):
            raise ValueError("Record the source page and source type before adding a candidate.")
        if payload["source_type"] == "own_photo":
            if not str(payload.get("source_note", "")).strip():
                raise ValueError("Record ownership and photo provenance.")
        elif not payload.get("source_url"):
            raise ValueError("Record the source page URL.")
        for source in payload.get("supporting_sources", []):
            https_url(source["url"])
        payload.setdefault("confidence", "unknown")
        payload.setdefault("usage_suitability", "Permission to reuse is unconfirmed.")
        payload.setdefault("ambiguity", "Product identity, packaging and image rights need manual verification.")
        payload.setdefault("match", {})
        for field in FIELDS:
            payload["match"].setdefault(field, {"status": "unknown", "detail": "Not established; verify manually."})
            if payload["match"][field]["status"] not in ("matched", "unknown", "ambiguous", "mismatch", "not_applicable"):
                raise ValueError("Invalid match status.")
        asset = sha = None
        if data:
            if len(data) > 12 * 1024 * 1024:
                raise ValueError("Image exceeds 12 MB.")
            sha = digest(data)
            asset = sha + image_extension(data)
            target = self.folder / "assets" / asset
            if target.exists() and target.read_bytes() != data:
                raise ValueError("Image hash collision; stop and investigate.")
            if not target.exists():
                target.write_bytes(data)
        cid = candidate_id or str(uuid.uuid4())
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            product = db.execute("SELECT * FROM products WHERE id=? AND active=1", (pid,)).fetchone()
            if not product:
                raise ValueError("Product ID is not in the active inventory.")
            existing = db.execute("SELECT * FROM candidates WHERE id=?", (cid,)).fetchone()
            if existing:
                if existing["product_id"] != pid or json.loads(existing["payload"]) != payload or existing["sha256"] != sha:
                    raise ValueError("Candidate ID already exists with different content.")
                return cid
            db.execute("INSERT INTO candidates VALUES(?,?,?,?,?,?,?,?)", (cid, pid, product["revision"], json.dumps(payload), asset, sha, "pending", now()))
            self.event(db, pid, cid, "proposed", {"sha256": sha, "product_revision": product["revision"]})
        return cid

    def verify_asset(self, candidate):
        if not candidate["asset"]:
            raise ValueError("This proposal needs an image snapshot. Upload an image before approving.")
        data = (self.folder / "assets" / candidate["asset"]).read_bytes()
        if digest(data) != candidate["sha256"]:
            raise ValueError("Image bytes changed. Add a new candidate and review it again.")
        image_extension(data)
        return data

    def decide(self, body):
        if body.get("action") not in ("approve", "reject"):
            raise ValueError("Choose approve or reject for one candidate.")
        if not str(body.get("reviewer", "")).strip():
            raise ValueError("Enter your name to record the decision.")
        with self.connect() as db:
            db.execute("BEGIN IMMEDIATE")
            product = db.execute("SELECT * FROM products WHERE id=? AND active=1", (body.get("product_id"),)).fetchone()
            candidate = db.execute("SELECT * FROM candidates WHERE id=?", (body.get("candidate_id"),)).fetchone()
            if not product or not candidate or candidate["product_id"] != product["id"]:
                raise ValueError("Candidate does not belong to this product.")
            if body.get("revision") != product["revision"] or body.get("expected_approved") != product["approved_candidate"]:
                raise ValueError("This product changed in another session. Refresh before deciding.")
            if candidate["product_revision"] != product["revision"] or candidate["status"] != "pending":
                raise ValueError("Candidate is already decided or belongs to an earlier inventory revision.")
            detail = dict(body)
            detail["product_name"] = product["name"]
            detail["reviewer"] = str(body["reviewer"]).strip()
            detail["previous_approved"] = product["approved_candidate"]
            if body["action"] == "approve":
                if body.get("match_confirmed") is not True or body.get("usage_confirmed") is not True:
                    raise ValueError("Explicit product match and image-use confirmations are required.")
                evidence = json.loads(candidate["payload"])
                uncertain = any(x["status"] not in ("matched", "not_applicable") for x in evidence["match"].values())
                if uncertain and not str(body.get("note", "")).strip():
                    raise ValueError("Record how you resolved the uncertain match fields.")
                if product["approved_candidate"] and body.get("replace_confirmed") is not True:
                    raise ValueError("Explicit confirmation is required to replace the existing approved image.")
                self.verify_asset(candidate)
                db.execute("UPDATE products SET approved_candidate=?,stale=0 WHERE id=?", (candidate["id"], product["id"]))
            else:
                if not str(body.get("note", "")).strip():
                    raise ValueError("Record a rejection reason.")
            db.execute("UPDATE candidates SET status=? WHERE id=?", ("approved" if body["action"] == "approve" else "rejected", candidate["id"]))
            return self.event(db, product["id"], candidate["id"], body["action"], detail)

    def snapshot(self):
        with self.connect() as db:
            products = [dict(r) for r in db.execute("SELECT * FROM products WHERE active=1 ORDER BY category,name,id")]
            candidates = []
            for row in db.execute("SELECT * FROM candidates ORDER BY created_at,id"):
                candidate = dict(row)
                candidate["evidence"] = json.loads(candidate.pop("payload"))
                candidates.append(candidate)
            events = [dict(r) for r in db.execute("SELECT * FROM events ORDER BY created_at,id")]
            for event in events:
                event["payload"] = json.loads(event["payload"])
        return {"products": products, "candidates": candidates, "events": events}

    def approved(self):
        entries = {}
        with self.connect() as db:
            for product in db.execute("SELECT * FROM products WHERE active=1 AND stale=0 AND approved_candidate IS NOT NULL"):
                candidate = db.execute("SELECT * FROM candidates WHERE id=?", (product["approved_candidate"],)).fetchone()
                event = db.execute("SELECT * FROM events WHERE candidate_id=? AND action='approve' ORDER BY created_at DESC LIMIT 1", (candidate["id"],)).fetchone()
                if not event or candidate["status"] != "approved" or candidate["product_revision"] != product["revision"]:
                    raise ValueError("Invalid approval state; export refused.")
                decision = json.loads(event["payload"])
                if decision.get("match_confirmed") is not True or decision.get("usage_confirmed") is not True:
                    raise ValueError("Missing explicit approval confirmations.")
                self.verify_asset(candidate)
                evidence = json.loads(candidate["payload"])
                entries[product["id"]] = {
                    "productId": product["id"], "productName": product["name"],
                    "imageUrl": "/product-images/" + candidate["asset"],
                    "candidateId": candidate["id"], "sha256": candidate["sha256"],
                    "approvalId": event["id"], "approvedAt": event["created_at"],
                    "approvedBy": decision["reviewer"], "status": "approved",
                    "sourceUrl": evidence.get("source_url", ""),
                    "sourceType": evidence["source_type"],
                    "sourceNote": evidence.get("source_note", ""), "matchConfirmed": True,
                    "usageConfirmed": True, "previousApproved": decision.get("previous_approved"),
                }
        return entries

    def master_csv(self):
        approved = self.approved()
        snapshot = self.snapshot()
        by_product = {}
        for candidate in snapshot["candidates"]:
            by_product.setdefault(candidate["product_id"], []).append(candidate)
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(["product_id", "product_name", "category", "image_review_status", "approved_image_path", "source_url", "approval_id", "approved_by", "approved_at"])
        for product in snapshot["products"]:
            entry = approved.get(product["id"], {})
            proposals = by_product.get(product["id"], [])
            pending = any(c["status"] == "pending" and c["product_revision"] == product["revision"] for c in proposals)
            status = "approved" if entry else "needs_reverification" if product["stale"] else "pending_review" if pending else "needs_new_proposal" if proposals else "needs_research"
            writer.writerow([product["id"], product["name"], product["category"], status, entry.get("imageUrl", ""), entry.get("sourceUrl", ""), entry.get("approvalId", ""), entry.get("approvedBy", ""), entry.get("approvedAt", "")])
        return output.getvalue().encode("utf-8-sig")

    def sync(self, website, replacements=()):
        website = Path(website).resolve()
        catalog = json.loads((website / "data/products.json").read_text(encoding="utf-8-sig"))
        master = {row["id"]: row for row in catalog}
        if len(master) != len(catalog):
            raise ValueError("Duplicate product IDs in website master.")
        desired = self.approved()
        manifest = website / "data/approved-product-images.json"
        previous = json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists() else {}
        merged = dict(previous)
        assets = []
        for pid, entry in desired.items():
            if pid not in master or master[pid]["name"] != entry["productName"]:
                raise ValueError("Website master ID/name differs for " + pid + "; re-import and review.")
            old = previous.get(pid)
            if old and old != entry and (pid not in replacements or entry["previousApproved"] != old.get("candidateId")):
                raise ValueError("Replacement refused for " + pid + "; confirm in review and pass --replace " + pid)
            asset = Path(entry["imageUrl"]).name
            data = (self.folder / "assets" / asset).read_bytes()
            target = website / "public/product-images" / asset
            if target.exists() and target.read_bytes() != data:
                raise ValueError("Existing approved asset differs; never overwrite it.")
            assets.append((target, data))
            merged[pid] = entry
        # Complete preflight before any website mutation. This only stages files,
        # GitHub review/merge is the existing production publishing boundary.
        for target, data in assets:
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists():
                target.write_bytes(data)
        manifest.parent.mkdir(parents=True, exist_ok=True)
        temporary = manifest.with_suffix(".tmp")
        temporary.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
        temporary.replace(manifest)
        return len(desired)


def serve(queue, port):
    token = secrets.token_urlsafe(32)
    class Handler(BaseHTTPRequestHandler):
        def valid(self, mutation=False):
            expected = "127.0.0.1:" + str(self.server.server_port)
            if self.headers.get("Host") != expected:
                return False
            origin = self.headers.get("Origin")
            if origin and origin != "http://" + expected:
                return False
            if self.headers.get("Sec-Fetch-Site") == "cross-site":
                return False
            return not mutation or (origin == "http://" + expected and secrets.compare_digest(self.headers.get("X-Review-Token", ""), token))

        def send(self, data, mime="application/json", status=200, filename=None):
            if not isinstance(data, bytes):
                data = json.dumps(data).encode()
            self.send_response(status)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; img-src 'self' blob:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
            if filename:
                self.send_header("Content-Disposition", 'attachment; filename="' + filename + '"')
            self.end_headers()
            self.wfile.write(data)

        def do_GET(self):
            if not self.valid():
                return self.send({"error": "Local review access only."}, status=403)
            path = urlparse(self.path).path
            try:
                if path == "/api/queue":
                    return self.send({**queue.snapshot(), "token": token, "application": "brown-derby-image-review"})
                if path == "/api/export/approved":
                    return self.send(queue.approved(), filename="approved-product-images.json")
                if path == "/api/export/master":
                    return self.send(queue.master_csv(), "text/csv; charset=utf-8", filename="product-image-master.csv")
                if path == "/api/export/backup":
                    with queue.connect() as db:
                        temporary = queue.folder / ("backup-" + str(uuid.uuid4()) + ".sqlite3")
                        with sqlite3.connect(temporary) as copy:
                            db.backup(copy)
                    data = temporary.read_bytes()
                    temporary.unlink()
                    return self.send(data, "application/octet-stream", filename="review-backup.sqlite3")
                if path in ("/", "/app.js", "/style.css"):
                    file = ROOT / ("index.html" if path == "/" else path[1:])
                elif path.startswith("/assets/"):
                    name = path.removeprefix("/assets/")
                    if not re.fullmatch(r"[0-9a-f]{64}\.(jpg|png|webp)", name):
                        return self.send({"error": "Image not found."}, status=404)
                    file = queue.folder / "assets" / name
                else:
                    return self.send({"error": "Not found."}, status=404)
                return self.send(file.read_bytes(), mimetypes.guess_type(file.name)[0] or "application/octet-stream")
            except (ValueError, OSError) as error:
                return self.send({"error": str(error)}, status=400)

        def do_POST(self):
            if not self.valid(True):
                return self.send({"error": "Review token and same-origin request required."}, status=403)
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length < 1 or length > 18 * 1024 * 1024:
                    raise ValueError("Invalid request size.")
                body = json.loads(self.rfile.read(length))
                if self.path == "/api/close":
                    self.send({"closed": True})
                    threading.Thread(target=self.server.shutdown, daemon=True).start()
                    return
                if self.path == "/api/decision":
                    return self.send({"event_id": queue.decide(body)})
                if self.path == "/api/candidate":
                    data = base64.b64decode(body["image_base64"], validate=True)
                    return self.send({"candidate_id": queue.add(body["product_id"], body["evidence"], data)})
                return self.send({"error": "Not found."}, status=404)
            except (ValueError, KeyError, TypeError, OSError) as error:
                return self.send({"error": str(error)}, status=400)
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print("Review desk: http://127.0.0.1:" + str(server.server_port), flush=True)
    print("Decisions persist in " + str(queue.path), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["init", "seed", "serve", "export", "sync"])
    parser.add_argument("--state", type=Path, default=ROOT / "state")
    parser.add_argument("--inventory", type=Path, default=ROOT / "inventory.json")
    parser.add_argument("--candidates", type=Path, default=ROOT / "candidates.json")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--website", type=Path)
    parser.add_argument("--replace", action="append", default=[])
    parser.add_argument("--out", type=Path, default=ROOT / "exports")
    args = parser.parse_args()
    queue = Queue(args.state)
    if args.command in ("init", "seed"):
        queue.inventory(json.loads(args.inventory.read_text(encoding="utf-8-sig")))
    if args.command == "seed":
        for proposal in json.loads(args.candidates.read_text(encoding="utf-8-sig")):
            # Explicit research input only. This caches bytes; it never approves.
            url = https_url(proposal["evidence"]["image_url"])
            with urlopen(Request(url, headers={"User-Agent": "BrownDerbyProductReview/1.0"}), timeout=30) as response:
                https_url(response.url)
                data = response.read(12 * 1024 * 1024 + 1)
            queue.add(proposal["product_id"], proposal["evidence"], data, proposal["candidate_id"])
        print("Seeded pending candidates. No approvals created.")
    elif args.command == "serve":
        serve(queue, args.port)
    elif args.command == "export":
        args.out.mkdir(parents=True, exist_ok=True)
        (args.out / "approved-product-images.json").write_text(json.dumps(queue.approved(), indent=2) + "\n", encoding="utf-8")
        (args.out / "product-image-master.csv").write_bytes(queue.master_csv())
        (args.out / "queue.json").write_text(json.dumps(queue.snapshot(), indent=2), encoding="utf-8")
        print("Exported approved images, master sheet and audit queue.")
    elif args.command == "sync":
        if not args.website:
            parser.error("sync requires --website")
        print("Staged", queue.sync(args.website, args.replace), "approved images. Publish through the existing website PR workflow.")
    else:
        print("Inventory imported; no decisions changed.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
