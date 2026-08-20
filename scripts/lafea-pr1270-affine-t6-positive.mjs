#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const sourcePath = 'scripts/lafea-pr1270-affine-metric-screen.mjs';
const tempPath = 'scripts/.lafea-pr1270-affine-t6-positive.tmp.mjs';
const original = fs.readFileSync(sourcePath, 'utf8');
let patched = original.replace("const families = ['T3'];", "const families = ['T6'];");
assert.notEqual(patched, original, 'T6 family patch anchor missing');
const geometryStart = patched.indexOf('const geometries = [');
const geometryEnd = patched.indexOf('];', geometryStart);
assert.ok(geometryStart >= 0 && geometryEnd > geometryStart, 'T6 affine geometry block anchors missing');
const geometryBlock = `const geometries = [
  affineRegion('ROTATED_30', 200, 120, 90, 30, 'POSITIVE_ROTATION_INVARIANCE'),
  affineRegion('SHEAR_75', 200, 120, 75, 0, 'POSITIVE_MARGINAL'),
];`;
patched = patched.slice(0, geometryStart) + geometryBlock + patched.slice(geometryEnd + 2);
patched = patched.replace(
  "check: 'PR1270_AFFINE_BALANCED_METRIC_SCREEN_V1'",
  "check: 'PR1270_AFFINE_T6_POSITIVE_ENVELOPE_V1'",
);
patched = patched.replace(
  "assert.ok(negativeBlocks.length > 0, '65-degree negative control did not trigger a production quality BLOCK');",
  "assert.equal(negativeBlocks.length, 0, 'positive-only T6 envelope unexpectedly contains a negative-control row');",
);

try {
  fs.writeFileSync(tempPath, patched);
  const run = spawnSync(process.execPath, [tempPath], { encoding: 'utf8' });
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  assert.equal(run.status, 0, `T6 affine positive-envelope qualification exited ${run.status}`);
} finally {
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
}
