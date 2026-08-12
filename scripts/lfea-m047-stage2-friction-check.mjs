#!/usr/bin/env node
/**
 * M047 Stage 2 nonlinear friction contract check.
 *
 * The pinned BM4_L.ACCDB is a Windows/ACE-only binary, so this check runs the
 * same governed code paths against the deterministic ACCDB-shaped fixture. It
 * proves the configuration-authority migration, the friction law, the active-set
 * iteration, the convergence gates, the derived-combination algebra, determinism
 * and stiffness sensitivity - and it proves the negative controls, so a
 * physically invalid friction state cannot pass.
 *
 * It asserts no CAESAR benchmark value: the fixture's OUTPUT_* rows are zeros.
 * Benchmark parity against the real ACCDB is the local Windows production run.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CAESAR_CONFIGURATION_PRECEDENCE,
  CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION,
  normalizeCaesarConfigurationAuthority,
  resolveCaesarConfigurationLedger,
} from '../src/core/fea-benchmarks/caesar-configuration-authority.js';
import {
  resolveCaesarFrictionAuthority,
  resolveCaesarFrictionAuthorityTable,
} from '../src/core/fea-benchmarks/caesar-friction-authority.js';
import { buildCaesarAccdbBenchmarkPackage } from '../src/core/fea-benchmarks/caesar-accdb-package.js';
import { solveCaesarAccdbLinearBenchmark } from '../src/core/fea-benchmarks/caesar-accdb-linear-solve.js';
import {
  CAESAR_FRICTION_SOLVER_PROFILE,
  buildFrictionPairedDeltaRca,
  runCaesarAccdbFrictionStiffnessSensitivity,
  solveCaesarAccdbFrictionBenchmark,
  verifyCaesarAccdbFrictionDeterminism,
} from '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js';
import { buildFrictionFixture } from '../src/core/fea-benchmarks/caesar-accdb-friction-fixture.js';
import { runCaesarAccdbBenchmark } from './lfea-caesar-accdb-benchmark.mjs';
import { buildFrictionRcaReport } from './lfea-m047-stage2-friction-rca.mjs';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const BASELINE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/m047-friction-migration-baseline.json';
const BM4L_PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const BM4NL_PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-l19-l20-linear-solve.profile.json';

const fixture = buildFrictionFixture('MODEL_MU_WITH_LOAD_CASE_MULTIPLIER');
const benchmarkPackage = buildCaesarAccdbBenchmarkPackage(fixture);
const authority = benchmarkPackage.profile.configurationAuthority;

/* 1. Configuration precedence is declared and executed lowest-to-highest. */
assert.deepEqual(CAESAR_CONFIGURATION_PRECEDENCE, [
  'OVERALL_GLOBAL_DEFAULT',
  'INDIVIDUAL_FILE_SETTING',
  'LOAD_CASE_SETTING',
  'MODEL_INPUT',
]);
assert.equal(CAESAR_CONFIGURATION_PRECEDENCE_DIRECTION, 'LOWEST_TO_HIGHEST_AUTHORITY');
for (const profilePath of [BM4L_PROFILE_PATH, BM4NL_PROFILE_PATH]) {
  const profile = readJson(profilePath);
  const declared = normalizeCaesarConfigurationAuthority(profile.configurationAuthority);
  assert.deepEqual(declared.precedence, CAESAR_CONFIGURATION_PRECEDENCE, profilePath);
  for (const [caseId, settings] of Object.entries(profile.configurationAuthority.layers.loadCase.cases)) {
    assert.ok(
      !Object.hasOwn(settings, 'COEFFICIENT_OF_FRICTION_MU'),
      `${profilePath} ${caseId} still represents friction by overriding COEFFICIENT_OF_FRICTION_MU.`,
    );
  }
  assert.equal(
    profile.configurationAuthority.layers.modelInput.settings.COEFFICIENT_OF_FRICTION_MU,
    0.3,
    `${profilePath} must keep the model-input coefficient as the highest authority.`,
  );
}
const bm4l = readJson(BM4L_PROFILE_PATH).configurationAuthority.layers.loadCase.cases;
for (const [caseId, expected] of Object.entries({
  L1: 1, L2: 0, L3: 0, L4: 0, L5: 0, L6: 0, L7: 1, L13: 1,
})) {
  assert.equal(bm4l[caseId].FRICTION_MULTIPLIER, expected, `BM4_L ${caseId} friction multiplier`);
}
for (const caseId of ['L14', 'L15']) {
  assert.ok(
    !Object.hasOwn(bm4l[caseId], 'FRICTION_MULTIPLIER'),
    `BM4_L ${caseId} is a derived combination and must not declare a friction multiplier.`,
  );
}

