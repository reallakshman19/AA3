#!/usr/bin/env node
/**
 * BM4_L root-cause evidence report.
 *
 * This script is intentionally numerically inert: it consumes the governed
 * benchmark report plus the sealed actual-result package and emits diagnostic
 * evidence only. It never changes tolerances, mechanics, reference rows or
 * solver results.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET_CASES = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const COMPONENT_ORDER = Object.freeze(['UX', 'UY', 'UZ', 'RX', 'RY', 'RZ', 'FX', 'FY', 'FZ', 'MX', 'MY', 'MZ']);

export function buildBm4lRootCauseReport({ report, actual }) {
  requireSchema(report, 'lfea-caesar-accdb-benchmark-report/v1', 'benchmark report');
  requireSchema(actual, 'lfea-accdb-benchmark-actual/v1', 'actual result');
  if (String(report.source?.sha256 ?? '') !== String(actual.sourceAccdbSha256 ?? '')) {
    throw new TypeError('Benchmark report and actual result are bound to different ACCDB hashes.');
  }

  const caseComparisons = new Map(
    (report.qualification?.cases ?? []).map((entry) => [String(entry.caseId), entry.comparison?.rows ?? []]),
  );
  for (const caseId of TARGET_CASES) {
    if (!actual.cases?.[caseId]?.rows) throw new TypeError(`Actual result is missing ${caseId}.`);
    if (!caseComparisons.has(caseId)) throw new TypeError(`Benchmark report is missing comparison rows for ${caseId}.`);
  }

  const sourceTopologyByCase = Object.fromEntries(TARGET_CASES.map((caseId) => [
    caseId,
    buildSourceTopology(actual.mechanics?.cases?.[caseId]?.elementLedger ?? []),
  ]));

  const failures = TARGET_CASES.flatMap((caseId) =>
    caseComparisons.get(caseId)
      .filter((row) => row.status === 'FAIL')
      .map((row) => normalizeFailure(caseId, row, sourceTopologyByCase[caseId])));

  const gravityLedger = aggregateMechanicsLedger(actual, (entry) => ({
    gravityWeightN: Number(entry.gravityWeightN ?? 0),
  }));
  const pressureLedger = aggregateMechanicsLedger(actual, (entry) => ({
    pressureAxialStrain: Number(entry.pressureAxialStrain ?? 0),
    bourdonRotationRadians: Number(entry.bourdonRotationRadians ?? 0),
    bourdonFreeEndTranslationM: vector3(entry.bourdonFreeEndTranslationM),
  }));

  const primitiveIdentities = [
    compareLinearIdentity(actual, 'L6=L2+L4', { L6: 1, L2: -1, L4: -1 }),
    compareLinearIdentity(actual, 'L5=L2+L3+L4', { L5: 1, L2: -1, L3: -1, L4: -1 }),
    compareLinearIdentity(actual, 'L14=L3', { L14: 1, L3: -1 }),
  ];

  const result = {
    schema: 'lfea-bm4l-root-cause-report/v1',
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    sourceAccdbSha256: actual.sourceAccdbSha256,
    targetCases: TARGET_CASES,
    mechanicsAreUnmodified: true,
    equilibrium: Object.fromEntries(TARGET_CASES.map((caseId) => [
      caseId,
      actual.mechanics?.cases?.[caseId]?.recoveredEquilibrium ?? null,
    ])),
    linearIdentities: primitiveIdentities,
    failureSummary: summarizeFailures(failures),
    topologySummary: summarizeBy(failures, (row) => `${row.caseId}:${row.family}:${row.topology}`),
    componentSummary: summarizeBy(failures, (row) => `${row.caseId}:${row.family}:${row.component ?? 'NONE'}`),
    endSummary: summarizeBy(failures.filter((row) => row.end !== null), (row) => `${row.caseId}:${row.end}:${row.component}`),
    traceCandidates: selectTraceCandidates(failures),
    engineeringSignificance: rankEngineeringSignificance(failures),
    gravityLedger,
    pressureLedger,
    failures,
  };
  return deepSort(result);
}

function requireSchema(value, expected, label) {
  if (value?.schema !== expected) throw new TypeError(`${label} must use ${expected}.`);
}

function normalizeFailure(caseId, row, topologyBySourceElement) {
  const quantity = String(row.quantity ?? '');
  const entityKind = String(row.entityKind ?? '');
  const entityId = String(row.entityId ?? '');
  const topology = entityKind === 'ELEMENT'
    ? topologyBySourceElement.get(entityId)?.topology ?? 'UNMAPPED_ELEMENT'
    : 'NODE';
  return {
    caseId,
    family: resultFamily(row),
    entityKind,
    entityId,
    topology,
    end: quantity.endsWith('_FROM') ? 'FROM' : quantity.endsWith('_TO') ? 'TO' : null,
    quantity,
    component: row.component ?? null,
    unit: row.unit ?? null,
    referenceValue: finiteOrNull(row.referenceValue),
    actualValue: finiteOrNull(row.actualValue),
    absoluteError: finiteOrNull(row.absoluteError),
    rawRelativeError: finiteOrNull(row.rawRelativeError),
    percentError: Number.isFinite(Number(row.rawRelativeError)) ? Number(row.rawRelativeError) * 100 : null,
    comparisonMode: row.tolerance?.comparisonMode ?? null,
    zeroReferenceAbsolute: finiteOrNull(row.tolerance?.zeroReferenceAbsolute),
    nearZeroReference: isNearZeroReference(row),
  };
}

function resultFamily(row) {
  if (row.entityKind === 'ELEMENT' && String(row.quantity).startsWith('GLOBAL_END_')) return 'GLOBAL_ELEMENT_END_ACTION';
  if (row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity)) return 'DISPLACEMENT_ROTATION';
  if (row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity)) return 'RESTRAINT_REACTION';
  return `${row.entityKind}:${row.quantity}`;
}

function isNearZeroReference(row) {
  const reference = Math.abs(Number(row.referenceValue));
  if (!Number.isFinite(reference)) return false;
  if (reference === 0) return true;
  const absoluteGate = Number(row.tolerance?.zeroReferenceAbsolute);
  return Number.isFinite(absoluteGate) && absoluteGate > 0 && reference <= absoluteGate;
}

function buildSourceTopology(ledger) {
  const grouped = new Map();
  for (const entry of ledger) {
    const sourceElementId = String(entry.sourceElementId ?? entry.elementId ?? '');
    if (!grouped.has(sourceElementId)) {
      grouped.set(sourceElementId, { sourceElementId, kinds: new Set(), analysisElementIds: [], nodes: new Set() });
    }
    const target = grouped.get(sourceElementId);
    target.kinds.add(String(entry.kind ?? 'UNKNOWN'));
    target.analysisElementIds.push(String(entry.elementId));
    target.nodes.add(String(entry.nodeI));
    target.nodes.add(String(entry.nodeJ));
  }
  return new Map([...grouped].map(([sourceElementId, entry]) => [sourceElementId, {
    sourceElementId,
    topology: classifyTopology(entry.kinds),
    kinds: [...entry.kinds].sort(compareText),
    analysisElementIds: entry.analysisElementIds.sort(compareText),
    nodes: [...entry.nodes].sort(compareText),
  }]));
}

function classifyTopology(kinds) {
  const values = [...kinds];
  if (values.some((value) => value.startsWith('BEND_'))) return 'BEND';
  if (values.some((value) => value === 'RIGID')) return 'RIGID';
  if (values.some((value) => value.startsWith('REDUCER'))) return 'REDUCER';
  if (values.some((value) => value.includes('TEE'))) return 'TEE_ADJACENT';
  if (values.every((value) => value === 'FRAME')) return 'STRAIGHT';
  return values.sort(compareText).join('+') || 'UNKNOWN';
}

function aggregateMechanicsLedger(actual, projection) {
  const result = {};
  for (const caseId of TARGET_CASES) {
    const ledger = actual.mechanics?.cases?.[caseId]?.elementLedger ?? [];
    const grouped = new Map();
    for (const entry of ledger) {
      const sourceElementId = String(entry.sourceElementId ?? entry.elementId ?? '');
      if (!grouped.has(sourceElementId)) {
        grouped.set(sourceElementId, {
          sourceElementId,
          kinds: new Set(),
          nodeI: String(entry.nodeI),
          nodeJ: String(entry.nodeJ),
          analysisElementCount: 0,
          entries: [],
        });
      }
      const target = grouped.get(sourceElementId);
      target.kinds.add(String(entry.kind ?? 'UNKNOWN'));
      target.analysisElementCount += 1;
      target.entries.push(projection(entry));
    }
    result[caseId] = [...grouped.values()]
      .map((entry) => aggregateProjectedEntry(entry))
      .sort((left, right) => compareText(left.sourceElementId, right.sourceElementId));
  }
  return result;
}

function aggregateProjectedEntry(entry) {
  const result = {
    sourceElementId: entry.sourceElementId,
    topology: classifyTopology(entry.kinds),
    kinds: [...entry.kinds].sort(compareText),
    nodeI: entry.nodeI,
    nodeJ: entry.nodeJ,
    analysisElementCount: entry.analysisElementCount,
  };
  const keys = [...new Set(entry.entries.flatMap((item) => Object.keys(item)))].sort(compareText);
  for (const key of keys) {
    const values = entry.entries.map((item) => item[key]).filter((value) => value !== undefined);
    if (values.every((value) => typeof value === 'number')) {
      result[key] = values.reduce((sum, value) => sum + value, 0);
    } else if (values.every((value) => Array.isArray(value) && value.length === 3)) {
      result[key] = [0, 1, 2].map((index) => values.reduce((sum, value) => sum + Number(value[index] ?? 0), 0));
    }
  }
  return result;
}

function compareLinearIdentity(actual, identity, factors) {
  const maps = Object.fromEntries(Object.keys(factors).map((caseId) => [caseId, caseRowMap(actual, caseId)]));
  const identities = [...new Set(Object.values(maps).flatMap((map) => [...map.keys()]))].sort(compareText);
  const differences = [];
  for (const rowIdentity of identities) {
    let value = 0;
    let unit = null;
    let complete = true;
    for (const [caseId, factor] of Object.entries(factors)) {
      const row = maps[caseId].get(rowIdentity);
      if (!row) {
        complete = false;
        break;
      }
      unit ??= row.unit ?? null;
      if (unit !== (row.unit ?? null)) throw new TypeError(`${identity} has incompatible units at ${rowIdentity}.`);
      value += factor * Number(row.value);
    }
    if (!complete) {
      differences.push({ rowIdentity, status: 'INCOMPLETE' });
      continue;
    }
    differences.push({ rowIdentity, unit, difference: value, absoluteDifference: Math.abs(value), status: 'COMPLETE' });
  }
  const complete = differences.filter((row) => row.status === 'COMPLETE');
  const byUnit = {};
  for (const row of complete) {
    byUnit[row.unit ?? 'UNITLESS'] ??= { rowCount: 0, maximumAbsoluteDifference: 0, worstRowIdentity: null };
    const target = byUnit[row.unit ?? 'UNITLESS'];
    target.rowCount += 1;
    if (row.absoluteDifference > target.maximumAbsoluteDifference) {
      target.maximumAbsoluteDifference = row.absoluteDifference;
      target.worstRowIdentity = row.rowIdentity;
    }
  }
  return {
    identity,
    factors,
    comparedRowCount: complete.length,
    incompleteRowCount: differences.length - complete.length,
    byUnit,
  };
}

function caseRowMap(actual, caseId) {
  const rows = actual.cases?.[caseId]?.rows;
  if (!Array.isArray(rows)) throw new TypeError(`Actual result is missing ${caseId}.`);
  return new Map(rows.map((row) => [rowIdentity(row), row]));
}

function rowIdentity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join(':');
}

function summarizeFailures(failures) {
  return Object.fromEntries(TARGET_CASES.map((caseId) => {
    const rows = failures.filter((row) => row.caseId === caseId);
    const byFamily = {};
    for (const row of rows) byFamily[row.family] = (byFamily[row.family] ?? 0) + 1;
    return [caseId, {
      total: rows.length,
      nearZeroReference: rows.filter((row) => row.nearZeroReference).length,
      byFamily: Object.fromEntries(Object.entries(byFamily).sort(([a], [b]) => compareText(a, b))),
    }];
  }));
}

function summarizeBy(rows, keyOf) {
  const counts = new Map();
  for (const row of rows) counts.set(keyOf(row), (counts.get(keyOf(row)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || compareText(left.key, right.key));
}

function selectTraceCandidates(failures) {
  const elementFailures = failures.filter((row) => row.family === 'GLOBAL_ELEMENT_END_ACTION');
  return TARGET_CASES.map((caseId) => {
    const candidates = elementFailures.filter((row) => row.caseId === caseId && !row.nearZeroReference);
    const fallback = elementFailures.filter((row) => row.caseId === caseId);
    const ranked = (candidates.length > 0 ? candidates : fallback)
      .sort((left, right) => Math.abs(Number(right.absoluteError ?? 0)) - Math.abs(Number(left.absoluteError ?? 0))
        || componentRank(left.component) - componentRank(right.component)
        || compareText(left.entityId, right.entityId));
    return ranked.length === 0 ? { caseId, candidate: null } : { caseId, candidate: ranked[0] };
  });
}

function rankEngineeringSignificance(failures) {
  return failures
    .slice()
    .sort((left, right) => Math.abs(Number(right.absoluteError ?? 0)) - Math.abs(Number(left.absoluteError ?? 0))
      || compareText(left.caseId, right.caseId)
      || compareText(left.entityId, right.entityId))
    .slice(0, 100);
}

function componentRank(component) {
  const index = COMPONENT_ORDER.indexOf(component);
  return index < 0 ? COMPONENT_ORDER.length : index;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function vector3(value) {
  if (!Array.isArray(value)) return [0, 0, 0];
  return [0, 1, 2].map((index) => finiteOrNull(value[index]) ?? 0);
}

function deepSort(value) {
  if (Array.isArray(value)) return value.map(deepSort);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort(compareText).map((key) => [key, deepSort(value[key])]));
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function parseArguments(argv) {
  const args = { reportPath: null, actualPath: null, outPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--report') args.reportPath = value, index += 1;
    else if (flag === '--actual') args.actualPath = value, index += 1;
    else if (flag === '--out') args.outPath = value, index += 1;
    else throw new TypeError(`Unknown argument ${flag}.`);
  }
  if (!args.reportPath || !args.actualPath) {
    throw new TypeError('Usage: node scripts/lfea-bm4l-root-cause-report.mjs --report <bm4l-report.json> --actual <bm4l-actual.json> [--out <diagnostics.json>]');
  }
  return args;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${label} ${path}: ${error.message}`, { cause: error });
  }
}

function main(argv) {
  const args = parseArguments(argv);
  const report = buildBm4lRootCauseReport({
    report: readJson(args.reportPath, 'benchmark report'),
    actual: readJson(args.actualPath, 'actual result'),
  });
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (args.outPath) writeFileSync(resolve(args.outPath), serialized, 'utf8');
  else process.stdout.write(serialized);
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
