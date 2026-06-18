# API7 Developer Portal

A customizable developer portal frontend for API7 Enterprise, built with Next.js 16, React 18, and Tailwind CSS.

## Requirements

- Node.js 22 LTS or 24 LTS
- pnpm 11 (enforced via `packageManager`)
- PostgreSQL database

## Quick Start

```bash
# Install dependencies
pnpm i

cd apps/site

# Copy and configure
cp config.yaml.example config.yaml
# Edit config.yaml with your database, auth, Portal API, and app URL settings

pnpm db:migrate

# Start development server
pnpm dev
# Visit the Local URL printed by Next.js
```

## Configuration

All configuration is managed via `apps/site/config.yaml`. Copy `apps/site/config.yaml.example` to `apps/site/config.yaml`, then follow [docs/usage.md](docs/usage.md) for required values, environment variable substitution, auth settings, Portal API tokens, Docker usage, and E2E examples.

## Project Structure

This is a pnpm workspace monorepo:

```text
apps/
├── site/          # Main Next.js application
└── site-e2e/      # Playwright E2E tests
```

## Development

Run these commands from the repository root unless otherwise noted.

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `pnpm dev`      | Start development server           |
| `pnpm build`    | Build for production               |
| `pnpm lint`     | Run ESLint                         |
| `pnpm lint:fix` | Fix lint issues and run type check |

Database commands must be run from `apps/site`:

```bash
pnpm db:generate   # Generate migration files
pnpm db:migrate    # Apply migrations
pnpm db:push       # Push schema directly (dev only)
pnpm db:studio     # Open Drizzle Studio
```

## E2E Testing

```bash
pnpm e2e           # Headless
pnpm e2e:ui        # Interactive UI mode
pnpm e2e:headed    # Headed browser
```

## Deployment

Deployment reference files:

- [Dockerfile](Dockerfile)
- [apps/site-e2e/runtime/api7-ee-minimal/docker-compose.yaml](apps/site-e2e/runtime/api7-ee-minimal/docker-compose.yaml)
- [apps/site-e2e/runtime/api7-ee-minimal/docker-compose.support.yaml](apps/site-e2e/runtime/api7-ee-minimal/docker-compose.support.yaml)

Detailed Docker build modes, runtime config mounting, preflight behavior, and E2E notes are maintained in [docs/usage.md](docs/usage.md).

## Tech Stack

- **Framework:** Next.js 16, React 18
- **UI:** Base UI / shadcn components, Tailwind CSS 4
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better Auth
- **API Client:** @api7/portal-sdk, TanStack Query
- **Testing:** Playwright