/* 2. The model input wins over every lower layer, including the load case. */
const muLedger = resolveCaesarConfigurationLedger(authority, 'COEFFICIENT_OF_FRICTION_MU', 'L7');
assert.equal(muLedger.resolved.level, 'MODEL_INPUT');
assert.equal(muLedger.resolved.value, 0.3);
assert.equal(
  resolveCaesarConfigurationLedger(authority, 'BOURDON_PRESSURE', 'L7').resolved.level,
  'INDIVIDUAL_FILE_SETTING',
);
assert.equal(
  resolveCaesarConfigurationLedger(authority, 'FRICTION_MULTIPLIER', 'L7').resolved.level,
  'LOAD_CASE_SETTING',
);
assert.equal(
  resolveCaesarConfigurationLedger(authority, 'Z_AXIS_UP', 'L7').resolved.level,
  'OVERALL_GLOBAL_DEFAULT',
);

/* 3. Effective friction is the product, and FRICT_STIF converts N/cm to N/m. */
const frictionTable = resolveCaesarFrictionAuthorityTable({
  authority,
  cases: benchmarkPackage.cases,
  inputUnitRows: benchmarkPackage.model.tables.INPUT_UNITS.rows,
});
for (const [caseId, expected] of Object.entries({
  L5: { kind: 'PRIMITIVE', multiplier: 0, effective: 0 },
  L6: { kind: 'PRIMITIVE', multiplier: 0, effective: 0 },
  L7: { kind: 'PRIMITIVE', multiplier: 1, effective: 0.3 },
  L13: { kind: 'PRIMITIVE', multiplier: 1, effective: 0.3 },
  L14: { kind: 'DERIVED_COMBINATION', multiplier: null, effective: 0 },
  L15: { kind: 'DERIVED_COMBINATION', multiplier: null, effective: 0.3 },
})) {
  const row = frictionTable.cases[caseId];
  assert.equal(row.kind, expected.kind, caseId);
  assert.equal(row.coefficient.value, 0.3, caseId);
  assert.equal(row.coefficient.level, 'MODEL_INPUT', caseId);
  assert.equal(row.frictionMultiplier.value, expected.multiplier, caseId);
  assert.equal(row.effectiveCoefficient, expected.effective, caseId);
  assert.equal(row.frictionStiffness.displayedValue, 1e6, caseId);
  assert.equal(row.frictionStiffness.displayedUnit, 'N./cm.', caseId);
  assert.equal(row.frictionStiffness.conversionFactor, 100, caseId);
  assert.equal(row.frictionStiffness.siValue, 1e8, caseId);
  assert.equal(row.frictionStiffness.siUnit, 'N/m', caseId);
}
assert.equal(frictionTable.cases.L15.constituents.minuendCaseId, 'L7');
assert.equal(frictionTable.cases.L15.constituents.subtrahendCaseId, 'L13');

/* 4. A primitive case without a declared multiplier fails closed. */
assert.throws(
  () => resolveCaesarFrictionAuthority({
    authority: strippedMultiplier(authority, 'L7'),
    cases: benchmarkPackage.cases,
    caseId: 'L7',
    inputUnitRows: benchmarkPackage.model.tables.INPUT_UNITS.rows,
  }),
  /has no declared authority value/u,
);
assert.throws(
  () => resolveCaesarFrictionAuthority({
    authority,
    cases: benchmarkPackage.cases,
    caseId: 'L15',
    inputUnitRows: [{ TRANS: 'kip./in.', ROT_STIFF: 'N.m./deg' }],
  }),
  /has no governed friction-stiffness conversion/u,
);
assert.throws(
  () => normalizeCaesarConfigurationAuthority({
    ...authority,
    precedence: ['LOAD_CASE_SETTING', 'INDIVIDUAL_FILE_SETTING', 'MODEL_INPUT', 'OVERALL_GLOBAL_DEFAULT'],
  }),
  /precedence must be declared lowest authority first/u,
);

