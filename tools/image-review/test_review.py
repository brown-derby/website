import base64
import json
import tempfile
import unittest
from pathlib import Path
from review import Queue, FIELDS

# Synthetic one-pixel PNG used only in temporary test databases.
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF2sAAAAASUVORK5CYII=')


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.test_base = Path(__file__).resolve().parent
        self.temp = tempfile.TemporaryDirectory(prefix='test-state-', dir=self.test_base)
        self.root = Path(self.temp.name)
        self.queue = Queue(self.root / 'state')
        self.inventory = [{'id': '000123', 'name': 'TEST ITEM 12/250G', 'category': 'Test'}]
        self.queue.inventory(self.inventory)
        self.evidence = {'source_type': 'own_photo', 'source_note': 'Synthetic test fixture only'}
        self.cid = self.queue.add('000123', self.evidence, PNG)
        self.body = {'action': 'approve', 'product_id': '000123', 'candidate_id': self.cid,
                     'revision': 1, 'expected_approved': None, 'reviewer': 'Test fixture',
                     'match_confirmed': True, 'usage_confirmed': True, 'note': 'Synthetic test verification'}

    def tearDown(self):
        self.assertTrue(self.root.resolve().is_relative_to(self.test_base))
        self.temp.cleanup()

    def test_proposals_never_export(self):
        self.assertEqual(self.queue.approved(), {})
        self.assertNotIn(b'/product-images/', self.queue.master_csv())
        self.assertIn(b'000123', self.queue.master_csv())

    def test_all_explicit_confirmations_required(self):
        for key in ('reviewer', 'match_confirmed', 'usage_confirmed', 'note'):
            body = dict(self.body)
            del body[key]
            with self.assertRaises(ValueError):
                self.queue.decide(body)
        self.assertEqual(self.queue.approved(), {})

    def test_wrong_id_and_revision_rejected(self):
        for change in ({'product_id': '123'}, {'revision': 2}, {'expected_approved': 'unexpected'}):
            with self.assertRaises(ValueError):
                self.queue.decide({**self.body, **change})

    def test_approval_persists_and_duplicate_decision_refused(self):
        self.queue.decide(self.body)
        reopened = Queue(self.root / 'state')
        self.assertEqual(reopened.approved()['000123']['productName'], self.inventory[0]['name'])
        with self.assertRaises(ValueError):
            reopened.decide(self.body)

    def test_rejection_never_exports(self):
        self.queue.decide({**self.body, 'action': 'reject', 'note': 'Wrong size'})
        self.assertEqual(self.queue.approved(), {})

    def test_asset_tampering_blocks_decision_and_export(self):
        candidate = self.queue.snapshot()['candidates'][0]
        file = self.root / 'state/assets' / candidate['asset']
        file.write_bytes(b'changed')
        with self.assertRaises(ValueError):
            self.queue.decide(self.body)
        file.write_bytes(PNG)
        self.queue.decide(self.body)
        file.write_bytes(b'changed again')
        with self.assertRaises(ValueError):
            self.queue.approved()

    def test_inventory_change_preserves_history_but_withholds_export(self):
        self.queue.decide(self.body)
        self.queue.inventory([{**self.inventory[0], 'name': 'CHANGED ITEM'}])
        self.assertEqual(self.queue.approved(), {})
        self.assertTrue(self.queue.snapshot()['products'][0]['stale'])
        self.assertEqual(len([e for e in self.queue.snapshot()['events'] if e['action'] == 'approve']), 1)

    def test_removal_and_reappearance_require_reverification(self):
        self.queue.decide(self.body)
        self.queue.inventory([])
        self.queue.inventory(self.inventory)
        self.assertEqual(self.queue.approved(), {})

    def test_replacement_requires_two_explicit_boundaries(self):
        self.queue.decide(self.body)
        website = self.root / 'website'
        (website / 'data').mkdir(parents=True)
        (website / 'data/products.json').write_text(json.dumps(self.inventory))
        self.queue.sync(website)
        replacement = self.queue.add('000123', {**self.evidence, 'source_note': 'Replacement test fixture'}, PNG)
        body = {**self.body, 'candidate_id': replacement, 'expected_approved': self.cid}
        with self.assertRaises(ValueError):
            self.queue.decide(body)
        self.queue.decide({**body, 'replace_confirmed': True})
        with self.assertRaises(ValueError):
            self.queue.sync(website)
        self.assertEqual(self.queue.sync(website, ['000123']), 1)

    def test_sync_exact_name_preflight_and_immutable_assets(self):
        self.queue.decide(self.body)
        website = self.root / 'website'
        (website / 'data').mkdir(parents=True)
        master = website / 'data/products.json'
        master.write_text(json.dumps([{**self.inventory[0], 'name': 'DIFFERENT PRODUCT'}]))
        with self.assertRaises(ValueError):
            self.queue.sync(website)
        self.assertFalse((website / 'public').exists())
        master.write_text(json.dumps(self.inventory))
        self.assertEqual(self.queue.sync(website), 1)
        manifest = json.loads((website / 'data/approved-product-images.json').read_text())
        image = website / 'public' / manifest['000123']['imageUrl'].lstrip('/')
        self.assertEqual(image.read_bytes(), PNG)
        image.write_bytes(b'changed existing approved image')
        with self.assertRaises(ValueError):
            self.queue.sync(website)

    def test_catalog_duplicate_ids_refused(self):
        with self.assertRaises(ValueError):
            self.queue.inventory(self.inventory * 2)
        with self.assertRaises(ValueError):
            self.queue.inventory([{**self.inventory[0], 'id': 123}])

    def test_candidates_and_audit_are_immutable(self):
        with self.queue.connect() as db:
            for sql in ("UPDATE candidates SET payload='{}'", "UPDATE events SET action='approve'", 'DELETE FROM events'):
                with self.assertRaises(Exception):
                    db.execute(sql)


if __name__ == '__main__':
    unittest.main()
