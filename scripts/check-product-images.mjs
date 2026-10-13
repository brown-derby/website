import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const catalog = JSON.parse(await readFile(new URL('../data/products.json', import.meta.url), 'utf8'));
const approved = JSON.parse(await readFile(new URL('../data/approved-product-images.json', import.meta.url), 'utf8'));
const master = new Map(catalog.map(p => [p.id, p]));
assert.equal(master.size, catalog.length, 'Master IDs must be unique');
for (const [id, image] of Object.entries(approved)) {
  assert.equal(image.status, 'approved', `${id}: unapproved proposal in public manifest`);
  assert.equal(image.productId, id, `${id}: identity mismatch`);
  assert.equal(image.productName, master.get(id)?.name, `${id}: stale or incorrect product name`);
  assert.equal(image.matchConfirmed, true, `${id}: missing product verification`);
  assert.equal(image.usageConfirmed, true, `${id}: missing image-use verification`);
  assert.ok(image.approvalId && image.approvedBy && image.approvedAt && image.candidateId, `${id}: missing approval audit`);
  assert.match(image.sha256, /^[0-9a-f]{64}$/);
  assert.match(image.imageUrl, new RegExp(`^/product-images/${image.sha256}\\.(jpg|png|webp)$`));
  const bytes = await readFile(new URL(`../public${image.imageUrl}`, import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), image.sha256, `${id}: image bytes changed after approval`);
}
console.log(`Product image checks passed: ${catalog.length} inventory IDs, ${Object.keys(approved).length} explicitly approved images.`);