/* 5. The migration changed no non-friction result row. */
const baseline = readJson(BASELINE_PATH);
assert.equal(baseline.capturedFrom.frictionDeclaration, 'SUPERSEDED_LOAD_CASE_MU_OVERRIDE');
const linear = solveCaesarAccdbLinearBenchmark(benchmarkPackage, baseline.caseIds);
for (const caseId of baseline.caseIds) {
  const now = linear.cases[caseId];
  const frozen = baseline.cases[caseId];
  assert.equal(now.rows.length, frozen.rowCount, `${caseId} row count`);
  assert.equal(semanticHash(now.rows), frozen.rowsSemanticHash, `${caseId} rows changed`);
  assert.equal(now.executionSemanticHash, frozen.executionSemanticHash, `${caseId} execution hash changed`);
  assert.equal(now.stiffnessStateHash, frozen.stiffnessStateHash, `${caseId} stiffness hash changed`);
  assert.deepEqual(now.rows, frozen.rows, `${caseId} rows differ elementwise`);
}
assert.equal(linear.mechanics.schema, 'lfea-accdb-linear-solve-evidence/v2');
for (const caseId of baseline.caseIds) {
  const evidence = linear.mechanics.cases[caseId];
  assert.equal(evidence.frictionAuthority.effectiveCoefficient, 0, caseId);
  assert.equal(evidence.frictionAuthority.coefficient.value, 0.3, caseId);
  assert.equal(evidence.caseOverlay.springCount, 0, caseId);
  assert.equal(evidence.caseOverlay.nodalLoadCount, 0, caseId);
}

/* 6. A friction-active case is refused by the linear solver. */
for (const caseId of ['L7', 'L13', 'L15']) {
  assert.throws(
    () => solveCaesarAccdbLinearBenchmark(benchmarkPackage, [caseId]),
    /nonzero effective friction is outside the linear benchmark solver/u,
    caseId,
  );
}

