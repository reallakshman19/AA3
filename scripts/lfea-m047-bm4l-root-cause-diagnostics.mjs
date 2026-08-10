import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const EXPECTED_CASES = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const DEFAULT_EXPECTED_ACCDB_SHA256 = 'e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c';
const SUPERPOSITION_IDENTITIES = Object.freeze([
  Object.freeze({ id: 'L6=L2+L4', terms: Object.freeze([['L6', 1], ['L2', -1], ['L4', -1]]) }),
  Object.freeze({ id: 'L5=L2+L3+L4', terms: Object.freeze([['L5', 1], ['L2', -1], ['L3', -1], ['L4', -1]]) }),
  Object.freeze({ id: 'L14=L3', terms: Object.freeze([['L14', 1], ['L3', -1]]) }),
  Object.freeze({ id: 'L14=L5-L6', terms: Object.freeze([['L14', 1], ['L5', -1], ['L6', 1]]) }),
]);

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Invalid command argument near ${String(key)}.`);
    }
    if (args.has(key)) throw new TypeError(`Duplicate command argument ${key}.`);
    args.set(key, value);
  }
  const actualPath = args.get('--actual');
  const reportPath = args.get('--report');
  const outPath = args.get('--out');
  const expectedSourceSha256 = String(args.get('--expected-source-sha') ?? DEFAULT_EXPECTED_ACCDB_SHA256).toLowerCase();
  if (!actualPath || !reportPath || !outPath || !/^[a-f0-9]{64}$/u.test(expectedSourceSha256)) {
    throw new TypeError('Usage: --actual <bm4l-actual.json> --report <bm4l-report.json> --out <diagnostics.json> [--expected-source-sha <sha256>].');
  }
  const unknown = [...args.keys()].filter((key) => !['--actual', '--report', '--out', '--expected-source-sha'].includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown command arguments: ${unknown.join(', ')}.`);
  return Object.freeze({ actualPath: resolve(actualPath), reportPath: resolve(reportPath), outPath: resolve(outPath), expectedSourceSha256 });
}

function readJsonWithHash(path, label) {
  const bytes = readFileSync(path);
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`Cannot parse ${label} ${path}: ${error.message}`, { cause: error });
  }
  return Object.freeze({ value, sha256: createHash('sha256').update(bytes).digest('hex') });
}

function requireInput(actual, report, expectedSourceSha256) {
  if (actual?.schema !== 'lfea-accdb-benchmark-actual/v1') {
    throw new TypeError(`Unexpected actual schema ${String(actual?.schema)}.`);
  }
  if (report?.schema !== 'lfea-caesar-accdb-benchmark-report/v1') {
    throw new TypeError(`Unexpected report schema ${String(report?.schema)}.`);
  }
  if (actual.sourceAccdbSha256 !== expectedSourceSha256 || report.source?.sha256 !== expectedSourceSha256) {
    throw new TypeError(`BM4_L diagnostics expected ACCDB ${expectedSourceSha256}.`);
  }
  if (actual.sourceAccdbSha256 !== report.source.sha256) {
    throw new TypeError('Actual and report ACCDB hashes disagree.');
  }
  const actualCases = Object.keys(actual.cases ?? {}).sort(compareText);
  const missing = EXPECTED_CASES.filter((caseId) => !actualCases.includes(caseId));
  if (missing.length > 0) throw new TypeError(`Actual result is missing required cases: ${missing.join(', ')}.`);
  const qualifiedCases = new Set(report.qualification?.cases?.map((entry) => entry.caseId) ?? []);
  const missingQualification = EXPECTED_CASES.filter((caseId) => !qualifiedCases.has(caseId));
  if (missingQualification.length > 0) {
    throw new TypeError(`Report qualification is missing required cases: ${missingQualification.join(', ')}.`);
  }
}

function caseRows(cases, caseId) {
  const rows = cases?.[caseId]?.rows;
  if (!Array.isArray(rows)) throw new TypeError(`Missing rows for case ${caseId}.`);
  return rows;
}

function rowIdentity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join(':');
}

function indexRows(rows, label) {
  const result = new Map();
  for (const row of rows) {
    const identity = rowIdentity(row);
    if (result.has(identity)) throw new TypeError(`${label} contains duplicate row ${identity}.`);
    result.set(identity, row);
  }
  return result;
}

