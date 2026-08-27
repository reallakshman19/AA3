/*
 * Straight pipe and the reducer condensation must share one beam theory.
 *
 * Condensing a UNIFORM reducer (from section == to section) must reproduce the
 * closed-form stiffness of that same prismatic section. Axial and torsion carry
 * no shear correction and must come back exact. Bending must come back at the
 * Timoshenko values -- 1/(1+phi) on the shear term, (4+phi)/(4(1+phi)) on the
 * rotation term -- because the condensation is Timoshenko with kappa = 0.5,
 * CAESAR's pipe shear coefficient 2.
 *
 * Production straight pipe now declares the same formulation and the same
 * kappa. This check fails if either side moves without the other, which is the
 * discontinuity that first showed up as reducer elements 16, 67 and 75 blowing
 * up in the production parity harness while every other element was fine.
 *
 * Note what this does NOT establish: matching the formulations did not make the
 * ten-cylinder promotion pay off. Measured on a matched Timoshenko base it
 * still costs 1.5-2.1 points of parity, so reducerExactMechanics stays false
 * for a reason of its own. See production-capability-profile.js.
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

// The production side must agree, in both the flag and the factor.
const productionProfile = inputXmlStiffnessFrameElementProfile();
assert.equal(productionProfile.shearDeformation, true,
  'production straight pipe must stay Timoshenko so reducers are not a beam-theory discontinuity');
assert.equal(productionProfile.shearCorrectionFactorY.value, 0.5,
  'production kappaY must equal the condensation kappa');
assert.equal(productionProfile.shearCorrectionFactorZ.value, 0.5,
  'production kappaZ must equal the condensation kappa');

console.log(JSON.stringify({
  check: 'lfea-reducer-beam-theory-consistency',
  status: 'MEASURED',
  condensationFormulation: 'TIMOSHENKO_KAPPA_0_5',
  productionFormulation: 'TIMOSHENKO_KAPPA_0_5',
  phi: Number(phi.toFixed(6)),
  shearTermRatio: Number((at(1, 1) / ((12 * E * inertia) / L ** 3)).toFixed(6)),
  rotationTermRatio: Number((at(4, 4) / ((4 * E * inertia) / L)).toFixed(6)),
  formulationsAgree: true,
  reducerPromotionStillOff: 'MEASURED_WORSE_ON_MATCHED_BASE',
}, null, 2));
