#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const MEASUREMENT_SCHEMA = 'lfea-bm4nl-iteration-measurement/v1';

export function compareBm4IterationMeasurements(before, after, iterationId = null) {
  requireMeasurement(before, 'before');
  requireMeasurement(after, 'after');
  for (const field of [
    'sourceAccdbSha256', 'packageSemanticHash', 'modelSemanticHash', 'profileId',
  ]) {
    if (before[field] !== after[field]) {
      throw new TypeError(
        `Cannot compare iteration measurements with different ${field}: ${String(before[field])} != ${String(after[field])}.`,
      );
    }
  }
  const beforeCaseIds = Object.keys(before.cases).sort(compareText);
  const afterCaseIds = Object.keys(after.cases).sort(compareText);
  if (JSON.stringify(beforeCaseIds) !== JSON.stringify(afterCaseIds)) {
    throw new TypeError(`Cannot compare different physical case sets: [${beforeCaseIds}] != [${afterCaseIds}].`);
  }

  const cases = {};
  for (const caseId of beforeCaseIds) {
    cases[caseId] = compareCase(before.cases[caseId], after.cases[caseId]);
  }
  const totals = aggregateCases(cases);
  const base = {
    schema: 'lfea-bm4nl-iteration-comparison/v1',
    iterationId,
    sourceAccdbSha256: before.sourceAccdbSha256,
    packageSemanticHash: before.packageSemanticHash,
    modelSemanticHash: before.modelSemanticHash,
    profileId: before.profileId,
    beforeMeasurementSemanticHash: before.semanticHash,
    afterMeasurementSemanticHash: after.semanticHash,
    cases,
    totals,
    acceptance: {
      allComparedRestraintComponentsWithinProfileTolerance: totals.afterExceedingComponentCount === 0,
      noSolverExecutionBlocked: Object.values(after.cases).every((entry) => entry.executionStatus !== 'BLOCKED'),
    },
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function compareCase(beforeCase, afterCase) {
  const beforeRows = new Map(beforeCase.components.map((row) => [identity(row), row]));
  const afterRows = new Map(afterCase.components.map((row) => [identity(row), row]));
  const identities = [...new Set([...beforeRows.keys(), ...afterRows.keys()])].sort(compareText);
  if (identities.length !== beforeRows.size || identities.length !== afterRows.size) {
    const missingBefore = identities.filter((key) => !beforeRows.has(key));
    const missingAfter = identities.filter((key) => !afterRows.has(key));
    throw new TypeError(
      `Iteration component identity drift: missingBefore=[${missingBefore}], missingAfter=[${missingAfter}].`,
    );
  }

  const components = identities.map((key) => compareComponent(beforeRows.get(key), afterRows.get(key)));
  const decreased = components.filter((row) => row.comparisonErrorDelta < 0);
  const increased = components.filter((row) => row.comparisonErrorDelta > 0);
  const unchanged = components.filter((row) => row.comparisonErrorDelta === 0);
  const transitions = Object.fromEntries([
    'FAIL_TO_PASS', 'PASS_TO_FAIL', 'PASS_TO_PASS', 'FAIL_TO_FAIL',
  ].map((name) => [name, components.filter((row) => row.statusTransition === name).length]));
  const largestImprovement = [...components].sort((left, right) =>
    left.comparisonErrorDelta - right.comparisonErrorDelta)[0] ?? null;
  const largestRegression = [...components].sort((left, right) =>
    right.comparisonErrorDelta - left.comparisonErrorDelta)[0] ?? null;

  return {
    beforeQualificationStatus: beforeCase.qualificationStatus,
    afterQualificationStatus: afterCase.qualificationStatus,
    beforeExecutionStatus: beforeCase.executionStatus,
    afterExecutionStatus: afterCase.executionStatus,
    comparedRestraintComponentCount: components.length,
    beforeExceedingComponentCount: beforeCase.exceedingComponentCount,
    afterExceedingComponentCount: afterCase.exceedingComponentCount,
    exceedingComponentCountDelta: afterCase.exceedingComponentCount - beforeCase.exceedingComponentCount,
    beforeExceedingRestraintCount: beforeCase.exceedingRestraintCount,
    afterExceedingRestraintCount: afterCase.exceedingRestraintCount,
    exceedingRestraintCountDelta: afterCase.exceedingRestraintCount - beforeCase.exceedingRestraintCount,
    comparisonErrorMovement: {
      decreasedComponentCount: decreased.length,
      increasedComponentCount: increased.length,
      unchangedComponentCount: unchanged.length,
      largestImprovement,
      largestRegression,
    },
    statusTransitions: transitions,
    components,
  };
}

function compareComponent(before, after) {
  if (before.referenceValue !== after.referenceValue || before.unit !== after.unit
      || before.scaleFloor !== after.scaleFloor) {
    throw new TypeError(`Reference/tolerance drift for restraint component ${identity(before)}.`);
  }
  const beforeError = comparisonError(before);
  const afterError = comparisonError(after);
  return {
    nodeId: before.nodeId,
    quantity: before.quantity,
    component: before.component,
    unit: before.unit,
    referenceValue: before.referenceValue,
    scaleFloor: before.scaleFloor,
    beforeActualValue: before.actualValue,
    afterActualValue: after.actualValue,
    actualValueDelta: after.actualValue - before.actualValue,
    beforeRelativeError: before.relativeError,
    afterRelativeError: after.relativeError,
    relativeErrorDelta: before.relativeError === null || after.relativeError === null
      ? null
      : after.relativeError - before.relativeError,
    beforeComparisonError: beforeError,
    afterComparisonError: afterError,
    comparisonErrorDelta: afterError - beforeError,
    beforePercentError: before.percentError,
    afterPercentError: after.percentError,
    percentErrorDelta: before.percentError === null || after.percentError === null
      ? null
      : after.percentError - before.percentError,
    statusTransition: `${before.status}_TO_${after.status}`,
  };
}

function comparisonError(row) {
  if (row.relativeError !== null) return row.relativeError;
  if (Number.isFinite(row.scaleFloor) && row.scaleFloor > 0) {
    return Math.abs(row.absoluteError) / row.scaleFloor;
  }
  return row.absoluteError === 0 ? 0 : Number.POSITIVE_INFINITY;
}

function aggregateCases(cases) {
  const values = Object.values(cases);
  return {
    comparedRestraintComponentCount: values.reduce((sum, row) => sum + row.comparedRestraintComponentCount, 0),
    beforeExceedingComponentCount: values.reduce((sum, row) => sum + row.beforeExceedingComponentCount, 0),
    afterExceedingComponentCount: values.reduce((sum, row) => sum + row.afterExceedingComponentCount, 0),
    exceedingComponentCountDelta: values.reduce((sum, row) => sum + row.exceedingComponentCountDelta, 0),
    failToPassCount: values.reduce((sum, row) => sum + row.statusTransitions.FAIL_TO_PASS, 0),
    passToFailCount: values.reduce((sum, row) => sum + row.statusTransitions.PASS_TO_FAIL, 0),
    decreasedErrorComponentCount: values.reduce((sum, row) => sum + row.comparisonErrorMovement.decreasedComponentCount, 0),
    increasedErrorComponentCount: values.reduce((sum, row) => sum + row.comparisonErrorMovement.increasedComponentCount, 0),
  };
}

function requireMeasurement(value, label) {
  if (!value || value.schema !== MEASUREMENT_SCHEMA) {
    throw new TypeError(`${label} must use ${MEASUREMENT_SCHEMA}.`);
  }
  const { semanticHash: claimed, ...base } = value;
  const expected = semanticHash(base);
  if (claimed !== expected) {
    throw new TypeError(`${label} measurement semantic hash mismatch: ${String(claimed)} != ${expected}.`);
  }
  for (const [caseId, caseValue] of Object.entries(value.cases ?? {})) {
    if (!Array.isArray(caseValue.components)) {
      throw new TypeError(`${label} case ${caseId} is missing the complete restraint component ledger.`);
    }
  }
}

function identity(row) {
  return [row.nodeId, row.quantity, row.component].join(':');
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error });
  }
}

