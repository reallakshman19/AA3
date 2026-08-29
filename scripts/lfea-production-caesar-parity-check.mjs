#!/usr/bin/env node

/**
 * Qualify PRODUCTION against CAESAR's own recorded answer for BM4_L.
 *
 * Until this existed, every numerical change to the linear piping module was
 * judged by eye. The reference (CAESAR's OUTPUT tables inside the ACCDB), the
 * per-quantity tolerances and the comparator were all already here; nothing
 * drove the production path into them. Three separate investigations ended at
 * that same wall, so this is built before the changes that need it.
 *
 * It drives the real production chain -- the one the Analyze button uses -- and
 * not a reimplementation: ACCDB intake, governed pre-flight, engineer
 * authorization, native execution authority.
 *
 * Scope, stated rather than implied: node displacements, rotations and
 * restraint reactions, across the production cases that have a CAESAR
 * counterpart. Element end actions are excluded because production's elements
 * do not correspond one-to-one with CAESAR's after bend retopology; see
 * scripts/lib/lfea-production-benchmark-actual.mjs.
 *
 * Exit status is deliberately NOT coupled to the qualification verdict. This
 * reports the measurement; whether today's agreement is good enough is an
 * engineering judgement, and baking a passing threshold in would make the check
 * assert its own conclusion. It fails only when the harness itself cannot
 * produce a comparison.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLinearPipingAccdbSession,
  prepareLinearPipingAccdbPreFlight,
} from '../src/workspace/linear-piping-accdb-intake.js';
import { authorizeLinearPipingInputXmlPreFlight } from '../src/workspace/linear-piping-inputxml-prefea.js';
import { sealInputXmlProductionBendFactorAuthority } from '../src/core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js';
import { sealInputXmlProductionBranchFactorAuthority } from '../src/core/linear-piping-analysis-consumer/inputxml-production-branch-factor-authority.js';
import { createLfeaNativeExecutionAuthority } from '../src/lfea/native-execution-authority.js';
import { recoverInputXmlAuthorizedRawCases } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js';
import { runCaesarAccdbBenchmark } from './lfea-caesar-accdb-benchmark.mjs';
import {
  buildProductionBenchmarkActual,
  PRODUCTION_TO_CAESAR_CASE,
} from './lib/lfea-production-benchmark-actual.mjs';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { computeInputXmlModelHealthSourceSemanticHash } from '../src/core/geometry/model-health/index.js';
import {
  INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA,
  sealInputXmlThermalIntervalAuthority,
} from '../src/core/linear-piping-analysis-consumer/inputxml-thermal-authority.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCDB = path.join(ROOT, 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
const PROFILE = path.join(ROOT, 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json');
const THERMAL_INTERVAL_AUTHORITY = path.join(
  ROOT,
  'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-t1-interval-authority.json',
);
const PRODUCTION_CASE_IDS = ['IXP-W', 'IXP-WP', 'IXP-WPT', 'IXP-WT'];
const MODEL_TABLES = [
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
];
// The B31/B31J edition an engineer must choose in the UI. Exact bend and tee
// mechanics are unreachable without one, so parity would otherwise be measured
// against a deliberately approximated model.
const EDITION_PROFILE_ID = 'B31_3_2022_B31J_2017';

if (!fs.existsSync(ACCDB)) {
  console.log(JSON.stringify({
    check: 'lfea-production-caesar-parity',
    status: 'SKIPPED_MODEL_NOT_PRESENT',
    requiredModel: 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB',
  }));
  process.exit(0);
}

const MDBReaderModule = await import('mdb-reader');
const MDBReader = MDBReaderModule.default ?? MDBReaderModule;
const reader = new MDBReader(fs.readFileSync(ACCDB));
const tables = Object.fromEntries(
  MODEL_TABLES.map((name) => [name, { rows: reader.getTable(name).getData() }]),
);

const session = createLinearPipingAccdbSession(tables, {
  fileName: 'BM4_L.ACCDB',
  requestedCaseIds: PRODUCTION_CASE_IDS,
});
const thermalIntervalAuthority = bm4lThermalIntervalAuthority(session.sourceBundle);
const prepared = prepareLinearPipingAccdbPreFlight(session.intake, session.sourceBundle, {
  bendFactorAuthority: sealInputXmlProductionBendFactorAuthority({
    authorityId: 'LFEA-PARITY-BEND',
    editionProfileId: EDITION_PROFILE_ID,
    smooth90FlexibilityCorrection: true,
    sourceId: 'LFEA_PARITY_HARNESS',
    sourceRevision: '1',
  }),
  branchFactorAuthority: sealInputXmlProductionBranchFactorAuthority({
    authorityId: 'LFEA-PARITY-BRANCH',
    editionProfileId: EDITION_PROFILE_ID,
    sourceId: 'LFEA_PARITY_HARNESS',
    sourceRevision: '1',
  }),
  preparationOptions: {
    authorityOptions: { thermalIntervalAuthority },
  },
});
const declaredBendCount = prepared.preparation.structuralPreparation
  .summary.bendRetopology.bendCount;
assert.equal(
  prepared.preparation.stiffnessPreflight.eligibleBendCount,
  declaredBendCount,
  'Every governed retopologized bend must retain exact bend ownership through stiffness preflight.',
);
const blockCodes = prepared.preparation.findings
  .filter((row) => row.disposition === 'BLOCK')
  .map((row) => row.code);
assert.deepEqual(blockCodes, [], `Production preparation must reach the solver: ${JSON.stringify(blockCodes)}`);
assertThermalIntervalConsumption(prepared.preparation, thermalIntervalAuthority);

const authorized = authorizeLinearPipingInputXmlPreFlight(prepared, {
  approverIdentity: 'lfea-production-caesar-parity-check',
  reason: 'Automated measurement of production against the retained CAESAR reference.',
});
assert.equal(authorized.solveAuthorized, true, 'Pre-flight authorization must succeed.');

const executed = createLfeaNativeExecutionAuthority().run(authorized, {
  requestedCaseIds: PRODUCTION_CASE_IDS,
});

// CAESAR reports a reaction at every restrained node with the unrestrained
// components zero-filled; production emits only the components it actually
// restrains. Comparing the two directly would score every absent-but-zero
// component as a mismatch, so production's sparse vector is expanded over its
// own constrained node set. An unrestrained DOF carries exactly zero reaction,
// so this adds no information that was not already implied -- and if the two
// disagree about WHICH nodes are restrained, that still surfaces as a real
// difference rather than being smoothed away.
const constrainedNodeIds = [...new Set(
  (prepared.preparation.structuralPreparation.constraintBindings ?? [])
    .map((row) => String(row.targetNodeId).replace(/^IXP\.N/u, '')),
)];

// Element end actions come from recovery, which refuses a whole batch if any
// case in it is BLOCKED. Re-running the qualified subset on its own keeps the
// cases that solved cleanly comparable instead of withholding element actions
// from all of them because one case failed an equilibrium tolerance.
const recoverableCaseIds = executed.execution.caseExecutions
  .filter((row) => ['QUALIFIED', 'CONDITIONAL'].includes(row.executionStatus))
  .map((row) => row.caseId);
const blockedCaseIds = executed.execution.caseExecutions
  .filter((row) => !recoverableCaseIds.includes(row.caseId))
  .map((row) => row.caseId);

let actionsByCase = new Map();
if (recoverableCaseIds.length > 0) {
  const recoverable = createLfeaNativeExecutionAuthority().run(authorized, {
    requestedCaseIds: recoverableCaseIds,
  });
  const recovered = recoverInputXmlAuthorizedRawCases({
    preparation: authorized.preparation,
    rawExecutionBatch: recoverable.execution,
  });
  actionsByCase = new Map(recovered.caseRecoveries.map((row) => [
    row.caseId,
    new Map((row.recovery.elementActions ?? []).map((entry) => [entry.elementId, entry])),
  ]));
}

const elementChains = buildSourceElementChains(
  tables.INPUT_BASIC_ELEMENT_DATA.rows,
  prepared.preparation.structuralPreparation.segmentBindings,
);

const caseResults = executed.execution.caseExecutions.map((row) => ({
  caseId: row.caseId,
  displacementsByNode: vectorsByNode(row.execution.displacement),
  reactionsByNode: zeroFill(vectorsByNode(row.execution.reactions), constrainedNodeIds),
  elementChains,
  actionsByElement: actionsByCase.get(row.caseId) ?? null,
}));

// Take the source hash from a reference-only run so the two sides are provably
// bound to the same file, rather than recomputing it under a possibly
// different rule here.
const referenceOnly = await runCaesarAccdbBenchmark({
  accdbPath: ACCDB, profilePath: PROFILE, solveLinear: false,
  solveCaseIds: [], solveFrictionCaseIds: [], actualPath: null, actualOutPath: null,
  frictionEvidenceOutPath: null, extractor: 'js', expectedAccdbSha256: null, outPath: null,
});

const actual = buildProductionBenchmarkActual({
  sourceAccdbSha256: referenceOnly.source.sha256,
  sourceModelSemanticHash: prepared.preparation.modelSemanticHash,
  caseResults,
});

const actualPath = path.join(ROOT, 'node_modules/.cache/lfea-production-actual.json');
fs.mkdirSync(path.dirname(actualPath), { recursive: true });
fs.writeFileSync(actualPath, JSON.stringify(actual), 'utf8');

const report = await runCaesarAccdbBenchmark({
  accdbPath: ACCDB, profilePath: PROFILE, solveLinear: false,
  solveCaseIds: [], solveFrictionCaseIds: [], actualPath,
  actualOutPath: null, frictionEvidenceOutPath: null,
  extractor: 'js', expectedAccdbSha256: null, outPath: null,
});

// Did the adapter actually emit element rows? Read it from what was supplied,
// not from what the comparison contains -- the comparison also carries
// reference rows that have no counterpart.
const elementActionsSupplied = Object.values(actual.cases)
  .some((entry) => entry.rows.some((row) => row.entityKind === 'ELEMENT'));

assert.ok(report.qualification, 'The comparator must return a qualification for production results.');
assert.ok(report.qualification.cases.length > 0, 'At least one case must be compared.');

// Only quantities production actually emits are meaningful here. Element end
// actions and incident-load rows exist in the reference and are not produced,
// so counting them would report a failure rate for work that was never claimed.
const SUPPLIED = new Set([
  'DISPLACEMENT', 'ROTATION', 'FORCE', 'MOMENT',
  'GLOBAL_END_FORCE_FROM', 'GLOBAL_END_FORCE_TO',
  'GLOBAL_END_MOMENT_FROM', 'GLOBAL_END_MOMENT_TO',
]);

const comparedByCase = new Map(report.qualification.cases.map((qualifiedCase) => [
  qualifiedCase.caseId,
  qualifiedCase.comparison.rows.filter((row) =>
    SUPPLIED.has(row.quantity)
    && (row.entityKind === 'NODE' || elementActionsSupplied)
    && ['PASS', 'FAIL'].includes(row.status)),
]));
const allCompared = [...comparedByCase.values()].flat();
const substantialReferenceFloorByQuantity = referenceFloorByQuantity(allCompared);

const perCase = report.qualification.cases.map((qualifiedCase) => {
  // Only quantities actually supplied are counted. A reference row with no
  // counterpart scores FAIL, so counting withheld element actions would report
  // a 0% pass rate for work that was never claimed -- the same artifact that
  // made MOMENT look like 3/90 before reactions were zero-filled.
  const compared = comparedByCase.get(qualifiedCase.caseId);
  const failed = compared.filter((row) => row.status === 'FAIL');
  const errors = compared
    .map((row) => (row.rawRelativeError === null ? null : Math.abs(row.rawRelativeError) * 100))
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  return {
    caseId: qualifiedCase.caseId,
    byQuantity: Object.fromEntries([...SUPPLIED].sort().map((quantity) => {
      const subset = compared.filter((row) => row.quantity === quantity);
      const bad = subset.filter((row) => row.status === 'FAIL').length;
      return [quantity, {
        compared: subset.length,
        failing: bad,
        passRatePercent: subset.length === 0 ? null
          : Number((100 * (subset.length - bad) / subset.length).toFixed(2)),
      }];
    })),
    comparedComponents: compared.length,
    failing: failed.length,
    passRatePercent: compared.length === 0
      ? null
      : Number((100 * (compared.length - failed.length) / compared.length).toFixed(2)),
    medianPercentError: errors.length === 0 ? null : Number(errors[Math.floor(errors.length / 2)].toFixed(4)),
    worstPercentError: errors.length === 0 ? null : Number(errors[errors.length - 1].toFixed(4)),
    overFivePercent: overFiveMeasure(compared),
    substantialReferenceOverFivePercent: substantialOverFiveMeasure(
      compared,
      substantialReferenceFloorByQuantity,
    ),
    worstRows: failed
      .sort((left, right) => Math.abs(right.rawRelativeError ?? 0) - Math.abs(left.rawRelativeError ?? 0))
      .slice(0, 5)
      .map((row) => ({
        node: row.entityId,
        quantity: row.quantity,
        component: row.component,
        reference: row.referenceValue,
        production: row.actualValue,
        percentError: row.rawRelativeError === null ? null : Number((row.rawRelativeError * 100).toFixed(3)),
      })),
  };
});

console.log(JSON.stringify({
  check: 'lfea-production-caesar-parity',
  status: 'MEASURED',
  measures: 'node displacement/rotation/reaction and source-element end actions',
  blockedCaseIds,
  elementActionsMeasured: elementActionsSupplied,
  elementActionsWithheldBecause: elementActionsSupplied
    ? null
    : `case(s) ${blockedCaseIds.join(', ')} could not be recovered, and partial element `
      + 'coverage fails the comparator rather than degrading it',
  sourceElementChains: elementChains.length,
  editionProfileId: EDITION_PROFILE_ID,
  caseMapping: PRODUCTION_TO_CAESAR_CASE,
  thermalIntervalAuthority: {
    authorityId: thermalIntervalAuthority.authorityId,
    semanticHash: thermalIntervalAuthority.semanticHash,
    sourceSemanticHash: thermalIntervalAuthority.sourceEvidence.sourceSemanticHash,
    installationTemperature: thermalIntervalAuthority.installationTemperature,
    operatingTemperature: thermalIntervalAuthority.operatingTemperature,
    coefficientPerKelvin: thermalIntervalAuthority.coefficientPerKelvin,
    thermalStrain: thermalIntervalAuthority.thermalStrain,
  },
  solverEvidence: executed.execution.caseExecutions.map((row) => ({
    caseId: row.caseId,
    executionStatus: row.executionStatus,
    conditionEstimate: row.execution.factorization.conditionEstimate,
    normalizedResidual: row.execution.diagnostics.residual.value,
    residualStatus: row.execution.diagnostics.residual.status,
  })),
  qualificationStatus: report.qualification.status,
  overFivePercent: overFiveMeasure(allCompared),
  substantialReferenceOverFivePercent: {
    definition: 'absolute raw relative error >5%; reference magnitude >=10% of the quantity non-zero-reference median; denominator is every supplied compared component',
    ...substantialOverFiveMeasure(allCompared, substantialReferenceFloorByQuantity),
  },
  perCase,
}, null, 2));

function bm4lThermalIntervalAuthority(sourceBundle) {
  const record = JSON.parse(fs.readFileSync(THERMAL_INTERVAL_AUTHORITY, 'utf8'));
  assert.equal(record.schema, 'm047-bm4l-t1-interval-authority/v1');
  assert.equal(record.benchmarkId, 'BM4_L');
  const materials = uniqueFinite(sourceBundle.geometry.segments
    .map((segment) => segment.meta?.materialNumber));
  const operatingTemperatures = uniqueFinite(sourceBundle.geometry.segments
    .map((segment) => segment.meta?.analysis?.operatingTemperature));
  assert.equal(materials.length, 1, 'The scoped interval requires one governed material.');
  assert.deepEqual(
    operatingTemperatures,
    [record.interval.operatingTemperatureC + 273.15],
    'The scoped interval operating temperature must match the source model.',
  );
  return sealInputXmlThermalIntervalAuthority({
    schema: INPUTXML_THERMAL_INTERVAL_AUTHORITY_SCHEMA,
    authorityId: `${record.schema}:${record.benchmarkId}`,
    modelId: 'IXP',
    sourceBundleSemanticHash: computeInputXmlModelHealthSourceSemanticHash(sourceBundle),
    materialNumber: materials[0],
    installationTemperature: record.interval.installationTemperatureC + 273.15,
    operatingTemperature: record.interval.operatingTemperatureC + 273.15,
    coefficientPerKelvin: record.interval.meanAlphaPerK,
    sourceEvidence: {
      sourceId: path.relative(ROOT, THERMAL_INTERVAL_AUTHORITY).replaceAll('\\', '/'),
      sourceRevision: record.reconstruction.evidenceSourceCommit,
      sourceSemanticHash: semanticHash(record),
    },
    semanticHash: '',
  });
}

function assertThermalIntervalConsumption(preparation, authority) {
  const sourcePreparation = preparation.sourcePreparation;
  assert.ok(sourcePreparation.loadBindings.length > 0, 'Thermal load bindings must exist.');
  for (const material of sourcePreparation.materialResolutions) {
    assert.equal(material.materialState.thermalExpansionCoefficient, authority.coefficientPerKelvin);
  }
  for (const binding of sourcePreparation.loadBindings) {
    assert.equal(binding.thermal.status, 'RESOLVED');
    assert.equal(binding.thermal.installationTemperature, authority.installationTemperature);
    assert.equal(binding.thermal.operatingTemperature, authority.operatingTemperature);
    assert.equal(binding.thermal.coefficientPerKelvin, authority.coefficientPerKelvin);
    assert.equal(binding.thermal.thermalStrain, authority.thermalStrain);
    assert.equal(binding.thermal.thermalAuthoritySemanticHash, authority.semanticHash);
  }
  assert.ok(sourcePreparation.rigidAuthorities.length > 0, 'Rigid thermal consumers must exist.');
  for (const rigid of sourcePreparation.rigidAuthorities) {
    assert.equal(rigid.thermal.installationTemperature, authority.installationTemperature);
    assert.equal(rigid.thermal.operatingTemperature, authority.operatingTemperature);
    assert.equal(rigid.thermal.expansionCoefficient, authority.coefficientPerKelvin);
    assert.equal(rigid.thermal.axialStrain, authority.thermalStrain);
  }
  const thermalLedger = preparation.physicalPreparation.loadLedger
    .filter((row) => row.sourceKind === 'UNIFORM_TEMPERATURE');
  const thermalPrimitiveIds = thermalLedger.flatMap((row) => row.primitiveIds);
  const analysisElementCount = preparation.structuralPreparation.segmentBindings.length;
  assert.equal(thermalLedger.length, analysisElementCount);
  assert.equal(new Set(thermalPrimitiveIds).size, analysisElementCount);
}

function referenceFloorByQuantity(rows) {
  return new Map([...SUPPLIED].map((quantity) => {
    const magnitudes = rows
      .filter((row) => row.quantity === quantity)
      .map((row) => Math.abs(row.referenceValue))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((left, right) => left - right);
    const median = magnitudes.length === 0 ? Infinity : magnitudes[Math.floor(magnitudes.length / 2)];
    return [quantity, 0.1 * median];
  }));
}

function overFiveMeasure(rows) {
  const aboveFive = rows.filter((row) =>
    Number.isFinite(row.rawRelativeError) && Math.abs(row.rawRelativeError) > 0.05).length;
  return rateMeasure(aboveFive, rows.length);
}

function substantialOverFiveMeasure(rows, floorByQuantity) {
  const aboveFive = rows.filter((row) =>
    Number.isFinite(row.rawRelativeError)
    && Math.abs(row.rawRelativeError) > 0.05
    && Math.abs(row.referenceValue) >= floorByQuantity.get(row.quantity)).length;
  return rateMeasure(aboveFive, rows.length);
}

function rateMeasure(numerator, denominator) {
  return {
    numerator,
    denominator,
    ratePercent: denominator === 0 ? null : Number((100 * numerator / denominator).toFixed(4)),
  };
}

function uniqueFinite(values) {
  return [...new Set(values.filter((value) => Number.isFinite(value)))].sort((left, right) => left - right);
}

/**
 * Walk each CAESAR source element's production chain from its FROM node to its
 * TO node.
 *
 * A plain element is one production element; a retopologized bend is an
 * incoming straight plus its arc chords. Only the chain's outer ends are ever
 * reported, so what matters is getting the order and the endpoints right.
 * A chain that does not close on the declared TO node is dropped rather than
 * reported partially.
 */
