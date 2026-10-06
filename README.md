# Brown Derby Wholesale Operations Hub

This repository is the foundation for Brown Derby Wholesale's internal operations and automation platform.

## Purpose

The goal is to give Brown Derby one dependable place for small utilities, bookkeeping workflow helpers, process knowledge, and future integrations.

The first utilities are expected to focus on repetitive document work such as PDF splitting and batch file renaming.

## Deployment model

- `main` is the production source of truth.
- Feature work is developed on branches.
- Pull requests run CI before merge.
- Vercel is the production host.
- Once Git integration is connected, pull requests receive Vercel preview deployments and `main` deploys to production.

## Local development

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Verification

```bash
npm run check
npm run build
```

The application also exposes `/api/health` for a lightweight deployment health check.

## Current milestone

**Milestone 1: Production foundation**

1. Clean Next.js application structure
2. CI build gate
3. Vercel Git deployment
4. Stable production URL
5. First useful Brown Derby minitool
