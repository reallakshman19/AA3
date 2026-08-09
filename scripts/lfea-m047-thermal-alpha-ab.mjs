#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const DIAGNOSTIC_PROFILE_ID = 'BM4NL-L19-L20-M047-I010-DIAGNOSTIC-ALPHA-AB';

export function buildDiagnosticAlphaProfile(baseProfile, fingerprint) {
  requireFingerprint(fingerprint);
  if (!baseProfile?.linearSolve || !Number.isFinite(baseProfile.linearSolve.thermalExpansionCoefficientPerKelvin)) {
    throw new TypeError('Base profile is missing thermalExpansionCoefficientPerKelvin.');
  }
  const coefficient = Number(fingerprint.summary?.gravityWeightedMedianImpliedThermalExpansionCoefficientPerKelvin);
  if (!Number.isFinite(coefficient) || !(coefficient > 0)) {
    throw new TypeError('Fingerprint is missing a positive gravity-weighted implied thermal coefficient.');
  }
  const profile = structuredClone(baseProfile);
  profile.profileId = DIAGNOSTIC_PROFILE_ID;
  profile.linearSolve.thermalExpansionCoefficientPerKelvin = coefficient;
  return Object.freeze({
    profile: Object.freeze(profile),
    manifest: Object.freeze({
      schema: 'lfea-m047-thermal-alpha-ab-profile/v1',
      issueId: 'M047',
      purpose: 'DIAGNOSTIC_CAUSAL_AB_ONLY',
      productionAuthority: false,
      outputFitUsedForProduction: false,
      baseProfileId: baseProfile.profileId,
      diagnosticProfileId: DIAGNOSTIC_PROFILE_ID,
      baseThermalExpansionCoefficientPerKelvin: baseProfile.linearSolve.thermalExpansionCoefficientPerKelvin,
      diagnosticThermalExpansionCoefficientPerKelvin: coefficient,
      coefficientDerivation: 'I009_GRAVITY_WEIGHTED_MEDIAN_IMPLIED_THERMAL_EXPANSION_COEFFICIENT',
      fingerprintSemanticHash: fingerprint.semanticHash,
      warning: 'This coefficient is derived from the same commercial benchmark outputs and MUST NOT be committed as production material authority. The A/B tests causality only.',
    }),
  });
}

export function compareThermalAlphaAb(baseline, diagnostic, manifest) {
  requireBenchmark(baseline, 'baseline');
  requireBenchmark(diagnostic, 'diagnostic');
  if (baseline.source.sha256 !== diagnostic.source.sha256 || baseline.source.sha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError('A/B benchmark source identity mismatch.');
  }
  if (baseline.benchmarkId !== diagnostic.benchmarkId) throw new TypeError('A/B benchmark ID mismatch.');
  const cases = {};
  for (const caseId of ['L19', 'L20']) {
    const before = requireQualificationCase(baseline, caseId);
    const after = requireQualificationCase(diagnostic, caseId);
    const rowDelta = compareRows(before.comparison.rows, after.comparison.rows);
    const beforeMetrics = failureMetrics(before);
    const afterMetrics = failureMetrics(after);
    cases[caseId] = Object.freeze({
      before: beforeMetrics,
      after: afterMetrics,
      delta: failureDelta(beforeMetrics, afterMetrics),
      actualRowChange: rowDelta,
    });
  }
  const l19Invariant = cases.L19.actualRowChange.maximumAbsoluteActualDelta === 0
    && cases.L19.actualRowChange.changedActualRowCount === 0;
  const base = {
    schema: 'lfea-m047-thermal-alpha-ab/v1',
    issueId: 'M047',
    sourceAccdbSha256: baseline.source.sha256,
    purpose: 'DIAGNOSTIC_CAUSAL_AB_ONLY',
    productionAuthority: false,
    outputFitUsedForProduction: false,
    profileManifest: manifest,
    cases: Object.freeze(cases),
    invariants: Object.freeze({
      l19NumericallyUnchanged: l19Invariant,
      sameLockedSource: true,
      sameBenchmarkId: true,
    }),
    interpretationRule: 'A strong L20 improvement with exactly unchanged L19 supports thermal free-strain causality, but cannot authorize the fitted coefficient.',
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function requireFingerprint(value) {
  if (!value || value.schema !== 'lfea-m047-thermal-axial-fingerprint/v1') {
    throw new TypeError('I010 requires I009 thermal axial fingerprint evidence.');
  }
  if (value.sourceAccdbSha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError(`I010 requires locked ACCDB SHA-256 ${LOCKED_ACCDB_SHA256}.`);
  }
  if (value.method?.outputFitUsedForProduction !== false) {
    throw new TypeError('I009 evidence must explicitly forbid production fitting.');
  }
}

function requireBenchmark(value, label) {
  if (!value || typeof value !== 'object' || !value.qualification?.cases || !value.source?.sha256) {
    throw new TypeError(`${label} benchmark report is incomplete.`);
  }
}

function requireQualificationCase(report, caseId) {
  const value = report.qualification.cases.find((entry) => entry.caseId === caseId);
  if (!value?.comparison || !Array.isArray(value.comparison.rows)) {
    throw new TypeError(`Benchmark report is missing comparison case ${caseId}.`);
  }
  return value;
}

function failureMetrics(caseRecord) {
  const rows = caseRecord.comparison.rows;
  const families = {
    restraint: rows.filter((row) => row.entityKind === 'NODE' && ['FORCE', 'MOMENT'].includes(row.quantity)),
    displacementRotation: rows.filter((row) => row.entityKind === 'NODE' && ['DISPLACEMENT', 'ROTATION'].includes(row.quantity)),
    sourceEndAction: rows.filter((row) => row.entityKind === 'ELEMENT' && row.quantity.startsWith('GLOBAL_END_')),
  };
  return Object.freeze(Object.fromEntries(Object.entries(families).map(([name, entries]) => {
    const failures = entries.filter((row) => row.status === 'FAIL');
    return [name, Object.freeze({
      failingComponentCount: failures.length,
      failingEntityCount: new Set(failures.map((row) => `${row.entityKind}:${row.entityId}`)).size,
      maximumRelativeError: entries.reduce((maximum, row) => Math.max(maximum, Number(row.relativeError ?? 0)), 0),
    })];
  })));
}

function failureDelta(before, after) {
  return Object.freeze(Object.fromEntries(Object.keys(before).map((family) => [family, Object.freeze({
    failingComponentCount: after[family].failingComponentCount - before[family].failingComponentCount,
    failingEntityCount: after[family].failingEntityCount - before[family].failingEntityCount,
    maximumRelativeError: after[family].maximumRelativeError - before[family].maximumRelativeError,
  })])));
}

function compareRows(beforeRows, afterRows) {
  const before = physicalRowMap(beforeRows);
  const after = physicalRowMap(afterRows);
  const beforeKeys = [...before.keys()].sort();
  const afterKeys = [...after.keys()].sort();
  if (beforeKeys.length !== afterKeys.length || beforeKeys.some((key, index) => key !== afterKeys[index])) {
    throw new TypeError('A/B comparison row identity changed.');
  }
  let maximumAbsoluteActualDelta = 0;
  let changedActualRowCount = 0;
  const top = [];
  for (const key of beforeKeys) {
    const left = before.get(key);
    const right = after.get(key);
    if (left.referenceValue !== right.referenceValue || left.unit !== right.unit) {
      throw new TypeError(`A/B reference custody changed for ${key}.`);
    }
    const delta = right.actualValue - left.actualValue;
    const absolute = Math.abs(delta);
    if (absolute > 0) changedActualRowCount += 1;
    maximumAbsoluteActualDelta = Math.max(maximumAbsoluteActualDelta, absolute);
    if (absolute > 0) top.push({ identity: key, before: left.actualValue, after: right.actualValue, delta, unit: left.unit });
  }
  top.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.identity.localeCompare(b.identity));
  return Object.freeze({
    rowCount: beforeKeys.length,
    changedActualRowCount,
    maximumAbsoluteActualDelta,
    topActualChanges: Object.freeze(top.slice(0, 20).map(Object.freeze)),
  });
}

function physicalRowMap(rows) {
  const result = new Map();
  for (const row of rows) {
    if (!Number.isFinite(row.actualValue) || !Number.isFinite(row.referenceValue)) continue;
    const key = `${row.entityKind}:${row.entityId}:${row.quantity}:${row.component}`;
    if (result.has(key)) throw new TypeError(`Duplicate A/B comparison row ${key}.`);
    result.set(key, row);
  }
  return result;
}

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  return args;
}

