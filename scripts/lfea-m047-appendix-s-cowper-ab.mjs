#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const fixturePath = path.resolve('scripts/lfea-b3.12-appendix-s-example1-fixtures.mjs');
const checkPath = path.resolve('scripts/lfea-b3.12-appendix-s-example1-check.mjs');
const artifactsDir = path.resolve('artifacts');
const helperPath = path.join(artifactsDir, 'm047-appendix-s-metrics.mjs');

function fail(message) {
  throw new Error(message);
}

function runNode(args) {
  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
}

function parseJsonOutput(result, label) {
  if (result.status !== 0) {
    fail(`${label} failed with exit ${result.status}:\n${result.stdout}\n${result.stderr}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    fail(`${label} did not emit JSON: ${error.message}\n${result.stdout}`);
  }
}

function replaceOnce(text, before, after, label) {
  const count = text.split(before).length - 1;
  if (count !== 1) fail(`${label}: expected exactly one match, found ${count}.`);
  return text.replace(before, after);
}

function patchFixture(original) {
  let text = original.replace(/\r\n/g, '\n');
  text = replaceOnce(
    text,
    "import { eulerBernoulliProfile } from './lfea-b3.1-frame-element-fixtures.mjs';",
    "import { eulerBernoulliProfile, timoshenkoProfile } from './lfea-b3.1-frame-element-fixtures.mjs';",
    'profile import',
  );
  text = replaceOnce(
    text,
    "  const frameProfile = eulerBernoulliProfile();\n  const bendProfile = componentProfile({",
    `  const frameProfile = eulerBernoulliProfile();
  // Independent continuum-mechanics discriminator only. The straight-span
  // profile is section-derived; bend component sub-elements retain their
  // existing bend formulation and Euler frame profile.
  const cowperA = section.dimensions.innerDiameter / section.dimensions.outerDiameter;
  const cowperOnePlusA2 = 1 + cowperA ** 2;
  const cowperNu = material.materialState.poissonRatio;
  const cowperKappa = 6 * (1 + cowperNu) * cowperOnePlusA2 ** 2
    / ((7 + 6 * cowperNu) * cowperOnePlusA2 ** 2 + (20 + 12 * cowperNu) * cowperA ** 2);
  const straightFrameProfile = timoshenkoProfile({
    shearCorrectionFactorY: { value: cowperKappa, source: 'COWPER-HOLLOW-CIRCLE-INDEPENDENT-APPENDIX-S-DISCRIMINATOR' },
    shearCorrectionFactorZ: { value: cowperKappa, source: 'COWPER-HOLLOW-CIRCLE-INDEPENDENT-APPENDIX-S-DISCRIMINATOR' },
  });
  const bendProfile = componentProfile({`,
    'Cowper profile declaration',
  );
  text = replaceOnce(
    text,
    "      profile: frameProfile,\n      distributedLoads: [],\n      temperature: temperaturesByElement.get(span.elementId),",
    "      profile: straightFrameProfile,\n      distributedLoads: [],\n      temperature: temperaturesByElement.get(span.elementId),",
    'ordinary straight-span ownership',
  );
  return text;
}

const metricsSource = String.raw`import {
  PUBLISHED_DISPLACEMENTS,
  PUBLISHED_SUPPORT_LOADS,
  OUTER_DIAMETER,
  WALL_THICKNESS,
  POISSON_RATIO,
  solveAppendixS,
} from '../scripts/lfea-b3.12-appendix-s-example1-fixtures.mjs';

const run = solveAppendixS();
const displacement = (nodeId, dof) => run.execution.displacement.find((row) => row.nodeId === nodeId && row.dof === dof)?.value;
const reaction = (nodeId, dof) => run.execution.reactions.find((row) => row.nodeId === nodeId && row.dof === dof)?.value;
const displacementRows = [];
for (const row of PUBLISHED_DISPLACEMENTS) {
  for (const [dof, expectedMm] of [['UX', row.uxMm], ['UY', row.uyMm]]) {
    if (expectedMm === 0) continue;
    const actualMm = displacement(row.nodeId, dof) * 1000;
    const scale = Math.max(Math.abs(expectedMm), 1.5);
    displacementRows.push({ label: row.label, dof, actualMm, expectedMm, errorMm: actualMm - expectedMm, normalized: (actualMm - expectedMm) / scale });
  }
}
const supportRows = [];
for (const row of PUBLISHED_SUPPORT_LOADS) {
  const pipeOnSupport = -reaction(row.nodeId, row.dof);
  const actual = row.absolute ? Math.abs(pipeOnSupport) : pipeOnSupport;
  const expected = row.absolute ? Math.abs(row.value) : row.value;
  const scale = Math.max(Math.abs(expected), row.quantity === 'moment' ? 1500 : 1200);
  supportRows.push({ nodeId: row.nodeId, dof: row.dof, actual, expected, error: actual - expected, normalized: (actual - expected) / scale });
}
const rms = (rows) => Math.sqrt(rows.reduce((sum, row) => sum + row.normalized ** 2, 0) / rows.length);
const a = (OUTER_DIAMETER - 2 * WALL_THICKNESS) / OUTER_DIAMETER;
const onePlusA2 = 1 + a * a;
const kappa = 6 * (1 + POISSON_RATIO) * onePlusA2 ** 2
  / ((7 + 6 * POISSON_RATIO) * onePlusA2 ** 2 + (20 + 12 * POISSON_RATIO) * a * a);
process.stdout.write(JSON.stringify({
  schema: 'lfea-m047-appendix-s-independent-metrics/v3',
  executionStatus: run.execution.status,
  kappa,
  displacement: {
    rmsNormalized: rms(displacementRows),
    maxAbsErrorMm: Math.max(...displacementRows.map((row) => Math.abs(row.errorMm))),
    rows: displacementRows,
  },
  support: {
    rmsNormalized: rms(supportRows),
    maxAbsNormalized: Math.max(...supportRows.map((row) => Math.abs(row.normalized))),
    rows: supportRows,
  },
  diagnostics: run.execution.diagnostics,
}, null, 2) + '\n');
`;

function main() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(helperPath, metricsSource);
  const original = fs.readFileSync(fixturePath, 'utf8');
  let baselineCheck;
  let cowperCheck;
  let baseline;
  let cowper;
  try {
    baselineCheck = runNode([checkPath]);
    if (baselineCheck.status !== 0) {
      fail(`Published Appendix S baseline is not qualified:\n${baselineCheck.stdout}\n${baselineCheck.stderr}`);
    }
    baseline = parseJsonOutput(runNode([helperPath]), 'baseline metrics');

    fs.writeFileSync(fixturePath, patchFixture(original));
    cowperCheck = runNode([checkPath]);
    cowper = parseJsonOutput(runNode([helperPath]), 'Cowper metrics');
  } finally {
    fs.writeFileSync(fixturePath, original);
  }

  const output = {
    schema: 'lfea-m047-independent-appendix-s-cowper-ab/v3',
    benchmark: 'ASME B31.3-2006 Appendix S Example 1',
    bm4ReferenceUsed: false,
    candidate: 'Cowper hollow-circle Timoshenko transverse shear on ordinary straight spans only; bend components unchanged',
    kappa: cowper.kappa,
    baselineQualificationPassed: baselineCheck.status === 0,
    cowperQualificationPassed: cowperCheck.status === 0,
    cowperQualificationFailure: cowperCheck.status === 0
      ? null
      : `${cowperCheck.stdout}\n${cowperCheck.stderr}`.slice(0, 12000),
    displacement: {
      baselineRmsNormalized: baseline.displacement.rmsNormalized,
      cowperRmsNormalized: cowper.displacement.rmsNormalized,
      cowperToBaselineRatio: cowper.displacement.rmsNormalized / baseline.displacement.rmsNormalized,
      baselineMaxAbsErrorMm: baseline.displacement.maxAbsErrorMm,
      cowperMaxAbsErrorMm: cowper.displacement.maxAbsErrorMm,
    },
    support: {
      baselineRmsNormalized: baseline.support.rmsNormalized,
      cowperRmsNormalized: cowper.support.rmsNormalized,
      cowperToBaselineRatio: cowper.support.rmsNormalized / baseline.support.rmsNormalized,
      baselineMaxAbsNormalized: baseline.support.maxAbsNormalized,
      cowperMaxAbsNormalized: cowper.support.maxAbsNormalized,
    },
    decisionBoundary: 'Independent published benchmark only. This can support general straight-pipe formulation choice but does not by itself prove CAESAR II 14 uses the same shear correction.',
  };

  const outIndex = process.argv.indexOf('--out');
  if (outIndex >= 0) {
    const outPath = process.argv[outIndex + 1];
    if (!outPath) fail('--out requires a path.');
    fs.writeFileSync(path.resolve(outPath), `${JSON.stringify(output, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

main();
