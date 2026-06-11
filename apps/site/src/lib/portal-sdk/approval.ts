/**
 * Approval client for the Developer Portal.
 *
 * These call the portal's OWN server routes (`/api/approvals*`), not the
 * Control Plane proxy directly — the server routes enforce platform-admin
 * access. Plain fetch is used so the org-slug rewrite (portalClient axios)
 * does not apply.
 */

export type ApprovalEvent =
  | 'api_product_subscription'
  | 'developer_registration';

export type ApprovalStatus = 'pending' | 'finished';

export type ApprovalResult = 'accepted' | 'rejected' | 'cancelled' | '';

/**
 * Marker the Control Plane stores in `operator_id` when an approval is processed
 * through the Developer Portal. The API returns it as-is; the real acting admin
 * lives in `metadata`, which the frontend resolves for display.
 */
export const DEVELOPER_PORTAL_OPERATOR = 'developer_portal_admin';

export type OperatorMetadata = {
  operator_id?: string;
  operator_name?: string;
};

export type Approval = {
  id: string;
  // The SDK deserializes these into Date objects, so the portal's own route
  // serializes them as ISO strings (the raw API still uses epoch numbers).
  created_at?: number | string;
  updated_at?: number | string;
  event: ApprovalEvent;
  status: ApprovalStatus;
  result?: ApprovalResult;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  applicant_id?: string;
  applicant_name?: string;
  /**
   * Human-readable organization name resolved from the Better Auth database
   * (the applicant is an organization). Falls back to `applicant_name` when the
   * organization can't be resolved.
   */
  applicant_org_name?: string;
  operator_id?: string;
  // When operator_id is the developer-portal marker, this holds the marker's
  // human-readable label; the real operator lives in metadata.
  operator_name?: string;
  portal_id?: string;
  portal_name?: string;
  applied_at?: number;
  operated_at?: number | null;
  /**
   * Opaque JSON string. When operator_id is the developer-portal marker it
   * carries the acting platform admin's identity (see {@link OperatorMetadata}).
   */
  metadata?: string;
};

export type ListApprovalsResponse = {
  list: Approval[];
  total: number;
};

/**
 * Display name of the operator. When the approval was processed through the
 * Developer Portal, the API returns the {@link DEVELOPER_PORTAL_OPERATOR} marker
 * in operator_id, so the real admin identity is read from `metadata`; falls back
 * to operator_name (the marker's human-readable label) when metadata is absent.
 */
export const resolveOperatorName = (approval: Approval): string => {
  if (approval.operator_id !== DEVELOPER_PORTAL_OPERATOR) {
    return approval.operator_name ?? '';
  }
  try {
    const meta = JSON.parse(approval.metadata ?? '{}') as OperatorMetadata;
    return (
      meta.operator_name || meta.operator_id || (approval.operator_name ?? '')
    );
  } catch {
    return approval.operator_name ?? '';
  }
};

const request = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore non-JSON body
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
};

export const approvalApi = {
  list: (
    params: Record<string, unknown> = {},
  ): Promise<ListApprovalsResponse> => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((v) => qs.append(key, String(v)));
      } else {
        qs.set(key, String(value));
      }
    });
    const query = qs.toString();
    return request(`/api/approvals${query ? `?${query}` : ''}`);
  },
  accept: (id: string) =>
    request(`/api/approvals/${id}/accept`, { method: 'POST' }),
  reject: (id: string) =>
    request(`/api/approvals/${id}/reject`, { method: 'POST' }),
};