/* 7. The nonlinear friction solver converges and passes every gate. */
const friction = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13', 'L7', 'L15']);
assert.equal(friction.schema, 'lfea-accdb-benchmark-actual/v1');
assert.equal(friction.mechanics.frictionSolverProfile.profileId, CAESAR_FRICTION_SOLVER_PROFILE.profileId);
assert.equal(friction.mechanics.nominalRun, true);
for (const caseId of ['L13', 'L7']) {
  const evidence = friction.mechanics.cases[caseId];
  assert.equal(evidence.kind, 'PRIMITIVE', caseId);
  assert.equal(evidence.independentNonlinearSolve, true, caseId);
  assert.equal(evidence.convergenceGates.status, 'CONVERGED', caseId);
  assert.deepEqual(evidence.convergenceGates.failedGates, [], caseId);
  assert.equal(evidence.recoveredEquilibrium.status, 'PASS', caseId);
  assert.equal(evidence.frictionStiffness.appliedSiValue, 1e8, caseId);
  assert.ok(evidence.iterationCount >= 2, `${caseId} must iterate an active set`);
  // Friction is a per-restraint model input read from the ACCDB row, stored as
  // float32, so it is compared at storage precision and never rounded silently.
  assert.equal(evidence.frictionPlan.fileCoefficientOfFriction, 0.3, caseId);
  for (const support of evidence.frictionPlan.supports) {
    assert.ok(Math.abs(support.coefficientOfFriction - 0.3) <= 1e-6, `${caseId} ${support.nodeId} mu`);
    assert.equal(support.coefficientLevel, 'MODEL_INPUT', caseId);
    assert.equal(support.coefficientSource, 'ACCDB:INPUT_RESTRAINTS:FRIC_COEF', caseId);
  }
  // 10 is an anchor, 40 is a support the model leaves frictionless, and 30 has a
  // line stop that removes one tangential direction.
  assert.deepEqual(
    Object.fromEntries(evidence.frictionPlan.excludedRestraints.map((row) => [row.nodeId, row.reason])),
    {
      10: 'ANCHOR_DECLARES_NO_FRICTION_AND_HAS_NO_FREE_TANGENTIAL_DIRECTION',
      40: 'MODEL_INPUT_DECLARES_NO_FRICTION_COEFFICIENT_AT_THIS_RESTRAINT',
    },
    caseId,
  );
  assert.deepEqual(
    Object.fromEntries(evidence.frictionPlan.supports.map((row) => [row.nodeId, [...row.frictionDofs]])),
    { 20: ['UX', 'UZ'], 30: ['UX'] },
    caseId,
  );
  // Friction identity is the restraint row, not the node.
  assert.deepEqual(
    evidence.frictionPlan.supports.map((row) => row.restraintId),
    ['20:REST_PTR2:TYPE3:UY', '30:REST_PTR3:TYPE3:UY'],
    caseId,
  );
  assert.deepEqual(
    evidence.frictionPlan.supports.find((row) => row.nodeId === '30').restrainedTangentialDofs,
    ['UZ'],
    caseId,
  );
  const supports = evidence.iterations.at(-1).supports;
  assert.equal(supports.length, evidence.frictionPlan.supportCount, caseId);
  for (const support of supports) {
    assert.equal(support.stateChanged, false, `${caseId} ${support.restraintId} state still moving`);
    assert.equal(support.normalDof, 'UY', caseId);
    assert.deepEqual(support.normalUnitVector, [0, 1, 0], caseId);
    assert.equal(
      Math.abs(support.signedNormalProjectionN),
      support.normalReactionMagnitudeN,
      `${caseId} ${support.restraintId} |N| must be the signed projection magnitude`,
    );
    assert.ok(support.restraintId.includes('REST_PTR'), caseId);
    assert.equal(support.frictionStiffnessNPerM, 1e8, caseId);
    assert.ok(
      Math.abs(support.capacityN - support.coefficientOfFriction * support.normalReactionMagnitudeN) <= 1e-9,
      `${caseId} ${support.nodeId} capacity must be mu times |N|`,
    );
    if (support.regime === 'SLID') {
      assert.ok(
        Math.abs(support.appliedFrictionForceMagnitudeN - support.capacityN) <= 1e-6,
        `${caseId} ${support.restraintId} sliding force must sit on the cap`,
      );
      assert.ok(support.oppositionCosine <= -0.999999, `${caseId} friction must oppose motion`);
      assert.equal(support.stickResidualN, null, caseId);
      assert.ok(support.slipUpdateM <= CAESAR_FRICTION_SOLVER_PROFILE.slipUpdateLimitM, caseId);
      assert.ok(support.accumulatedSlipMagnitudeM > 0, caseId);
      assert.ok(support.slipOppositionCosine <= -0.999999, caseId);
    } else {
      assert.ok(
        support.appliedFrictionForceMagnitudeN <= support.capacityN + 1e-6,
        `${caseId} ${support.restraintId} sticking force must stay under the cap`,
      );
      assert.ok(support.stickResidualN <= CAESAR_FRICTION_SOLVER_PROFILE.stickResidualLimitN, caseId);
      assert.equal(support.slideResidualN, null, caseId);
    }
  }
}

/* 8. A sliding support reports its friction force as a restraint load. */
const slidingRows = new Map(friction.cases.L7.rows
  .filter((row) => row.entityKind === 'NODE' && row.quantity === 'FORCE')
  .map((row) => [`${row.entityId}:${row.component}`, row.value]));
for (const support of friction.mechanics.cases.L7.iterations.at(-1).supports) {
  if (support.state !== 'SLIDE') continue;
  support.frictionDofs.forEach((dof, index) => {
    assert.equal(
      slidingRows.get(`${support.nodeId}:${dof}`),
      support.appliedFrictionForceN[index],
      `L7 ${support.nodeId} ${dof} restraint load must carry the friction force`,
    );
  });
}

