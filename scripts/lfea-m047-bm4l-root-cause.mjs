#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = 'e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c';
const CASE_IDS = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const FROZEN_COUNTS = Object.freeze({
  L2: { restraint: 4, displacement: 115, element: 142 },
  L3: { restraint: 9, displacement: 98, element: 179 },
  L4: { restraint: 6, displacement: 66, element: 86 },
  L5: { restraint: 3, displacement: 72, element: 162 },
  L6: { restraint: 1, displacement: 64, element: 50 },
  L14: { restraint: 9, displacement: 98, element: 179 },
});

const args = parseArgs(process.argv.slice(2));
const actual = readJson(required(args, 'actual'));
const report = readJson(required(args, 'report'));
const outPath = resolve(required(args, 'out'));
const summaryPath = resolve(required(args, 'summary-out'));

requireSourceCustody(actual, report);
const diagnosis = buildDiagnosis(actual, report);
writeJson(outPath, diagnosis);
writeText(summaryPath, renderSummary(diagnosis));

function buildDiagnosis(actualPackage, benchmarkReport) {
  const comparisonByCase = new Map((benchmarkReport.qualification?.cases ?? [])
    .map((entry) => [String(entry.caseId), entry.comparison?.rows ?? []]));
  const actualRowsByCase = new Map(CASE_IDS.map((caseId) => [
    caseId,
    actualPackage.cases?.[caseId]?.rows ?? [],
  ]));

  const failureCounts = {};
  const topFailures = {};
  const lineages = {};
  const mechanics = {};

  for (const caseId of CASE_IDS) {
    const compared = comparisonByCase.get(caseId) ?? [];
    const failures = compared.filter((row) => row.status === 'FAIL');
    failureCounts[caseId] = countFailures(failures);
    topFailures[caseId] = failures
      .map(normalizeFailure)
      .sort((a, b) => b.absoluteError - a.absoluteError || compareText(a.identity, b.identity))
      .slice(0, 40);
    lineages[caseId] = buildSourceLineages(
      caseId,
      failures.filter((row) => row.entityKind === 'ELEMENT' && String(row.quantity).startsWith('GLOBAL_END_')),
      actualRowsByCase.get(caseId),
      actualPackage.mechanics?.cases?.[caseId]?.elementLedger ?? [],
    );
    mechanics[caseId] = mechanicsGate(actualPackage.mechanics?.cases?.[caseId]);
  }

  const identities = {
    l6EqualsL2PlusL4: compareLinearCombination(actualRowsByCase, 'L6', [['L2', 1], ['L4', 1]]),
    l5EqualsL2PlusL3PlusL4: compareLinearCombination(actualRowsByCase, 'L5', [['L2', 1], ['L3', 1], ['L4', 1]]),
    l14EqualsL3: compareLinearCombination(actualRowsByCase, 'L14', [['L3', 1]]),
  };

  const gravityLedger = summarizeGravity(actualPackage.mechanics?.cases?.L2?.elementLedger ?? []);
  const pressureLedger = summarizePressure(actualPackage.mechanics?.cases?.L4?.elementLedger ?? []);
  const thermalAuthority = Object.freeze({
    profile: actualPackage.mechanics?.profile?.thermalExpansion ?? null,
    unresolved: (benchmarkReport.configurationAuthority?.unresolvedSettings ?? [])
      .filter((entry) => entry.setting === 'THERMAL_EXPANSION_STRAIN'),
  });

  return Object.freeze({
    schema: 'lfea-m047-bm4l-root-cause-diagnostic/v1',
    source: Object.freeze({
      actualAccdbSha256: actualPackage.sourceAccdbSha256,
      reportAccdbSha256: benchmarkReport.source?.sha256 ?? null,
      expectedAccdbSha256: EXPECTED_SOURCE_SHA256,
      profileId: benchmarkReport.profileId ?? null,
      packageSemanticHash: benchmarkReport.packageSemanticHash ?? null,
    }),
    baseline: Object.freeze({
      frozenCounts: FROZEN_COUNTS,
      observedCounts: failureCounts,
      frozenCountsMatch: CASE_IDS.every((caseId) => equalCounts(FROZEN_COUNTS[caseId], failureCounts[caseId])),
    }),
    mechanics,
    linearIdentities: identities,
    topFailures,
    sourceElementLineages: lineages,
    gravityLedger,
    pressureLedger,
    thermalAuthority,
    interpretation: Object.freeze([
      'A zero source-to-descendant mapping delta rules out report remapping for that row and moves the discrepancy upstream.',
      'The solver already computes end actions as q = K*u - f_fixed - f_initial and records transformed-local versus assembled-global recovery disagreement; this diagnostic binds failed source rows to those raw analysis-element qGlobal rows.',
      'L2 gravity work must preserve total gravity weight and may affect L2/L5/L6 only.',
      'L4 pressure work may affect L4/L5/L6 only.',
      'L3/L14 thermal closure remains blocked while thermal expansion authority is explicitly provisional/[GUESSED].',
    ]),
  });
}

