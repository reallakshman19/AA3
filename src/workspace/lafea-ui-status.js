/** Formal UI-only presentation of canonical LAFEA engineering states. */

export const LAFEA_UI_STATUS_SCHEMA = 'lafea-ui-status/v1';

const PRESENTATIONS = Object.freeze({
  NOT_STARTED: Object.freeze({ label: 'Not started', tone: 'neutral' }),
  READY: Object.freeze({ label: 'Ready', tone: 'positive' }),
  WARNING: Object.freeze({ label: 'Attention required', tone: 'warning' }),
  BLOCKED: Object.freeze({ label: 'Blocked', tone: 'critical' }),
  COMPLETE: Object.freeze({ label: 'Complete', tone: 'positive' }),
  CURRENT_PASS: Object.freeze({ label: 'Qualified', tone: 'positive' }),
  CURRENT_WARNING: Object.freeze({ label: 'Qualified with warnings', tone: 'warning' }),
  CURRENT_BLOCK: Object.freeze({ label: 'Blocked', tone: 'critical' }),
  STALE: Object.freeze({ label: 'Stale evidence', tone: 'warning' }),
  INVALID: Object.freeze({ label: 'Invalid', tone: 'critical' }),
  UNINITIALIZED: Object.freeze({ label: 'Not initialized', tone: 'neutral' }),
  QUALIFIED: Object.freeze({ label: 'Qualified', tone: 'positive' }),
  FAILED: Object.freeze({ label: 'Failed', tone: 'critical' }),
  NOT_RUN: Object.freeze({ label: 'Not run', tone: 'neutral' }),
  QUALIFIED_NOT_CURRENT: Object.freeze({ label: 'Previous result — stale', tone: 'warning' }),
  ENGINE_NOT_IMPLEMENTED: Object.freeze({ label: 'Unavailable', tone: 'neutral' }),
  QUALIFIED_ROUTE_REGISTERED: Object.freeze({ label: 'Engine available', tone: 'positive' }),
  EXACT_HEAD_QUALIFICATION_REQUIRED: Object.freeze({ label: 'External qualification required', tone: 'warning' }),
  NOT_GATED: Object.freeze({ label: 'Informational only', tone: 'neutral' }),
  NOT_RETAINED: Object.freeze({ label: 'Not generated', tone: 'neutral' }),
});

export function lafeaUiStatusPresentation(canonicalStatus) {
  const canonical = typeof canonicalStatus === 'string' && canonicalStatus
    ? canonicalStatus
    : 'UNKNOWN';
  const presentation = PRESENTATIONS[canonical]
    ?? Object.freeze({ label: 'Unknown state', tone: 'neutral' });
  return Object.freeze({
    schema: LAFEA_UI_STATUS_SCHEMA,
    canonical,
    label: presentation.label,
    tone: presentation.tone,
  });
}
