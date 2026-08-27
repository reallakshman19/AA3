/*
 * Why the ten-cylinder reducer condensation is built, wired, authorized -- and
 * still not enabled in production.
 *
 * Condensing a UNIFORM reducer (from section == to section) must reproduce the
 * closed-form prismatic stiffness of that same section. It does for axial and
 * torsion, and it does NOT for bending: the condensation is Timoshenko and
 * returns 1/(1+phi) of the Euler-Bernoulli shear term and (4+phi)/(4(1+phi)) of
 * the rotation term. Production straight pipe is Euler-Bernoulli, so enabling
 * the reducer alone puts a beam-theory discontinuity at the reducer elements.
 *
 * This check pins that mismatch as a measured fact. It fails if either side
 * changes formulation without the other -- which is exactly the moment the
 * reducer promotion becomes safe to revisit.
 */
import assert from 'node:assert';
import {
  REDUCER_CONDENSATION_REQUEST_SCHEMA, REDUCER_SAMPLING_RULE, REDUCER_SEGMENT_COUNT,
  compileTenCylinderReducerAuthority, sealReducerCondensationRequest,
} from '../src/core/linear-fea-reducer-condensation/index.js';
import { inputXmlStiffnessFrameElementProfile } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-profile.js';

const OD = 0.2191, T = 0.0127, L = 1.0, E = 2.0e11, G = 7.7e10;
const request = sealReducerCondensationRequest({
  schema: REDUCER_CONDENSATION_REQUEST_SCHEMA, reducerId: 'BEAM-THEORY-PROBE', length: L,
  fromSection: { outerDiameter: OD, wallThickness: T },
  toSection: { outerDiameter: OD, wallThickness: T },
  segmentCount: REDUCER_SEGMENT_COUNT, samplingRule: REDUCER_SAMPLING_RULE,
  material: { elasticModulus: E, shearModulus: G, massDensity: 7850, thermalExpansionCoefficient: 1.2e-5 },
  gravity: { enabled: false, acceleration: 9.80665, directionLocal: [0, -1, 0], fluidDensity: 0, insulationThickness: 0, insulationDensity: 0 },
  thermal: { installationTemperature: 21, operatingTemperature: 21 },
  sourceEvidence: { sourceId: 'PROBE', sourceRevision: 'r1', sourceSemanticHash: 'fnv1a64:0000000000000000' },
  semanticHash: '',
});
const K = compileTenCylinderReducerAuthority(request).condensed.localStiffness;
const flat = Array.isArray(K[0]) ? K.flat() : K;
const at = (i, j) => flat[i * 12 + j];

const Di = OD - 2 * T;
const area = Math.PI * (OD ** 2 - Di ** 2) / 4;
const inertia = Math.PI * (OD ** 4 - Di ** 4) / 64;
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// Axial and torsion carry no shear correction: these must be exact.
assert.ok(rel(at(0, 0), E * area / L) < 1e-9, 'condensed axial term must match the prismatic section exactly');
assert.ok(rel(at(3, 3), G * (2 * inertia) / L) < 1e-9, 'condensed torsion term must match the prismatic section exactly');
assert.ok(Math.max(...flat.map((_, n) => Math.abs(flat[n] - at(n % 12, Math.floor(n / 12))))) < 1e-6,
  'condensed stiffness must stay symmetric');

// Bending is softened by exactly the Timoshenko factors for this section.
const phi = (12 * E * inertia) / (G * 0.5 * area * L * L);
assert.ok(rel(at(1, 1), (12 * E * inertia) / ((1 + phi) * L ** 3)) < 1e-6,
  'condensed shear term must equal the Timoshenko value for kappa = 0.5');
assert.ok(rel(at(4, 4), ((4 + phi) * E * inertia) / ((1 + phi) * L)) < 1e-6,
  'condensed rotation term must equal the Timoshenko value for kappa = 0.5');

// The production side of the mismatch.
assert.equal(inputXmlStiffnessFrameElementProfile().shearDeformation, false,
  'production straight pipe is Euler-Bernoulli; if this changes, re-measure the reducer promotion');

console.log(JSON.stringify({
  check: 'lfea-reducer-beam-theory-consistency',
  status: 'MEASURED',
  condensationFormulation: 'TIMOSHENKO_KAPPA_0_5',
  productionFormulation: 'EULER_BERNOULLI',
  phi: Number(phi.toFixed(6)),
  shearTermRatio: Number((at(1, 1) / ((12 * E * inertia) / L ** 3)).toFixed(6)),
  rotationTermRatio: Number((at(4, 4) / ((4 * E * inertia) / L)).toFixed(6)),
  consequence: 'REDUCER_PROMOTION_BLOCKED_UNTIL_FORMULATIONS_AGREE',
}, null, 2));