function mechanicsGate(value) {
  if (!value) return null;
  return Object.freeze({
    recoveredEquilibriumStatus: value.recoveredEquilibrium?.status ?? null,
    maximumAbsoluteResidual: value.recoveredEquilibrium?.maximumAbsoluteResidual ?? null,
    globalRecoveryMaximumAbsolute: value.globalRecoveryDisagreement?.maximumAbsolute ?? null,
    gravityWeightN: value.gravityWeightN ?? null,
    analysisNodeCount: value.analysisNodeCount ?? null,
    analysisElementCount: value.analysisElementCount ?? null,
    sourceElementCount: value.sourceElementCount ?? null,
  });
}

function buildSourceLineages(caseId, failures, actualRows, ledger) {
  const actualIndex = rowIndex(actualRows);
  const bySource = groupBy(ledger, (entry) => String(entry.sourceElementId));
  return failures.map((failure) => {
    const parsed = parseSourceElementId(failure.entityId);
    const descendants = parsed === null ? [] : (bySource.get(parsed.sourceElementId) ?? []);
    const endpoint = String(failure.quantity).endsWith('_FROM') ? 'FROM'
      : String(failure.quantity).endsWith('_TO') ? 'TO' : null;
    const selected = endpoint === 'FROM' ? descendants[0]
      : endpoint === 'TO' ? descendants.at(-1) : null;
    const rawRow = selected === null || selected === undefined ? null : actualIndex.get(rowIdentity({
      entityKind: 'ELEMENT',
      entityId: String(selected.elementId),
      quantity: failure.quantity,
      component: failure.component,
    })) ?? null;
    const mappedValue = numberOrNull(failure.actualValue);
    const rawValue = numberOrNull(rawRow?.value);
    return Object.freeze({
      caseId,
      sourceEntityId: failure.entityId,
      sourceElementId: parsed?.sourceElementId ?? null,
      sourceFromNode: parsed?.fromNode ?? null,
      sourceToNode: parsed?.toNode ?? null,
      quantity: failure.quantity,
      component: failure.component,
      referenceValue: numberOrNull(failure.referenceValue),
      mappedActualValue: mappedValue,
      rawAnalysisElementId: selected?.elementId ?? null,
      rawAnalysisNodeI: selected?.nodeI ?? null,
      rawAnalysisNodeJ: selected?.nodeJ ?? null,
      rawAnalysisKind: selected?.kind ?? null,
      rawAnalysisValue: rawValue,
      mappingDelta: mappedValue === null || rawValue === null ? null : mappedValue - rawValue,
      firstDescendantStartsAtSourceFrom: parsed === null || descendants.length === 0
        ? null : String(descendants[0].nodeI) === parsed.fromNode,
      lastDescendantEndsAtSourceTo: parsed === null || descendants.length === 0
        ? null : String(descendants.at(-1).nodeJ) === parsed.toNode,
      descendantChain: descendants.map((entry) => Object.freeze({
        elementId: entry.elementId,
        nodeI: entry.nodeI,
        nodeJ: entry.nodeJ,
        kind: entry.kind,
        gravityWeightN: entry.gravityWeightN,
        pressureAxialStrain: entry.pressureAxialStrain,
        bourdonRotationRadians: entry.bourdonRotationRadians,
      })),
    });
  }).sort((a, b) => {
    const deltaA = Math.abs(a.mappingDelta ?? Number.POSITIVE_INFINITY);
    const deltaB = Math.abs(b.mappingDelta ?? Number.POSITIVE_INFINITY);
    return deltaB - deltaA || compareText(lineageIdentity(a), lineageIdentity(b));
  });
}