/* 9. The stick branch converges on its own declared numerics. */
const stickDiagnostic = solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13'], {
  frictionStiffnessScale: 1e-5,
});
const stickEvidence = stickDiagnostic.mechanics.cases.L13;
assert.equal(stickEvidence.convergenceGates.status, 'CONVERGED');
assert.equal(stickDiagnostic.mechanics.nominalRun, false);
const stickSupports = stickEvidence.iterations.at(-1).supports;
assert.ok(
  stickSupports.every((support) => support.regime === 'STUCK'),
  'The low-stiffness diagnostic must converge with every support sticking.',
);
for (const support of stickSupports) {
  assert.ok(support.stickResidualN <= CAESAR_FRICTION_SOLVER_PROFILE.stickResidualLimitN);
  assert.ok(support.trialTangentialSpringForceMagnitudeN <= support.capacityN + 1e-6);
}

/* 10. The derived combination is algebraic, exact and separately conditioned. */
const derived = friction.mechanics.cases.L15;
assert.equal(derived.kind, 'DERIVED_COMBINATION');
assert.equal(derived.independentNonlinearSolve, false);
assert.equal(derived.identityProof.status, 'PASS');
assert.equal(derived.identityProof.maximumAbsoluteDeviation, 0);
assert.equal(derived.combination.minuendCaseId, 'L7');
assert.equal(derived.combination.subtrahendCaseId, 'L13');
assert.equal(friction.cases.L15.executionSemanticHash, null);
assert.ok(derived.conditioning.comparedRowCount > 0);
const l7Rows = new Map(friction.cases.L7.rows.map((row) => [identity(row), row.value]));
const l13Rows = new Map(friction.cases.L13.rows.map((row) => [identity(row), row.value]));
for (const row of friction.cases.L15.rows) {
  assert.equal(row.value, l7Rows.get(identity(row)) - l13Rows.get(identity(row)), identity(row));
}

/* 11. Repeated nominal runs are deterministic. */
const determinism = verifyCaesarAccdbFrictionDeterminism(benchmarkPackage, ['L13', 'L7', 'L15']);
assert.equal(determinism.status, 'PASS');
assert.deepEqual(determinism.mismatchedCaseIds, []);

/* 12. Stiffness sensitivity is diagnostic and cannot replace the nominal run. */
const sensitivity = runCaesarAccdbFrictionStiffnessSensitivity(benchmarkPackage, ['L13', 'L7']);
assert.equal(sensitivity.rule, 'DIAGNOSTIC_ONLY_NOMINAL_1X_REMAINS_THE_GOVERNED_RESULT');
assert.deepEqual(sensitivity.runs.map((run) => run.scale), [0.5, 1, 2]);
const nominalRun = sensitivity.runs.find((run) => run.nominal);
for (const caseId of ['L13', 'L7']) {
  assert.equal(
    nominalRun.cases[caseId].rowsSemanticHash,
    semanticHash(friction.cases[caseId].rows),
    `${caseId} nominal sensitivity run must reproduce the governed result`,
  );
  assert.equal(nominalRun.cases[caseId].frictionStiffnessSiValue, 1e8, caseId);
}
assert.throws(
  () => runCaesarAccdbFrictionStiffnessSensitivity(benchmarkPackage, ['L13'], [0.5, 2]),
  /must include the nominal 1x run/u,
);

