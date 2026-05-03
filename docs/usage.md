# API7 Developer Portal - Usage Guide

This guide explains how to configure and deploy the API7 Developer Portal.

---

## Deployment Sample

The project includes reference configurations for Docker and Kubernetes deployment. These files are primarily for testing/development purposes, but you can use them as templates for your own deployment.

**Reference files:**
| File | Description |
|------|-------------|
| `Dockerfile` | Multi-stage build using Node.js 22 Alpine |
| `apps/site/docker-entrypoint.sh` | Entrypoint script used by Docker image startup and preflight |
| `dev-tools/devportal.yaml` | Example K8s manifests (Secret, ConfigMap, Service, Deployment) |
| `Makefile` | Make targets for Kind cluster operations |

> **Note:** These configurations contain testing-related settings. Review and modify them for production use.

The Kubernetes sample is intended to be deployed through the Make target so the Portal token is substituted into the generated Secret:

```bash
make kind-deploy-devportal PORTAL_TOKEN="a7prt-xxx"
```

If you apply `dev-tools/devportal.yaml` manually, create your own `developer-portal-token` Secret or render the manifest with `envsubst '$PORTAL_TOKEN'` first. Applying the file directly leaves `${PORTAL_TOKEN}` as a literal placeholder and the pod will fail Portal preflight.

---

## Configuration Overview

The Developer Portal uses a centralized configuration file:

```
apps/site/config.yaml
```

Copy from `apps/site/config.yaml.example` and customize for your environment.

### Configuration Values

You can set values in two ways:

**1. Direct values** - Write the value directly in config:
```yaml
# file: apps/site/config.yaml
db:
  url: "postgresql://user:pass@localhost:5432/devportal"
auth:
  secret: "my-secret-key-at-least-32-characters"
```

**2. Environment variable substitution** - Reference env vars that are resolved at runtime:

Environment variable names are user-defined. You can use any variable name with the `${VAR}` syntax, then set the corresponding env var at runtime.

```yaml
# file: apps/site/config.yaml
portal:
  url: ${MY_PORTAL_URL}
  token: ${MY_TOKEN}
db:
  url: ${MY_DB_CONNECTION}
```

```bash
# At runtime
export MY_PORTAL_URL="https://portal.example.com"
export MY_TOKEN="a7prt-xxx"
export MY_DB_CONNECTION="postgres://user:pass@host:5432/db"
```

| Syntax | Behavior |
|--------|----------|
| `${VAR}` | Required - error if `VAR` is not set |
| `${VAR:default}` | Optional - uses `default` if `VAR` is not set |

You can mix both approaches in the same config file. See `config.yaml.example` and `dev-tools/devportal.yaml` for reference examples.

---

## Database Configuration

The portal uses PostgreSQL with Drizzle ORM.

```yaml
# file: apps/site/config.yaml
db:
  url: "postgresql://username:password@localhost:5432/devportal"
  # Optional pool settings
  pool:
    max: 20
    min: 0
  # Optional SSL
  # When you want to connect to the database through the public network, please make sure to use SSL
  ssl: false  # or true, or object with ca/cert/key
```