function compareLinearCombination(actualRowsByCase, targetCaseId, terms) {
  const target = rowIndex(actualRowsByCase.get(targetCaseId) ?? []);
  const termIndexes = terms.map(([caseId, coefficient]) => [
    caseId,
    coefficient,
    rowIndex(actualRowsByCase.get(caseId) ?? []),
  ]);
  const residuals = [];
  for (const [identity, targetRow] of target) {
    const termRows = termIndexes.map(([caseId, coefficient, index]) => [caseId, coefficient, index.get(identity)]);
    if (termRows.some(([, , row]) => row === undefined)) continue;
    const predicted = termRows.reduce((sum, [, coefficient, row]) => sum + coefficient * Number(row.value), 0);
    const residual = Number(targetRow.value) - predicted;
    residuals.push(Object.freeze({
      identity,
      unit: targetRow.unit,
      targetValue: Number(targetRow.value),
      predictedValue: predicted,
      residual,
      absoluteResidual: Math.abs(residual),
    }));
  }
  const byUnit = {};
  for (const row of residuals) {
    const current = byUnit[row.unit] ?? { maximumAbsoluteResidual: 0, rowCount: 0 };
    current.rowCount += 1;
    current.maximumAbsoluteResidual = Math.max(current.maximumAbsoluteResidual, row.absoluteResidual);
    byUnit[row.unit] = current;
  }
  return Object.freeze({
    targetCaseId,
    terms: terms.map(([caseId, coefficient]) => Object.freeze({ caseId, coefficient })),
    byUnit,
    topResiduals: residuals.sort((a, b) => b.absoluteResidual - a.absoluteResidual || compareText(a.identity, b.identity)).slice(0, 30),
  });
}

function summarizeGravity(ledger) {
  const groups = groupBy(ledger, (entry) => String(entry.sourceElementId));
  const sources = [...groups.entries()].map(([sourceElementId, descendants]) => Object.freeze({
    sourceElementId,
    totalWeightN: descendants.reduce((sum, entry) => sum + Number(entry.gravityWeightN ?? 0), 0),
    descendantCount: descendants.length,
    kinds: [...new Set(descendants.map((entry) => entry.kind))].sort(compareText),
    chain: descendants.map((entry) => `${entry.nodeI}->${entry.nodeJ}`),
  })).sort((a, b) => b.totalWeightN - a.totalWeightN || compareText(a.sourceElementId, b.sourceElementId));
  return Object.freeze({
    totalWeightN: sources.reduce((sum, entry) => sum + entry.totalWeightN, 0),
    sourceCount: sources.length,
    sources,
  });
}

function summarizePressure(ledger) {
  const groups = groupBy(ledger, (entry) => String(entry.sourceElementId));
  const sources = [...groups.entries()].map(([sourceElementId, descendants]) => {
    const strain = descendants.map((entry) => Number(entry.pressureAxialStrain ?? 0));
    const rotation = descendants.map((entry) => Number(entry.bourdonRotationRadians ?? 0));
    const translation = descendants.map((entry) => vectorNorm(entry.bourdonFreeEndTranslationM));
    return Object.freeze({
      sourceElementId,
      descendantCount: descendants.length,
      kinds: [...new Set(descendants.map((entry) => entry.kind))].sort(compareText),
      maximumAbsolutePressureAxialStrain: maximum(strain.map(Math.abs)),
      maximumAbsoluteBourdonRotationRadians: maximum(rotation.map(Math.abs)),
      maximumBourdonFreeEndTranslationM: maximum(translation),
      nonzeroPressureAxialDescendants: strain.filter((value) => value !== 0).length,
      nonzeroBourdonRotationDescendants: rotation.filter((value) => value !== 0).length,
    });
  }).sort((a, b) => Math.max(
    b.maximumAbsolutePressureAxialStrain,
    b.maximumAbsoluteBourdonRotationRadians,
    b.maximumBourdonFreeEndTranslationM,
  ) - Math.max(
    a.maximumAbsolutePressureAxialStrain,
    a.maximumAbsoluteBourdonRotationRadians,
    a.maximumBourdonFreeEndTranslationM,
  ) || compareText(a.sourceElementId, b.sourceElementId));
  return Object.freeze({
    sourceCount: sources.length,
    activeSourceCount: sources.filter((entry) => entry.maximumAbsolutePressureAxialStrain !== 0
      || entry.maximumAbsoluteBourdonRotationRadians !== 0
      || entry.maximumBourdonFreeEndTranslationM !== 0).length,
    sources,
  });
}

