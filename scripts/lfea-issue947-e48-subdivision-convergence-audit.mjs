#!/usr/bin/env node
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.raw || !args.e48) {
  throw new TypeError('Usage: node scripts/lfea-issue947-e48-subdivision-convergence-audit.mjs --package <json> --raw <json> --e48 <json> [--out <json>]');
}
const here = dirname(fileURLToPath(import.meta.url));
const solverPath = join(here, '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js');
const auditPath = join(here, 'lfea-issue947-e48-half-bend-action-audit.mjs');
const original = readFileSync(solverPath, 'utf8');
const anchor = "bendMaxAngleDegrees: { value: 5, source: PROFILE_SOURCE },";
if (original.split(anchor).length - 1 !== 1) throw new Error('Expected one bendMaxAngleDegrees=5 authority anchor.');
const cases = [5, 2.5, 1.25, 0.625];
const work = join(here, '../.work/e48-subdivision-convergence');
mkdirSync(work, { recursive: true });
const results = [];
try {
  for (const angle of cases) {
    const patched = angle === 5 ? original : original.replace(anchor, `bendMaxAngleDegrees: { value: ${angle}, source: PROFILE_SOURCE },`);
    writeFileSync(solverPath, patched);
    const out = join(work, `e48-half-${String(angle).replace('.', '_')}deg.json`);
    const run = spawnSync(process.execPath, [auditPath, '--package', args.package, '--raw', args.raw, '--e48', args.e48, '--out', out], {
      encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    });
    if (run.status !== 0) {
      process.stderr.write(run.stdout ?? '');
      process.stderr.write(run.stderr ?? '');
      throw new Error(`E48 subdivision case ${angle} deg failed with exit ${run.status}.`);
    }
    const record = JSON.parse(readFileSync(out, 'utf8'));
    results.push({
      bendMaxAngleDegrees: angle,
      nearDescendantCount: record.nearHalf.descendantCount,
      farDescendantCount: record.farHalf.descendantCount,
      nearMaxAbsNormalizedResidual: record.nearHalf.maxAbsNormalizedResidual,
      nearNormalizedResidualL2: record.nearHalf.normalizedResidualL2,
      nearGoverningComponent: record.nearHalf.governingComponent,
      farMaxAbsNormalizedResidual: record.farHalf.maxAbsNormalizedResidual,
      farNormalizedResidualL2: record.farHalf.normalizedResidualL2,
      farGoverningComponent: record.farHalf.governingComponent,
      rawHalfJunctionEquilibriumMaxAbs: record.rawJunctionActionEquilibrium.maxAbsResidual,
    });
  }
} finally {
  writeFileSync(solverPath, original);
}
const baseline = results[0];
const finest = results.at(-1);
const steps = results.slice(1).map((record, index) => {
  const previous = results[index];
  return {
    fromDegrees: previous.bendMaxAngleDegrees,
    toDegrees: record.bendMaxAngleDegrees,
    nearMaxRatio: record.nearMaxAbsNormalizedResidual / previous.nearMaxAbsNormalizedResidual,
    farMaxRatio: record.farMaxAbsNormalizedResidual / previous.farMaxAbsNormalizedResidual,
    nearL2Ratio: record.nearNormalizedResidualL2 / previous.nearNormalizedResidualL2,
    farL2Ratio: record.farNormalizedResidualL2 / previous.farNormalizedResidualL2,
  };
});
const closes = finest.nearMaxAbsNormalizedResidual <= 0.1 && finest.farMaxAbsNormalizedResidual <= 0.1;
const materiallyImproves = finest.nearMaxAbsNormalizedResidual < 0.5 * baseline.nearMaxAbsNormalizedResidual
  || finest.farMaxAbsNormalizedResidual < 0.5 * baseline.farMaxAbsNormalizedResidual;
const classification = closes
  ? 'E48_SUBDIVISION_REFINEMENT_CLOSES_RAW_HALF_BEND_ACTION_GATE_REQUIRES_WHOLE_MODEL_CANDIDATE'
  : materiallyImproves
    ? 'E48_SUBDIVISION_REFINEMENT_MATERIALLY_IMPROVES_BUT_DOES_NOT_CLOSE_RAW_ACTION_GATE'
    : 'E48_SUBDIVISION_REFINEMENT_FALSIFIED_AS_RAW_HALF_BEND_ACTION_EXPLANATION';
const output = {
  schema: 'lfea-issue947-e48-subdivision-convergence-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceElementId: '48',
  purpose: 'NUMERICAL_DISCRETIZATION_FALSIFICATION_ONLY_NO_PRODUCTION_UPDATE_NO_TOLERANCE_CHANGE',
  controlledVariable: 'componentProfile.bendMaxAngleDegrees',
  fixedMechanics: [
    'B31J_SMOOTH90_FACTOR_AUTHORITY',
    'BEND_AXIAL_SHAPE_YES',
    'TIMOSHENKO_KAPPA_0_5',
    'CUMULATIVE_MEC21_TRANSLATION_AND_ROTATION',
    'STRAIGHT_CLOSED_END_BOURDON_STRAIN',
    'SOURCE_GEOMETRY_AND_RAW_CAESAR_HALF_BEND_BOUNDARY_DOF',
    'EXISTING_10_PERCENT_ACTION_GATE',
  ],
  results,
  refinementSteps: steps,
  baseline,
  finest,
  existingActionLimit: 0.1,
  finestClosesBothHalfBendGates: closes,
  classification,
  disposition: closes
    ? 'Do not promote solely from this diagnostic. Run an independently bounded whole-model L19 refinement candidate and require no new failures plus unchanged solver gates.'
    : 'Do not change production bend subdivision to repair E48. Continue formulation/free-load investigation because refinement alone does not close the unchanged action gate.',
  falsificationRule: 'Subdivision is not an admissible explanation unless systematic refinement at fixed mechanics closes both direct raw CAESAR half-bend action comparisons inside the unchanged 10% gate. Merely improving the residual is insufficient.',
};
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 E48 subdivision convergence: ${classification}`);
rmSync(work, { recursive: true, force: true });

function parseArgs(tokens){const r={};for(let i=0;i<tokens.length;i++){const t=tokens[i];if(!t.startsWith('--'))throw new TypeError(`Unexpected ${t}`);const v=tokens[i+1];if(v===undefined||v.startsWith('--'))throw new TypeError(`Missing ${t}`);r[t.slice(2)]=v;i++;}return r;}
