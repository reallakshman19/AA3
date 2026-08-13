#!/usr/bin/env node
/**
 * M047 Stage 2 R1 reference-resolution-floor diagnostic.
 *
 * This tool reads a committed friction tuning iteration and an explicit CAESAR
 * printed-displacement resolution declaration. It does not alter comparison
 * tolerances or solver mechanics. The resulting force floor is diagnostic only:
 *
 *   half-step force floor = k_f * (printed displacement resolution / 2)
 *
 * Resolution authority is deliberately explicit. Per-restraint declarations are
 * preferred; a CLI uniform value is accepted only as a provisional diagnostic and
 * is labelled as such in the output.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ITERATION_SCHEMA = 'm047-bm4l-stage2-friction-tuning-iteration/v1';
const OUTPUT_SCHEMA = 'm047-bm4l-stage2-reference-resolution-floor/v1';
const MAP_SCHEMA = 'm047-bm4l-stage2-print-resolution-map/v1';
const PINNED_ACCDB_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const GOVERNED_FRICTION_STIFFNESS_N_PER_M = 1.751270055770874e8;

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Expected --name value pairs; got ${String(key)} ${String(value)}.`);
    }
    values.set(key, value);
  }
  const iterationPath = values.get('--iteration');
  if (!iterationPath) {
    throw new TypeError(
      'Usage: --iteration <friction-iteration.json> '
      + '[--resolution-map <map.json> | --uniform-resolution-mm <mm>] [--out <json>].',
    );
  }
  const resolutionMapPath = values.get('--resolution-map') ?? null;
  const uniform = values.has('--uniform-resolution-mm')
    ? Number(values.get('--uniform-resolution-mm'))
    : null;
  if ((resolutionMapPath === null) === (uniform === null)) {
    throw new TypeError('Provide exactly one of --resolution-map or --uniform-resolution-mm.');
  }
  if (uniform !== null && !(uniform > 0)) {
    throw new TypeError('--uniform-resolution-mm must be positive.');
  }
  return {
    iterationPath: resolve(iterationPath),
    resolutionMapPath: resolutionMapPath === null ? null : resolve(resolutionMapPath),
    uniformResolutionMm: uniform,
    outPath: values.get('--out') === undefined ? null : resolve(values.get('--out')),
  };
}

export function buildResolutionFloorDiagnostic(iteration, resolutionAuthority) {
  requireIteration(iteration);
  const rows = iteration.restraints.map((row) => analyzeRestraint(row, resolutionAuthority));
  const unresolved = rows.filter((row) => row.resolutionMm === null);
  const resolved = rows.filter((row) => row.resolutionMm !== null);
  const belowFloor = resolved.filter((row) => row.referenceTangentialMagnitudeN < row.displacementDerivedForceHalfStepN);
  const halfStepAtLeastQuarterReference = resolved.filter((row) =>
    row.halfStepToReferenceForceRatio !== null && row.halfStepToReferenceForceRatio >= 0.25);
  const halfStepAtLeastHalfReference = resolved.filter((row) =>
    row.halfStepToReferenceForceRatio !== null && row.halfStepToReferenceForceRatio >= 0.5);

  const base = {
    schema: OUTPUT_SCHEMA,
    sourceAccdbSha256: iteration.sourceAccdbSha256,
    sourceIterationSemanticHash: iteration.iterationSemanticHash ?? null,
    caseId: iteration.caseId,
    variant: iteration.variant,
    governedFrictionStiffnessNPerM: GOVERNED_FRICTION_STIFFNESS_N_PER_M,
    status: unresolved.length === 0 ? 'COMPLETE' : 'INCOMPLETE_RESOLUTION_AUTHORITY',
    interpretationBoundary:
      'DIAGNOSTIC_OF_DISPLACEMENT_DERIVED_FRICTION_INFERENCE_ONLY; DOES_NOT_WIDEN_FORCE_OR_VECTOR_COMPARISON_TOLERANCE',
    resolutionAuthority: resolutionAuthority.summary,
    summary: {
      frictionRestraintCount: rows.length,
      resolutionResolvedCount: resolved.length,
      resolutionUnresolvedCount: unresolved.length,
      unresolvedRestraintIds: unresolved.map((row) => row.restraintId),
      referenceForceBelowHalfStepFloorCount: belowFloor.length,
      referenceForceBelowHalfStepFloorRestraintIds: belowFloor.map((row) => row.restraintId),
      halfStepAtLeast25PercentOfReferenceCount: halfStepAtLeastQuarterReference.length,
      halfStepAtLeast25PercentOfReferenceRestraintIds: halfStepAtLeastQuarterReference.map((row) => row.restraintId),
      halfStepAtLeast50PercentOfReferenceCount: halfStepAtLeastHalfReference.length,
      halfStepAtLeast50PercentOfReferenceRestraintIds: halfStepAtLeastHalfReference.map((row) => row.restraintId),
    },
    rows,
  };
  return Object.freeze({ ...base, diagnosticSemanticHash: semanticHash(base) });
}

function analyzeRestraint(row, authority) {
  const resolution = authority.resolve(row);
  const referenceForce = finiteVector(row.tangential?.referenceN, row.restraintId);
  const referenceTangentialMagnitudeN = Math.hypot(...referenceForce);
  if (resolution === null) {
    return {
      restraintId: row.restraintId,
      nodeId: String(row.nodeId),
      resolutionMm: null,
      resolutionSource: null,
      referenceTangentialMagnitudeN,
      displacementHalfStepM: null,
      displacementDerivedForceHalfStepN: null,
      halfStepToReferenceForceRatio: null,
      belowHalfStepFloor: null,
    };
  }
  const displacementHalfStepM = resolution.resolutionMm * 1e-3 / 2;
  const displacementDerivedForceHalfStepN = GOVERNED_FRICTION_STIFFNESS_N_PER_M * displacementHalfStepM;
  const halfStepToReferenceForceRatio = referenceTangentialMagnitudeN === 0
    ? null
    : displacementDerivedForceHalfStepN / referenceTangentialMagnitudeN;
  return {
    restraintId: row.restraintId,
    nodeId: String(row.nodeId),
    resolutionMm: resolution.resolutionMm,
    resolutionSource: resolution.source,
    referenceTangentialMagnitudeN,
    displacementHalfStepM,
    displacementDerivedForceHalfStepN,
    halfStepToReferenceForceRatio,
    belowHalfStepFloor: referenceTangentialMagnitudeN < displacementDerivedForceHalfStepN,
  };
}

function loadResolutionAuthority(input) {
  if (input.uniformResolutionMm !== null) {
    const resolutionMm = input.uniformResolutionMm;
    return {
      summary: {
        mode: 'USER_DECLARED_UNIFORM_DIAGNOSTIC',
        resolutionMm,
        qualificationUse: 'PROVISIONAL_ONLY_UNTIL_PER_RESTRAINT_PRINT_RESOLUTION_IS_DECLARED',
      },
      resolve() {
        return { resolutionMm, source: 'CLI_UNIFORM_DIAGNOSTIC' };
      },
    };
  }

  const map = JSON.parse(readFileSync(input.resolutionMapPath, 'utf8'));
  if (map?.schema !== MAP_SCHEMA) {
    throw new TypeError(`resolution map must use ${MAP_SCHEMA}.`);
  }
  const byRestraintId = normalizeResolutionEntries(map.byRestraintId ?? {}, 'byRestraintId');
  const byNodeId = normalizeResolutionEntries(map.byNodeId ?? {}, 'byNodeId');
  const defaultResolutionMm = map.defaultResolutionMm === null || map.defaultResolutionMm === undefined
    ? null
    : positiveNumber(map.defaultResolutionMm, 'defaultResolutionMm');
  return {
    summary: {
      mode: 'EXPLICIT_RESOLUTION_MAP',
      mapSchema: MAP_SCHEMA,
      authority: map.authority ?? null,
      defaultResolutionMm,
      restraintDeclarationCount: Object.keys(byRestraintId).length,
      nodeDeclarationCount: Object.keys(byNodeId).length,
      qualificationUse: defaultResolutionMm === null
        ? 'PER_RESTRAINT_OR_PER_NODE_AUTHORITY_REQUIRED'
        : 'DEFAULT_IS_EXPLICITLY_DECLARED_BY_MAP_AUTHORITY',
    },
    resolve(row) {
      const restraint = byRestraintId[String(row.restraintId)];
      if (restraint !== undefined) return restraint;
      const node = byNodeId[String(row.nodeId)];
      if (node !== undefined) return node;
      return defaultResolutionMm === null
        ? null
        : { resolutionMm: defaultResolutionMm, source: 'MAP_DEFAULT' };
    },
  };
}

function normalizeResolutionEntries(entries, label) {
  if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return Object.fromEntries(Object.entries(entries).map(([key, value]) => {
    if (typeof value === 'number') {
      return [key, { resolutionMm: positiveNumber(value, `${label}.${key}`), source: label }];
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`${label}.${key} must be a positive number or object.`);
    }
    return [key, {
      resolutionMm: positiveNumber(value.resolutionMm, `${label}.${key}.resolutionMm`),
      source: value.source ?? label,
    }];
  }));
}

function requireIteration(iteration) {
  if (iteration?.schema !== ITERATION_SCHEMA) {
    throw new TypeError(`iteration must use ${ITERATION_SCHEMA}.`);
  }
  if (iteration.sourceAccdbSha256 !== PINNED_ACCDB_SHA256) {
    throw new TypeError(`iteration source is not the pinned BM4_L ACCDB: ${iteration.sourceAccdbSha256}.`);
  }
  if (!iteration.converged || !Array.isArray(iteration.restraints)) {
    throw new TypeError('R1 requires a converged friction tuning artifact with restraint rows.');
  }
}

function finiteVector(value, restraintId) {
  if (!Array.isArray(value) || value.length === 0 || !value.every((entry) => Number.isFinite(Number(entry)))) {
    throw new TypeError(`restraint ${restraintId} has invalid reference tangential force vector.`);
  }
  return value.map(Number);
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!(number > 0) || !Number.isFinite(number)) throw new TypeError(`${label} must be positive.`);
  return number;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${canonicalPrettyStringify(value)}\n`, 'utf8');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  const input = parseArguments(process.argv.slice(2));
  const iteration = JSON.parse(readFileSync(input.iterationPath, 'utf8'));
  const authority = loadResolutionAuthority(input);
  const record = buildResolutionFloorDiagnostic(iteration, authority);
  if (input.outPath === null) process.stdout.write(`${canonicalPrettyStringify(record)}\n`);
  else {
    writeJson(input.outPath, record);
    process.stdout.write(`${record.status} ${input.outPath}\n`);
  }
  if (record.status !== 'COMPLETE') process.exitCode = 2;
}

export { MAP_SCHEMA, OUTPUT_SCHEMA, loadResolutionAuthority };
