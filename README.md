# API7 Developer Portal

## Preparation

1. Install [`Node.js`](https://nodejs.org/en/download/package-manager) version 20.
2. Install [`pnpm`](https://pnpm.io/installation#using-corepack)
3. Get the source codes of this project and `cd ${repo_folder}`
4. Install Dependencies

    ```shell
    pnpm i
    ```

5. Configure Environment Variables

    Copy `apps/site/config.yaml.example` to `apps/site/config.yaml` and customize for your environment. See the example file for environment variable mapping and default values.

    Required environment variables:
    - `DB_URL` - PostgreSQL database connection string
    - `AUTH_SECRET` - Authentication secret (minimum 32 characters)

## Development

This project uses [`pnpm workspace`](https://pnpm.io/workspaces) for monorepo management and [`Next.js`](https://nextjs.org/) for the site application.

### Database Setup

The project uses Drizzle ORM with PostgreSQL and Better Auth for authentication.

```bash
# Generate migration files
cd apps/site && pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Or push schema directly (for development only)
pnpm db:push

# Open Drizzle Studio to browse database
pnpm db:studio
```

**Schema**: The database schema is manually defined in `apps/site/src/lib/db/schema.ts` and includes tables for `user`, `session`, `account`, and `verification` (required by Better Auth). For initial setup, you can use Better Auth CLI to generate schema:

```bash
npx @better-auth/cli@latest generate
```

**Best Practices**:
- Always use migrations in production (never use `db:push`)
- Configuration is validated using Zod schema
- All timestamps use timezone-aware fields

### Start Development Server

You need to create a portal on the provider side and set its Public URL to http://localhost:3000/.


```shell
# Set the dashboard URL
export DEV_API_URL="https://developer-portal-backend-url"
# Start the development server
pnpm dev

# or
DEV_API_URL="https://developer-portal-backend-url" pnpm dev

# If the port is not occupied or there are no other unexpected issues, You can visit `localhost:3000` in your browser
```

## Build and Test

```shell
export REGISTRY=""
export REGISTRY_NS=""
export CHART_URL=""

# only needs to be called the first time, if you don't delete kind cluster
make kind-up

# run test server
make run-test-server

export A7_URL="http://localhost:3000"
export A7_ROOT_USERNAME="admin"
export A7_ROOT_PASSWORD="admin123456Aa!"
export ONETIME_PASSWORD="admin"
# dashboard license, for not activated dashboard
export BACKEND_API7_LICENSE=""

# run test
pnpm e2e
# or with UI mode
pnpm e2e:ui
# or with headed browser
pnpm e2e:headed
# or you can install `Playwright Test for VSCode` which is very convenient to use.
```

Almost all configurable options provided by us are included in `localhost:4321/docs`, you can check them out to learn more.


## Deploy to Kubernetes Cluster

Replace [`image`](https://github.com/api7/api7-helm-chart/blob/bf4456ca4b724d90d4fc6f9c83ce7912ad50cce3/charts/api7/values.yaml#L56) with `${REGISTRY}/${REGISTRY_NAMESPACE}/api7-developer-portal`.

Replace [`tag`](https://github.com/api7/api7-helm-chart/blob/bf4456ca4b724d90d4fc6f9c83ce7912ad50cce3/charts/api7/values.yaml#L59) with `${IMAGE_TAG}`

If your image repository is private, then you need to make changes to [`imagePullSecret`](https://github.com/api7/api7-helm-chart/blob/bf4456ca4b724d90d4fc6f9c83ce7912ad50cce3/charts/api7/values.yaml#L64)
