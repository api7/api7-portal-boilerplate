import { RESERVED_FIRST_SEGMENTS } from '@/constants/common';
import { ReqError } from '@/types/portal-sdk';
import { API7Portal } from '@api7/portal-sdk/browser';
import axios, { AxiosError, HttpStatusCode } from 'axios';
import { toast } from 'sonner';

type K = number | string | symbol;
const match = (
  value: K,
  patterns: {
    [key: K]: () => void;
    default: () => void;
  },
) => (patterns[value] || patterns.default)();

const errToast = (m: string) => void toast.error(m, { id: m, duration: 5000 });

/**
 * use request header `skipInterceptor: ['404', ...]` to skip interceptor for specific status code.
 */
const matchSkipInterceptor = (err: AxiosError) => {
  const interceptors = err.config?.headers?.['skipInterceptor'] || [];
  const status = err.response?.status;
  return interceptors.some((v: string) => v === String(status));
};

const portalAxios = axios.create();

/**
 * Extract the organization slug from the current page URL.
 * Returns null on global (non-org-scoped) pages like /auth, /account, /api-hub.
 */
const getOrgSlugFromPathname = (): string | null => {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (!first || RESERVED_FIRST_SEGMENTS.has(first)) return null;
  return first;
};

// Rewrite API URLs to include the organization slug prefix.
// /api/applications → /api/{org-slug}/applications
portalAxios.interceptors.request.use((config) => {
  const slug = getOrgSlugFromPathname();
  if (slug && config.url) {
    config.url = config.url.replace(/^\/api(?=\/)/, `/api/${slug}`);
  }
  return config;
});

portalAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response) {
      const d = err.response.data as ReqError;
      if (matchSkipInterceptor(err)) return;
      const msg = d?.message?.trim();
      match(err.response.status as HttpStatusCode, {
        500: () => {
          errToast(msg || 'System Error. Please Contact the Administrator.');
        },
        default: () => errToast(msg),
      });
    }
    return Promise.reject(err);
  },
);
export const portalClient = new API7Portal({ axios: portalAxios });
