#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const sourcePath = 'scripts/lafea-pr1270-affine-metric-screen.mjs';
const tempPath = 'scripts/.lafea-pr1270-affine-angle-boundary.tmp.mjs';
const original = fs.readFileSync(sourcePath, 'utf8');
const geometryStart = original.indexOf('const geometries = [');
const geometryEnd = original.indexOf('];', geometryStart);
assert.ok(geometryStart >= 0 && geometryEnd > geometryStart, 'affine geometry block anchors missing');

const geometryBlock = `const geometries = [
  affineRegion('SHEAR_60', 200, 120, 60, 0, 'NEGATIVE_CONTROL'),
  affineRegion('SHEAR_55', 200, 120, 55, 0, 'NEGATIVE_CONTROL'),
];`;
let patched = original.slice(0, geometryStart) + geometryBlock + original.slice(geometryEnd + 2);
patched = patched.replace(
  "check: 'PR1270_AFFINE_BALANCED_METRIC_SCREEN_V1'",
  "check: 'PR1270_AFFINE_60_55_BOUNDARY_SWEEP_V1'",
);

try {
  fs.writeFileSync(tempPath, patched);
  const run = spawnSync(process.execPath, [tempPath], { encoding: 'utf8' });
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  assert.equal(run.status, 0, `60/55 affine boundary sweep exited ${run.status}`);
} finally {
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
}
