#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const sourcePath = args.get('--source');
if (!sourcePath) throw new TypeError('Usage: --source <solver.js>.');
const source = readFileSync(resolve(sourcePath), 'utf8').replace(/\r\n/gu, '\n');
const mustHave = [
  "const FACTOR_PROFILE_ID = 'B31_3_2022_B31J_2017';",
  '        smooth90FlexibilityCorrection: true,',
  'pressure: Number(row.PRESSURE1) * KPA_TO_PA,',
  'elasticModulus: input.material.materialState.elasticModulus,',
  "componentType: 'BEND',",
];
for (const token of mustHave) if (!source.includes(token)) throw new Error(`I029 missing required token: ${token}`);
if (source.includes('        smooth90FlexibilityCorrection: false,')) throw new Error('I029 retains smooth90=false.');
if ((source.match(/smooth90FlexibilityCorrection:\s*true,/gu) ?? []).length !== 1) throw new Error('I029 smooth90=true must occur exactly once.');
console.log('M047 I029 smooth-90 candidate boundary: PASS');
