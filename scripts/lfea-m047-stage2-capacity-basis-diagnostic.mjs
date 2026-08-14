#!/usr/bin/env node
/**
 * M047 Stage 2 C1 capacity-basis diagnostic.
 *
 * Data-only RCA: compare CAESAR L13 tangential friction utilisation against
 * capacity built from the L13 normal reaction versus the frictionless L6 twin
 * normal reaction. No solver mechanic is changed.
 *
 * Usage:
 *   node scripts/lfea-m047-stage2-capacity-basis-diagnostic.mjs \
 *     --accdb artifacts/bm4l-stage2/source/BM4_L.ACCDB \
 *     --iteration reports/lfea-m047-stage2-friction-iteration-L13.json \
 *     --out reports/lfea-m047-stage2-capacity-basis-L13-vs-L6.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import {
  buildCaesarAccdbBenchmarkPackage,
  requiredCaesarAccdbTables,
} from '../src/core/fea-benchmarks/caesar-accdb-package.js';

const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';

async function buildCapacityBasisDiagnostic(input) {
  const profile = JSON.parse(readFileSync(resolve(input.profilePath ?? PROFILE_PATH), 'utf8'));
  const rawExport = await extractCaesarAccdbTables({
    accdbPath: input.accdbPath,
    tableNames: requiredCaesarAccdbTables(profile),
  });
  const benchmarkPackage = buildCaesarAccdbBenchmarkPackage({ rawExport, profile });
  const iteration = JSON.parse(readFileSync(resolve(input.iterationPath), 'utf8'));

  const frictionCaseId = input.frictionCaseId ?? 'L13';
  const controlCaseId = input.controlCaseId ?? 'L6';
  if (iteration.caseId !== frictionCaseId) {
    throw new TypeError(
      `Capacity-basis diagnostic expected iteration ${frictionCaseId}, got ${iteration.caseId}.`,
    );
  }
  if (iteration.sourceAccdbSha256 !== benchmarkPackage.source.sha256) {
    throw new TypeError(
      `Iteration source ${iteration.sourceAccdbSha256} does not match ACCDB ${benchmarkPackage.source.sha256}.`,
    );
  }
  if (!benchmarkPackage.references[frictionCaseId] || !benchmarkPackage.references[controlCaseId]) {
    throw new TypeError(`Missing reference rows for ${frictionCaseId} or ${controlCaseId}.`);
  }

  const frictionVectors = vectorsByNode(benchmarkPackage.references[frictionCaseId].rows);
  const controlVectors = vectorsByNode(benchmarkPackage.references[controlCaseId].rows);

  const rows = iteration.restraints.map((restraint) => {
    const nodeId = String(restraint.nodeId);
    const frictionVector = frictionVectors.get(nodeId) ?? {};
    const controlVector = controlVectors.get(nodeId) ?? {};
    const mu = Number(restraint.coefficientOfFriction);
    const tangential = restraint.frictionDofs.map((dof) => Number(frictionVector[dof] ?? 0));
    const tangentialMagnitudeN = Math.hypot(...tangential);
    const normalFrictionCaseN = Math.abs(Number(frictionVector[restraint.normalDof] ?? 0));
    const normalControlCaseN = Math.abs(Number(controlVector[restraint.normalDof] ?? 0));
    const capacityFrictionCaseN = mu * normalFrictionCaseN;
    const capacityControlCaseN = mu * normalControlCaseN;
    const utilisationFrictionCase = ratio(tangentialMagnitudeN, capacityFrictionCaseN);
    const utilisationControlCase = ratio(tangentialMagnitudeN, capacityControlCaseN);
    const deviationFrictionCase = surfaceDeviation(utilisationFrictionCase);
    const deviationControlCase = surfaceDeviation(utilisationControlCase);
    return {
      restraintId: restraint.restraintId,
      nodeId,
      normalDof: restraint.normalDof,
      frictionDofs: restraint.frictionDofs,
      coefficientOfFriction: mu,
      tangentialMagnitudeN,
      normalFrictionCaseN,
      normalControlCaseN,
      capacityFrictionCaseN,
      capacityControlCaseN,
      utilisationFrictionCase,
      utilisationControlCase,
      surfaceDeviationFrictionCase: deviationFrictionCase,
      surfaceDeviationControlCase: deviationControlCase,
      closerBasis: compareDeviation(deviationFrictionCase, deviationControlCase),
      singleTangentialAxis: restraint.frictionDofs.length === 1,
    };
  }).sort((left, right) =>
    Math.max(right.utilisationFrictionCase ?? 0, right.utilisationControlCase ?? 0)
    - Math.max(left.utilisationFrictionCase ?? 0, left.utilisationControlCase ?? 0));

  const summary = {
    restraintCount: rows.length,
    closerToSurfaceWithFrictionCaseNormal: rows.filter((row) => row.closerBasis === frictionCaseId).length,
    closerToSurfaceWithControlCaseNormal: rows.filter((row) => row.closerBasis === controlCaseId).length,
    equalSurfaceDistance: rows.filter((row) => row.closerBasis === 'EQUAL').length,
    frictionCaseNormal: basisSummary(rows, 'utilisationFrictionCase', 'surfaceDeviationFrictionCase'),
    controlCaseNormal: basisSummary(rows, 'utilisationControlCase', 'surfaceDeviationControlCase'),
    singleAxisOverCap: rows
      .filter((row) => row.singleTangentialAxis && (row.utilisationFrictionCase ?? 0) > 1.02)
      .map((row) => ({
        restraintId: row.restraintId,
        utilisationFrictionCase: row.utilisationFrictionCase,
        utilisationControlCase: row.utilisationControlCase,
      })),
  };

  const record = {
    schema: 'm047-bm4l-stage2-capacity-basis-diagnostic/v1',
    sourceAccdbSha256: benchmarkPackage.source.sha256,
    iterationSemanticHash: iteration.iterationSemanticHash ?? null,
    frictionCaseId,
    controlCaseId,
    rule: 'DATA_ONLY_COMPARE_REFERENCE_FRICTION_UTILISATION_USING_FRICTION_CASE_NORMAL_VERSUS_FRICTIONLESS_TWIN_NORMAL',
    interpretationBoundary:
      'This diagnostic selects no solver mechanic. It only identifies which reference normal-force basis better explains the CAESAR Coulomb-surface pattern.',
    summary,
    rows,
  };
  return Object.freeze({ ...record, diagnosticSemanticHash: semanticHash(record) });
}

function basisSummary(rows, utilisationKey, deviationKey) {
  const utilisations = rows.map((row) => row[utilisationKey]).filter(Number.isFinite);
  const deviations = rows.map((row) => row[deviationKey]).filter(Number.isFinite);
  return {
    within2PercentOfSurface: utilisations.filter((value) => Math.abs(value - 1) <= 0.02).length,
    within5PercentOfSurface: utilisations.filter((value) => Math.abs(value - 1) <= 0.05).length,
    within10PercentOfSurface: utilisations.filter((value) => Math.abs(value - 1) <= 0.10).length,
    meanAbsoluteSurfaceDeviation: mean(deviations),
    medianAbsoluteSurfaceDeviation: median(deviations),
    maximumUtilisation: utilisations.length === 0 ? null : Math.max(...utilisations),
  };
}

function vectorsByNode(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.entityKind !== 'NODE' || row.quantity !== 'FORCE') continue;
    const vector = map.get(String(row.entityId)) ?? {};
    vector[row.component] = Number(row.value);
    map.set(String(row.entityId), vector);
  }
  return map;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function surfaceDeviation(utilisation) {
  return utilisation === null ? null : Math.abs(utilisation - 1);
}

function compareDeviation(left, right) {
  if (left === null && right === null) return 'EQUAL';
  if (left === null) return 'L6';
  if (right === null) return 'L13';
  if (Math.abs(left - right) <= 1e-12) return 'EQUAL';
  return left < right ? 'L13' : 'L6';
}

function mean(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Expected --name value pairs; got ${String(key)} ${String(value)}.`);
    }
    args.set(key, value);
  }
  const accdbPath = args.get('--accdb');
  const iterationPath = args.get('--iteration');
  if (!accdbPath || !iterationPath) {
    throw new TypeError('Usage: --accdb <BM4_L.ACCDB> --iteration <L13 iteration.json> [--out <json>].');
  }
  return {
    accdbPath,
    iterationPath,
    profilePath: args.get('--profile'),
    frictionCaseId: args.get('--friction-case') ?? 'L13',
    controlCaseId: args.get('--control-case') ?? 'L6',
    outPath: args.get('--out') ?? null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArguments(process.argv.slice(2));
  const record = await buildCapacityBasisDiagnostic(args);
  const content = `${canonicalPrettyStringify(record)}\n`;
  if (args.outPath === null) {
    process.stdout.write(content);
  } else {
    const out = resolve(args.outPath);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, content, 'utf8');
    process.stdout.write(`${out}\n`);
  }
}

export { buildCapacityBasisDiagnostic };