/* 13. Paired-delta RCA isolates friction from the qualified controls. */
const nonFriction = solveCaesarAccdbLinearBenchmark(benchmarkPackage, ['L5', 'L6', 'L14']);
const rowsByCase = {
  ...Object.fromEntries(Object.entries(nonFriction.cases).map(([caseId, value]) => [caseId, value.rows])),
  ...Object.fromEntries(Object.entries(friction.cases).map(([caseId, value]) => [caseId, value.rows])),
};
const rca = buildFrictionPairedDeltaRca({
  referenceRowsByCase: Object.fromEntries(benchmarkPackage.cases
    .map((row) => [row.caseId, benchmarkPackage.references[row.caseId].rows])),
  actualRowsByCase: rowsByCase,
  pairs: [['L13', 'L6'], ['L7', 'L5'], ['L15', 'L14']],
});
assert.deepEqual(rca.pairs.map((pair) => pair.isolatedMechanic), ['L13-L6', 'L7-L5', 'L15-L14']);
for (const pair of rca.pairs) {
  assert.ok(pair.comparedRowCount > 0, pair.isolatedMechanic);
  assert.deepEqual(pair.unmatchedReferenceIdentities, [], pair.isolatedMechanic);
}
const operatingDelta = rca.pairs.find((pair) => pair.isolatedMechanic === 'L7-L5');
const expansionDelta = rca.pairs.find((pair) => pair.isolatedMechanic === 'L15-L14');
assert.ok(
  operatingDelta.maximumAbsoluteError > 0,
  'The L7-L5 delta must expose the friction contribution rather than cancel it.',
);
assert.ok(expansionDelta.rows.some((row) => row.actualDelta !== 0));

/* 14. The command boundary reports friction and non-friction cases together. */
const report = await runCaesarAccdbBenchmark({
  profile: fixture.profile,
  rawExport: fixture.rawExport,
  solveLinear: true,
  solveCaseIds: ['L5', 'L6', 'L14'],
  solveFrictionCaseIds: ['L13', 'L7', 'L15'],
  actualPath: null,
  actualOutPath: null,
  outPath: null,
});
assert.equal(report.mechanics.schema, 'lfea-accdb-combined-solve-evidence/v1');
assert.deepEqual(
  Object.keys(report.mechanics.cases).sort(),
  ['L13', 'L14', 'L15', 'L5', 'L6', 'L7'],
);
for (const caseId of ['L5', 'L6', 'L13', 'L7', 'L14', 'L15']) {
  assert.ok(report.qualification.caseIds.includes(caseId), `${caseId} must be qualified and reported`);
  assert.ok(
    Object.hasOwn(report.restraintBasis.cases, caseId) && Object.hasOwn(report.elementBasis.cases, caseId)
    && Object.hasOwn(report.displacementBasis.cases, caseId),
    `${caseId} must appear in every result-family basis`,
  );
}
// A single-term difference may never be formed across two different friction states.
for (const derivedCase of report.derivedCases) {
  const [minuend, subtrahend] = derivedCase.formula.split('-');
  assert.equal(
    frictionTable.cases[minuend].effectiveCoefficient,
    frictionTable.cases[subtrahend].effectiveCoefficient,
    `${derivedCase.caseId} pairs two different friction states`,
  );
}
assert.ok(
  report.derivedCases.some((derivedCase) => derivedCase.formula === 'L7-L13'),
  'The friction operating/sustained pair must still be reported.',
);
assert.ok(
  !report.derivedCases.some((derivedCase) => ['L7-L6', 'L13-L5'].includes(derivedCase.formula)),
  'A friction case must not be differenced against a non-friction case.',
);

