import { useNavigate, useSearch } from '@tanstack/react-router';

// `next/navigation` shim backed by TanStack Router, for vendored components
// still written against Next.js's router API.
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate({ href }),
  };
}

// Mirrors the one method vendored components actually call —
// `useSearchParams().get(key)` — backed by TanStack Router's parsed search
// object instead of a real `URLSearchParams`.
export function useSearchParams() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  return {
    get(key: string): string | null {
      const value = search[key];
      return typeof value === 'string' ? value : null;
    },
  };
}
