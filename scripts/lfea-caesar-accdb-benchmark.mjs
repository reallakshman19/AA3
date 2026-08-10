/**
 * ACCDB benchmark command boundary.
 * Inputs are an ACCDB path, a governed profile and an optional normalized LFEA result package.
 * Output is a deterministic reference/qualification report; extraction and validation failures are fatal.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildCaesarAccdbBenchmarkPackage,
  compareBenchmarkResultRows,
  createCaesarAccdbQualificationAdapter,
  normalizeBenchmarkResultRows,
  requiredCaesarAccdbTables,
  runGovernedBenchmarkQualification,
  solveCaesarAccdbLinearBenchmark,
} from '../src/core/fea-benchmarks/index.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXPORT_SCRIPT = resolve(SCRIPT_DIR, 'lfea-caesar-accdb-export.ps1');

/** Load, normalize and optionally compare one CAESAR ACCDB benchmark profile. */
export function runCaesarAccdbBenchmark(input) {
  const profile = readJson(input.profilePath, 'benchmark profile');
  const tableNames = requiredCaesarAccdbTables(profile);
  const rawExport = extractAccdb(input.accdbPath, tableNames);
  const benchmarkPackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  if (input.solveLinear === true && input.actualPath !== null) {
    throw new TypeError('--solve-linear and --actual are mutually exclusive.');
  }
  const requestedSolveCaseIds = input.solveCaseIds ?? [];
  const solveCaseIds = requestedSolveCaseIds.length === 0
    ? benchmarkPackage.cases.map((row) => row.caseId)
    : requestedSolveCaseIds;
  const actual = input.solveLinear === true
    ? solveCaesarAccdbLinearBenchmark(benchmarkPackage, solveCaseIds)
    : input.actualPath === null ? null : readJson(input.actualPath, 'actual solver result');
  if (input.actualOutPath !== null) {
    if (actual === null) throw new TypeError('--actual-out requires --solve-linear true or --actual.');
    writeJson(actual, input.actualOutPath);
  }
  const qualification = actual === null ? null : qualifyActual(benchmarkPackage, actual);
  return buildReport(benchmarkPackage, qualification, actual);
}