/* 15. The four comparison layers and the paired-delta RCA are all populated. */
const rcaReport = buildFrictionRcaReport({
  actual: {
    schema: 'lfea-accdb-benchmark-actual/v1',
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    cases: { ...nonFriction.cases, ...friction.cases },
    mechanics: {
      schema: 'lfea-accdb-combined-solve-evidence/v1',
      cases: { ...nonFriction.mechanics.cases, ...friction.mechanics.cases },
    },
  },
  report,
  pairs: [['L13', 'L6'], ['L7', 'L5'], ['L15', 'L14']],
});
assert.deepEqual(Object.keys(rcaReport.layers).sort(), [
  'coordinateInvariantVectorGate',
  'literalComponentGate',
  'nonlinearStateGate',
  'physicalEquilibriumGate',
]);
for (const caseId of ['L5', 'L6', 'L7', 'L13', 'L14', 'L15']) {
  assert.ok(
    rcaReport.layers.literalComponentGate.cases[caseId].comparedComponentCount > 0,
    `${caseId} literal layer`,
  );
  assert.ok(
    rcaReport.layers.coordinateInvariantVectorGate.cases[caseId].comparedVectorCount > 0,
    `${caseId} vector layer`,
  );
}
for (const caseId of ['L5', 'L6', 'L14', 'L7', 'L13']) {
  assert.equal(rcaReport.layers.physicalEquilibriumGate.cases[caseId].status, 'PASS', caseId);
}
assert.equal(rcaReport.layers.physicalEquilibriumGate.cases.L7.appliedNodalLoadCount > 0, true);
for (const caseId of ['L7', 'L13']) {
  const state = rcaReport.layers.nonlinearStateGate.cases[caseId];
  assert.equal(state.kind, 'PRIMITIVE', caseId);
  assert.equal(state.convergenceStatus, 'CONVERGED', caseId);
  // The Coulomb cap is checked on the same absolute basis as the solver gate.
  assert.ok(
    state.supports.every((support) => support.capacityMarginN
      >= -Math.max(CAESAR_FRICTION_SOLVER_PROFILE.capViolationAbsoluteN,
        CAESAR_FRICTION_SOLVER_PROFILE.capViolationRelative * support.capacityN)),
    caseId,
  );
}
assert.equal(rcaReport.layers.nonlinearStateGate.cases.L15.independentNonlinearSolve, false);
assert.deepEqual(rcaReport.skippedPairs, []);
assert.deepEqual(
  rcaReport.pairedDelta.pairs.map((pair) => pair.isolatedMechanic),
  ['L13-L6', 'L7-L5', 'L15-L14'],
);

/* 16. Negative controls: an invalid friction state must not pass. */
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L5']),
  /accepts only governed friction-active cases/u,
);
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13'], {
    profile: { ...CAESAR_FRICTION_SOLVER_PROFILE, maximumIterations: 1 },
  }),
  /did not converge within 1 iterations/u,
);
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13'], {
    profile: { ...CAESAR_FRICTION_SOLVER_PROFILE, oppositionCosineLimit: -2 },
  }),
  /did not converge/u,
);
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13'], {
    profile: { ...CAESAR_FRICTION_SOLVER_PROFILE, capViolationAbsoluteN: -1, capViolationRelative: -1 },
  }),
  /did not converge/u,
);
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L15']),
  /requires the converged state of L7/u,
);
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13'], { frictionStiffnessScale: 0 }),
  /must be finite and positive/u,
);
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(benchmarkPackage, ['L13'], { profile: { schema: 'other' } }),
  /versioned caesar-accdb-friction-solver-profile\/v1 is required/u,
);

/* 17. A skewed support and a contradicted per-restraint coefficient fail closed. */
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(skewedPackage(), ['L13']),
  /is skewed; a rotated friction tangent plane is not implemented/u,
);
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(contradictedCoefficientPackage(), ['L13']),
  /contradicts the file-level model-input coefficient/u,
);