function writeJson(value, path) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, canonicalPrettyStringify(value), 'utf8');
}

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid command argument near ${String(key)}.`);
    }
    if (accepted.has(key)) throw new TypeError(`Duplicate command argument ${key}.`);
    accepted.set(key, value);
  }
  const known = new Set(['--before', '--after', '--out', '--iteration-id']);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown command arguments: ${unknown.join(', ')}.`);
  const beforePath = accepted.get('--before');
  const afterPath = accepted.get('--after');
  const outPath = accepted.get('--out');
  if (!beforePath || !afterPath || !outPath) {
    throw new TypeError('Usage: --before <measurement.json> --after <measurement.json> --out <comparison.json> [--iteration-id I005].');
  }
  return Object.freeze({
    beforePath,
    afterPath,
    outPath,
    iterationId: accepted.get('--iteration-id') ?? null,
  });
}

if (resolve(process.argv[1] ?? '') === resolve(SCRIPT_PATH)) {
  try {
    const args = parseArguments(process.argv.slice(2));
    const comparison = compareBm4IterationMeasurements(
      readJson(args.beforePath, 'before measurement'),
      readJson(args.afterPath, 'after measurement'),
      args.iterationId,
    );
    writeJson(comparison, args.outPath);
    console.log(canonicalPrettyStringify({
      status: comparison.acceptance.allComparedRestraintComponentsWithinProfileTolerance ? 'PASS' : 'FAIL',
      semanticHash: comparison.semanticHash,
      totals: comparison.totals,
      acceptance: comparison.acceptance,
    }));
  } catch (error) {
    console.error(error?.stack ?? String(error));
    process.exitCode = 1;
  }
}
