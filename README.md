# JobTrack

A job-application tracker built to replace an Excel spreadsheet. Track applications
through an 18-stage pipeline, drag them across a Kanban board, watch live analytics,
attach documents, and import/export CSV — all computed from a local database.

Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**,
**Prisma**, **Recharts**, and **@dnd-kit**.

## Features

- **Applications table** — search (debounced), filter by status / platform / work
  mode / role type, sort, removable filter chips, and a slide-in detail drawer.
- **Kanban board** (`/board`) — five pipeline columns (Applied · Interviewing ·
  Assessment · Offer · Closed). Drag a card to a column and pick the exact status;
  changes persist and record a status-history event. Tap a card's ⇄ button on mobile.
- **Dashboard** (`/dashboard`) — stat cards and live charts (status breakdown,
  platform donut, work-mode / role-type, applications-over-time, upcoming deadlines).
- **Documents** — upload PDF / DOCX / TXT (max 10 MB) per application, download, delete.
- **CSV import/export** — import from your existing spreadsheet (headers are
  auto-matched, rows are validated and previewed); export everything back to CSV.
- **Dark mode** (persisted), consistent status/platform/work-mode color coding
  everywhere, and full responsive layout down to mobile.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `n` | Open the Add Application modal |
| `/` | Focus the search box |

## Getting started

Requires **Node.js 18.17+**.

```bash
# 1. Install dependencies
npm install

# 2. Create the environment file
echo 'DATABASE_URL="file:./dev.db"' > .env

# 3. Create the database, run migrations, and generate the Prisma client
npx prisma migrate dev

# 4. (Optional) Seed 5 sample applications
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

### Useful scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:seed` | Reset and reseed sample data |
| `npx prisma studio` | Browse the database in a GUI |

## Project structure

```
prisma/
  schema.prisma        # Application, Document, StatusEvent models
  seed.ts              # sample data
src/
  app/
    api/               # route handlers (applications, documents, import, export)
    board/  dashboard/ # pages
    layout.tsx page.tsx
  components/          # UI (applications, board, dashboard, ui primitives)
  lib/
    db.ts              # Prisma client singleton
    constants.ts       # dropdown values + color families (single source of truth)
    validation.ts      # Zod schemas shared by client and server
    csv.ts  dashboard.ts  status-groups.ts  format.ts
uploads/               # uploaded documents (gitignored)
```

Uploaded files are stored on local disk under `uploads/{applicationId}/`. For a
real deployment you'd swap this for object storage (S3/R2); the database only keeps
the metadata and relative path.

## Switching from SQLite to PostgreSQL

The schema uses only portable column types, so moving to Postgres is a config change:

1. **Point the datasource at Postgres** in `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

2. **Update the connection string** in `.env`:

   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/jobtrack?schema=public"
   ```

3. **Regenerate migrations.** The existing migration SQL is SQLite-specific, so
   remove it and create a fresh Postgres migration:

   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name init
   ```

   (No new dependencies needed — the Prisma client supports Postgres natively.)

4. **Reseed if desired:** `npm run db:seed`.

Nothing in the application code references SQLite directly — all database access
goes through Prisma via `src/lib/db.ts`, so no code changes are required.
