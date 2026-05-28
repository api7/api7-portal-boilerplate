# Minimal API7 EE E2E Environment

This runtime extracts the minimum E2E control-plane components from the Compose bundle at `https://run.api7.ai/api7-ee/api7-ee-latest.tar.gz`:

- PostgreSQL
- Prometheus
- Jaeger
- Dashboard
- DP Manager
- Developer Portal API

It intentionally does not include the following:

- kind / Kubernetes / Helm
- file-server
- `api-usage` in the cloud profile
- The FE-under-test container itself

Support services are defined separately in [apps/site-e2e/runtime/api7-ee-minimal/docker-compose.support.yaml](apps/site-e2e/runtime/api7-ee-minimal/docker-compose.support.yaml).

## Start

Run these commands from the repository root:

```bash
docker compose \
  --env-file ./apps/site-e2e/runtime/api7-ee-minimal/.env.example \
  -f ./apps/site-e2e/runtime/api7-ee-minimal/docker-compose.yaml \
  up -d

docker compose \
  -f ./apps/site-e2e/runtime/api7-ee-minimal/docker-compose.support.yaml \
  up -d
```

Default ports:

- Dashboard HTTP: `http://127.0.0.1:7080`
- Dashboard HTTPS: `https://127.0.0.1:7443`
- DP Manager HTTP: `http://127.0.0.1:7900`
- Developer Portal API: `http://127.0.0.1:4321`
- PostgreSQL: `127.0.0.1:5432`

## Stop

```bash
docker rm -f developer-portal-e2e api7-ee-gateway-1 || true

docker compose \
  -f ./apps/site-e2e/runtime/api7-ee-minimal/docker-compose.support.yaml \
  down -v --remove-orphans

docker compose \
  --env-file ./apps/site-e2e/runtime/api7-ee-minimal/.env.example \
  -f ./apps/site-e2e/runtime/api7-ee-minimal/docker-compose.yaml \
  down -v --remove-orphans
```

## Notes

This runtime no longer exposes any startup entrypoint through the Makefile.
The Playwright global setup now starts API7 EE, support services, and the FE-under-test directly with Docker Compose and Docker containers.
