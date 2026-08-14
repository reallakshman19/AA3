#!/usr/bin/env node
/**
 * M047 Stage 2 next measurement batch.
 *
 * Executes the frozen engineering sequence on one pinned BM4_L.ACCDB source:
 *   controls -> D1 -> D1 RCA -> C1 -> explicit D1 decision -> optional B0-S1.
 *
 * This script does not alter production solver mechanics or acceptance criteria.
 * It fails closed on source custody, control regression, cross-artifact source drift,
 * and invalid experiment sequencing.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { runD1, D1_VARIANT } from './lfea-m047-stage2-friction-d1-total-direction.mjs';
import { runS1, S1_VARIANT } from './lfea-m047-stage2-friction-s1-no-relock.mjs';
import { buildAccuracyRca } from './lfea-m047-stage2-accuracy-rca.mjs';
import { buildCapacityBasisDiagnostic } from './lfea-m047-stage2-capacity-basis-diagnostic.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const PINNED_ACCDB_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const PINNED_ACCDB_BYTES = 5_136_384;
const DEFAULT_B0 = 'reports/lfea-m047-stage2-friction-iteration-L13.json';
const DEFAULT_OUT_DIR = 'reports/m047-stage2-next-batch';
const CONTROL_CASES = 'L2,L3,L4,L5,L6,L14';
const DECISIONS = new Set(['hold', 'promote', 'reject']);

function parseArguments(argv) {
  const flags = new Set(['--run-s1']);
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (flags.has(key)) {
      values.set(key, 'true');
      continue;
    }
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new TypeError(`Expected --name value or --run-s1; got ${String(key)} ${String(value)}.`);
    }
    values.set(key, value);
    index += 1;
  }

  const accdbPath = values.get('--accdb');
  if (!accdbPath) {
    throw new TypeError(
      'Usage: --accdb <BM4_L.ACCDB> (--control-baseline <json> | --baseline-root <checkout>) '
      + '[--b0 <iteration.json>] [--out-dir <dir>] [--d1-decision hold|promote|reject] [--run-s1].',
    );
  }
  const controlBaseline = values.get('--control-baseline') ?? null;
  const baselineRoot = values.get('--baseline-root') ?? null;
  if ((controlBaseline === null) === (baselineRoot === null)) {
    throw new TypeError('Provide exactly one of --control-baseline <json> or --baseline-root <checkout>.');
  }
  const d1Decision = values.get('--d1-decision') ?? 'hold';
  if (!DECISIONS.has(d1Decision)) {
    throw new TypeError(`--d1-decision must be hold, promote, or reject; got ${d1Decision}.`);
  }
  if (values.has('--run-s1') && d1Decision !== 'reject') {
    throw new TypeError('--run-s1 is valid only with --d1-decision reject for the independent B0-S1 fallback.');
  }

  return {
    accdbPath: resolve(accdbPath),
    controlBaseline: controlBaseline === null ? null : resolve(controlBaseline),
    baselineRoot: baselineRoot === null ? null : resolve(baselineRoot),
    baselineProfile: values.get('--baseline-profile') ?? null,
    profilePath: values.get('--profile') ?? null,
    b0Path: resolve(values.get('--b0') ?? DEFAULT_B0),
    outDir: resolve(values.get('--out-dir') ?? DEFAULT_OUT_DIR),
    d1Decision,
    runS1: values.has('--run-s1'),
    maxIterations: values.has('--max-iterations') ? Number(values.get('--max-iterations')) : undefined,
    stiffnessScale: values.has('--stiffness-scale') ? Number(values.get('--stiffness-scale')) : undefined,
    printResolutionMm: values.has('--print-resolution-mm')
      ? Number(values.get('--print-resolution-mm'))
      : 0.001,
  };
}

async function runNextBatch(input) {
  mkdirSync(input.outDir, { recursive: true });
  const custody = verifyPinnedAccdb(input.accdbPath);
  const b0 = readIteration(input.b0Path, 'B0');
  requireSameSource('B0', b0.sourceAccdbSha256, custody.sha256);
  if (b0.caseId !== 'L13' || !b0.converged) {
    throw new Error('B0 must be a converged L13 friction tuning artifact.');
  }

  const controlPath = resolve(input.outDir, 'control-regression.json');
  runControls({ ...input, controlPath });
  const controls = JSON.parse(readFileSync(controlPath, 'utf8'));
  requireSameSource('controls', controls.sourceAccdbSha256, custody.sha256);
  if (controls.status !== 'PASS') {
    throw new Error(`Frozen control regression failed; see ${controlPath}.`);
  }

  const d1Path = resolve(input.outDir, 'friction-iteration-L13-D1.json');
  const d1 = await runD1({
    accdbPath: input.accdbPath,
    profilePath: input.profilePath ?? undefined,
    caseId: 'L13',
    outPath: d1Path,
    maxIterations: input.maxIterations,
    stiffnessScale: input.stiffnessScale,
  });
  requireSameSource('D1', d1.sourceAccdbSha256, custody.sha256);

  let d1Rca = null;
  let d1RcaPath = null;
  if (d1.converged) {
    d1Rca = buildAccuracyRca(d1, { printResolutionMm: input.printResolutionMm });
    d1RcaPath = resolve(input.outDir, 'accuracy-rca-L13-D1.json');
    writeJson(d1RcaPath, d1Rca);
  }

  const c1Path = resolve(input.outDir, 'capacity-basis-L13-vs-L6.json');
  const c1 = await buildCapacityBasisDiagnostic({
    accdbPath: input.accdbPath,
    profilePath: input.profilePath ?? undefined,
    iterationPath: input.b0Path,
    frictionCaseId: 'L13',
    controlCaseId: 'L6',
  });
  requireSameSource('C1', c1.sourceAccdbSha256, custody.sha256);
  writeJson(c1Path, c1);

  const decisionPacket = buildDecisionPacket({
    custody,
    controls,
    b0,
    d1,
    d1Rca,
    c1,
    requestedDecision: input.d1Decision,
  });
  const decisionPath = resolve(input.outDir, 'd1-decision-packet.json');
  writeJson(decisionPath, decisionPacket);

  if (input.d1Decision === 'promote') {
    if (decisionPacket.hardGates.status !== 'PASS') {
      throw new Error(`D1 cannot be promoted because hard gates failed; see ${decisionPath}.`);
    }
    process.stdout.write(
      'D1 decision recorded as PROMOTE. S1 is not run here: the next S1 experiment must use accepted D1 as its declared baseline.\n',
    );
  }

  let s1 = null;
  let s1Path = null;
  if (input.d1Decision === 'reject' && input.runS1) {
    s1Path = resolve(input.outDir, 'friction-iteration-L13-S1-from-B0.json');
    s1 = await runS1({
      accdbPath: input.accdbPath,
      profilePath: input.profilePath ?? undefined,
      caseId: 'L13',
      outPath: s1Path,
      maxIterations: input.maxIterations,
      stiffnessScale: input.stiffnessScale,
    });
    requireSameSource('S1', s1.sourceAccdbSha256, custody.sha256);
  }

  const receiptBase = {
    schema: 'm047-bm4l-stage2-next-batch-receipt/v1',
    generatedAtUtc: new Date().toISOString(),
    source: custody,
    sequence: ['CONTROLS', 'D1', 'D1_RCA_IF_CONVERGED', 'C1', 'D1_DECISION', ...(s1 ? ['S1_FROM_B0'] : [])],
    variants: {
      baseline: b0.variant,
      d1: D1_VARIANT,
      s1: s1 ? S1_VARIANT : null,
    },
    decision: decisionPacket.decision,
    statuses: {
      controls: controls.status,
      d1Converged: d1.converged,
      d1Rca: d1Rca === null ? 'NOT_AVAILABLE_NONCONVERGED_D1' : 'WRITTEN',
      c1: 'WRITTEN',
      s1: s1 === null ? 'NOT_RUN' : s1.converged ? 'CONVERGED' : 'NONCONVERGED',
    },
    artifacts: {
      controls: controlPath,
      d1: d1Path,
      d1Rca: d1RcaPath,
      c1: c1Path,
      decision: decisionPath,
      s1: s1Path,
    },
    qualificationBoundary:
      'This batch is RCA evidence only. It does not qualify BM4_L friction and does not change tolerances or acceptance criteria.',
  };
  const receipt = { ...receiptBase, receiptSemanticHash: semanticHash(receiptBase) };
  const receiptPath = resolve(input.outDir, 'next-batch-receipt.json');
  writeJson(receiptPath, receipt);
  process.stdout.write(`${canonicalPrettyStringify(receipt)}\n`);
  return receipt;
}

function buildDecisionPacket({ custody, controls, b0, d1, d1Rca, c1, requestedDecision }) {
  const b0Summary = summarySnapshot(b0);
  const d1Summary = summarySnapshot(d1);
  const hardGateChecks = {
    samePinnedSource: d1.sourceAccdbSha256 === custody.sha256,
    controlsPass: controls.status === 'PASS',
    d1Converged: d1.converged === true,
    allD1NormalsWithinTenPercent: d1.converged === true
      && d1.summary?.normalWithinGoal === d1.summary?.frictionRestraintCount,
  };
  const hardGatePass = Object.values(hardGateChecks).every(Boolean);
  const comparison = {
    tangentialVectorsWithinGoalDelta: nullableDelta(
      d1Summary.tangentialVectorsWithinGoal,
      b0Summary.tangentialVectorsWithinGoal,
    ),
    tangentialWorstRelativeErrorDelta: nullableDelta(
      d1Summary.tangentialWorstRelativeError,
      b0Summary.tangentialWorstRelativeError,
    ),
    normalWorstPercentErrorDelta: nullableDelta(
      d1Summary.normalWorstPercentError,
      b0Summary.normalWorstPercentError,
    ),
    constitutiveRegimeMatchCountD1: d1Rca?.summary?.constitutiveRegimeMatchCount ?? null,
    constitutiveRegimeMatchCountB0: null,
  };

  const packetBase = {
    schema: 'm047-bm4l-stage2-d1-decision-packet/v1',
    sourceAccdbSha256: custody.sha256,
    requestedDecision: requestedDecision.toUpperCase(),
    decision: {
      status: requestedDecision.toUpperCase(),
      automaticPromotion: false,
      engineeringDecisionRequired: true,
      rule:
        'PROMOTION_OR_REJECTION_IS_EXPLICIT. THE_RUNNER ENFORCES HARD PHYSICS/CUSTODY GATES BUT DOES_NOT_INVENT_A_NUMERIC_DEFINITION_OF_MATERIALLY_IMPROVES.',
    },
    hardGates: {
      status: hardGatePass ? 'PASS' : 'FAIL',
      checks: hardGateChecks,
    },
    baselineB0: b0Summary,
    d1: d1Summary,
    comparison,
    d1RcaSummary: d1Rca?.summary ?? null,
    c1Summary: c1.summary,
    nextAction: requestedDecision === 'promote'
      ? 'DECLARE_D1_AS_BASELINE_THEN_RUN_A_SEPARATE_ONE_MECHANIC_S1_STATE_PATH_ITERATION'
      : requestedDecision === 'reject'
        ? 'KEEP_B0_DIRECTION_RULE; B0_S1_FALLBACK_MAY_RUN_AS_A_SEPARATE_ONE_MECHANIC_ITERATION'
        : 'REVIEW_D1_AND_C1_EVIDENCE_AND_RECORD_PROMOTE_OR_REJECT_BEFORE_SEQUENTIAL_MECHANICS',
  };
  return { ...packetBase, decisionSemanticHash: semanticHash(packetBase) };
}

function summarySnapshot(iteration) {
  return {
    variant: iteration.variant ?? null,
    converged: iteration.converged ?? false,
    tangentialVectorsWithinGoal: iteration.summary?.tangentialVectorsWithinGoal ?? null,
    tangentialVectorsCompared: iteration.summary?.tangentialVectorsCompared ?? null,
    tangentialWorstRelativeError: iteration.summary?.tangentialWorstRelativeError ?? null,
    normalWithinGoal: iteration.summary?.normalWithinGoal ?? null,
    frictionRestraintCount: iteration.summary?.frictionRestraintCount ?? null,
    normalWorstPercentError: iteration.summary?.normalWorstPercentError ?? null,
    rawRegimeMismatchCount: iteration.summary?.regimeMismatchCount ?? null,
  };
}

function runControls(input) {
  const controlScript = resolve(dirname(SCRIPT_PATH), 'lfea-m047-stage2-control-regression.mjs');
  const args = [
    controlScript,
    '--accdb', input.accdbPath,
    '--cases', CONTROL_CASES,
    '--out', input.controlPath,
  ];
  if (input.profilePath !== null) args.push('--profile', input.profilePath);
  if (input.controlBaseline !== null) {
    args.push('--baseline', input.controlBaseline);
  } else {
    args.push('--baseline-root', input.baselineRoot);
    if (input.baselineProfile !== null) args.push('--baseline-profile', input.baselineProfile);
  }
  execFileSync(process.execPath, args, { stdio: 'inherit' });
}

function verifyPinnedAccdb(path) {
  const bytes = readFileSync(path);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (bytes.byteLength !== PINNED_ACCDB_BYTES || sha256 !== PINNED_ACCDB_SHA256) {
    throw new Error(
      `Pinned BM4_L.ACCDB custody mismatch: ${bytes.byteLength} bytes, ${sha256}; `
      + `expected ${PINNED_ACCDB_BYTES} bytes, ${PINNED_ACCDB_SHA256}.`,
    );
  }
  return { fileName: 'BM4_L.ACCDB', byteLength: bytes.byteLength, sha256 };
}

function readIteration(path, label) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  if (value?.schema !== 'm047-bm4l-stage2-friction-tuning-iteration/v1') {
    throw new Error(`${label} is not an M047 Stage 2 friction tuning iteration artifact: ${path}.`);
  }
  return value;
}

function requireSameSource(label, actual, expected) {
  if (actual !== expected) throw new Error(`${label} source ${actual} does not match pinned ACCDB ${expected}.`);
}

function nullableDelta(current, baseline) {
  return Number.isFinite(current) && Number.isFinite(baseline) ? current - baseline : null;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${canonicalPrettyStringify(value)}\n`, 'utf8');
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  await runNextBatch(parseArguments(process.argv.slice(2)));
}

export { buildDecisionPacket, parseArguments, runNextBatch, verifyPinnedAccdb };
