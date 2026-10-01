# CS2 Tracker

Two independently deployable TypeScript apps: a Next.js dashboard on **Vercel** and an Express API with background demo parsing on **Render** (or Railway). Supabase provides PostgreSQL, public dashboard reads, and authentication for replay submissions.

**Start with [the architecture and deployment guide](docs/architecture-and-setup.md).** For the existing repository, use [the current deployment checklist](docs/deploy-current-repository.md).

Open `/demo` for an interactive presentation dashboard with clearly labeled fictional data. Real player pages still use Supabase.

```text
frontend/           Next.js App Router; publish as cs2-tracker-web
backend/            Express API + isolated parser processes; publish as cs2-tracker-api
  db/001_initial.sql  Supabase schema, durable queue, read policies
  render.yaml        Render Blueprint for the standalone backend repository
  Dockerfile         Node 24, native CS2 parser, bzip2
render.yaml         Render Blueprint for this combined source repository
```

## Parser dependency correction

`@opensafe/demofile` returned **404 from public npm** when this scaffold was created. This implementation uses the available CS2 parser **`@laihoe/demoparser2@0.42.0`**. It does **not** claim to implement the unavailable package's API. The integration is isolated in `backend/src/parser.ts`; a verified private package can replace it without changing the API or database. The unrelated `demofile` package targets CS:GO and is not used.

## Local development

Requires Node 24, npm, `bzip2`, and a Supabase project. Apply `backend/db/001_initial.sql` first. Fill in the sample environments with your project settings; never commit credentials.

```bash
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

In another terminal:

```bash
cd backend
cp .env.example .env
npm ci
npm run dev
```

The frontend uses port 3000; the API uses 3001. The API requires a TLS PostgreSQL connection and the schema to exist before starting. See the guide for Supabase certificates and email sign-in configuration.

## Checks

Run in **each** app directory:

```bash
npm ci
npm run build
npm test
```

Backend tests exercise API authentication boundaries, job ownership, queue retries and lease recovery, atomic imports, public read policies, URL restrictions, stream limits, and parser output normalization. SQL tests use PGlite; they do not require a hosted Supabase project. A real replay, hosted auth, and deployment smoke tests remain separate operational checks.