function normalizeFailure(row) {
  return Object.freeze({
    identity: rowIdentity(row),
    entityKind: row.entityKind,
    entityId: row.entityId,
    quantity: row.quantity,
    component: row.component,
    unit: row.unit,
    referenceValue: numberOrNull(row.referenceValue),
    actualValue: numberOrNull(row.actualValue),
    absoluteError: Number(row.absoluteError ?? Math.abs(Number(row.actualValue) - Number(row.referenceValue))),
    percentError: row.rawRelativeError === null || row.rawRelativeError === undefined
      ? null : Number(row.rawRelativeError) * 100,
  });
}

function countFailures(rows) {
  const result = { restraint: 0, displacement: 0, element: 0, other: 0 };
  for (const row of rows) {
    if (row.entityKind === 'ELEMENT' && String(row.quantity).startsWith('GLOBAL_END_')) result.element += 1;
    else if (row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity)) result.displacement += 1;
    else if (row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity)) result.restraint += 1;
    else result.other += 1;
  }
  return Object.freeze(result);
}

function renderSummary(diagnosis) {
  const lines = [];
  lines.push('# M047 BM4_L root-cause diagnostic');
  lines.push('');
  lines.push(`ACCDB SHA-256: \`${diagnosis.source.actualAccdbSha256}\``);
  lines.push(`Frozen baseline counts match: **${diagnosis.baseline.frozenCountsMatch ? 'YES' : 'NO'}**`);
  lines.push('');
  lines.push('## Failure counts');
  lines.push('');
  lines.push('| Case | Restraint | Disp/rot | Global end action | Frozen match |');
  lines.push('|---|---:|---:|---:|---|');
  for (const caseId of CASE_IDS) {
    const observed = diagnosis.baseline.observedCounts[caseId];
    const frozen = diagnosis.baseline.frozenCounts[caseId];
    lines.push(`| ${caseId} | ${observed.restraint} | ${observed.displacement} | ${observed.element} | ${equalCounts(observed, frozen) ? 'YES' : 'NO'} |`);
  }
  lines.push('');
  lines.push('## Solver/recovery integrity');
  lines.push('');
  lines.push('| Case | Recovered equilibrium | max force residual N | max moment residual N*m | local/global recovery max |');
  lines.push('|---|---|---:|---:|---:|');
  for (const caseId of CASE_IDS) {
    const gate = diagnosis.mechanics[caseId] ?? {};
    lines.push(`| ${caseId} | ${gate.recoveredEquilibriumStatus ?? 'MISSING'} | ${fmt(gate.maximumAbsoluteResidual?.forceN)} | ${fmt(gate.maximumAbsoluteResidual?.momentNm)} | ${fmt(gate.globalRecoveryMaximumAbsolute)} |`);
  }
  lines.push('');
  lines.push('## Linear identity maxima');
  lines.push('');
  for (const [name, identity] of Object.entries(diagnosis.linearIdentities)) {
    lines.push(`### ${name}`);
    lines.push('');
    lines.push('| Unit | Rows | max abs residual |');
    lines.push('|---|---:|---:|');
    for (const [unit, value] of Object.entries(identity.byUnit)) lines.push(`| ${unit} | ${value.rowCount} | ${fmt(value.maximumAbsoluteResidual)} |`);
    lines.push('');
  }
  lines.push('## Source-row mapping audit');
  lines.push('');
  lines.push('Rows below bind a failed reported source element end action to the raw first/last analysis-descendant global action used to produce it. Nonzero mapping delta is a reporting/mapping defect; zero mapping delta moves the discrepancy upstream.');
  lines.push('');
  lines.push('| Case | Source | Qty | Comp | Descendant | Kind | mapping delta | endpoint chain valid |');
  lines.push('|---|---|---|---|---|---|---:|---|');
  for (const caseId of CASE_IDS) {
    for (const row of diagnosis.sourceElementLineages[caseId].slice(0, 20)) {
      const endpointOk = row.firstDescendantStartsAtSourceFrom !== false && row.lastDescendantEndsAtSourceTo !== false;
      lines.push(`| ${caseId} | ${row.sourceElementId ?? row.sourceEntityId} | ${row.quantity} | ${row.component} | ${row.rawAnalysisElementId ?? 'MISSING'} | ${row.rawAnalysisKind ?? 'MISSING'} | ${fmt(row.mappingDelta)} | ${endpointOk ? 'YES' : 'NO'} |`);
    }
  }
  lines.push('');
  lines.push('## Highest absolute discrepancies');
  lines.push('');
  for (const caseId of CASE_IDS) {
    lines.push(`### ${caseId}`);
    lines.push('');
    lines.push('| Entity | Quantity | Comp | Reference | Actual | Abs error | % error |');
    lines.push('|---|---|---|---:|---:|---:|---:|');
    for (const row of diagnosis.topFailures[caseId].slice(0, 15)) {
      lines.push(`| ${row.entityId} | ${row.quantity} | ${row.component} | ${fmt(row.referenceValue)} | ${fmt(row.actualValue)} | ${fmt(row.absoluteError)} | ${row.percentError === null ? 'zero-ref' : fmt(row.percentError)} |`);
    }
    lines.push('');
  }
  lines.push('## Load ledgers');
  lines.push('');
  lines.push(`L2 total represented gravity weight: **${fmt(diagnosis.gravityLedger.totalWeightN)} N** across ${diagnosis.gravityLedger.sourceCount} source elements.`);
  lines.push(`L4 pressure-active source elements: **${diagnosis.pressureLedger.activeSourceCount}/${diagnosis.pressureLedger.sourceCount}**.`);
  lines.push('');
  lines.push('## Thermal authority');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(diagnosis.thermalAuthority, null, 2));
  lines.push('```');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function parseSourceElementId(value) {
  const match = /^INPUT_ELEMENT:([^|]+)\|([^|]+)->([^|]+)\|/.exec(String(value));
  return match === null ? null : Object.freeze({ sourceElementId: match[1], fromNode: match[2], toNode: match[3] });
}

