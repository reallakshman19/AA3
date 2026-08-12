#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runBm4lFrictionProduction } from './lfea-m047-bm4l-friction.mjs';
import { evaluateBm4lFrictionProductionAcceptance } from '../src/core/fea-benchmarks/caesar-friction-production-acceptance.js';
import { canonicalPrettyStringify } from '../src/core/shared-piping-model/canonical-json.js';

/**
 * Qualification boundary over the Stage 2 production runner.
 *
 * The underlying runner owns extraction, assembly, nonlinear solving and raw
 * comparison evidence. This boundary owns the final issue-#1083 acceptance
 * decision and therefore refuses to pass unless every frozen L2-L6/L14
 * restraint comparison remains at zero failures in addition to the friction
 * cases, mechanics and source-custody gates.
 */
export function runQualifiedBm4lFrictionProduction(input) {
  const result = runBm4lFrictionProduction(input);
  const acceptance = evaluateBm4lFrictionProductionAcceptance({
    accuracy: result.evidence.accuracy,
    mechanicsStatus: result.evidence.acceptance.mechanicsStatus,
    sourceCustodyStatus: result.evidence.acceptance.frictionRestraintSourceCustodyStatus,
  });
  return Object.freeze({
    actual: result.actual,
    evidence: Object.freeze({
      ...result.evidence,
      schema: 'm047-bm4l-friction-production-evidence/v2',
      legacyAcceptance: result.evidence.acceptance,
      acceptance: Object.freeze({
        ...result.evidence.acceptance,
        frozenControlRestraintAccuracyStatus: acceptance.frozenControlRestraintGate.status,
        frozenControlRestraintFailureCount: acceptance.frozenControlRestraintGate.restraintFailureCount,
        frozenControlFailedCaseIds: acceptance.frozenControlRestraintGate.failedCaseIds,
        frozenControlMissingCaseIds: acceptance.frozenControlRestraintGate.missingCaseIds,
        benchmarkRestraintAccuracyStatus: acceptance.frictionRestraintGate.status,
        frictionRestraintFailureCount: acceptance.frictionRestraintGate.restraintFailureCount,
        overallStatus: acceptance.overallStatus,
        governedAcceptance: acceptance,
      }),
    }),
  });
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (values.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    values.set(key, value);
  }
  const required = ['--accdb', '--profile', '--friction-profile', '--actual-out', '--evidence-out'];
  const unknown = [...values.keys()].filter((key) => !required.includes(key));
  if (unknown.length > 0) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  for (const key of required) {
    if (!values.get(key)) throw new TypeError(`Missing required argument ${key}.`);
  }
  return {
    accdbPath: values.get('--accdb'),
    profilePath: values.get('--profile'),
    frictionProfilePath: values.get('--friction-profile'),
    actualOutPath: values.get('--actual-out'),
    evidenceOutPath: values.get('--evidence-out'),
  };
}

function writeJson(value, path) {
  const target = resolve(path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, canonicalPrettyStringify(value), 'utf8');
  return target;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = parseArguments(process.argv.slice(2));
    const result = runQualifiedBm4lFrictionProduction(input);
    const actualPath = writeJson(result.actual, input.actualOutPath);
    const evidencePath = writeJson(result.evidence, input.evidenceOutPath);
    process.stdout.write(`${actualPath}\n${evidencePath}\n`);
    if (result.evidence.acceptance.overallStatus !== 'PASS') process.exitCode = 2;
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
