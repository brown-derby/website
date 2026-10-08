# Brown Derby Wholesale Website

Customer-facing website for Brown Derby Wholesale Ltd.

## Purpose

This repository is for the public Brown Derby website: brand, company information, product discovery, and the foundation for future customer accounts and online ordering.

Internal bookkeeping and automation tools should live in a separate application/project.

## Current milestone

1. Branded public website
2. Product catalog structure
3. Real Brown Derby product data
4. Customer account/login
5. Customer-specific pricing and ordering
6. Order submission and back-office integration

## Development

```bash
npm ci
npm run dev
```

## Verification

```bash
npm run check
npm run build
npm run check:seo
```

The SEO check uses the production build and starts and stops its own local server. See [SEO.md](SEO.md) for the sitemap allowlist, metadata and schema conventions, dependency audit follow-up, and owner-managed Google tasks.

Production is deployed automatically from `main` through Vercel. Review feature work in a pull request before merging to `main`, then verify the live deployment.
