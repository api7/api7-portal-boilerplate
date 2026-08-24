import { createStart } from '@tanstack/react-start';

// Required entry point for Start's config discovery (routeTree.gen.ts
// imports `startInstance`). 2FA enrollment enforcement lives in `_public`'s
// `beforeLoad` instead of here — beforeLoad is isomorphic (runs server-side
// for SSR, client-side triggering a server function for SPA navigation) and
// redirects through the router directly, so it doesn't need to guess
// whether an incoming request is a page load or a server function RPC call
// the way a raw request middleware would. `_sessionOnly` doesn't need the
// same check: every route under it (/account/*, /auth/landing) must stay
// reachable regardless of enrollment status — that's where enrollment
// itself happens — so there's nothing there to redirect away from.
export const startInstance = createStart(() => ({}));
