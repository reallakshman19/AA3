import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  compareCaesarFrictionMicroModelRuns,
  measureCaesarFrictionMicroModelRun,
  measureCaesarFrictionMicroModelSeries,
} from '../src/core/nonlinear-restraint-friction/caesar-friction-micro-model-measurement.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const planPath = path.resolve(here, '../benchmarks/LFEA/CAESAR_ACCDB/m047-friction-independent-micro-model-plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

assert.equal(plan.schema, 'm047-friction-independent-micro-model-plan/v1');
assert.equal(plan.requiredProduct.version, '14.00.00.0910');
assert.equal(plan.requiredProduct.build, '231113');
assert.equal(plan.commonControls.frictionStiffnessNPerM, 100_000_000);
assert.equal(plan.commonControls.responseDataSource, 'INDEPENDENT_MICRO_MODEL_ONLY');
assert.equal(plan.experiments.length, 5);
assert.equal(plan.decision.status, 'EXPERIMENT_HARNESS_READY_NOT_EXECUTED');
assert.equal(plan.decision.l13ProductionSolveAuthorized, false);
assert.equal(plan.decision.l7ProductionSolveAuthorized, false);
assert.equal(plan.decision.newMechanicsAuthorized, false);

const ids = plan.experiments.map((entry) => entry.id);
assert.deepEqual(ids, [
  'MM1_STICK_STIFFNESS',
  'MM2_SLIDE_PLATEAU',
  'MM3_DIRECTION_CHANGE_TRACE',
  'MM4_NORMAL_FORCE_UPDATE_TRACE',
  'MM5_GAP_CONTACT_TRACE',
]);
assert.ok(plan.experiments.find((entry) => entry.id === 'MM3_DIRECTION_CHANGE_TRACE')
  .requiredEvidence.includes('CAESAR_NONLINEAR_ITERATION_TRACE'));
assert.ok(plan.experiments.find((entry) => entry.id === 'MM4_NORMAL_FORCE_UPDATE_TRACE')
  .requiredEvidence.includes('CAESAR_NONLINEAR_ITERATION_TRACE'));
assert.ok(plan.experiments.find((entry) => entry.id === 'MM5_GAP_CONTACT_TRACE')
  .requiredEvidence.includes('CAESAR_NONLINEAR_ITERATION_TRACE'));

const stick = measureCaesarFrictionMicroModelRun({
  runId: 'synthetic-stick',
  normalUnit: [0, 1, 0],
  coefficientOfFriction: 0.3,
  displacementM: [1e-6, 0, 0],
  restraintReactionN: [-100, 1000, 0],
});
assert.equal(stick.normalReactionMagnitudeN, 1000);
assert.equal(stick.coulombLimitN, 300);
assert.equal(stick.frictionLimitRatio, 1 / 3);
assert.equal(stick.effectiveTangentialStiffnessNPerM, 100_000_000);
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
