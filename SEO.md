# Technical SEO maintenance

The public SEO package uses `https://brownderby.ca` as its canonical origin. This change was prepared against commit `e65d1cad4f4fdb440e775d79e43428059424eaf2` after inspecting the repository and production website. At that baseline, the four public pages shared a title, had no canonical links or business JSON-LD, and `/sitemap.xml` and `/robots.txt` returned 404.

## Sitemap scope

`app/sitemap.ts` lists only the following 12 public URLs. It deliberately omits modification dates because the repository does not provide reliable page modification timestamps.

| Page | Sitemap URL |
| --- | --- |
| Homepage | `https://brownderby.ca/` |
| Products | `https://brownderby.ca/products` |
| About | `https://brownderby.ca/about` |
| Contact | `https://brownderby.ca/contact` |
| Food & Grocery | `https://brownderby.ca/products/food-grocery` |
| Beverages | `https://brownderby.ca/products/beverages` |
| Candy & Chocolate | `https://brownderby.ca/products/candy-chocolate` |
| Snacks | `https://brownderby.ca/products/snacks` |
| Packaging & Disposables | `https://brownderby.ca/products/packaging-disposables` |
| Cleaning & Janitorial | `https://brownderby.ca/products/cleaning-janitorial` |
| Baking & Foodservice Ingredients | `https://brownderby.ca/products/baking-foodservice-ingredients` |
| Restaurant Equipment & Smallwares | `https://brownderby.ca/products/restaurant-equipment-smallwares` |

## Implementation conventions

- `lib/seo.ts` owns the canonical origin and `pageMetadata(title, description, path)`. Each public page supplies its own title, description and path, which also determine Open Graph and Twitter metadata. The root layout sets `metadataBase` and a fallback title template; it does not set a canonical that child pages could inherit incorrectly.
- `app/components/BusinessSchema.tsx` supplies the JSON-LD used on the homepage and contact page. It describes one business as both `LocalBusiness` and `Organization`, plus a linked `WebSite`. Confirmed details are Brown Derby Wholesale Ltd., 22 Hardy Avenue, Grand Falls-Windsor, NL A2A 2P9, Canada, phone +1-709-489-2299, the canonical website and the existing logo. JSON is escaped for safe inclusion in HTML. No ratings, reviews, opening hours or geographic coordinates are invented.
- `/account`, `/login` and `/reset-password` have distinct metadata, self canonicals and `noindex, follow`. They remain crawlable so search engines can read those directives. `app/robots.ts` allows public crawling, disallows `/api/` and identifies the canonical sitemap. Robots directives are separate from the existing portal authentication.
- `lib/categories.ts` is the reviewed category allowlist and copy source. A category needs useful copy and a real catalog range before inclusion. The category route renders products in the initial HTML, uses request-time rendering so dated Program prices are evaluated at request time, and preserves the existing catalog filtering and ordering controls. Unknown category slugs return 404.
- No bulk product pages, search-result routes or arbitrary filter routes are generated. Catalog query URLs canonicalize to `/products`; private reset URLs canonicalize without their query parameters.

## Verification and release

Run the checks from the repository root:

```bash
npm ci
npm run check
npm run build
npm run check:seo
```

`check:seo` uses the completed production build and starts its own local server. It checks all 12 public pages for successful responses, distinct metadata, canonical URLs and server-rendered category tables; parses the business JSON-LD; and checks the sitemap, robots file, private noindex directives, query canonicals and unknown-category 404s. It stops the server when finished.

Review the change in a pull request before merging to `main`. Production deploys automatically from `main` through Vercel. After deployment, check the live sitemap, robots file and representative public/category pages before submitting the sitemap to Google.

For read-only checks against a deployed site, pass its origin without a path or query string:

```bash
npm run check:seo -- https://brownderby.ca
```

The same check can optionally run against `https://www.brownderby.ca` or a preview origin; expected canonical URLs always remain on `https://brownderby.ca`. This change does not alter the www redirect or DNS policy. Browser smoke checks use isolated mock session and draft responses, without accessing a real customer's account or submitting an order.

The pinned dependency installation reported six audit vulnerabilities, including one critical finding. Dependency remediation is a separate maintenance item; this SEO change does not upgrade package versions.

## Owner-managed Google and directory tasks

No Google Business Profile or DNS settings were changed by this implementation.

1. In Google Business Profile, verify the business address and postal code against **22 Hardy Avenue, Grand Falls-Windsor, NL A2A 2P9**, the phone **709-489-2299**, and website **https://brownderby.ca**. Confirm the actual business category and hours, and add current, authentic business photos and the logo. These updates require the owner's profile access.
2. Establish or confirm Search Console ownership through the owner's account. DNS verification, if needed, remains owner-managed and requires express approval before any DNS change.
3. After the pull request is merged and the production deployment is verified, submit **https://brownderby.ca/sitemap.xml** in Search Console.
4. Use Google's Rich Results Test and Search Console URL Inspection on the homepage, contact page and representative category pages. Confirm that Google sees the intended canonical URLs and rendered content, then request indexing or a recrawl where appropriate.
5. Keep business name, address, phone and website consistent in relevant directory listings, and run review requests through the business's normal customer process. Directory updates and customer outreach remain owner-managed.
