#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1]);
const sourcePath = args.get('--source');
if (!sourcePath) throw new TypeError('Usage: --source <solver.js>.');
const source = readFileSync(resolve(sourcePath), 'utf8').replace(/\r\n/gu, '\n');
const required = [
  'smooth90FlexibilityCorrection: true,',
  'authority.segments.reduce((sum, segment) => {',
  "input.solveProfile.bourdonPressureEffects.mode !== 'DISABLED'",
  'const reducerPressureAxialStrain = reducerPressureFreeElongation / length;',
  'matrixVector12(authority.condensed.localStiffness, pressureFreeDofLocal)',
  'const initialLocal = add(thermalInitialLocal, pressureInitialLocal);',
  'pressureAxialStrain: reducerPressureAxialStrain,',
  'bourdonFreeEndTranslationM: scale(axesResult.axes.x, reducerPressureFreeElongation),',
  'const authority = compileTenCylinderReducerAuthority(request);',
  'const equivalentLocal = [...authority.condensed.gravityLocalVector];',
];
for (const token of required) if (!source.includes(token)) throw new Error(`I031 missing required token: ${token}`);
if (source.includes("kind: 'REDUCER',\n    material: input.material,\n    bindingSection: fromSection,\n    axesResult,\n    frame,\n    effectiveLocalStiffness: authority.condensed.localStiffness,\n    effectiveGlobalStiffness,\n    equivalentLocal,\n    equivalentGlobal,\n    initialLocal,\n    initialGlobal,\n    pressureAxialStrain: 0,")) throw new Error('I031 reducer pressure strain remains zero.');
if ((source.match(/authority\.segments\.reduce\(\(sum, segment\) => \{/gu) ?? []).length !== 1) throw new Error('I031 reducer pressure integration must occur exactly once.');
if ((source.match(/smooth90FlexibilityCorrection:\s*true,/gu) ?? []).length !== 1) throw new Error('I031 must retain exactly one accepted smooth90=true control.');
console.log('M047 I031 reducer Bourdon candidate boundary: PASS');