function extractAccdb(accdbPath, tableNames) {
  if (process.platform !== 'win32') {
    throw new Error('Direct ACCDB extraction currently requires Windows and the Microsoft ACE OLE DB provider.');
  }
  const result = spawnSync('powershell.exe', [
    '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', EXPORT_SCRIPT,
    '-AccdbPath', resolve(accdbPath),
    '-TablesCsv', tableNames.join(','),
  ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (result.error) throw new Error(`ACCDB extraction failed to start: ${result.error.message}`, { cause: result.error });
  if (result.status !== 0) {
    throw new Error(`ACCDB extraction failed with exit ${result.status}: ${String(result.stderr).trim()}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`ACCDB extraction returned invalid JSON: ${error.message}`, { cause: error });
  }
}

function qualifyActual(benchmarkPackage, actual) {
  if (actual?.schema !== 'lfea-accdb-benchmark-actual/v1') {
    throw new TypeError('Actual solver result must use lfea-accdb-benchmark-actual/v1.');
  }
  if (actual.sourceAccdbSha256 !== benchmarkPackage.source.sha256) {
    throw new TypeError('Actual solver result is bound to another ACCDB source hash.');
  }
  const actualCaseIds = Object.keys(actual.cases ?? {}).sort(compareText);
  const adapter = createCaesarAccdbQualificationAdapter(benchmarkPackage, actualCaseIds);
  return runGovernedBenchmarkQualification({
    adapter,
    source: benchmarkPackage,
    tolerances: benchmarkPackage.profile.tolerances,
    optionalQuantities: [],
    prepare: ({ caseIds, modelInput }) => governedRecord('ACCDB-PREPARATION', { caseIds, modelSemanticHash: modelInput.semanticHash }),
    authorize: ({ caseIds, preparation }) => governedRecord('ACCDB-AUTHORIZATION', {
      preparationSemanticHash: preparation.semanticHash,
      authorizedPhysicalCaseIds: caseIds,
      executionBoundary: { authorizationIssued: true },
    }),
    solve: ({ caseId }) => requireActualCase(actual, caseId),
    normalizeSolved: (caseId, solved) => normalizeActualCase(caseId, solved),
  });
}

function normalizeActualCase(caseId, value) {
  const rows = normalizeBenchmarkResultRows(value.rows, caseId);
  return Object.freeze({
    rows,
    exposedQuantities: Object.freeze([...new Set(rows.map((row) => row.quantity))].sort()),
    executionSemanticHash: value.executionSemanticHash ?? null,
    executionEvidenceHash: value.executionEvidenceHash ?? null,
  });
}

function requireActualCase(actual, caseId) {
  const value = actual.cases?.[caseId];
  if (!value || !Array.isArray(value.rows)) throw new TypeError(`Actual solver result is missing case ${caseId}.`);
  return value;
}

function governedRecord(kind, fields) {
  const base = { kind, ...fields };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function buildReport(benchmarkPackage, qualification, actual) {
  const cases = benchmarkPackage.cases.map((caseRecord) => {
    const reference = benchmarkPackage.references[caseRecord.caseId];
    return {
      ...caseRecord,
      referenceCounts: countBy(reference.rows, (row) => row.quantity),
      equilibrium: reference.equilibrium,
      referenceRows: reference.rows,
    };
  });
  const referenceIntegrityScopeCaseIds = qualification === null
    ? cases.map((row) => row.caseId)
    : qualification.caseIds;
  const referenceIntegrityScope = new Set(referenceIntegrityScopeCaseIds);
  const equilibriumFailure = cases.some((row) =>
    referenceIntegrityScope.has(row.caseId) && row.equilibrium?.status === 'FAIL');
  const actualIntegrityFailure = Object.values(actual?.mechanics?.cases ?? {})
    .some((row) => row.recoveredEquilibrium?.status === 'FAIL');
  const derivedCases = buildDerivedLinearCases(benchmarkPackage, actual);
  const derivedFailure = derivedCases.some((row) => row.comparison.status === 'FAIL');
  const status = equilibriumFailure
    ? 'REFERENCE_INVALID'
    : actualIntegrityFailure ? 'ACTUAL_INVALID'
      : qualification === null ? 'REFERENCE_READY'
        : derivedFailure ? 'FAIL' : qualification.status;
  return Object.freeze({
    schema: 'lfea-caesar-accdb-benchmark-report/v1',
    benchmarkId: benchmarkPackage.benchmarkId,
    profileId: benchmarkPackage.profile.profileId,
    status,
    source: benchmarkPackage.source,
    packageSemanticHash: benchmarkPackage.semanticHash,
    model: {
      semanticHash: benchmarkPackage.model.semanticHash,
      installationTemperatureK: benchmarkPackage.model.installationTemperatureK,
      inventory: benchmarkPackage.model.inventory,
    },
    configurationAuthority: benchmarkPackage.profile.configurationAuthority,
    resultFamilies: benchmarkPackage.profile.resultFamilies,
    tolerances: benchmarkPackage.profile.tolerances,
    referenceIntegrityScopeCaseIds,
    cases,
    derivedCases,
    qualification,
    mechanics: actual?.mechanics ?? null,
    restraintBasis: buildRestraintBasis(qualification, actual),
    displacementBasis: buildDisplacementBasis(qualification),
    elementBasis: buildElementBasis(qualification),
    limitations: reportLimitations(benchmarkPackage, qualification),
  });
}

function reportLimitations(benchmarkPackage, qualification) {
  if (qualification === null) {
    return ['No LFEA actual-result package was supplied; this run validates and materializes the ACCDB reference only.'];
  }
  const qualified = new Set(qualification.caseIds);
  const deferred = benchmarkPackage.cases.map((row) => row.caseId)
    .filter((caseId) => !qualified.has(caseId));
  const limitations = deferred.length === 0
    ? []
    : [`Selected ACCDB cases deferred from this solver run: ${deferred.join(', ')}.`];
  const deferredReferenceFailures = deferred.filter((caseId) =>
    benchmarkPackage.references[caseId]?.equilibrium?.status === 'FAIL');
  if (deferredReferenceFailures.length > 0) {
    limitations.push(
      `Deferred ACCDB cases failing reference equilibrium: ${deferredReferenceFailures.join(', ')}.`,
    );
  }
  return limitations;
}

function buildDisplacementBasis(qualification) {
  if (qualification === null) return null;
  const cases = {};
  for (const qualifiedCase of qualification.cases) {
    const compared = qualifiedCase.comparison.rows.filter((row) =>
      row.entityKind === 'NODE'
      && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity)
      && ['PASS', 'FAIL'].includes(row.status));
    const failures = compared.filter((row) => row.status === 'FAIL');
    const nodeIds = [...new Set(failures.map((row) => row.entityId))].sort(compareText);
    cases[qualifiedCase.caseId] = {
      comparedComponentCount: compared.length,
      comparedNodeCount: new Set(compared.map((row) => row.entityId)).size,
      exceedingComponentCount: failures.length,
      exceedingNodeCount: nodeIds.length,
      nodes: nodeIds.map((nodeId) => ({
        nodeId,
        exceedingComponents: failures
          .filter((row) => row.entityId === nodeId)
          .map((row) => comparisonError(row)),
      })),
    };
  }
  return { schema: 'lfea-accdb-displacement-basis/v1', cases };
}

function comparisonError(row) {
  return {
    quantity: row.quantity,
    component: row.component,
    unit: row.unit,
    referenceValue: row.referenceValue,
    actualValue: row.actualValue,
    absoluteError: row.absoluteError,
    percentError: row.rawRelativeError === null ? null : row.rawRelativeError * 100,
    acceptanceRatioPercent: row.relativeError === null ? null : row.relativeError * 100,
    comparisonMode: row.tolerance?.comparisonMode ?? null,
    zeroReferenceAbsolute: row.tolerance?.zeroReferenceAbsolute ?? null,
    scaleFloor: row.tolerance?.scaleFloor ?? null,
  };
}

function buildDerivedLinearCases(benchmarkPackage, actual) {
  if (actual === null) return [];
  const referenceByCase = new Map(benchmarkPackage.cases.map((row) => [
    row.caseId,
    benchmarkPackage.references[row.caseId].rows,
  ]));
  const results = [];
  for (const minuend of benchmarkPackage.cases) {
    if (!actual.cases[minuend.caseId]) continue;
    const minuendTerms = formulaTerms(minuend.formula);
    for (const subtrahend of benchmarkPackage.cases) {
      if (minuend.caseId === subtrahend.caseId) continue;
      if (!actual.cases[subtrahend.caseId]) continue;
      const subtrahendTerms = formulaTerms(subtrahend.formula);
      if (!isProperSubset(subtrahendTerms, minuendTerms)) continue;
      const addedTerms = minuendTerms.filter((term) => !subtrahendTerms.includes(term));
      if (addedTerms.length !== 1) continue;
      const caseId = `DERIVED:${minuend.caseId}-${subtrahend.caseId}`;
      const referenceRows = subtractCaseRows(
        caseId,
        referenceByCase.get(minuend.caseId),
        referenceByCase.get(subtrahend.caseId),
      );
      const actualRows = subtractCaseRows(
        caseId,
        actual.cases[minuend.caseId].rows,
        actual.cases[subtrahend.caseId].rows,
      );
      results.push(Object.freeze({
        caseId,
        formula: `${minuend.caseId}-${subtrahend.caseId}`,
        addedTerms: Object.freeze(addedTerms),
        comparison: compareBenchmarkResultRows({
          caseId,
          referenceRows,
          actualRows,
          tolerances: benchmarkPackage.profile.tolerances,
          optionalQuantities: [],
          exposedQuantities: [...new Set(actualRows.map((row) => row.quantity))],
        }),
      }));
    }
  }
  return Object.freeze(results.sort((left, right) => compareText(left.caseId, right.caseId)));
}

function formulaTerms(formula) {
  return [...new Set(String(formula).split('+').map((term) => term.trim()).filter(Boolean))].sort(compareText);
}

function isProperSubset(candidate, target) {
  return candidate.length < target.length && candidate.every((term) => target.includes(term));
}

function subtractCaseRows(caseId, minuendRows, subtrahendRows) {
  const minuend = new Map(minuendRows.map((row) => [caseIndependentRowIdentity(row), row]));
  const subtrahend = new Map(subtrahendRows.map((row) => [caseIndependentRowIdentity(row), row]));
  const identities = [...new Set([...minuend.keys(), ...subtrahend.keys()])].sort(compareText);
  return identities.flatMap((identity) => {
    const left = minuend.get(identity);
    const right = subtrahend.get(identity);
    if (left === undefined || right === undefined) {
      throw new TypeError(`Derived case ${caseId} has incomplete row coverage at ${identity}.`);
    }
    if (left.unit !== right.unit) throw new TypeError(`Derived row ${identity} has incompatible units.`);
    return [{
      caseId,
      entityKind: left.entityKind,
      entityId: left.entityId,
      quantity: left.quantity,
      component: left.component,
      value: Number(left.value) - Number(right.value),
      unit: left.unit,
      required: left.required !== false && right.required !== false,
    }];
  });
}

function caseIndependentRowIdentity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join(':');
}

function buildElementBasis(qualification) {
  if (qualification === null) return null;
  const cases = {};
  for (const qualifiedCase of qualification.cases) {
    const compared = qualifiedCase.comparison.rows.filter((row) =>
      row.entityKind === 'ELEMENT'
      && row.quantity.startsWith('GLOBAL_END_')
      && ['PASS', 'FAIL'].includes(row.status));
    const failures = compared.filter((row) => row.status === 'FAIL');
    const elementIds = [...new Set(failures.map((row) => row.entityId))].sort(compareText);
    cases[qualifiedCase.caseId] = {
      comparedComponentCount: compared.length,
      comparedElementCount: new Set(compared.map((row) => row.entityId)).size,
      exceedingComponentCount: failures.length,
      exceedingElementCount: elementIds.length,
      elements: elementIds.map((elementId) => ({
        elementId,
        exceedingComponents: failures
          .filter((row) => row.entityId === elementId)
          .map((row) => comparisonError(row)),
      })),
    };
  }
  return { schema: 'lfea-accdb-global-element-basis/v1', cases };
}

function buildRestraintBasis(qualification, actual) {
  if (qualification === null || actual === null) return null;
  const cases = {};
  for (const qualifiedCase of qualification.cases) {
    const caseId = qualifiedCase.caseId;
    const failures = qualifiedCase.comparison.rows.filter((row) =>
      row.entityKind === 'NODE'
      && ['FORCE', 'MOMENT'].includes(row.quantity)
      && row.status === 'FAIL');
    const ledger = actual.mechanics?.cases?.[caseId]?.elementLedger ?? [];
    const actualRows = actual.cases?.[caseId]?.rows ?? [];
    const actualByIdentity = new Map(actualRows.map((row) => [
      [row.entityKind, row.entityId, row.quantity, row.component].join(':'),
      row,
    ]));
    const nodeIds = [...new Set(failures.map((row) => row.entityId))].sort(compareText);
    cases[caseId] = {
      exceedingComponentCount: failures.length,
      exceedingRestraintCount: nodeIds.length,
      restraints: nodeIds.map((nodeId) => ({
        nodeId,
        exceedingComponents: failures
          .filter((row) => row.entityId === nodeId)
          .map((row) => comparisonError(row)),
        incidentGlobalElementEndActions: incidentElementActions(
          nodeId,
          ledger,
          actualByIdentity,
        ),
      })),
    };
  }
  return { schema: 'lfea-accdb-restraint-basis/v1', cases };
}

function incidentElementActions(nodeId, ledger, actualByIdentity) {
  return ledger.flatMap((entry) => {
    const end = entry.nodeI === nodeId ? 'FROM' : entry.nodeJ === nodeId ? 'TO' : null;
    if (end === null) return [];
    const vector = {};
    for (const [quantity, components] of [
      [`GLOBAL_END_FORCE_${end}`, ['FX', 'FY', 'FZ']],
      [`GLOBAL_END_MOMENT_${end}`, ['MX', 'MY', 'MZ']],
    ]) {
      for (const component of components) {
        const identity = ['ELEMENT', entry.elementId, quantity, component].join(':');
        const row = actualByIdentity.get(identity);
        if (!row) throw new TypeError(`Actual result is missing ${identity}.`);
        vector[component] = row.value;
      }
    }
    return [{
      elementId: entry.elementId,
      sourceElementId: entry.sourceElementId,
      end,
      oppositeNodeId: end === 'FROM' ? entry.nodeJ : entry.nodeI,
      ...vector,
    }];
  });
}

function countBy(values, keyOf) {
  const result = {};
  for (const value of values) {
    const key = keyOf(value);
    result[key] = (result[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
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

function parseArguments(argv) {
  const accepted = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid command argument near ${String(key)}.`);
    if (accepted.has(key)) throw new TypeError(`Duplicate command argument ${key}.`);
    accepted.set(key, value);
  }
  const accdbPath = accepted.get('--accdb');
  const profilePath = accepted.get('--profile');
  if (!accdbPath || !profilePath) throw new TypeError('Usage: --accdb <file.accdb> --profile <profile.json> [--solve-linear true] [--solve-cases L2,L3] [--actual <actual.json>] [--actual-out <actual.json>] [--summary-out <summary.md>] [--out <report.json>].');
  const known = new Set(['--accdb', '--profile', '--solve-linear', '--solve-cases', '--actual', '--actual-out', '--summary-out', '--out']);
  const unknown = [...accepted.keys()].filter((key) => !known.has(key));
  if (unknown.length > 0) throw new TypeError(`Unknown command arguments: ${unknown.join(', ')}.`);
  const solveLinearValue = accepted.get('--solve-linear');
  if (solveLinearValue !== undefined && !['true', 'false'].includes(solveLinearValue.toLowerCase())) {
    throw new TypeError('--solve-linear must be true or false.');
  }
  const solveCaseIds = parseCaseIds(accepted.get('--solve-cases'));
  if (solveCaseIds.length > 0 && solveLinearValue?.toLowerCase() !== 'true') {
    throw new TypeError('--solve-cases requires --solve-linear true.');
  }
  return Object.freeze({
    accdbPath,
    profilePath,
    solveLinear: solveLinearValue?.toLowerCase() === 'true',
    solveCaseIds,
    actualPath: accepted.get('--actual') ?? null,
    actualOutPath: accepted.get('--actual-out') ?? null,
    summaryOutPath: accepted.get('--summary-out') ?? null,
    outPath: accepted.get('--out') ?? null,
  });
}

function parseCaseIds(value) {
  if (value === undefined) return Object.freeze([]);
  const caseIds = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (caseIds.length === 0) throw new TypeError('--solve-cases must contain at least one case ID.');
  if (new Set(caseIds).size !== caseIds.length) throw new TypeError('--solve-cases contains duplicates.');
  return Object.freeze(caseIds.sort(compareText));
}

function writeJson(value, path) {
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, canonicalPrettyStringify(value), 'utf8');
}

function writeRestraintSummary(report, path) {
  if (report.restraintBasis === null) throw new TypeError('--summary-out requires actual solver results.');
  const authority = report.configurationAuthority;
  const caseBoundaries = Object.entries(report.mechanics?.cases ?? {}).map(([caseId, evidence]) => {
    const friction = evidence.effectiveConfiguration?.friction;
    return `${caseId} effective mu=${String(friction?.value)} (${String(friction?.level)})`;
  });
  const lines = [
    `# ${report.benchmarkId} restraint, displacement, and global element benchmark basis`,
    '',
    `- ACCDB: ${report.source.linkedPath}`,
    `- SHA-256: \`${report.source.sha256}\``,
    `- CAESAR version: ${authority.caesarVersion}`,
    `- Configuration precedence: ${authority.precedence.join(' > ')}`,
    `- Installation temperature: ${report.model.installationTemperatureK} K`,
    `- Benchmark status: ${report.status}`,
    `- Boundary: provisional bilateral fixed DOFs; ${caseBoundaries.join('; ')}; lift-off excluded.`,
    '- Error criterion: literal percentage of each nonzero reference; exactly-zero references use the separately declared absolute tolerance.',
    ...report.limitations.map((entry) => `- Limitation: ${entry}`),
    '',
  ];
  for (const [caseId, evidence] of Object.entries(report.mechanics?.cases ?? {})) {
    const balance = evidence.recoveredEquilibrium;
    if (balance === undefined) continue;
    lines.push(
      `- ${caseId} LFEA recovered-action equilibrium: ${balance.status}; maximum residual ${formatNumber(balance.maximumAbsoluteResidual.forceN)} N / ${formatNumber(balance.maximumAbsoluteResidual.momentNm)} N.m.`,
    );
  }
  lines.push('');
  for (const [caseId, caseBasis] of Object.entries(report.restraintBasis.cases)) {
    lines.push(
      `## ${caseId}`,
      '',
      `${caseBasis.exceedingRestraintCount} restraints / ${caseBasis.exceedingComponentCount} components exceed 10%.`,
      '',
      '| Node | Quantity | Component | Reference | LFEA | Error | Unit |',
      '|---:|---|---|---:|---:|---:|---|',
    );
    for (const restraint of caseBasis.restraints) {
      for (const component of restraint.exceedingComponents) {
        lines.push(`| ${restraint.nodeId} | ${component.quantity} | ${component.component} | ${formatNumber(component.referenceValue)} | ${formatNumber(component.actualValue)} | ${formatPercent(component.percentError)} | ${component.unit} |`);
      }
    }
    lines.push(
      '',
      '### Incident global element-end actions at the exceeding restraints',
      '',
      '| Node | Analysis element | Source element | End | Opposite node | FX (N) | FY (N) | FZ (N) | MX (N.m) | MY (N.m) | MZ (N.m) |',
      '|---:|---|---:|---|---:|---:|---:|---:|---:|---:|---:|',
    );
    for (const restraint of caseBasis.restraints) {
      for (const action of restraint.incidentGlobalElementEndActions) {
        lines.push(`| ${restraint.nodeId} | ${action.elementId} | ${action.sourceElementId} | ${action.end} | ${action.oppositeNodeId} | ${formatNumber(action.FX)} | ${formatNumber(action.FY)} | ${formatNumber(action.FZ)} | ${formatNumber(action.MX)} | ${formatNumber(action.MY)} | ${formatNumber(action.MZ)} |`);
      }
    }
    lines.push('');
    const displacementBasis = report.displacementBasis?.cases?.[caseId];
    if (displacementBasis !== undefined) {
      lines.push(
        `### Displacement and rotation errors for ${caseId}`,
        '',
        `${displacementBasis.comparedNodeCount} nodes / ${displacementBasis.comparedComponentCount} components were compared; ${displacementBasis.exceedingNodeCount} nodes / ${displacementBasis.exceedingComponentCount} components exceed 10%.`,
        '',
        '| Node | Quantity | Component | Reference | LFEA | Error | Unit |',
        '|---:|---|---|---:|---:|---:|---|',
      );
      for (const node of displacementBasis.nodes) {
        for (const component of node.exceedingComponents) {
          lines.push(`| ${node.nodeId} | ${component.quantity} | ${component.component} | ${formatNumber(component.referenceValue)} | ${formatNumber(component.actualValue)} | ${formatPercent(component.percentError)} | ${component.unit} |`);
        }
      }
      lines.push('');
    }
    const elementBasis = report.elementBasis?.cases?.[caseId];
    if (elementBasis !== undefined) {
      lines.push(
        `### Global source-element end-action errors for ${caseId}`,
        '',
        `${elementBasis.comparedElementCount} source elements / ${elementBasis.comparedComponentCount} end-action components were compared exactly; ${elementBasis.exceedingElementCount} elements / ${elementBasis.exceedingComponentCount} components exceed 10%.`,
        '',
        '| Source element identity | Quantity | Component | Reference | LFEA | Error | Unit |',
        '|---|---|---|---:|---:|---:|---|',
      );
      for (const element of elementBasis.elements) {
        for (const component of element.exceedingComponents) {
          lines.push(`| ${element.elementId} | ${component.quantity} | ${component.component} | ${formatNumber(component.referenceValue)} | ${formatNumber(component.actualValue)} | ${formatPercent(component.percentError)} | ${component.unit} |`);
        }
      }
      lines.push('');
    }
  }
  const resolved = resolve(path);
  mkdirSync(dirname(resolved), { recursive: true });
  while (lines.at(-1) === '') lines.pop();
  writeFileSync(resolved, `${lines.join('\n')}\n`, 'utf8');
}

function formatNumber(value) {
  if (value === 0) return '0';
  if (Math.abs(value) >= 0.001 && Math.abs(value) < 1e7) return Number(value.toFixed(6)).toString();
  return value.toExponential(6);
}

function formatPercent(value) {
  return value === null ? 'absolute-only' : `${value.toFixed(2)}%`;
}

function writeReport(report, outPath) {
  const content = canonicalPrettyStringify(report);
  if (outPath === null) {
    process.stdout.write(content);
    return;
  }
  const resolved = resolve(outPath);
  mkdirSync(dirname(resolved), { recursive: true });
  writeFileSync(resolved, content, 'utf8');
  process.stdout.write(`${resolved}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = parseArguments(process.argv.slice(2));
    const report = runCaesarAccdbBenchmark(input);
    if (input.summaryOutPath !== null) writeRestraintSummary(report, input.summaryOutPath);
    writeReport(report, input.outPath);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
