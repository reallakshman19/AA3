#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const path = 'src/core/linear-fea-piping-components/bourdon-pressure-expansion.js';
const source = readFileSync(resolve(root, path), 'utf8');
const executable = source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(^|[^:])\/\/.*$/gmu, '$1');

assert.match(
  source,
  /import\s*\{\s*FRAME_LOCAL_AXIS_PROFILE\s*\}\s*from\s*'\.\.\/centerline-beam-fea\/index\.js'/u,
  'Bourdon a-b-c validation must cite the B-2.4 local-axis authority',
);
assert.doesNotMatch(
  executable,
  /(?:AXIS|ORTHOGONALITY|HANDEDNESS|UNIT_VECTOR)_?TOLERANCE\s*=\s*[0-9.]+/iu,
  'Bourdon mechanics must not introduce a private axis tolerance',
);
assert.match(
  source,
  /FRAME_LOCAL_AXIS_PROFILE\.unitVectorTolerance/u,
  'unit-vector validation must use B-2.4 policy',
);
assert.match(
  source,
  /FRAME_LOCAL_AXIS_PROFILE\.orthogonalityTolerance/u,
  'orthogonality validation must use B-2.4 policy',
);
assert.match(
  source,
  /FRAME_LOCAL_AXIS_PROFILE\.handednessTolerance/u,
  'handedness validation must use B-2.4 policy',
);

assert.match(
  source,
  /MEC21_PART_II_EQ_2_25_BEND_PRESSURE_FREE_MOVEMENT_V1/u,
  'MEC-21 Eq. (2.25) authority identity must remain explicit',
);
assert.match(
  source,
  /MEC21_PART_II_EQ_2_25_COMPATIBLE_CUMULATIVE_NODAL_FIELD_V1/u,
  'compatible cumulative field identity must remain explicit',
);
assert.match(
  executable,
  /Math\.PI\s*\*\s*pressure\s*\*\s*innerRadius\s*\*\*\s*4/u,
  'curvature-change ratio must remain mechanically derived from pressure and section geometry',
);
assert.match(
  executable,
  /Math\.sin\(bendAngle\)\s*-\s*bendAngle/u,
  'MEC-21 a translation term must remain explicit',
);
assert.match(
  executable,
  /Math\.cos\(bendAngle\)\s*-\s*1/u,
  'MEC-21 c translation term must remain explicit',
);
assert.match(
  executable,
  /curvatureChangeRatio\s*\*\s*bendAngle/u,
  'MEC-21 b rotation term must remain explicit',
);

for (const forbidden of [
  /20090/u,
  /1659\.837/u,
  /1941\.292/u,
  /1376\.712/u,
  /950\.859/u,
  /BM4_NL/u,
  /benchmark.*(?:reaction|displacement)/iu,
  /InputXML/u,
]) {
  assert.doesNotMatch(
    executable,
    forbidden,
    `Bourdon mechanics contains prohibited benchmark/input-specific text ${forbidden}`,
  );
}

assert.doesNotMatch(
  executable,
  /\b(?:reaction|restraint|supportReaction|acceptanceLimit|relativeError|scaleFloor)\b/u,
  'Bourdon free-deformation mechanics must not depend on benchmark comparison or reaction recovery',
);
assert.doesNotMatch(
  executable,
  /\b(?:HOT_MOD1|thermalExpansionCoefficient|TEMP_EXP_C1)\b/u,
  'M047 Bourdon mechanics must remain independent of the later thermal investigation',
);

process.stdout.write('lfea-m047-bourdon-source-guard: PASS\n');