> **Tip:** Check out [Get started with Drizzle](https://orm.drizzle.team/docs/get-started) for integration with other databases. This may require you to modify the code and rebuild it.

**Migrations:**

```bash
cd apps/site
pnpm db:migrate    # Apply migrations
pnpm db:generate   # Generate new migrations
```

For local non-Docker runs, run migrations explicitly before starting the app. The Docker image entrypoint runs preflight before starting Next.js, including Portal connectivity, DB connectivity, and Drizzle migrations.

For multi-replica production deployments, prefer running migrations as a single Job before rolling out the web deployment, or otherwise ensure that only one startup path applies migrations.

---

## Authentication

The portal uses [Better Auth](https://www.better-auth.com/) for authentication.

### Basic Configuration

```yaml
# file: apps/site/config.yaml
auth:
  secret: "your-secret-key-at-least-32-characters"  # Required
```

Generate a strong secret before first startup:

```bash
openssl rand -base64 32
<<<<<<< codex/split-361-bootstrap-docs
```

### First Admin User

Platform admin access is configured by user id, not email address:

```yaml
# file: apps/site/config.yaml
auth:
  adminUserIds:
    - "better-auth-user-id"
=======
>>>>>>> main
```

For a new deployment, register the first user, read that user's id from the database or `/api/auth/get-session`, add it to `auth.adminUserIds`, then restart the app.

### Email & Password

```yaml
# file: apps/site/config.yaml
auth:
  emailAndPassword:
    enabled: true
    requireEmailVerification: false
```

### Two-Factor Authentication (TOTP)

```yaml
# file: apps/site/config.yaml
auth:
  twoFactor:
    enabled: true
```

When enabling this for the first time, run DB migration to add 2FA tables/columns:

```bash
cd apps/site
pnpm db:migrate
```

### Social Providers (SSO)

```yaml
# file: apps/site/config.yaml
auth:
  socialProviders:
    github:
      clientId: ${GITHUB_CLIENT_ID}
      clientSecret: ${GITHUB_CLIENT_SECRET}
    google:
      clientId: ${GOOGLE_CLIENT_ID}
      clientSecret: ${GOOGLE_CLIENT_SECRET}
```

For detailed configuration of social providers, magic links, sessions, and other auth features, see the [Better Auth Documentation](https://www.better-auth.com/docs).

> **Note:** Some features (e.g., magic links, custom email providers) require code changes and rebuilding the image. Check `apps/site/src/lib/auth/server.ts` or `apps/site/src/lib/auth/client.ts`.

---

## API7 Portal API Integration

Connect to the API7 Portal backend:

```yaml
# file: apps/site/config.yaml
portal:
  url: ${PORTAL_URL:http://localhost:4321}
  token: ${PORTAL_TOKEN}  # Required - create from API7 Dashboard
```

### Creating Portal Token

1. Log in to API7 Enterprise Dashboard
2. Navigate to **Portal** > **Settings** > **Tokens**
3. Create a new token with appropriate permissions
4. Copy the token (format: `a7prt-xxxxxxxxxxxx`)

### Trusted Origins

```yaml
# file: apps/site/config.yaml
app:
  baseURL: "https://your-portal.example.com"
  # Used to handle CORS requirements for better auth and generate SEO related information.
  # refs:
  # - https://www.better-auth.com/docs/reference/security#trusted-origins
  # - https://nextjs.org/docs/app/getting-started/metadata-and-og-images
  trustedOrigins:
    - "https://your-portal.example.com"
```

Set `app.baseURL` to the primary public URL for the portal. `app.trustedOrigins` must include every browser-facing origin (scheme, host, and port) that can access the portal.

---

## Docker Build Modes

Production Docker builds disable testing-only auth providers by default:

```bash
docker build -t api7-ee-developer-portal-fe:prod .
```

Enable testing features only for e2e/dev images:

```bash
docker build --build-arg NEXT_PUBLIC_TESTING=true -t api7-ee-developer-portal-fe:e2e .
```

### Run the Docker Image

Prepare `apps/site/config.yaml` first. The file must contain a reachable Portal API URL/token, a reachable PostgreSQL URL, and an `auth.secret` with at least 32 characters.

```yaml
# file: apps/site/config.yaml
portal:
  url: "http://provider-portal.example.com"
  token: ${PORTAL_TOKEN}

db:
  url: "postgresql://user:password@postgres.example.com:5432/devportal"

auth:
  secret: "your-secret-key-at-least-32-characters"

app:
  baseURL: "http://localhost:3001"
  trustedOrigins:
    - "http://localhost:3001"
```

Run the image with the config file mounted at the path used by the bundled server:

```bash
docker run --rm -p 3001:3001 \
  -e PORTAL_TOKEN="your-portal-token" \
  -v "$(pwd)/apps/site/config.yaml:/app/apps/site/config.yaml:ro" \
  api7-ee-developer-portal-fe:prod
```

Expected startup sequence:

```text
Running preflight checks...
Portal connection successful
Database connection successful
Migrations completed!
Starting Next.js server...
```

If any preflight step fails, the container exits before the web server starts.

---

## Docker Build Modes

Production Docker builds disable testing-only auth providers by default:

```bash
docker build -t api7-ee-developer-portal-fe:prod .
```

Enable testing features only for e2e/dev images:

```bash
docker build --build-arg NEXT_PUBLIC_TESTING=true -t api7-ee-developer-portal-fe:e2e .
```

### Run the Docker Image

Prepare `apps/site/config.yaml` first. The file must contain a reachable Portal API URL/token, a reachable PostgreSQL URL, and an `auth.secret` with at least 32 characters.

```yaml
# file: apps/site/config.yaml
portal:
  url: "http://provider-portal.example.com"
  token: ${PORTAL_TOKEN}

db:
  url: "postgresql://user:password@postgres.example.com:5432/devportal"

auth:
  secret: "your-secret-key-at-least-32-characters"

app:
  baseURL: "http://localhost:3001"
  trustedOrigins:
    - "http://localhost:3001"
```

Run the image with the config file mounted at the path used by the bundled server:

```bash
docker run --rm -p 3001:3001 \
  -e PORTAL_TOKEN="your-portal-token" \
  -v "$(pwd)/apps/site/config.yaml:/app/apps/site/config.yaml:ro" \
  api7-ee-developer-portal-fe:prod
```

Expected startup sequence:

```text
Running preflight checks...
Portal connection successful
Database connection successful
Migrations completed!
Starting Next.js server...
```

If any preflight step fails, the container exits before the web server starts.

---

## Personalization & Branding

### Logo & Assets

| File | Location | Purpose |
|------|----------|---------|
| Favicon | `apps/site/app/favicon.ico` | Browser tab icon |
| Logo | `apps/site/public/logo.svg` | Main logo |
| Hero BG | `apps/site/public/herobg.svg` | Homepage background |

### Application Name

```yaml
# file: apps/site/config.yaml
app:
  name: "Your Developer Portal"
  desc: "Your portal description"
  baseURL: "https://your-portal.example.com"
```

### Sign-up Notice HTML (Optional)

```yaml
# file: apps/site/config.yaml
app:
  beforeSignUpButtonHtml: >-
    <p>By continuing, you acknowledge Example's <a href="https://example.com/terms" target="_blank" rel="noopener noreferrer">Terms of use</a> and the <a href="https://example.com/privacy" target="_blank" rel="noopener noreferrer">Privacy policy</a>.</p>
```

> **Security note:** This field is rendered as raw HTML before the **Sign Up** button. Only use trusted static content.

### Theme

Edit CSS variables in `apps/site/app/globals.css` for colors and styling.

---

## Quick Start Checklist

1. [ ] Copy `config.yaml.example` to `config.yaml` (You can refer to file `dev-tools/devportal.yaml` to deploy in k8s in a simpler way)
2. [ ] Configure database connection (`db.url`)
3. [ ] Set authentication secret (`auth.secret`)
4. [ ] Configure Portal API (`portal.url`, `portal.token`)
5. [ ] Configure `app.baseURL` and `app.trustedOrigins` for the browser-facing URL
6. [ ] Ensure database migrations are applied (`pnpm db:migrate` for local non-Docker runs, Docker preflight, or a one-off migration job)
7. [ ] Register the first user and configure `auth.adminUserIds` if platform admin access is required
8. [ ] (Optional) Configure SSO providers
9. [ ] (Optional) Customize branding

---

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Next.js Documentation](https://nextjs.org/docs)
