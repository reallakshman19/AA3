#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const LOCKED_ACCDB_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const FORCE_COMPONENTS = Object.freeze(['FX', 'FY', 'FZ']);

export function buildM047ThermalAxialFingerprint(report, replay) {
  requireInputs(report, replay);
  const alpha = Number(report.mechanics?.profile?.thermalExpansionCoefficientPerKelvin);
  if (!Number.isFinite(alpha) || !(alpha > 0)) {
    throw new TypeError('M047 thermal fingerprint requires a positive profile thermal expansion coefficient.');
  }
  const forceScaleFloor = Number(report.tolerances?.GLOBAL_END_FORCE_FROM?.scaleFloor);
  if (!Number.isFinite(forceScaleFloor) || !(forceScaleFloor > 0)) {
    throw new TypeError('M047 thermal fingerprint requires the governed source-end force scale floor.');
  }

  const l19Ledger = groupLedger(report.mechanics.cases.L19.elementLedger);
  const l20Ledger = groupLedger(report.mechanics.cases.L20.elementLedger);
  const replay20 = new Map(replay.cases.L20.sources.map((entry) => [String(entry.sourceElementId), entry]));
  const sources = [];
  const skipped = [];

  for (const [sourceElementId, coldElements] of [...l19Ledger].sort(compareSourceEntries)) {
    const hotElements = l20Ledger.get(sourceElementId) ?? [];
    const hotReplay = replay20.get(sourceElementId);
    const eligibility = ordinarySingleFrameEligibility(sourceElementId, coldElements, hotElements, hotReplay);
    if (!eligibility.ok) {
      skipped.push(Object.freeze({ sourceElementId, reason: eligibility.reason }));
      continue;
    }
    const cold = coldElements[0];
    const hot = hotElements[0];
    const coldContribution = requireContribution(cold, sourceElementId, 'L19');
    const hotContribution = requireContribution(hot, sourceElementId, 'L20');
    const stiffnessDelta = maximumAbsoluteDifference(coldContribution.globalStiffness, hotContribution.globalStiffness);
    if (stiffnessDelta !== 0) {
      skipped.push(Object.freeze({
        sourceElementId,
        reason: 'L19_L20_GLOBAL_STIFFNESS_DIFFERS',
        maximumAbsoluteStiffnessDelta: stiffnessDelta,
      }));
      continue;
    }

    const thermalInitialIncrement = hotContribution.initialStrainLoadGlobal.map(
      (value, index) => value - coldContribution.initialStrainLoadGlobal[index],
    );
    const dominantIndex = dominantForceIndex(thermalInitialIncrement.slice(0, 3));
    const fromThermalLoad = thermalInitialIncrement[dominantIndex];
    const toThermalLoad = thermalInitialIncrement[dominantIndex + 6];
    if (Math.abs(fromThermalLoad) <= forceScaleFloor || Math.abs(toThermalLoad) <= forceScaleFloor) {
      skipped.push(Object.freeze({
        sourceElementId,
        reason: 'THERMAL_AXIAL_LOAD_NOT_ABOVE_GOVERNED_FORCE_SCALE_FLOOR',
        forceScaleFloor,
        fromThermalLoad,
        toThermalLoad,
      }));
      continue;
    }
    const component = FORCE_COMPONENTS[dominantIndex];
    const fromReplay = requireReplayComponent(hotReplay, 'FROM', component);
    const toReplay = requireReplayComponent(hotReplay, 'TO', component);
    const multiplierFrom = 1 + fromReplay.residual / fromThermalLoad;
    const multiplierTo = 1 + toReplay.residual / toThermalLoad;
    const multiplier = (multiplierFrom + multiplierTo) / 2;
    if (![multiplierFrom, multiplierTo, multiplier].every(Number.isFinite)) {
      throw new TypeError(`Source ${sourceElementId} produced a non-finite thermal multiplier.`);
    }
    sources.push(Object.freeze({
      sourceElementId,
      elementId: cold.elementId,
      kind: cold.kind,
      axialGlobalComponent: component,
      referenceAuthority: hotReplay.referenceAuthority,
      gravityWeightN: cold.gravityWeightN,
      l19PressureAxialStrain: cold.pressureAxialStrain,
      l20PressureAxialStrain: hot.pressureAxialStrain,
      maximumAbsoluteL19L20StiffnessDelta: stiffnessDelta,
      thermalInitialLoadIncrement: Object.freeze({ from: fromThermalLoad, to: toThermalLoad }),
      replayResidualN: Object.freeze({ from: fromReplay.residual, to: toReplay.residual }),
      impliedThermalMultiplier: Object.freeze({
        from: multiplierFrom,
        to: multiplierTo,
        mean: multiplier,
        endDisagreement: Math.abs(multiplierFrom - multiplierTo),
      }),
      impliedThermalExpansionCoefficientPerKelvin: alpha * multiplier,
    }));
  }

  if (sources.length === 0) throw new TypeError('M047 thermal fingerprint found no qualified ordinary straight FRAME sources.');
  const multipliers = sources.map((entry) => entry.impliedThermalMultiplier.mean);
  const medianMultiplier = median(multipliers);
  const medianAbsoluteDeviation = median(multipliers.map((value) => Math.abs(value - medianMultiplier)));
  const gravityWeightedMedianMultiplier = weightedMedian(
    sources.map((entry) => ({ value: entry.impliedThermalMultiplier.mean, weight: positiveWeight(entry.gravityWeightN) })),
  );
  const source4 = sources.find((entry) => entry.sourceElementId === '4') ?? null;
  const source4L19 = replay.cases.L19.sources.find((entry) => entry.sourceElementId === '4') ?? null;
  const source4L19Axial = source4 === null || source4L19 === null
    ? null
    : requireReplayComponent(source4L19, 'FROM', source4.axialGlobalComponent);

  const base = {
    schema: 'lfea-m047-thermal-axial-fingerprint/v1',
    issueId: 'M047',
    benchmarkId: report.benchmarkId,
    profileId: report.profileId,
    sourceAccdbSha256: report.source.sha256,
    method: Object.freeze({
      caseIdentity: 'L20_MINUS_L19',
      displacementAuthority: replay.method.displacementAuthority,
      eligibleSourceRule: 'ONE_ANALYSIS_ELEMENT_KIND_FRAME_NO_TEE_DIRECT_CAESAR_END_ACTION_IDENTICAL_L19_L20_GLOBAL_STIFFNESS',
      thermalLoadIncrement: 'L20 initialStrainLoadGlobal - L19 initialStrainLoadGlobal',
      inferredMultiplierEquation: 'm = 1 + replayResidual / thermalInitialLoadIncrement',
      interpretation: 'DIAGNOSTIC_FINGERPRINT_ONLY_NOT_MATERIAL_AUTHORITY',
      outputFitUsedForProduction: false,
    }),
    currentThermalExpansionCoefficientPerKelvin: alpha,
    qualifiedSourceCount: sources.length,
    skippedSourceCount: skipped.length,
    summary: Object.freeze({
      medianMultiplier,
      medianAbsoluteDeviation,
      gravityWeightedMedianMultiplier,
      medianImpliedThermalExpansionCoefficientPerKelvin: alpha * medianMultiplier,
      gravityWeightedMedianImpliedThermalExpansionCoefficientPerKelvin: alpha * gravityWeightedMedianMultiplier,
      minimumMultiplier: Math.min(...multipliers),
      maximumMultiplier: Math.max(...multipliers),
    }),
    tracked: Object.freeze({
      source4,
      source4L19AxialReplay: source4L19Axial === null ? null : Object.freeze({
        component: source4.axialGlobalComponent,
        replayValue: source4L19Axial.replayValue,
        referenceValue: source4L19Axial.referenceValue,
        residualN: source4L19Axial.residual,
        normalizedResidual: source4L19Axial.normalizedResidual,
      }),
    }),
    sources: Object.freeze(sources),
    skipped: Object.freeze(skipped),
  };
  return Object.freeze({ ...base, semanticHash: semanticHash(base) });
}

