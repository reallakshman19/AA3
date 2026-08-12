import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  compareCaesarFrictionMicroModelRuns,
  measureCaesarFrictionMicroModelRun,
  measureCaesarFrictionMicroModelSeries,
} from '../src/core/nonlinear-restraint-friction/caesar-friction-micro-model-measurement.js';

const plan = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-friction-independent-micro-model-plan.json', import.meta.url),
  'utf8',
));
const k = 175126835.24647635;
assert.equal(plan.schema, 'm047-friction-independent-micro-model-plan/v1');
assert.equal(plan.requiredProduct.version, '14.00.00.0910');
assert.equal(plan.requiredProduct.build, '231113');
assert.equal(plan.commonControls.frictionStiffnessNPerM, k);
assert.equal(plan.commonControls.responseDataSource, 'INDEPENDENT_MICRO_MODEL_ONLY');
assert.equal(plan.experiments.length, 5);
assert.equal(plan.decision.l13ProductionSolveAuthorized, false);

const ids = plan.experiments.map((entry) => entry.id);
assert.deepEqual(ids, [
  'MM1_STICK_STIFFNESS',
  'MM2_SLIDE_PLATEAU',
  'MM3_DIRECTION_CHANGE_TRACE',
  'MM4_NORMAL_FORCE_UPDATE_TRACE',
  'MM5_GAP_CONTACT_TRACE',
]);
for (const id of ['MM3_DIRECTION_CHANGE_TRACE','MM4_NORMAL_FORCE_UPDATE_TRACE','MM5_GAP_CONTACT_TRACE']) {
  assert.ok(plan.experiments.find((entry) => entry.id === id).requiredEvidence.includes('CAESAR_NONLINEAR_ITERATION_TRACE'));
}

const stick = measureCaesarFrictionMicroModelRun({
  runId: 'synthetic-stick',
  normalUnit: [0, 1, 0],
  coefficientOfFriction: 0.3,
  displacementM: [1e-6, 0, 0],
  restraintReactionN: [-k * 1e-6, 1000, 0],
});
assert.equal(stick.normalReactionMagnitudeN, 1000);
assert.equal(stick.coulombLimitN, 300);
assert.ok(stick.frictionLimitRatio < 1);
assert.equal(stick.effectiveTangentialStiffnessNPerM, k);
assert.equal(stick.oppositionCosine, 1);

const slide = measureCaesarFrictionMicroModelRun({
  runId: 'synthetic-slide',
  normalUnit: [0, 1, 0],
  coefficientOfFriction: 0.3,
  displacementM: [0.002, 0, 0],
  restraintReactionN: [-300, 1000, 0],
});
assert.equal(slide.frictionLimitRatio, 1);
assert.equal(slide.oppositionCosine, 1);

const slide45 = measureCaesarFrictionMicroModelRun({
  runId: 'synthetic-slide-45',
  normalUnit: [0, 1, 0],
  coefficientOfFriction: 0.3,
  displacementM: [0.001, 0, 0.001],
  restraintReactionN: [-300 / Math.sqrt(2), 1000, -300 / Math.sqrt(2)],
});
const transition = compareCaesarFrictionMicroModelRuns(slide, slide45);
assert.ok(Math.abs(transition.tangentialReactionDirectionChangeDeg - 45) < 1e-10);
assert.ok(Math.abs(transition.tangentialDisplacementDirectionChangeDeg - 45) < 1e-10);
assert.equal(transition.normalForceRelativeChange, 0);

const series = measureCaesarFrictionMicroModelSeries([stick, slide, slide45]);
assert.equal(series.measurements.length, 3);
assert.equal(series.transitions.length, 2);

console.log('PASS M047 independent CAESAR friction micro-model measurement harness');