function requireSourceCustody(actualPackage, benchmarkReport) {
  if (actualPackage?.sourceAccdbSha256 !== EXPECTED_SOURCE_SHA256) {
    throw new Error(`Actual ACCDB SHA-256 mismatch: ${actualPackage?.sourceAccdbSha256}.`);
  }
  if (benchmarkReport?.source?.sha256 !== EXPECTED_SOURCE_SHA256) {
    throw new Error(`Report ACCDB SHA-256 mismatch: ${benchmarkReport?.source?.sha256}.`);
  }
  for (const caseId of CASE_IDS) {
    if (!actualPackage.cases?.[caseId]) throw new Error(`Actual package is missing ${caseId}.`);
  }
}

function rowIndex(rows) {
  return new Map(rows.map((row) => [rowIdentity(row), row]));
}

function rowIdentity(row) {
  return [row.entityKind, row.entityId, row.quantity, row.component].join(':');
}

function lineageIdentity(row) {
  return [row.caseId, row.sourceEntityId, row.quantity, row.component].join(':');
}

function groupBy(values, keyFn) {
  const result = new Map();
  for (const value of values) {
    const key = keyFn(value);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(value);
  }
  return result;
}

function equalCounts(left, right) {
  return left?.restraint === right?.restraint
    && left?.displacement === right?.displacement
    && left?.element === right?.element;
}

function vectorNorm(value) {
  if (!Array.isArray(value)) return 0;
  return Math.hypot(...value.map((entry) => Number(entry ?? 0)));
}

function maximum(values) {
  return values.length === 0 ? 0 : Math.max(...values);
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function fmt(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'n/a';
  if (number === 0) return '0';
  const absolute = Math.abs(number);
  return absolute >= 1e5 || absolute < 1e-4 ? number.toExponential(6) : number.toFixed(6);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function writeJson(value, path) {
  writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const name = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`Missing value for --${name}.`);
    result[name] = value;
    index += 1;
  }
  return result;
}

function required(values, name) {
  if (!values[name]) throw new TypeError(`--${name} is required.`);
  return values[name];
}

function compareText(left, right) {
  return String(left).localeCompare(String(right));
}