function referenceCases(report) {
  return Object.fromEntries((report.cases ?? []).map((entry) => [entry.caseId, { rows: entry.referenceRows }]));
}

function linearCombination(cases, identity) {
  const indexed = identity.terms.map(([caseId, factor]) => [caseId, factor, indexRows(caseRows(cases, caseId), caseId)]);
  const keys = [...indexed[0][2].keys()].sort(compareText);
  for (const [caseId, , rows] of indexed.slice(1)) {
    const otherKeys = [...rows.keys()].sort(compareText);
    if (keys.length !== otherKeys.length || keys.some((key, index) => key !== otherKeys[index])) {
      throw new TypeError(`Superposition identity ${identity.id} has incompatible row coverage in ${caseId}.`);
    }
  }
  return keys.map((key) => {
    const sourceRows = indexed.map(([caseId, factor, rows]) => ({ caseId, factor, row: rows.get(key) }));
    const units = new Set(sourceRows.map((entry) => entry.row.unit));
    if (units.size !== 1) throw new TypeError(`Superposition identity ${identity.id} has incompatible units at ${key}.`);
    return Object.freeze({
      identity: key,
      entityKind: sourceRows[0].row.entityKind,
      entityId: sourceRows[0].row.entityId,
      quantity: sourceRows[0].row.quantity,
      component: sourceRows[0].row.component,
      unit: sourceRows[0].row.unit,
      residual: sourceRows.reduce((sum, entry) => sum + entry.factor * Number(entry.row.value), 0),
      terms: Object.freeze(sourceRows.map((entry) => Object.freeze({ caseId: entry.caseId, factor: entry.factor, value: Number(entry.row.value) }))),
    });
  });
}

function summarizeResidualRows(rows) {
  const ranked = [...rows].sort((left, right) => Math.abs(right.residual) - Math.abs(left.residual) || compareText(left.identity, right.identity));
  const byQuantity = {};
  for (const row of rows) {
    const prior = byQuantity[row.quantity] ?? { rowCount: 0, maximumAbsoluteResidual: 0 };
    prior.rowCount += 1;
    prior.maximumAbsoluteResidual = Math.max(prior.maximumAbsoluteResidual, Math.abs(row.residual));
    byQuantity[row.quantity] = prior;
  }
  return Object.freeze({
    rowCount: rows.length,
    maximumAbsoluteResidual: ranked.length === 0 ? 0 : Math.abs(ranked[0].residual),
    worstRows: Object.freeze(ranked.slice(0, 20)),
    byQuantity: Object.freeze(Object.fromEntries(Object.entries(byQuantity).sort(([left], [right]) => compareText(left, right)))),
  });
}

function buildSuperposition(actual, report) {
  const reference = referenceCases(report);
  return Object.freeze(SUPERPOSITION_IDENTITIES.map((identity) => {
    const actualRows = linearCombination(actual.cases, identity);
    const referenceRows = linearCombination(reference, identity);
    const referenceById = new Map(referenceRows.map((row) => [row.identity, row]));
    const deltaRows = actualRows.map((row) => Object.freeze({
      ...row,
      referenceResidual: referenceById.get(row.identity).residual,
      residualDifference: row.residual - referenceById.get(row.identity).residual,
    }));
    const rankedDelta = [...deltaRows].sort((left, right) => Math.abs(right.residualDifference) - Math.abs(left.residualDifference) || compareText(left.identity, right.identity));
    return Object.freeze({
      identity: identity.id,
      actual: summarizeResidualRows(actualRows),
      reference: summarizeResidualRows(referenceRows),
      maximumAbsoluteResidualDifference: rankedDelta.length === 0 ? 0 : Math.abs(rankedDelta[0].residualDifference),
      worstResidualDifferences: Object.freeze(rankedDelta.slice(0, 20)),
    });
  }));
}

function sourceElementId(entityId) {
  const match = /^INPUT_ELEMENT:([^|]+)/u.exec(String(entityId));
  return match ? match[1] : null;
}

function actualRowForFailure(actualCase, failure) {
  const row = indexRows(actualCase.rows, 'actual case').get(rowIdentity(failure));
  if (!row) throw new TypeError(`Actual case has no row corresponding to failed comparison ${rowIdentity(failure)}.`);
  return row;
}

