# API7 Developer Portal - Usage Guide

This guide explains how to configure and deploy the API7 Developer Portal.

---

## Deployment Sample

The project includes reference configurations for Docker and Kubernetes deployment. These files are primarily for testing/development purposes, but you can use them as templates for your own deployment.

**Reference files:**
| File | Description |
|------|-------------|
| `Dockerfile` | Multi-stage build using Node.js 22 Alpine |
| `apps/site/docker-entrypoint.sh` | Entrypoint script (runs DB migrations on startup) |
| `dev-tools/devportal.yaml` | Example K8s manifests (ConfigMap, Service, Deployment) |
| `Makefile` | Make targets for Kind cluster operations |

> **Note:** These configurations contain testing-related settings. Review and modify them for production use.

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

> **Tip:** See `apps/site/docker-entrypoint.sh` for auto-migration logic that runs when the Docker container or K8s pod starts.

---

## Authentication

The portal uses [Better Auth](https://www.better-auth.com/) for authentication.

### Basic Configuration

```yaml
# file: apps/site/config.yaml
auth:
  secret: "your-secret-key"  # Required
```

### Email & Password

```yaml
# file: apps/site/config.yaml
auth:
  emailAndPassword:
    enabled: true
    requireEmailVerification: false
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

> **Note:** Some features (e.g., magic links, custom email providers) require code changes and rebuilding the image. check `lib/auth/server.ts` or `lib/auth/client.ts`

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

### Theme

Edit CSS variables in `apps/site/app/globals.css` for colors and styling.

---

## Quick Start Checklist

1. [ ] Copy `config.yaml.example` to `config.yaml` (You can refer to file `dev-tools/devportal.yaml` to deploy in k8s in a simpler way)
2. [ ] Configure database connection (`db.url`)
3. [ ] Set authentication secret (`auth.secret`)
4. [ ] Configure Portal API (`portal.url`, `portal.token`)
5. [ ] Run database migrations (You can refer to file `apps/site/docker-entrypoint.sh` to run DB migrations on pod or container startup)
6. [ ] (Optional) Configure SSO providers
7. [ ] (Optional) Customize branding

---

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Next.js Documentation](https://nextjs.org/docs)
