import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const INDEX = new URL('../src/core/fea-benchmarks/index.js', import.meta.url);
const PRODUCTION = new URL('../scripts/lfea-m047-bm4l-friction.mjs', import.meta.url);
const GOVERNED = new URL('../src/core/fea-benchmarks/caesar-accdb-friction-stage2-governed.js', import.meta.url);
const HYDRO = new URL('../src/core/fea-benchmarks/caesar-accdb-hydrotest-friction.js', import.meta.url);
const SENSITIVITY = new URL('../src/core/fea-benchmarks/caesar-friction-stage2-sensitivity.js', import.meta.url);

function source(url) { return fs.readFileSync(url, 'utf8'); }

test('public benchmark API exposes governed Stage-2 solver instead of raw L1-blocking solver', () => {
  const text = source(INDEX);
  assert.match(text,
    /export \{ solveCaesarAccdbFrictionBenchmark \} from '\.\/caesar-accdb-friction-stage2-governed\.js';/u);
  assert.doesNotMatch(text,
    /solveCaesarAccdbFrictionBenchmark,[\s\S]*?from '\.\/caesar-accdb-friction-solve\.js';/u);
});

test('public sensitivity API includes governed L1 wrapper', () => {
  const text = source(INDEX);
  assert.match(text,
    /runBm4lFrictionStiffnessSensitivity,[\s\S]*?from '\.\/caesar-friction-stage2-sensitivity\.js';/u);
  assert.match(source(SENSITIVITY), /\['L13', 'L7', 'L15', 'L1'\]/u);
  assert.match(source(SENSITIVITY), /caseIds: \['L1'\]/u);
});

test('production runner consumes solver and sensitivity only through the public benchmark API', () => {
  const text = source(PRODUCTION);
  assert.match(text, /solveCaesarAccdbFrictionBenchmark,/u);
  assert.match(text, /runBm4lFrictionStiffnessSensitivity/u);
  assert.match(text, /from '\.\.\/src\/core\/fea-benchmarks\/index\.js';/u);
  assert.doesNotMatch(text, /caesar-accdb-friction-solve\.js/u);
});

test('governed solver solves hydrotest last through the source-custodied compatibility path', () => {
  const text = source(GOVERNED);
  assert.match(text, /solveBm4lHydrotestFrictionCase\(benchmarkPackage, options\)/u);
  assert.match(text, /L1: hydro\.caseResult/u);
  assert.match(text, /L1: hydro\.evidence/u);
  assert.match(source(HYDRO), /PINNED_ACCDB_L1_OUTPUT_REMAINS_THE_ONLY_COMPARISON_REFERENCE/u);
  assert.match(source(HYDRO), /FLUID_DENSITY: BM4L_HYDROTEST_WATER_DENSITY_KG_PER_CM3/u);
  assert.match(source(HYDRO), /PRESSURE1: Number\(row\.HYDRO_PRESSURE\)/u);
  assert.match(source(HYDRO), /INSUL_THICK: 0/u);
  assert.match(source(HYDRO), /INSUL_DENSITY: 0/u);
});
