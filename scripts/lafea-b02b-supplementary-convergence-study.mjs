#!/usr/bin/env node
/**
 * Supplementary convergence study for B02B (does NOT touch the frozen v1
 * validation/lafea-b02-definitions/B02B-nonuniform-shear.json, the v2 sign
 * correction in B02B-nonuniform-shear-v2.json, or either's mesh ladder --
 * this script only reads the v2-corrected definition and reuses the shared,
 * already-qualified production route to add more h-refinement).
 *
 * With the v2 sign correction applied, scripts/lafea-b02b-production-check.mjs
 * still fails: T6 and Q8 (both release-critical) sit at ~6.3-6.5% relative
 * error against the frozen 5% tolerance at the ladder's finest level (L3,
 * h=2.5mm), not the ~190%+ the sign bug caused. This script checks whether
 * that residual gap is a mesh-density issue (resolves with more refinement,
 * same character as B02A's T3 finding) or a persistent gap suggesting the
 * 1-D Timoshenko+Jourawski beam-theory oracle itself has reduced validity for
 * this benchmark's short/deep geometry (length/depth = 0.5, a stub rather
 * than a slender beam -- the probe sits only 7.3mm from the fixed end, well
 * inside the region where Saint-Venant/local-fixity effects can invalidate a
 * reduced 1-D theory regardless of mesh density).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeB02RectangleProductionLevel } from './lib/lafea-b02-production-route.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = read('validation/lafea-b02-definitions/B02B-nonuniform-shear-v2.json');
const probeId = 'B02B-PROBE-TAU-01';
const expected = definition.fixedProbes.find((row) => row.probeId === probeId).expectedValue;
const tolerance = definition.acceptance.fixedProbeShearStressRelativeErrorMaximum;

const supplementaryLevels = [
  ...definition.meshLadder.levels,
  { levelId: 'L4-SUPPLEMENTARY', h: 1.25, targetElementLength: 1.25, curvatureToleranceDegrees: 30 },
  { levelId: 'L5-SUPPLEMENTARY', h: 0.625, targetElementLength: 0.625, curvatureToleranceDegrees: 30 },
];

function measure(method, level) {
  const run = executeB02RectangleProductionLevel(definition, method, level);
  const probe = run.probes.find((row) => row.probe.probeId === probeId);
  assert.ok(probe, `${method}/${level.levelId} missing probe ${probeId}`);
  const relativeError = Math.abs(probe.authoritativeValue - expected) / Math.abs(expected);
  return {
    levelId: level.levelId,
    h: level.h,
    elementCount: run.meshEvidence.mesh.elements.length,
    value: probe.authoritativeValue,
    relativeError,
  };
}

const results = { T6: [], Q8: [] };
for (const method of ['T6', 'Q8']) {
  for (const level of supplementaryLevels) {
    try {
      results[method].push(measure(method, level));
    } catch (error) {
      results[method].push({ levelId: level.levelId, h: level.h, failed: error.code ?? error.message });
    }
  }
}

function trend(rows) {
  const usable = rows.filter((row) => Number.isFinite(row.relativeError));
  if (usable.length < 2) return { classification: 'INSUFFICIENT_DATA' };
  const errors = usable.map((row) => row.relativeError);
  let monotonic = true;
  for (let i = 1; i < errors.length; i += 1) if (!(errors[i] < errors[i - 1])) monotonic = false;
  const first = errors[0];
  const last = errors.at(-1);
  return {
    classification: monotonic ? 'MONOTONICALLY_DECREASING' : 'NOT_MONOTONIC',
    firstErrorPercent: Number((first * 100).toFixed(4)),
    lastErrorPercent: Number((last * 100).toFixed(4)),
    stillOverToleranceAtFinest: last > tolerance,
  };
}

console.log(JSON.stringify({
  schema: 'lafea-b02b-supplementary-convergence-study/v1',
  note: 'Diagnostic-only: does not modify or supersede any frozen/amended B02B definition or ' +
    'scripts/lafea-b02b-production-check.mjs, which continues to enforce only the frozen 3-level ladder.',
  probeId,
  expectedValueV2Corrected: expected,
  frozenToleranceRelative: tolerance,
  T6: { levels: results.T6, trend: trend(results.T6) },
  Q8: { levels: results.Q8, trend: trend(results.Q8) },
}, null, 2));

function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}
