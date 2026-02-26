# Convex Studio

A DevTools dashboard for managing, monitoring, and comparing multiple Convex deployments from a single interface.

## Features

- **Deployment Management** — Add, remove, and monitor Convex deployments with connection status checks
- **Log Viewer** — Real-time log streaming with filtering by deployment, severity level, and full-text search
- **Schema Diff** — Compare schemas between two deployments with color-coded diff visualization (added/removed/changed)
- **Data Browser** — Browse documents across deployments with pagination and side-by-side comparison mode
- **Authentication** — Clerk-powered auth with per-user data isolation
- **Dark Mode** — Dark theme enabled by default

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript (strict)
- **Backend:** Convex (real-time database + serverless functions)
- **Auth:** Clerk (JWT integration with Convex)
- **UI:** shadcn/ui + Tailwind CSS 4 + Radix UI
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account and project
- A [Clerk](https://clerk.com) account and application

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Sign-in page path (`/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Sign-up page path (`/sign-up`) |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk JWT issuer domain for Convex auth |

### 3. Set up Convex

```bash
npx convex dev
```

This will push the schema and functions to your Convex deployment and generate TypeScript types.

### 4. Configure Clerk + Convex integration

In your Clerk dashboard, create a JWT template for Convex with the issuer domain matching `CLERK_JWT_ISSUER_DOMAIN`.

### 5. Run the development server

```bash
npm run dev
```

This starts both the Next.js frontend and the Convex backend in parallel. Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  dashboard/
    page.tsx              # Dashboard overview with stats
    deployments/page.tsx  # Deployment management (CRUD)
    logs/page.tsx         # Log viewer with filters
    schema-diff/page.tsx  # Schema comparison tool
    data-browser/page.tsx # Document browser
  sign-in/                # Clerk sign-in page
  sign-up/                # Clerk sign-up page
components/
  app-sidebar.tsx         # Navigation sidebar
  providers.tsx           # Clerk + Convex provider wrapper
  ui/                     # shadcn/ui components
convex/
  schema.ts               # Database schema (deployments, logs, cachedSchemas)
  deployments.ts          # Deployment CRUD queries/mutations
  logs.ts                 # Log queries/mutations
  schemas.ts              # Schema caching queries/mutations
  deploymentApi.ts        # HTTP actions for external deployment communication
  auth.config.ts          # Clerk JWT auth configuration
```

## Database Schema

- **deployments** — Stores deployment connection info (name, URL, deploy key, environment, status)
- **logs** — Log entries tied to deployments (level, message, function name, request ID)
- **cachedSchemas** — Cached schema JSON per deployment for diffing

All tables include `userId` for multi-tenancy isolation.

## Deployment

Deploy the Next.js frontend to [Vercel](https://vercel.com):

```bash
npm run build
```

Convex functions are deployed via:

```bash
npx convex deploy
```

## License

MIT
