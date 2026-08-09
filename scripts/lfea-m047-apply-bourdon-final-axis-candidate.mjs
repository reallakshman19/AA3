#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASELINE_COMMIT = '882d59a99c3a03847d20bec34770ba57ff479d91';
const OLD_FORMULATION = 'MEC21_PART_II_EQ_2_25_BEND_PRESSURE_FREE_MOVEMENT_V1';
const NEW_FORMULATION = 'MEC21_PART_II_EQ_2_25_BEND_PRESSURE_FREE_MOVEMENT_FINAL_TO_INITIAL_AXES_V2';

const OLD_BLOCK = `  const translationScale = curvatureChangeRatio * bendRadius;

  return Object.freeze({
    formulation: MEC21_BEND_PRESSURE_EXPANSION_FORMULATION,
    translationAbc: Object.freeze([
      translationScale * (Math.sin(bendAngle) - bendAngle),
      0,
      translationScale * (Math.cos(bendAngle) - 1),
    ]),
    rotationAbc: Object.freeze([0, curvatureChangeRatio * bendAngle, 0]),
    curvatureChangeRatio,
    shellCorrection,
  });`;

const NEW_BLOCK = `  const translationScale = curvatureChangeRatio * bendRadius;
  const equationTranslationFinalAbc = Object.freeze([
    translationScale * (Math.sin(bendAngle) - bendAngle),
    0,
    translationScale * (Math.cos(bendAngle) - 1),
  ]);

  // MEC-21 section 2.3 resolves the published free movement at the final
  // point in that final point's local a-b-c basis. The ACCDB assembler stores
  // the segment basis at the initial point. For b = c x a along a directed
  // circular bend:
  //   a_f = cos(B) a_i + sin(B) c_i
  //   c_f = -sin(B) a_i + cos(B) c_i
  // Rotate the published final-basis components into the initial basis before
  // the caller maps them into the assembled frame. Magnitude and Eq. (2.25)
  // coefficients are unchanged.
  const cosine = Math.cos(bendAngle);
  const sine = Math.sin(bendAngle);
  const translationAbc = Object.freeze([
    cosine * equationTranslationFinalAbc[0] - sine * equationTranslationFinalAbc[2],
    0,
    sine * equationTranslationFinalAbc[0] + cosine * equationTranslationFinalAbc[2],
  ]);

  return Object.freeze({
    formulation: MEC21_BEND_PRESSURE_EXPANSION_FORMULATION,
    equationTranslationFinalAbc,
    equationRotationFinalAbc: Object.freeze([0, curvatureChangeRatio * bendAngle, 0]),
    translationAbc,
    translationAbcFrame: 'INITIAL_POINT_EQUIVALENT_OF_MEC21_FINAL_POINT_AXES',
    rotationAbc: Object.freeze([0, curvatureChangeRatio * bendAngle, 0]),
    rotationAbcFrame: 'COMMON_BEND_PLANE_NORMAL',
    curvatureChangeRatio,
    shellCorrection,
  });`;

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
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
  const source = args.get('--source');
  const manifest = args.get('--manifest');
  if (!source || !manifest) throw new TypeError('Usage: --source <bourdon-pressure-expansion.js> --manifest <json>.');
  const unknown = [...args.keys()].filter((key) => !['--source', '--manifest'].includes(key));
  if (unknown.length) throw new TypeError(`Unknown arguments: ${unknown.join(', ')}.`);
  return { source: resolve(source), manifest: resolve(manifest) };
}

const input = parseArguments(process.argv.slice(2));
const beforeRaw = readFileSync(input.source, 'utf8');
const eol = beforeRaw.includes('\r\n') ? '\r\n' : '\n';
const before = beforeRaw.replace(/\r\n/gu, '\n');
if (!before.includes(`'${OLD_FORMULATION}'`)) {
  throw new Error(`I011 requires baseline formulation ${OLD_FORMULATION}.`);
}
if (before.includes(NEW_FORMULATION) || before.includes('equationTranslationFinalAbc')) {
  throw new Error('I011 candidate appears to be already applied.');
}
const blockCount = before.split(OLD_BLOCK).length - 1;
if (blockCount !== 1) throw new Error(`I011 expected one baseline free-movement block; found ${blockCount}.`);
let after = before.replace(`'${OLD_FORMULATION}'`, `'${NEW_FORMULATION}'`);
after = after.replace(OLD_BLOCK, NEW_BLOCK);
if (after === before) throw new Error('I011 candidate made no source change.');
const afterRaw = eol === '\r\n' ? after.replace(/\n/gu, '\r\n') : after;
writeFileSync(input.source, afterRaw, 'utf8');

const manifest = {
  schema: 'lfea-m047-bourdon-final-axis-candidate/v1',
  issueId: 'M047',
  iterationId: 'M047-I011',
  baselineCommit: BASELINE_COMMIT,
  changedPath: 'src/core/linear-fea-piping-components/bourdon-pressure-expansion.js',
  mechanicsChanged: true,
  benchmarkOutputFitUsed: false,
  authority: 'MEC21_PART_II_SECTION_2_3_FINAL_POINT_AXES_TO_ASSEMBLER_INITIAL_POINT_AXES',
  mechanicsDelta: 'Resolve Eq. (2.25) final-point a-c translation components into the segment initial-point a-c basis consumed by the ACCDB assembler; pressure coefficient, movement magnitude and b-axis rotation remain unchanged.',
  originalSourceSha256: sha256(beforeRaw),
  candidateSourceSha256: sha256(afterRaw),
  detectedLineEnding: eol === '\r\n' ? 'CRLF' : 'LF',
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`M047 I011 Bourdon final-axis candidate: ${manifest.originalSourceSha256} -> ${manifest.candidateSourceSha256}\n`);
