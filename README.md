# API7 Developer Portal

A customizable developer portal frontend for API7 Enterprise, built with Next.js 16, React 18, and Tailwind CSS.

## Requirements

- Node.js >= 20
- pnpm 9.6.0 (enforced via `packageManager`)
- PostgreSQL database

## Quick Start

```bash
# Install dependencies
pnpm i

cd apps/site

# Copy and configure
cp config.yaml.example config.yaml
# Edit config.yaml with your settings (see Configuration below)

# Ensure PostgreSQL is running and update db.url in config.yaml
# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
# Visit http://localhost:3000, or check the information displayed by Next.js
```

## Configuration

All configuration is managed via `apps/site/config.yaml`. Copy `config.yaml.example` to `config.yaml` and customize it.

**Required settings:**

```yaml
db:
  url: 'postgresql://user:pass@your-pg-host:5432/devportal'
auth:
  secret: 'your-secret-key-at-least-32-characters'
portal:
  url: ${PORTAL_URL:http://your-portal-host:4321}
  token: ${PORTAL_TOKEN} # Create from API7 Dashboard
```

> Environment variable syntax: `${VAR}` (required) or `${VAR:default}` (optional with default value)

For complete configuration options (SSO, branding, database SSL, etc.), see [docs/usage.md](docs/usage.md).

## Project Structure

This is a pnpm workspace monorepo:

```
apps/
├── site/          # Main Next.js application
└── site-e2e/      # Playwright E2E tests
```

## Development

| Command         | Description                        |
| --------------- | ---------------------------------- |
| `pnpm dev`      | Start development server           |
| `pnpm build`    | Build for production               |
| `pnpm preview`  | Preview production build           |
| `pnpm lint`     | Run ESLint                         |
| `pnpm lint:fix` | Fix lint issues and run type check |

### Database Commands

Run from `apps/site`:

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

Reference files for deployment:

- [Dockerfile](Dockerfile)
- [dev-tools/devportal.yaml](dev-tools/devportal.yaml)

> **Note:** These files are configured for testing purposes. Review and modify them for production use.

For detailed configuration, see [docs/usage.md](docs/usage.md).

## Tech Stack

- **Framework:** Next.js 16, React 18
- **UI:** Ant Design 6, Tailwind CSS 4, DaisyUI
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Better Auth
- **API Client:** @api7/portal-sdk, TanStack Query
- **Testing:** Playwright