function buildSourceElementChains(sourceRows, segmentBindings) {
  const bySource = new Map();
  for (const binding of segmentBindings) {
    const key = String(binding.sourceSegmentId);
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key).push(binding);
  }
  const chains = [];
  for (const row of sourceRows) {
    const sourceId = String(row.ELEMENTID);
    const bindings = bySource.get(`ACCDB.E${sourceId}`) ?? [];
    if (bindings.length === 0) continue;
    const byStart = new Map(bindings.map((binding) => [String(binding.startNodeId), binding]));
    const from = String(row.FROM_NODE);
    const to = String(row.TO_NODE);
    const elementIds = [];
    let node = from;
    for (let step = 0; step < bindings.length; step += 1) {
      const binding = byStart.get(node);
      if (binding === undefined) break;
      elementIds.push(binding.elementId);
      node = String(binding.endNodeId);
      if (node === to) break;
    }
    if (node !== to || elementIds.length !== bindings.length) continue;
    chains.push({
      entityId: `INPUT_ELEMENT:${sourceId}|${from}->${to}|${String(row.ELEMENT_NAME ?? '').trim()}`,
      elementIds,
    });
  }
  return chains;
}

/** Expand a sparse reaction map over every constrained node and all six DOFs. */
function zeroFill(byNode, nodeIds) {
  const filled = { ...byNode };
  for (const nodeId of nodeIds) {
    const vector = { ...(filled[nodeId] ?? {}) };
    for (const dof of ['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ']) {
      if (!Number.isFinite(vector[dof])) vector[dof] = 0;
    }
    filled[nodeId] = vector;
  }
  return filled;
}

/** `[{nodeId:'IXP.N20010', dof:'UX', value}]` becomes `{'20010': {UX: value}}`. */
function vectorsByNode(rows) {
  const byNode = {};
  for (const row of rows ?? []) {
    // Production prefixes its own node identity; CAESAR's plain number is what
    // the reference names. Nodes introduced by retopology carry no CAESAR
    // number and are dropped by the adapter.
    const nodeId = String(row.nodeId).replace(/^IXP\.N/u, '');
    (byNode[nodeId] ??= {})[String(row.dof).toUpperCase()] = Number(row.value);
  }
  return byNode;
}
