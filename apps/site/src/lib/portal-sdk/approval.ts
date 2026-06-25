/**
 * Approval client for the Developer Portal.
 *
 * These call the portal's OWN server routes (`/api/approvals*`), not the
 * Control Plane proxy directly — the server routes enforce platform-admin
 * access. Plain fetch is used so the org-slug rewrite (portalClient axios)
 * does not apply.
 */

import type { ListApprovalsResponses } from '@api7/portal-sdk/unstable-types';

type SDKApproval = ListApprovalsResponses[200]['list'][number];

export type Approval = SDKApproval & {
  /**
   * Human-readable organization name resolved from the Better Auth database
   * (the applicant is an organization). Falls back to `applicant_name` when the
   * organization can't be resolved.
   */
  applicant_org_name?: string;
};

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

