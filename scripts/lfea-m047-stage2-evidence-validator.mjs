#!/usr/bin/env node
/**
 * M047 Stage 2 friction evidence validator.
 *
 * Validates custody, control-regression status, tuning semantic hash, convergence,
 * and declared one-mechanic experiment lineage before a B0/D1/S1 artifact is used
 * as review evidence. This validator does not judge accuracy and cannot promote a
 * mechanics variant.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PINNED_ACCDB_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const ITERATION_SCHEMA = 'm047-bm4l-stage2-friction-tuning-iteration/v1';
const CONTROL_SCHEMA = 'm047-bm4l-stage2-control-regression/v1';
const D1_VARIANT = 'D1-total-relative-tangential-displacement-direction';
const S1_VARIANT = 'S1-no-relock-after-breakaway';
const KINDS = new Set(['b0', 'd1', 's1']);

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
  const controlsPath = values.get('--controls');
  const kind = (values.get('--kind') ?? '').toLowerCase();
  if (!iterationPath || !controlsPath || !KINDS.has(kind)) {
    throw new TypeError(
      'Usage: --iteration <artifact.json> --controls <control-regression.json> '
      + '--kind <b0|d1|s1> [--baseline <B0 artifact.json>].',
    );
  }
  return {
    iterationPath: resolve(iterationPath),
    controlsPath: resolve(controlsPath),
    kind,
    baselinePath: values.get('--baseline') === undefined ? null : resolve(values.get('--baseline')),
  };
}

export function validateEvidence({ iteration, controls, kind, baseline = null }) {
  const checks = [];
  check(checks, 'iteration-schema', iteration?.schema === ITERATION_SCHEMA,
    `expected ${ITERATION_SCHEMA}, got ${iteration?.schema}`);
  check(checks, 'controls-schema', controls?.schema === CONTROL_SCHEMA,
    `expected ${CONTROL_SCHEMA}, got ${controls?.schema}`);
  check(checks, 'pinned-iteration-source', iteration?.sourceAccdbSha256 === PINNED_ACCDB_SHA256,
    String(iteration?.sourceAccdbSha256));
  check(checks, 'pinned-controls-source', controls?.sourceAccdbSha256 === PINNED_ACCDB_SHA256,
    String(controls?.sourceAccdbSha256));
  check(checks, 'same-source', iteration?.sourceAccdbSha256 === controls?.sourceAccdbSha256,
    `${iteration?.sourceAccdbSha256} vs ${controls?.sourceAccdbSha256}`);
  check(checks, 'controls-pass', controls?.status === 'PASS', String(controls?.status));
  check(checks, 'iteration-converged', iteration?.converged === true, String(iteration?.converged));
  check(checks, 'l13-case', iteration?.caseId === 'L13', String(iteration?.caseId));
  check(checks, 'restraint-rows-present', Array.isArray(iteration?.restraints) && iteration.restraints.length > 0,
    String(iteration?.restraints?.length ?? null));
  check(checks, 'iteration-semantic-hash', validIterationHash(iteration), String(iteration?.iterationSemanticHash));
  check(checks, 'control-semantic-hash', validControlHash(controls), String(controls?.regressionSemanticHash));

  if (baseline !== null) {
    check(checks, 'baseline-schema', baseline?.schema === ITERATION_SCHEMA, String(baseline?.schema));
    check(checks, 'baseline-pinned-source', baseline?.sourceAccdbSha256 === PINNED_ACCDB_SHA256,
      String(baseline?.sourceAccdbSha256));
    check(checks, 'baseline-l13-converged', baseline?.caseId === 'L13' && baseline?.converged === true,
      `${baseline?.caseId}/${baseline?.converged}`);
    check(checks, 'baseline-semantic-hash', validIterationHash(baseline), String(baseline?.iterationSemanticHash));
  }

  validateKind(checks, iteration, kind, baseline);

  const base = {
    schema: 'm047-bm4l-stage2-evidence-validation/v1',
    kind: kind.toUpperCase(),
    sourceAccdbSha256: iteration?.sourceAccdbSha256 ?? null,
    iterationSemanticHash: iteration?.iterationSemanticHash ?? null,
    controlsSemanticHash: controls?.regressionSemanticHash ?? null,
    baselineSemanticHash: baseline?.iterationSemanticHash ?? null,
    status: checks.every((entry) => entry.pass) ? 'PASS' : 'FAIL',
    checks,
    interpretationBoundary:
      'VALIDATES_CUSTODY_CONTROLS_CONVERGENCE_HASH_AND_DECLARED_LINEAGE_ONLY; DOES_NOT_VALIDATE_ACCURACY_OR_PROMOTE_MECHANICS',
  };
  return Object.freeze({ ...base, validationSemanticHash: semanticHash(base) });
}

function validateKind(checks, iteration, kind, baseline) {
  const hasD1 = iteration?.d1Evidence !== undefined;
  const hasS1 = iteration?.s1Evidence !== undefined;
  if (kind === 'b0') {
    check(checks, 'b0-no-experiment-evidence', !hasD1 && !hasS1, `d1=${hasD1} s1=${hasS1}`);
    if (baseline !== null) check(checks, 'b0-no-baseline-required', false, 'B0 validation must not supply --baseline');
    return;
  }

  check(checks, 'one-experiment-evidence-object', Number(hasD1) + Number(hasS1) === 1,
    `d1=${hasD1} s1=${hasS1}`);
  check(checks, 'baseline-required', baseline !== null, baseline === null ? 'missing' : 'present');
  if (baseline !== null) {
    check(checks, 'baseline-is-b0', baseline.d1Evidence === undefined && baseline.s1Evidence === undefined,
      `baseline variant=${baseline.variant}`);
  }

  if (kind === 'd1') {
    check(checks, 'd1-variant', iteration?.variant === D1_VARIANT, String(iteration?.variant));
    check(checks, 'd1-evidence-present', hasD1 && !hasS1, `d1=${hasD1} s1=${hasS1}`);
    check(checks, 'd1-changed-mechanic',
      iteration?.d1Evidence?.changedMechanic === 'SLIDING_COULOMB_FORCE_DIRECTION_ONLY',
      String(iteration?.d1Evidence?.changedMechanic));
    check(checks, 'd1-production-unchanged', iteration?.d1Evidence?.productionSolverModified === false,
      String(iteration?.d1Evidence?.productionSolverModified));
    return;
  }

  check(checks, 's1-variant', iteration?.variant === S1_VARIANT, String(iteration?.variant));
  check(checks, 's1-evidence-present', hasS1 && !hasD1, `d1=${hasD1} s1=${hasS1}`);
  check(checks, 's1-changed-mechanic', iteration?.s1Evidence?.changedMechanic === 'STATE_PATH_RELOCK_ONLY',
    String(iteration?.s1Evidence?.changedMechanic));
  check(checks, 's1-b0-baseline-declared', iteration?.s1Evidence?.baseline === 'B0_PRODUCTION_DIRECTION_AND_CAPACITY_RULES',
    String(iteration?.s1Evidence?.baseline));
  check(checks, 's1-not-composed-with-d1', iteration?.s1Evidence?.composedWithD1 === false,
    String(iteration?.s1Evidence?.composedWithD1));
  check(checks, 's1-production-unchanged', iteration?.s1Evidence?.productionSolverModified === false,
    String(iteration?.s1Evidence?.productionSolverModified));
}

function validIterationHash(iteration) {
  if (typeof iteration?.iterationSemanticHash !== 'string') return false;
  const { iterationSemanticHash, d1Evidence, s1Evidence, ...base } = iteration;
  return semanticHash(base) === iterationSemanticHash;
}

function validControlHash(controls) {
  if (typeof controls?.regressionSemanticHash !== 'string') return false;
  const { regressionSemanticHash, ...base } = controls;
  return semanticHash(base) === regressionSemanticHash;
}

function check(checks, name, pass, evidence) {
  checks.push({ name, pass: Boolean(pass), evidence });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH)) {
  const input = parseArguments(process.argv.slice(2));
  const iteration = JSON.parse(readFileSync(input.iterationPath, 'utf8'));
  const controls = JSON.parse(readFileSync(input.controlsPath, 'utf8'));
  const baseline = input.baselinePath === null
    ? null
    : JSON.parse(readFileSync(input.baselinePath, 'utf8'));
  const result = validateEvidence({ iteration, controls, kind: input.kind, baseline });
  process.stdout.write(`${canonicalPrettyStringify(result)}\n`);
  if (result.status !== 'PASS') process.exitCode = 2;
}
