/**
 * Code-owned trust root for engineering correlation qualification approvals.
 *
 * This set is intentionally empty until a separate qualified release explicitly
 * registers an approval authority. User-supplied dataset/profile metadata must
 * never create trust merely by naming an authority.
 */
export const TRUSTED_CORRELATION_APPROVAL_AUTHORITIES = Object.freeze([]);

export function correlationApprovalAuthorityTrusted(authorityId) {
  return typeof authorityId === 'string'
    && TRUSTED_CORRELATION_APPROVAL_AUTHORITIES.includes(authorityId);
}