function requireInputs(report, replay) {
  if (!report || typeof report !== 'object' || !replay || typeof replay !== 'object') {
    throw new TypeError('M047 thermal fingerprint requires benchmark report and replay evidence objects.');
  }
  if (report.source?.sha256 !== LOCKED_ACCDB_SHA256 || replay.sourceAccdbSha256 !== LOCKED_ACCDB_SHA256) {
    throw new TypeError(`M047 thermal fingerprint requires locked ACCDB SHA-256 ${LOCKED_ACCDB_SHA256}.`);
  }
  if (report.benchmarkId !== replay.benchmarkId || report.profileId !== replay.profileId) {
    throw new TypeError('M047 benchmark/replay identity mismatch.');
  }
  for (const caseId of ['L19', 'L20']) {
    if (!Array.isArray(report.mechanics?.cases?.[caseId]?.elementLedger)) {
      throw new TypeError(`Benchmark report is missing ${caseId} mechanics ledger.`);
    }
    if (!Array.isArray(replay.cases?.[caseId]?.sources)) {
      throw new TypeError(`Replay evidence is missing ${caseId} source rows.`);
    }
  }
}

function groupLedger(ledger) {
  const result = new Map();
  for (const entry of ledger) {
    const key = String(entry.sourceElementId);
    const current = result.get(key) ?? [];
    current.push(entry);
    result.set(key, current);
  }
  return result;
}

