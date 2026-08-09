#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const NEEDLE = '        smooth90FlexibilityCorrection: false,';
const REPLACEMENT = '        smooth90FlexibilityCorrection: true,';

function parse(argv) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) throw new TypeError(`Invalid argument near ${String(argv[i])}.`);
    args.set(argv[i], argv[i + 1]);
  }
  if (!args.get('--source') || !args.get('--manifest')) throw new TypeError('Usage: --source <solver.js> --manifest <json>.');
  return { source: resolve(args.get('--source')), manifest: resolve(args.get('--manifest')) };
}
function normalize(text) { return text.replace(/\r\n/gu, '\n'); }
function count(text, needle) { return text.split(needle).length - 1; }
function sha(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }

const input = parse(process.argv.slice(2));
const raw = readFileSync(input.source, 'utf8');
let source = normalize(raw);
if (count(source, NEEDLE) !== 1) throw new Error(`I029 expected one smooth90=false needle; found ${count(source, NEEDLE)}.`);
if (source.includes(REPLACEMENT)) throw new Error('I029 smooth-90 candidate already appears applied.');
source = source.replace(NEEDLE, REPLACEMENT);
if (source.includes(NEEDLE) || count(source, REPLACEMENT) !== 1) throw new Error('I029 smooth-90 patch did not apply exactly once.');
for (const retained of [
  "const FACTOR_PROFILE_ID = 'B31_3_2022_B31J_2017';",
  'pressure: Number(row.PRESSURE1) * KPA_TO_PA,',
  'elasticModulus: input.material.materialState.elasticModulus,',
  "componentType: 'BEND',",
  'bendAngleDegrees: bendAngle * 180 / Math.PI,',
]) {
  if (!source.includes(retained)) throw new Error(`I029 missing retained bend-authority token: ${retained}`);
}
writeFileSync(input.source, source, 'utf8');
const manifest = {
  schema: 'lfea-m047-i029-smooth90-manifest/v1',
  issueId: 'M047', iterationId: 'M047-I029',
  sourcePath: 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  originalSha256: sha(normalize(raw)), candidateSha256: sha(source),
  mechanicsDelta: {
    factorStandard: 'ASME_B31J', factorEdition: '2017', activeCode: 'ASME_B31_3_2022',
    bendPopulationAuthority: 'LOCKED_ACCDB_I028_ALL_12_BENDS_EXACTLY_90_DEGREES',
    smooth90FlexibilityCorrection: true,
    baselineFlexibilityCoefficient: 1.65,
    candidateFlexibilityCoefficient: 1.3,
    coefficientBasis: 'VENDOR_B31J_SMOOTH_90_BOOLEAN_RULE_NOT_BENCHMARK_FIT',
    changed: ['BEND_B31J_SMOOTH_90_BOOLEAN'],
    unchanged: ['FRAME_BASE_LAW','TEE_FACTORS','REDUCER','RIGID','BOURDON','PRESSURE_AXIAL_STRAIN','THERMAL_CTE','GRAVITY','RESTRAINTS','TOLERANCES','REFERENCE_ROWS'],
  },
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`M047 I029 smooth-90 candidate: ${manifest.originalSha256} -> ${manifest.candidateSha256}`);
