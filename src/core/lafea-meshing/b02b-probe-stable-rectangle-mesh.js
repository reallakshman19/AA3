/**
 * B02B probe-stable structured rectangle mesh (T3/T6/Q8).
 * See probe-stable-rectangle-core.js for why this exists and how it works.
 * B02B's shear probe (STRESS_TAU_XY) uses the same direct, non-averaged,
 * per-element-constant recovery as B02A's stress probe, so it needs the same
 * treatment to get a well-behaved (non-oscillatory) h-convergence sequence.
 */
import { buildProbeStableRectangleMesh } from './probe-stable-rectangle-core.js';

export const LAFEA_B02B_PROBE_STABLE_RECTANGLE_STRATEGY = 'B02B_PROBE_STABLE_RECTANGLE';
export const LAFEA_B02B_PROBE_STABLE_RECTANGLE_POLICY_ID = 'B02B_PROBE_STABLE_RECTANGLE_POLICY_V1';

const POLICY = Object.freeze({
  schema: 'lafea-b02b-probe-stable-rectangle-policy/v1',
  errorPrefix: 'LAFEA_B02B_PROBE_STABLE',
  policyId: LAFEA_B02B_PROBE_STABLE_RECTANGLE_POLICY_ID,
  strategy: LAFEA_B02B_PROBE_STABLE_RECTANGLE_STRATEGY,
  caseId: 'B02B',
  geometry: { xMinimum: 0, xMaximum: 20, yMinimum: -20, yMaximum: 20 },
  probe: { x: 7.3, y: 4.7 },
  cellFraction: { fx: 0.3, fy: 0.65 },
  hLevels: Object.freeze([10, 5, 2.5, 1.25, 0.625]),
});

export function lafeaB02bProbeStableRectanglePolicy() {
  return POLICY;
}

export function generateLafeaB02bProbeStableRectangleMesh(request) {
  return buildProbeStableRectangleMesh(POLICY, request);
}
