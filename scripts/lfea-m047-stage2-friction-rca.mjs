#!/usr/bin/env node
/**
 * M047 Stage 2 four-layer friction comparison and paired-delta RCA.
 *
 * Layer 1  literal component gate: the raw <10% criterion and exact-zero limits,
 *          reported per case and per result family with no summary percentage.
 * Layer 2  coordinate-invariant vector gate: translation, rotation, force and
 *          moment vectors at each physical node and element end.
 * Layer 3  physical equilibrium gate: recovered element-end actions against
 *          support reactions and declared applied nodal loads.
 * Layer 4  nonlinear-state gate: friction complementarity, cap, direction,
 *          active-set stability and iteration convergence.
 *
 * The paired deltas L13-L6, L7-L5 and L15-L14 isolate friction against real
 * non-friction data, so a friction-law defect cannot be compensated by editing an
 * already-qualified thermal, pressure, bend, tee, restraint or recovery mechanic.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-friction-rca.mjs --actual <actual.json>
 *     --report <report.json> [--pairs L13:L6,L7:L5,L15:L14] [--out <rca.json>]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { buildFrictionPairedDeltaRca } from '../src/core/fea-benchmarks/caesar-accdb-friction-solve.js';

const VECTOR_FAMILIES = Object.freeze([
  { quantity: 'DISPLACEMENT', components: ['UX', 'UY', 'UZ'], entityKind: 'NODE' },
  { quantity: 'ROTATION', components: ['RX', 'RY', 'RZ'], entityKind: 'NODE' },
  { quantity: 'FORCE', components: ['UX', 'UY', 'UZ'], entityKind: 'NODE' },
  { quantity: 'MOMENT', components: ['RX', 'RY', 'RZ'], entityKind: 'NODE' },
  { quantity: 'INCIDENT_GLOBAL_FORCE', components: ['UX', 'UY', 'UZ'], entityKind: 'NODE' },
  { quantity: 'INCIDENT_GLOBAL_MOMENT', components: ['RX', 'RY', 'RZ'], entityKind: 'NODE' },
  { quantity: 'GLOBAL_END_FORCE_FROM', components: ['FX', 'FY', 'FZ'], entityKind: 'ELEMENT' },
  { quantity: 'GLOBAL_END_FORCE_TO', components: ['FX', 'FY', 'FZ'], entityKind: 'ELEMENT' },
  { quantity: 'GLOBAL_END_MOMENT_FROM', components: ['MX', 'MY', 'MZ'], entityKind: 'ELEMENT' },
  { quantity: 'GLOBAL_END_MOMENT_TO', components: ['MX', 'MY', 'MZ'], entityKind: 'ELEMENT' },
]);

const VECTOR_RELATIVE_LIMIT = 0.1;

/** Build the layered comparison and paired-delta record. */
export function buildFrictionRcaReport(input) {
  const { actual, report, pairs } = input;
  requireSchema(actual, 'lfea-accdb-benchmark-actual/v1', 'actual');
  requireSchema(report, 'lfea-caesar-accdb-benchmark-report/v1', 'report');
  if (actual.sourceAccdbSha256 !== report.source?.sha256) {
    throw new TypeError('Actual and report packages are bound to different ACCDB sources.');
  }
  const qualifiedCases = report.qualification?.cases ?? [];
  const literal = {};
  const vector = {};
  for (const qualified of qualifiedCases) {
    literal[qualified.caseId] = literalLayer(qualified);
    vector[qualified.caseId] = vectorLayer(qualified);
  }
  const equilibrium = {};
  const nonlinearState = {};
  for (const [caseId, evidence] of Object.entries(actual.mechanics?.cases ?? {})) {
    if (evidence.recoveredEquilibrium !== undefined) {
      equilibrium[caseId] = {
        status: evidence.recoveredEquilibrium.status,
        counts: evidence.recoveredEquilibrium.counts,
        maximumAbsoluteResidual: evidence.recoveredEquilibrium.maximumAbsoluteResidual,
        appliedNodalLoadCount: evidence.caseOverlay?.nodalLoadCount ?? 0,
      };
    }
    if (evidence.convergenceGates !== undefined || evidence.kind === 'DERIVED_COMBINATION') {
      nonlinearState[caseId] = nonlinearStateLayer(evidence);
    }
  }
  const referenceRowsByCase = Object.fromEntries((report.cases ?? [])
    .map((row) => [row.caseId, row.referenceRows]));
  const actualRowsByCase = Object.fromEntries(Object.entries(actual.cases ?? {})
    .map(([caseId, value]) => [caseId, value.rows]));
  const availablePairs = pairs.filter(([left, right]) =>
    referenceRowsByCase[left] && referenceRowsByCase[right]
    && actualRowsByCase[left] && actualRowsByCase[right]);
  const skippedPairs = pairs
    .filter((pair) => !availablePairs.includes(pair))
    .map(([left, right]) => `${left}-${right}`);
  const pairedDelta = availablePairs.length === 0
    ? null
    : buildFrictionPairedDeltaRca({ referenceRowsByCase, actualRowsByCase, pairs: availablePairs });
  const base = {
    schema: 'm047-bm4l-stage2-friction-rca/v1',
    benchmarkId: report.benchmarkId,
    sourceAccdbSha256: actual.sourceAccdbSha256,
    qualificationStatus: report.qualification?.status ?? null,
    layers: {
      literalComponentGate: {
        rule: 'RAW_TEN_PERCENT_OF_EACH_NONZERO_REFERENCE_WITH_SEPARATE_EXACT_ZERO_ABSOLUTE_LIMITS',
        cases: literal,
      },
      coordinateInvariantVectorGate: {
        rule: 'ERROR_VECTOR_NORM_OVER_REFERENCE_VECTOR_NORM_AT_EACH_PHYSICAL_NODE_OR_ELEMENT_END',
        relativeLimit: VECTOR_RELATIVE_LIMIT,
        cases: vector,
      },
      physicalEquilibriumGate: {
        rule: 'SUM_INCIDENT_GLOBAL_ELEMENT_END_ACTIONS_EQUALS_REACTION_PLUS_APPLIED_NODAL_LOAD',
        cases: equilibrium,
      },
      nonlinearStateGate: {
        rule: 'FRICTION_COMPLEMENTARITY_CAP_DIRECTION_ACTIVE_SET_STABILITY_AND_CONVERGENCE',
        cases: nonlinearState,
      },
    },
    pairedDelta,
    skippedPairs,
    frictionIsolationRule:
      'A paired delta compares two real cases that differ only in friction state, so friction error is attributed to the friction law rather than to W, T1, P1, bend, tee, restraint or recovery mechanics.',
  };
  return Object.freeze({ ...base, rcaSemanticHash: semanticHash(base) });
}

