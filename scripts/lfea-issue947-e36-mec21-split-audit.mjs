#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const args = parseArgs(process.argv.slice(2));
if (!args.package) throw new TypeError('Usage: node scripts/lfea-issue947-e36-mec21-split-audit.mjs --package <canonical-package.json> [--out <json>]');
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
if (pkg?.source?.sha256 !== EXPECTED_SOURCE_SHA256) throw new TypeError(`Unexpected source hash ${pkg?.source?.sha256}`);

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const basePath = join(scriptDir, 'lfea-issue947-e36-production-condensation-audit.mjs');
const baseSource = readFileSync(basePath, 'utf8');
const workspace = mkdtempSync(join(tmpdir(), 'issue947-e36-mec21-'));

const variants = {};
try {
  for (const variant of ['FULL', 'TRANSLATION_ONLY', 'ROTATION_ONLY', 'NONE']) {
    const source = variantSource(baseSource, variant);
    const scriptPath = join(scriptDir, `.issue947-e36-mec21-${variant.toLowerCase()}.tmp.mjs`);
    const outPath = join(workspace, `${variant}.json`);
    writeFileSync(scriptPath, source);
    try {
      const run = spawnSync(process.execPath, [scriptPath, '--package', args.package, '--out', outPath], {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      });
      if (run.status !== 0) {
        throw new Error(`${variant} execution failed\nSTDOUT:\n${run.stdout}\nSTDERR:\n${run.stderr}`);
      }
      const result = JSON.parse(readFileSync(outPath, 'utf8'));
      variants[variant] = summarize(result, variant);
    } finally {
      rmSync(scriptPath, { force: true });
    }
  }

  if (variants.FULL.parityStatus !== 'PASS' || variants.FULL.parityMaxAbsResidual > 2e-3) {
    throw new Error(`FULL production parity failed: ${JSON.stringify(variants.FULL)}`);
  }

  const ranking = Object.entries(variants)
    .map(([variant, value]) => ({
      variant,
      normalizedResidualL2: value.normalizedResidualL2,
      maxAbsNormalizedResidual: value.maxAbsNormalizedResidual,
      governingResidualDof: value.governingResidualDof,
    }))
    .sort((a, b) => a.normalizedResidualL2 - b.normalizedResidualL2);

  const output = {
    schema: 'lfea-issue947-e36-mec21-split-audit/v1',
    issue: 947,
    caseId: 'L19',
    sourceAccdbSha256: pkg.source.sha256,
    sourceElementId: '36',
    referenceUsage: 'DIAGNOSTIC_ONLY_NO_PARAMETER_FIT_NO_UPDATE_RULE',
    invariantAuthorities: [
      'production E36 geometry and 19-element descendant chain',
      'Timoshenko pipe frame with kappa=0.5',
      'B31J tee branch surface offset and in-plane rotational spring',
      'B31 bend flexibility and pressure stiffening',
      'gravity equivalent loads',
      'straight incoming-span closed-end pressure strain',
      'CAESAR source boundary DOFs and inferred source actions',
    ],
    variableOnly: 'MEC21 bend pressure free-field generalized displacement components before K*d0 conversion',
    variants,
    ranking,
    interpretationRule: 'A split variant may diagnose sensitivity but is not a candidate production law unless it has independent physical/source authority and survives canonical/full-model qualification.',
  };
  if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
  console.log('Issue 947 E36 MEC21 split audit PASS');
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

function variantSource(source, variant) {
  if (variant === 'FULL') return source;
  let result = source;
  const translationStart = 'const startTranslationGlobal = abcVectorToGlobal(input.segment.referenceAxes, startState.translationAbc);';
  const translationEnd = 'const endTranslationGlobal = abcVectorToGlobal(input.segment.referenceAxes, endState.translationAbc);';
  const rotationStart = 'const startRotationGlobal = abcVectorToGlobal(input.segment.referenceAxes, startState.rotationAbc);';
  const rotationEnd = 'const endRotationGlobal = abcVectorToGlobal(input.segment.referenceAxes, endState.rotationAbc);';
  for (const anchor of [translationStart, translationEnd, rotationStart, rotationEnd]) {
    if (!result.includes(anchor)) throw new Error(`Production-audit anchor missing: ${anchor}`);
  }
  if (variant === 'ROTATION_ONLY' || variant === 'NONE') {
    result = result.replace(translationStart, 'const startTranslationGlobal = zero3();');
    result = result.replace(translationEnd, 'const endTranslationGlobal = zero3();');
  }
  if (variant === 'TRANSLATION_ONLY' || variant === 'NONE') {
    result = result.replace(rotationStart, 'const startRotationGlobal = zero3();');
    result = result.replace(rotationEnd, 'const endRotationGlobal = zero3();');
  }
  const parityAnchor = "assert.ok(parityMaxAbs <= 2e-3, `E36 condensed parity against production source action failed: ${parityMaxAbs}`);";
  if (!result.includes(parityAnchor)) throw new Error('Production parity assertion anchor missing.');
  result = result.replace(parityAnchor, `if ('${variant}' === 'FULL') ${parityAnchor}`);
  return result;
}

function summarize(result, variant) {
  const c = result.caesarInjection;
  return {
    variant,
    parityStatus: result.parity.status,
    parityMaxAbsResidual: result.parity.maxAbsResidual,
    fullAction: c.fullAction,
    residual: c.residual,
    normalizedResidual: c.normalizedResidual,
    normalizedResidualL2: c.normalizedResidualL2,
    maxAbsNormalizedResidual: c.maxAbsNormalizedResidual,
    governingResidualDof: c.governingResidualDof,
    condensedBourdonInitial: c.terms.bourdonInitial,
  };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--package') out.package = argv[++i];
    else if (argv[i] === '--out') out.out = argv[++i];
  }
  return out;
}