/* 18. A hydrotest case without a declared basis stops with a named authority. */
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(hydrotestPackage(), ['L1']),
  /needs hydrotest load mechanics/u,
);
// With the governed basis declared, the same case solves: hydrotest weight uses
// the declared test-fluid density and pressure comes from the ACCDB HP field.
const hydrotest = solveCaesarAccdbFrictionBenchmark(hydrotestPackage({
  testFluidDensityKgPerM3: 1000,
  temperatureBasis: 'AMBIENT_INSTALLATION_TEMPERATURE',
  pressureField: 'HYDRO_PRESSURE',
  authorityStatus: 'RESOLVED',
  source: 'FIXTURE_OWNER_DECLARED_HYDROTEST_BASIS',
}), ['L1']);
const hydrotestEvidence = hydrotest.mechanics.cases.L1;
assert.equal(hydrotestEvidence.convergenceGates.status, 'CONVERGED');
assert.equal(hydrotestEvidence.recoveredEquilibrium.status, 'PASS');
assert.equal(hydrotestEvidence.frictionAuthority.terms.join('+'), 'WW+HP');
// The declared test-fluid density drives the hydrotest weight: doubling it must
// raise the support normal reaction, so the declaration is load-bearing rather
// than recorded and ignored.
const hydrotestReaction = (density) => {
  const run = solveCaesarAccdbFrictionBenchmark(hydrotestPackage({
    testFluidDensityKgPerM3: density,
    temperatureBasis: 'AMBIENT_INSTALLATION_TEMPERATURE',
    pressureField: 'HYDRO_PRESSURE',
    authorityStatus: 'RESOLVED',
    source: `FIXTURE_HYDROTEST_BASIS_${density}`,
  }), ['L1']);
  return run.mechanics.cases.L1.iterations.at(-1)
    .supports.find((support) => support.nodeId === '20').normalReactionMagnitudeN;
};
const declaredReaction = hydrotestReaction(1000);
assert.ok(declaredReaction > 0 && Number.isFinite(declaredReaction));
assert.ok(
  hydrotestReaction(2000) > declaredReaction,
  'A heavier declared test fluid must increase the hydrotest support reaction.',
);
assert.throws(
  () => solveCaesarAccdbFrictionBenchmark(hydrotestPackage({
    testFluidDensityKgPerM3: 1000,
    temperatureBasis: 'AMBIENT_INSTALLATION_TEMPERATURE',
    pressureField: 'HYDRO_PRESSURE',
    authorityStatus: 'UNRESOLVED',
    source: 'FIXTURE_UNRESOLVED_HYDROTEST_BASIS',
  }), ['L1']),
  /requires a RESOLVED linearSolve.hydrotestBasis/u,
);

process.stdout.write('PASS m047 stage 2 nonlinear friction contract\n');

function identity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join(':');
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function strippedMultiplier(source, caseId) {
  const cases = { ...source.layers.loadCase.cases };
  const settings = { ...cases[caseId] };
  delete settings.FRICTION_MULTIPLIER;
  cases[caseId] = settings;
  return {
    ...source,
    layers: { ...source.layers, loadCase: { ...source.layers.loadCase, cases } },
  };
}

function mutatedRestraintPackage(mutate) {
  const raw = structuredClone(fixture.rawExport);
  mutate(raw.tables.INPUT_RESTRAINTS);
  return buildCaesarAccdbBenchmarkPackage({ profile: fixture.profile, rawExport: raw });
}

function skewedPackage() {
  return mutatedRestraintPackage((table) => {
    const support = table.rows.find((row) => Number(row.FRIC_COEF) > 0);
    support.XCOSINE = 0.5;
    support.YCOSINE = 0.866;
  });
}

function contradictedCoefficientPackage() {
  return mutatedRestraintPackage((table) => {
    table.rows.find((row) => Number(row.FRIC_COEF) > 0).FRIC_COEF = 0.15;
  });
}

function hydrotestPackage(hydrotestBasis) {
  const raw = structuredClone(fixture.rawExport);
  const profile = structuredClone(fixture.profile);
  if (hydrotestBasis !== undefined) profile.linearSolve.hydrotestBasis = hydrotestBasis;
  for (const tableName of ['OUTPUT_DISPLACEMENTS', 'OUTPUT_RESTRAINTS_SUMMARY', 'OUTPUT_GLOBAL_ELEMENT_FORCES']) {
    const table = raw.tables[tableName];
    const template = table.rows.filter((row) => Number(row.LCASE_NUM) === 13);
    table.rows = [
      ...table.rows,
      ...template.map((row) => ({
        ...row,
        LCASE_NUM: 1,
        CASE: 'CASE 1 (HYD) WW+HP',
        LCASE_NAME: 'FIXTURE-L1',
      })),
    ];
  }
  profile.caseSelection = {
    mode: 'EXPLICIT',
    cases: [{ caseId: 'L1', lcaseNumber: 1 }, ...profile.caseSelection.cases],
  };
  profile.configurationAuthority.layers.loadCase.cases = {
    L1: { FRICTION_MULTIPLIER: 1 },
    ...profile.configurationAuthority.layers.loadCase.cases,
  };
  return buildCaesarAccdbBenchmarkPackage({ profile, rawExport: raw });
}
