import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS,
  assessCaesarFrictionMicroModelEvidence,
} from '../src/core/nonlinear-restraint-friction/caesar-friction-micro-model-evidence-gate.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(fs.readFileSync(
  path.resolve(here, '../benchmarks/LFEA/CAESAR_ACCDB/m047-friction-micro-model-evidence-contract.json'),
  'utf8',
));

assert.equal(contract.schema, 'm047-friction-micro-model-evidence-contract/v1');
assert.equal(contract.product.version, '14.00.00.0910');
assert.equal(contract.product.build, '231113');
assert.equal(contract.requiredConfiguration.frictionStiffnessNPerM, 100_000_000);
assert.deepEqual(contract.observability.iterationTraceRequired, [
  'MM3_DIRECTION_CHANGE_TRACE',
  'MM4_NORMAL_FORCE_UPDATE_TRACE',
  'MM5_GAP_CONTACT_TRACE',
]);
assert.equal(contract.decision.l13ProductionSolveAuthorized, false);
assert.equal(contract.decision.l7ProductionSolveAuthorized, false);

const baseEvidence = {
  source: { provenanceClass: 'INDEPENDENT_MICRO_MODEL', benchmarkId: 'MM-FRIC-001' },
  product: { name: 'CAESAR II', version: '14.00.00.0910', build: '231113' },
  inputCustody: { fileName: 'MM-FRIC-001._A', sha256: 'a'.repeat(64) },
  configuration: {
    coefficientOfFriction: 0.3,
    frictionMultiplier: 1,
    frictionStiffnessNPerM: 100_000_000,
  },
  finalOutput: {
    displacementM: [0.001, 0, 0],
    restraintReactionN: [-300, 1000, 0],
    globalEquilibriumPassed: true,
  },
};

const mm1 = assessCaesarFrictionMicroModelEvidence({ ...baseEvidence, experimentId: 'MM1_STICK_STIFFNESS' });
assert.equal(mm1.status, CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS.MEASUREMENT_READY);
assert.equal(mm1.measurementClass, 'FINAL_STATE_MEASUREMENT');
assert.equal(mm1.authority.measurementAuthorized, true);
assert.equal(mm1.authority.productionMechanicsAuthorized, false);
assert.equal(mm1.authority.slideMultiplierAuthorized, false);

const mm2 = assessCaesarFrictionMicroModelEvidence({ ...baseEvidence, experimentId: 'MM2_SLIDE_PLATEAU' });
assert.equal(mm2.status, CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS.MEASUREMENT_READY);

const mm2NoEquilibrium = assessCaesarFrictionMicroModelEvidence({
  ...baseEvidence,
  experimentId: 'MM2_SLIDE_PLATEAU',
  finalOutput: { ...baseEvidence.finalOutput, globalEquilibriumPassed: false },
});
assert.equal(mm2NoEquilibrium.status, CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS.BLOCKED_EVIDENCE);
assert.ok(mm2NoEquilibrium.blockerCodes.includes('FINAL_GLOBAL_EQUILIBRIUM_PROOF_REQUIRED'));

const mm3NoTrace = assessCaesarFrictionMicroModelEvidence({ ...baseEvidence, experimentId: 'MM3_DIRECTION_CHANGE_TRACE' });
assert.equal(mm3NoTrace.status, CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS.BLOCKED_EVIDENCE);
assert.ok(mm3NoTrace.blockerCodes.includes('CAESAR_NONLINEAR_ITERATION_TRACE_REQUIRED'));

const trace = [
  { iteration: 1, restraintStatus: 'STICK', normalReactionN: 1000, tangentialDirection: [1, 0, 0], frictionReactionMagnitudeN: 250, converged: false },
  { iteration: 2, restraintStatus: 'SLIDING', normalReactionN: 1000, tangentialDirection: [0.966, 0, 0.259], frictionReactionMagnitudeN: 300, converged: true },
];
const mm3 = assessCaesarFrictionMicroModelEvidence({
  ...baseEvidence,
  experimentId: 'MM3_DIRECTION_CHANGE_TRACE',
  iterationTrace: trace,
});
assert.equal(mm3.status, CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS.MEASUREMENT_READY);
assert.equal(mm3.measurementClass, 'ITERATION_STATE_MEASUREMENT');
assert.equal(mm3.authority.stateHistorySemanticsAuthorized, false);

const bm4l = assessCaesarFrictionMicroModelEvidence({
  ...baseEvidence,
  experimentId: 'MM1_STICK_STIFFNESS',
  source: { provenanceClass: 'INDEPENDENT_MICRO_MODEL', benchmarkId: 'BM4_L' },
});
assert.equal(bm4l.status, CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS.BLOCKED_EVIDENCE);
assert.ok(bm4l.blockerCodes.includes('BM4_L_RESPONSE_PROVENANCE_PROHIBITED'));

const bm4nl = assessCaesarFrictionMicroModelEvidence({
  ...baseEvidence,
  experimentId: 'MM1_STICK_STIFFNESS',
  source: {
    provenanceClass: 'INDEPENDENT_MICRO_MODEL',
    benchmarkId: 'BM4_NL',
    accdbSha256: '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21',
    caseId: 'L19',
  },
});
assert.equal(bm4nl.status, CAESAR_FRICTION_MICRO_MODEL_EVIDENCE_STATUS.BLOCKED_EVIDENCE);
assert.ok(bm4nl.blockerCodes.includes('KNOWN_FRICTION_DISABLED_BM4_NL_CASE_PROHIBITED'));

console.log('PASS M047 independent CAESAR friction micro-model evidence gate');