function literalLayer(qualified) {
  const rows = qualified.comparison?.rows ?? [];
  const compared = rows.filter((row) => ['PASS', 'FAIL'].includes(row.status));
  const byFamily = {};
  for (const row of compared) {
    const family = byFamily[row.quantity] ?? {
      comparedComponentCount: 0,
      failedComponentCount: 0,
      exactZeroReferenceComparedCount: 0,
      exactZeroReferenceFailedCount: 0,
      worstPercentError: 0,
      worstIdentity: null,
    };
    family.comparedComponentCount += 1;
    const exactZero = Number(row.referenceValue) === 0;
    if (exactZero) family.exactZeroReferenceComparedCount += 1;
    if (row.status === 'FAIL') {
      family.failedComponentCount += 1;
      if (exactZero) family.exactZeroReferenceFailedCount += 1;
      // An exact-zero reference has no percentage; it is governed by its own
      // absolute limit and is counted separately rather than as an infinite error.
      const percent = row.rawRelativeError === null ? 0 : Math.abs(row.rawRelativeError) * 100;
      if (percent > family.worstPercentError) {
        family.worstPercentError = percent;
        family.worstIdentity = `${row.entityKind}:${row.entityId}:${row.quantity}:${row.component}`;
      }
    }
    byFamily[row.quantity] = family;
  }
  return {
    comparedComponentCount: compared.length,
    failedComponentCount: compared.filter((row) => row.status === 'FAIL').length,
    families: Object.fromEntries(Object.entries(byFamily).sort(([left], [right]) => compareText(left, right))),
  };
}

