/**
 * B02A probe-stable structured rectangle mesh (T3/T6/Q8). Used for all three
 * element families so they share one small, fast-solving mesh at each h
 * level (the generic mesher's equivalent mesh is several times larger and
 * too slow to solve at this case's finer levels for T6/Q8).
 * See probe-stable-rectangle-core.js for why this exists and how it works.
 */
import { buildProbeStableRectangleMesh } from './probe-stable-rectangle-core.js';

export const LAFEA_B02A_PROBE_STABLE_RECTANGLE_STRATEGY = 'B02A_PROBE_STABLE_RECTANGLE';
export const LAFEA_B02A_PROBE_STABLE_RECTANGLE_POLICY_ID = 'B02A_PROBE_STABLE_RECTANGLE_POLICY_V1';

const POLICY = Object.freeze({
  schema: 'lafea-b02a-probe-stable-rectangle-policy/v1',
  errorPrefix: 'LAFEA_B02A_PROBE_STABLE',
  policyId: LAFEA_B02A_PROBE_STABLE_RECTANGLE_POLICY_ID,
  strategy: LAFEA_B02A_PROBE_STABLE_RECTANGLE_STRATEGY,
  caseId: 'B02A',
  geometry: { xMinimum: 0, xMaximum: 100, yMinimum: -5, yMaximum: 5 },
  probe: { x: 53, y: 2.7 },
  // Triangle B = [bottomLeft, topRight, topLeft] has centroid (1/3, 2/3) in
  // normalized cell coordinates; anchoring the probe there (rather than an
  // arbitrary interior point) minimizes the distance between the probe and
  // the point a T3 element's constant recovered value is most representative
  // of, which is what keeps the sampling error shrinking smoothly with h.
  cellFraction: { fx: 1 / 3, fy: 2 / 3 },
  hLevels: Object.freeze([25, 12.5, 6.25, 3.125, 1.5625]),
});

export function lafeaB02aProbeStableRectanglePolicy() {
  return POLICY;
}

export function generateLafeaB02aProbeStableRectangleMesh(request) {
  return buildProbeStableRectangleMesh(POLICY, request);
}