function incidentLedger(ledger, nodeId) {
  return ledger.filter((entry) => String(entry.nodeI) === String(nodeId) || String(entry.nodeJ) === String(nodeId))
    .map((entry) => Object.freeze({
      elementId: entry.elementId,
      sourceElementId: entry.sourceElementId,
      kind: entry.kind,
      nodeI: entry.nodeI,
      nodeJ: entry.nodeJ,
      endAtNode: String(entry.nodeI) === String(nodeId) ? 'FROM' : 'TO',
      gravityWeightN: entry.gravityWeightN,
      pressureAxialStrain: entry.pressureAxialStrain,
      bourdonRotationRadians: entry.bourdonRotationRadians,
      bourdonFreeEndTranslationM: entry.bourdonFreeEndTranslationM,
      physicalInitialStrainLoadGlobal: entry.physicalInitialStrainLoadGlobal,
      solvedInitialStrainLoadGlobal: entry.solvedInitialStrainLoadGlobal,
      numericalShiftLoadGlobal: entry.numericalShiftLoadGlobal,
    }));
}

function elementLedger(ledger, entityId) {
  const id = sourceElementId(entityId);
  if (id === null) return [];
  return ledger.filter((entry) => String(entry.sourceElementId) === id)
    .map((entry) => Object.freeze({
      elementId: entry.elementId,
      sourceElementId: entry.sourceElementId,
      kind: entry.kind,
      nodeI: entry.nodeI,
      nodeJ: entry.nodeJ,
      gravityWeightN: entry.gravityWeightN,
      pressureAxialStrain: entry.pressureAxialStrain,
      bourdonRotationRadians: entry.bourdonRotationRadians,
      bourdonFreeEndTranslationM: entry.bourdonFreeEndTranslationM,
      physicalInitialStrainLoadGlobal: entry.physicalInitialStrainLoadGlobal,
      solvedInitialStrainLoadGlobal: entry.solvedInitialStrainLoadGlobal,
      numericalShiftLoadGlobal: entry.numericalShiftLoadGlobal,
    }));
}

function buildFailureTraces(actual, report) {
  const traces = {};
  for (const qualifiedCase of report.qualification.cases) {
    if (!EXPECTED_CASES.includes(qualifiedCase.caseId)) continue;
    const caseId = qualifiedCase.caseId;
    const actualCase = actual.cases[caseId];
    const mechanics = actual.mechanics?.cases?.[caseId] ?? {};
    const ledger = mechanics.elementLedger ?? [];
    const failures = qualifiedCase.comparison.rows.filter((row) => row.status === 'FAIL');
    traces[caseId] = Object.freeze(failures.map((failure) => {
      const actualRow = actualRowForFailure(actualCase, failure);
      const isNode = failure.entityKind === 'NODE';
      const isSourceElement = failure.entityKind === 'ELEMENT' && String(failure.entityId).startsWith('INPUT_ELEMENT:');
      return Object.freeze({
        rowIdentity: rowIdentity(failure),
        entityKind: failure.entityKind,
        entityId: failure.entityId,
        quantity: failure.quantity,
        component: failure.component,
        unit: failure.unit,
        referenceValue: failure.referenceValue,
        actualValue: failure.actualValue,
        signedError: Number(failure.actualValue) - Number(failure.referenceValue),
        absoluteError: failure.absoluteError,
        rawRelativeError: failure.rawRelativeError,
        referenceClass: Number(failure.referenceValue) === 0 ? 'EXACT_ZERO_ABSOLUTE_GATE' : 'NONZERO_LITERAL_RELATIVE_GATE',
        rawActualRow: Object.freeze({ ...actualRow }),
        mechanicsTrace: isNode
          ? Object.freeze({
              kind: 'NODE_INCIDENT_ANALYSIS_ELEMENTS',
              recoveredEquilibrium: mechanics.recoveredEquilibrium ?? null,
              incidentElements: Object.freeze(incidentLedger(ledger, failure.entityId)),
            })
          : isSourceElement
            ? Object.freeze({
                kind: 'SOURCE_ELEMENT_ANALYSIS_DESCENDANTS',
                sourceElementId: sourceElementId(failure.entityId),
                descendants: Object.freeze(elementLedger(ledger, failure.entityId)),
              })
            : Object.freeze({ kind: 'DIRECT_RESULT_ROW_ONLY' }),
      });
    }));
  }
  return Object.freeze(traces);
}