function ordinarySingleFrameEligibility(sourceElementId, coldElements, hotElements, hotReplay) {
  if (coldElements.length !== 1 || hotElements.length !== 1) return { ok: false, reason: 'SOURCE_IS_NOT_SINGLE_ANALYSIS_ELEMENT_IN_BOTH_CASES' };
  const cold = coldElements[0];
  const hot = hotElements[0];
  if (cold.elementId !== hot.elementId) return { ok: false, reason: 'ANALYSIS_ELEMENT_ID_CHANGES_BETWEEN_CASES' };
  if (cold.kind !== 'FRAME' || hot.kind !== 'FRAME') return { ok: false, reason: 'SOURCE_IS_NOT_ORDINARY_FRAME' };
  if (cold.teeJunctionNodeId !== null || hot.teeJunctionNodeId !== null) return { ok: false, reason: 'SOURCE_CARRIES_TEE_MODIFIER' };
  if (!hotReplay) return { ok: false, reason: 'SOURCE_HAS_NO_I008_REPLAY' };
  if (hotReplay.referenceAuthority !== 'CAESAR_DIRECT_SOURCE_END_ACTION') return { ok: false, reason: 'SOURCE_REFERENCE_IS_NOT_DIRECT_CAESAR_END_ACTION' };
  return { ok: true, sourceElementId };
}

function requireContribution(element, sourceElementId, caseId) {
  const contribution = element.replayElementContribution;
  if (!contribution
    || !Array.isArray(contribution.globalStiffness) || contribution.globalStiffness.length !== 144
    || !Array.isArray(contribution.initialStrainLoadGlobal) || contribution.initialStrainLoadGlobal.length !== 12) {
    throw new TypeError(`Source ${sourceElementId} ${caseId} lacks replay contribution evidence.`);
  }
  return contribution;
}

function requireReplayComponent(source, end, component) {
  const row = source.components.find((entry) =>
    entry.quantity === `GLOBAL_END_FORCE_${end}` && entry.component === component);
  if (!row) throw new TypeError(`Source ${source.sourceElementId} lacks ${end} ${component} replay component.`);
  return row;
}

function dominantForceIndex(vector) {
  let result = 0;
  for (let index = 1; index < vector.length; index += 1) {
    if (Math.abs(vector[index]) > Math.abs(vector[result])) result = index;
  }
  return result;
}

function maximumAbsoluteDifference(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    throw new TypeError('Stiffness comparison requires equal arrays.');
  }
  return left.reduce((maximum, value, index) => Math.max(maximum, Math.abs(value - right[index])), 0);
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new TypeError('Median requires finite values.');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function positiveWeight(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : Number.EPSILON;
}

function weightedMedian(entries) {
  const sorted = [...entries].sort((left, right) => left.value - right.value);
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  let cumulative = 0;
  for (const entry of sorted) {
    cumulative += entry.weight;
    if (cumulative >= total / 2) return entry.value;
  }
  return sorted.at(-1).value;
}

function compareSourceEntries([left], [right]) {
  return Number(left) - Number(right) || String(left).localeCompare(String(right));
}

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  const report = args.get('--report');
  const replay = args.get('--replay');
  const out = args.get('--out');
  if (!report || !replay || !out) throw new TypeError('Usage: --report <benchmark.json> --replay <element-replay.json> --out <thermal-fingerprint.json>.');
  const unknown = [...args.keys()].filter((key) => !['--report', '--replay', '--out'].includes(key));
  if (unknown.length) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return { report: resolve(report), replay: resolve(replay), out: resolve(out) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = parseArguments(process.argv.slice(2));
  const report = JSON.parse(readFileSync(input.report, 'utf8'));
  const replay = JSON.parse(readFileSync(input.replay, 'utf8'));
  const result = buildM047ThermalAxialFingerprint(report, replay);
  mkdirSync(dirname(input.out), { recursive: true });
  writeFileSync(input.out, canonicalPrettyStringify(result), 'utf8');
  process.stdout.write(`M047 I009 qualified straight sources: ${result.qualifiedSourceCount}\n`);
  process.stdout.write(`M047 I009 thermal multiplier median=${result.summary.medianMultiplier}; MAD=${result.summary.medianAbsoluteDeviation}; gravity-weighted median=${result.summary.gravityWeightedMedianMultiplier}\n`);
  process.stdout.write(`M047 I009 implied alpha median=${result.summary.medianImpliedThermalExpansionCoefficientPerKelvin} 1/K\n`);
  if (result.tracked.source4L19AxialReplay) {
    process.stdout.write(`M047 I009 source4 L19 axial replay residual=${result.tracked.source4L19AxialReplay.residualN} N\n`);
  }
  process.stdout.write(`M047 I009 evidence: ${result.semanticHash}\n`);
}