function writeJson(path, value) {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, canonicalPrettyStringify(value), 'utf8');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.get('--mode');
  if (mode === 'prepare') {
    const baseProfilePath = args.get('--base-profile');
    const fingerprintPath = args.get('--fingerprint');
    const profileOut = args.get('--profile-out');
    const manifestOut = args.get('--manifest-out');
    if (!baseProfilePath || !fingerprintPath || !profileOut || !manifestOut) {
      throw new TypeError('prepare requires --base-profile --fingerprint --profile-out --manifest-out.');
    }
    const baseProfile = JSON.parse(readFileSync(resolve(baseProfilePath), 'utf8'));
    const fingerprint = JSON.parse(readFileSync(resolve(fingerprintPath), 'utf8'));
    const built = buildDiagnosticAlphaProfile(baseProfile, fingerprint);
    writeJson(profileOut, built.profile);
    writeJson(manifestOut, built.manifest);
    process.stdout.write(`M047 I010 diagnostic profile alpha=${built.manifest.diagnosticThermalExpansionCoefficientPerKelvin} 1/K; productionAuthority=false\n`);
  } else if (mode === 'compare') {
    const baselinePath = args.get('--baseline');
    const diagnosticPath = args.get('--diagnostic');
    const manifestPath = args.get('--manifest');
    const out = args.get('--out');
    if (!baselinePath || !diagnosticPath || !manifestPath || !out) {
      throw new TypeError('compare requires --baseline --diagnostic --manifest --out.');
    }
    const baseline = JSON.parse(readFileSync(resolve(baselinePath), 'utf8'));
    const diagnostic = JSON.parse(readFileSync(resolve(diagnosticPath), 'utf8'));
    const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
    const result = compareThermalAlphaAb(baseline, diagnostic, manifest);
    writeJson(out, result);
    process.stdout.write(`M047 I010 L19 unchanged=${result.invariants.l19NumericallyUnchanged}; L20 restraint failures ${result.cases.L20.before.restraint.failingComponentCount}->${result.cases.L20.after.restraint.failingComponentCount}; displacement ${result.cases.L20.before.displacementRotation.failingComponentCount}->${result.cases.L20.after.displacementRotation.failingComponentCount}; source actions ${result.cases.L20.before.sourceEndAction.failingComponentCount}->${result.cases.L20.after.sourceEndAction.failingComponentCount}\n`);
    process.stdout.write(`M047 I010 evidence: ${result.semanticHash}\n`);
  } else {
    throw new TypeError('Use --mode prepare or --mode compare.');
  }
}
