import '@tanstack/react-start/server-only';

import { createFileRoute } from '@tanstack/react-router';

import { auth } from '@/lib/auth/server';

const handler = ({ request }: { request: Request }) => auth.handler(request);

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      PUT: handler,
      PATCH: handler,
      DELETE: handler,
    },
  },
});