function vectorLayer(qualified) {
  const rows = (qualified.comparison?.rows ?? []).filter((row) => ['PASS', 'FAIL'].includes(row.status));
  const index = new Map(rows.map((row) => [
    [row.entityKind, row.entityId, row.quantity, row.component].join(':'),
    row,
  ]));
  const vectors = [];
  for (const family of VECTOR_FAMILIES) {
    const entityIds = [...new Set(rows
      .filter((row) => row.entityKind === family.entityKind && row.quantity === family.quantity)
      .map((row) => String(row.entityId)))].sort(compareText);
    for (const entityId of entityIds) {
      const triple = family.components.map((component) =>
        index.get([family.entityKind, entityId, family.quantity, component].join(':')) ?? null);
      if (triple.some((row) => row === null)) continue;
      const referenceNorm = Math.hypot(...triple.map((row) => Number(row.referenceValue)));
      const errorNorm = Math.hypot(...triple.map((row) => Number(row.actualValue) - Number(row.referenceValue)));
      vectors.push({
        entityKind: family.entityKind,
        entityId,
        quantity: family.quantity,
        unit: triple[0].unit,
        referenceVectorNorm: referenceNorm,
        actualVectorNorm: Math.hypot(...triple.map((row) => Number(row.actualValue))),
        errorVectorNorm: errorNorm,
        vectorRelativeError: referenceNorm === 0 ? null : errorNorm / referenceNorm,
        status: referenceNorm === 0
          ? 'ABSOLUTE_ONLY'
          : errorNorm / referenceNorm <= VECTOR_RELATIVE_LIMIT ? 'PASS' : 'FAIL',
      });
    }
  }
  const exceeding = vectors.filter((entry) => entry.status === 'FAIL')
    .sort((left, right) => right.vectorRelativeError - left.vectorRelativeError);
  return {
    comparedVectorCount: vectors.length,
    exceedingVectorCount: exceeding.length,
    absoluteOnlyVectorCount: vectors.filter((entry) => entry.status === 'ABSOLUTE_ONLY').length,
    exceedingVectors: exceeding.slice(0, 100),
  };
}

function nonlinearStateLayer(evidence) {
  if (evidence.kind === 'DERIVED_COMBINATION') {
    return {
      kind: 'DERIVED_COMBINATION',
      independentNonlinearSolve: evidence.independentNonlinearSolve,
      identityProof: evidence.identityProof,
      conditioning: {
        comparedRowCount: evidence.conditioning?.comparedRowCount ?? null,
        severeCancellationRowCount: evidence.conditioning?.severeCancellationRowCount ?? null,
      },
      combination: evidence.combination,
    };
  }
  const supports = evidence.iterations?.at(-1)?.supports ?? [];
  return {
    kind: 'PRIMITIVE',
    iterationCount: evidence.iterationCount,
    convergenceStatus: evidence.convergenceGates?.status ?? null,
    failedGates: evidence.convergenceGates?.failedGates ?? null,
    gates: evidence.convergenceGates?.gates ?? null,
    convergedStates: evidence.convergedStates ?? null,
    frictionStiffness: evidence.frictionStiffness ?? null,
    supports: supports.map((support) => ({
      nodeId: support.nodeId,
      state: support.state,
      normalReactionMagnitudeN: support.normalReactionMagnitudeN,
      capacityN: support.capacityN,
      appliedFrictionForceMagnitudeN: support.appliedFrictionForceMagnitudeN,
      capacityUtilisation: support.capacityN === 0
        ? null
        : support.appliedFrictionForceMagnitudeN / support.capacityN,
      capacityMarginN: support.capacityN - support.appliedFrictionForceMagnitudeN,
      oppositionCosine: support.oppositionCosine,
      stickResidualN: support.stickResidualN,
      slideResidualN: support.slideResidualN,
    })),
  };
}

function requireSchema(value, schema, label) {
  if (value?.schema !== schema) throw new TypeError(`${label} must use ${schema}.`);
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArguments(process.argv.slice(2));
  const record = buildFrictionRcaReport({
    actual: JSON.parse(readFileSync(resolve(args.actualPath), 'utf8')),
    report: JSON.parse(readFileSync(resolve(args.reportPath), 'utf8')),
    pairs: args.pairs,
  });
  const content = `${canonicalPrettyStringify(record)}\n`;
  if (args.outPath === null) {
    process.stdout.write(content);
  } else {
    const resolved = resolve(args.outPath);
    mkdirSync(dirname(resolved), { recursive: true });
    writeFileSync(resolved, content, 'utf8');
    process.stdout.write(`${resolved}\n`);
  }
}

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    if (!argv[index]?.startsWith('--') || argv[index + 1] === undefined) {
      throw new TypeError(`Invalid argument near ${String(argv[index])}.`);
    }
    accepted.set(argv[index], argv[index + 1]);
  }
  const known = new Set(['--actual', '--report', '--pairs', '--out']);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  const actualPath = accepted.get('--actual');
  const reportPath = accepted.get('--report');
  if (!actualPath || !reportPath) {
    throw new TypeError('Usage: --actual <actual.json> --report <report.json> [--pairs L13:L6,L7:L5,L15:L14] [--out <rca.json>].');
  }
  const pairs = (accepted.get('--pairs') ?? 'L13:L6,L7:L5,L15:L14')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [left, right] = entry.split(':');
      if (!left || !right) throw new TypeError(`Invalid pair ${entry}; use frictionCase:controlCase.`);
      return [left, right];
    });
  return { actualPath, reportPath, pairs, outPath: accepted.get('--out') ?? null };
}