function buildFailureClusters(traces) {
  const result = {};
  for (const [caseId, rows] of Object.entries(traces)) {
    const byQuantity = {};
    const byComponent = {};
    const byElementKind = {};
    let exactZeroReferenceCount = 0;
    for (const row of rows) {
      byQuantity[row.quantity] = (byQuantity[row.quantity] ?? 0) + 1;
      byComponent[row.component] = (byComponent[row.component] ?? 0) + 1;
      if (row.referenceClass === 'EXACT_ZERO_ABSOLUTE_GATE') exactZeroReferenceCount += 1;
      const mechanics = row.mechanicsTrace;
      const entries = mechanics.kind === 'NODE_INCIDENT_ANALYSIS_ELEMENTS'
        ? mechanics.incidentElements
        : mechanics.kind === 'SOURCE_ELEMENT_ANALYSIS_DESCENDANTS' ? mechanics.descendants : [];
      for (const kind of new Set(entries.map((entry) => entry.kind))) {
        byElementKind[kind] = (byElementKind[kind] ?? 0) + 1;
      }
    }
    result[caseId] = Object.freeze({
      failureCount: rows.length,
      exactZeroReferenceCount,
      nonzeroReferenceCount: rows.length - exactZeroReferenceCount,
      byQuantity: sortObject(byQuantity),
      byComponent: sortObject(byComponent),
      byElementKind: sortObject(byElementKind),
    });
  }
  return Object.freeze(result);
}

function buildLinearityAuthority(actual) {
  const cases = {};
  const stiffnessHashes = [];
  for (const caseId of EXPECTED_CASES) {
    const evidence = actual.mechanics?.cases?.[caseId] ?? {};
    const stiffnessStateHash = actual.cases?.[caseId]?.stiffnessStateHash ?? evidence.stiffnessStateHash ?? null;
    if (stiffnessStateHash !== null) stiffnessHashes.push(String(stiffnessStateHash));
    cases[caseId] = Object.freeze({
      formula: evidence.formula ?? null,
      gravityIncluded: evidence.gravityIncluded ?? null,
      thermalIncluded: evidence.thermalIncluded ?? null,
      pressureIncluded: evidence.pressureIncluded ?? null,
      friction: evidence.effectiveConfiguration?.friction ?? null,
      executionStatus: evidence.executionStatus ?? null,
      stiffnessStateHash,
      executionSemanticHash: actual.cases[caseId].executionSemanticHash ?? null,
    });
  }
  const distinct = [...new Set(stiffnessHashes)];
  const complete = stiffnessHashes.length === EXPECTED_CASES.length;
  const common = complete && distinct.length === 1;
  return Object.freeze({
    selectedCases: EXPECTED_CASES,
    cases,
    commonOperatorHashAvailable: complete,
    distinctStiffnessStateHashes: Object.freeze(distinct),
    commonStiffnessStateHash: common ? distinct[0] : null,
    status: common ? 'PASS_COMMON_OPERATOR' : complete ? 'FAIL_OPERATOR_MISMATCH' : 'INCOMPLETE_OPERATOR_PROOF',
  });
}

function sortObject(value) {
  return Object.freeze(Object.fromEntries(Object.entries(value).sort(([left], [right]) => compareText(left, right))));
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const input = parseArguments(process.argv.slice(2));
const actualFile = readJsonWithHash(input.actualPath, 'actual result');
const reportFile = readJsonWithHash(input.reportPath, 'qualification report');
requireInput(actualFile.value, reportFile.value, input.expectedSourceSha256);
const failureTraces = buildFailureTraces(actualFile.value, reportFile.value);
const output = Object.freeze({
  schema: 'lfea-m047-bm4l-root-cause-diagnostics/v1',
  source: Object.freeze({
    accdbSha256: actualFile.value.sourceAccdbSha256,
    actualPath: input.actualPath,
    actualSha256: actualFile.sha256,
    reportPath: input.reportPath,
    reportSha256: reportFile.sha256,
  }),
  scope: Object.freeze({ cases: EXPECTED_CASES }),
  linearityAuthority: buildLinearityAuthority(actualFile.value),
  superposition: buildSuperposition(actualFile.value, reportFile.value),
  failureClusters: buildFailureClusters(failureTraces),
  failureTraces,
  unresolvedEvidence: Object.freeze([
    'ACCDB table/field canonical hashes and provider binary version are emitted separately by the provenance artifact when its source/provider gate is satisfied.',
  ]),
});
writeJson(input.outPath, output);
console.log(`Wrote BM4_L root-cause diagnostics to ${input.outPath}`);
