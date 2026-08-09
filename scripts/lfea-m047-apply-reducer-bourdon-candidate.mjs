#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const INITIAL_NEEDLE = `  const authority = compileTenCylinderReducerAuthority(request);\n  const transformation = frameTransformationMatrix(axesResult.axes);\n  const equivalentLocal = [...authority.condensed.gravityLocalVector];\n  const initialLocal = input.caseMode.thermal\n    ? [...authority.condensed.thermalInitialStrainLocalVector]\n    : zero12();`;

const INITIAL_REPLACEMENT = `  const authority = compileTenCylinderReducerAuthority(request);\n  const transformation = frameTransformationMatrix(axesResult.axes);\n  const equivalentLocal = [...authority.condensed.gravityLocalVector];\n  const thermalInitialLocal = input.caseMode.thermal\n    ? [...authority.condensed.thermalInitialStrainLocalVector]\n    : zero12();\n  const reducerPressureEnabled = input.caseMode.pressure\n    && input.solveProfile.bourdonPressureEffects.mode !== 'DISABLED';\n  const reducerPressureFreeElongation = reducerPressureEnabled\n    ? authority.segments.reduce((sum, segment) => {\n        const outerDiameter = segment.section.outerDiameter;\n        const innerDiameter = segment.section.innerDiameter;\n        const pressureAxialStrain = (1 - 2 * Number(input.row.POISSONS))\n          * Number(input.row.PRESSURE1) * KPA_TO_PA * innerDiameter ** 2\n          / (materialState.elasticModulus * (outerDiameter ** 2 - innerDiameter ** 2));\n        return sum + pressureAxialStrain * segment.length;\n      }, 0)\n    : 0;\n  const reducerPressureAxialStrain = reducerPressureFreeElongation / length;\n  const pressureFreeDofLocal = zero12();\n  pressureFreeDofLocal[6] = reducerPressureFreeElongation;\n  const pressureInitialLocal = reducerPressureEnabled\n    ? matrixVector12(authority.condensed.localStiffness, pressureFreeDofLocal)\n    : zero12();\n  const initialLocal = add(thermalInitialLocal, pressureInitialLocal);`;

const EVIDENCE_NEEDLE = `    pressureAxialStrain: 0,\n    bourdonRotationRadians: 0,\n    bourdonFreeEndTranslationM: zero3(),`;
const EVIDENCE_REPLACEMENT = `    pressureAxialStrain: reducerPressureAxialStrain,\n    bourdonRotationRadians: 0,\n    bourdonFreeEndTranslationM: scale(axesResult.axes.x, reducerPressureFreeElongation),`;

function parse(argv) {
  const map = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) throw new TypeError(`Invalid argument near ${String(argv[i])}`);
    map.set(argv[i], argv[i + 1]);
  }
  if (!map.get('--source') || !map.get('--manifest')) throw new TypeError('Usage: --source <solver.js> --manifest <json>.');
  return { source: resolve(map.get('--source')), manifest: resolve(map.get('--manifest')) };
}
function normalize(text) { return text.replace(/\r\n/gu, '\n'); }
function count(text, needle) { return text.split(needle).length - 1; }
function sha(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }

const input = parse(process.argv.slice(2));
const raw = readFileSync(input.source, 'utf8');
let source = normalize(raw);
if (count(source, INITIAL_NEEDLE) !== 1) throw new Error(`I031 expected one reducer initial-load needle; found ${count(source, INITIAL_NEEDLE)}.`);
if (count(source, EVIDENCE_NEEDLE) !== 1) throw new Error(`I031 expected one reducer pressure-evidence needle; found ${count(source, EVIDENCE_NEEDLE)}.`);
source = source.replace(INITIAL_NEEDLE, INITIAL_REPLACEMENT).replace(EVIDENCE_NEEDLE, EVIDENCE_REPLACEMENT);
for (const token of [
  'authority.segments.reduce((sum, segment) => {',
  "input.solveProfile.bourdonPressureEffects.mode !== 'DISABLED'",
  '* Number(input.row.PRESSURE1) * KPA_TO_PA * innerDiameter ** 2',
  'matrixVector12(authority.condensed.localStiffness, pressureFreeDofLocal)',
  'const initialLocal = add(thermalInitialLocal, pressureInitialLocal);',
  'pressureAxialStrain: reducerPressureAxialStrain,',
  'bourdonFreeEndTranslationM: scale(axesResult.axes.x, reducerPressureFreeElongation),',
  'smooth90FlexibilityCorrection: true,',
]) {
  if (!source.includes(token)) throw new Error(`I031 candidate missing required token: ${token}`);
}
if (source.includes(EVIDENCE_NEEDLE)) throw new Error('I031 reducer still exposes zero pressure strain.');
writeFileSync(input.source, source, 'utf8');
const manifest = {
  schema: 'lfea-m047-i031-reducer-bourdon-manifest/v1',
  issueId: 'M047',
  iterationId: 'M047-I031',
  sourcePath: 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js',
  originalSha256: sha(normalize(raw)),
  candidateSha256: sha(source),
  mechanicsDelta: {
    component: 'REDUCER',
    segmentCount: 10,
    pressureLaw: 'CLOSED_END_PRESSURE_AXIAL_STRAIN_PER_EXISTING_REDUCER_CYLINDER',
    freeElongationRule: 'SUM_SEGMENT_STRAIN_TIMES_SEGMENT_LENGTH',
    condensedInitialLoadRule: 'K_REDUCER_CONDENSED_TIMES_FREE_J_END_LOCAL_UX',
    activation: 'PRESSURE_CASE_AND_BOURDON_NOT_DISABLED',
    sectionSampling: 'UNCHANGED_EXISTING_REDUCER_SEGMENTS',
    fittedParameter: false,
    held: ['SMOOTH90_B31J','FRAME_BASE_LAW','TEE','BEND_PRESSURE_STIFFENING','REDUCER_STIFFNESS','REDUCER_GRAVITY','REDUCER_THERMAL','RIGID','EC','FRICTION','TOLERANCES'],
  },
};
mkdirSync(dirname(input.manifest), { recursive: true });
writeFileSync(input.manifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`M047 I031 reducer Bourdon candidate: ${manifest.originalSha256} -> ${manifest.candidateSha256}`);
