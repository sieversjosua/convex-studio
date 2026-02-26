# Convex Studio

Open source DevTools dashboard for Convex. Manage, monitor, and compare multiple Convex deployments from a single interface.

## Features

- **Deployment Management** - Add, remove, and monitor Convex deployments with connection status checks
- **Log Viewer** - Real-time log streaming with filtering by deployment, severity level, and full-text search
- **Schema Diff** - Compare schemas between two deployments with color-coded diff visualization (added/removed/changed)
- **Data Browser** - Browse documents across deployments with pagination and side-by-side comparison mode
- **Dark Mode** - Dark theme enabled by default

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript (strict)
- **Backend:** Convex (real-time database + serverless functions)
- **UI:** shadcn/ui + Tailwind CSS 4 + Radix UI
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account and project

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

This will push the schema and functions to your Convex deployment and generate TypeScript types.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  dashboard/
    page.tsx              # Dashboard overview with stats
    deployments/page.tsx  # Deployment management (CRUD)
    logs/page.tsx         # Log viewer with filters
    schema-diff/page.tsx  # Schema comparison tool
    data-browser/page.tsx # Document browser
components/
  app-sidebar.tsx         # Navigation sidebar
  ui/                     # shadcn/ui components
convex/
  schema.ts               # Database schema
  deployments.ts          # Deployment CRUD queries/mutations
  logs.ts                 # Log queries/mutations
  schemas.ts              # Schema caching queries/mutations
  deploymentApi.ts        # HTTP actions for external deployment communication
```

## How It Works

You connect your Convex deployments via their Deploy URL and Deploy Key. Convex Studio then communicates with the Convex Admin API to fetch logs, schemas, and data from your deployments.

## License

MIT
