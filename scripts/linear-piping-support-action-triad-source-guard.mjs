import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TRIAD_ROOT = path.join(ROOT, 'src/core/linear-piping-support-action-triad');
const TRIAD_SOURCE = fs.readFileSync(path.join(TRIAD_ROOT, 'triad.js'), 'utf8');

assert.doesNotMatch(TRIAD_SOURCE, /from\s+['"][^'"]*linear-piping-interface[^'"]*['"]/u);
assert.doesNotMatch(TRIAD_SOURCE, /from\s+['"][^'"]*centerline-beam-fea[^'"]*['"]/u);
assert.match(TRIAD_SOURCE, /forceGlobal/u);
assert.match(TRIAD_SOURCE, /cross\(upUnit, axialUnit\)/u);
assert.match(TRIAD_SOURCE, /cross\(axialUnit, lateralUnit\)/u);
assert.match(TRIAD_SOURCE, /BLOCKED_AXIS_DEGENERATE/u);
assert.match(TRIAD_SOURCE, /AXIAL_PARALLEL_TO_VERTICAL/u);

for (const file of javascriptFiles(path.join(ROOT, 'src'))) {
  if (file.startsWith(`${TRIAD_ROOT}${path.sep}`)) continue;
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);
  assert.doesNotMatch(
    source,
    /\bf(?:Axial|Lateral|Vertical)\s*[:=][^\n;]*\bforceLocal\b/u,
    `${relative} must not relabel forceLocal as Fa/Fl/Fv.`,
  );
  assert.doesNotMatch(
    source,
    /\bf(?:Axial|Lateral|Vertical)\s*[:=][^\n;]*\bdot\s*\(/u,
    `${relative} must not independently derive Fa/Fl/Fv; use the triad authority.`,
  );
}

console.log('linear-piping-support-action-triad-source-guard: PASS');

function javascriptFiles(root) {
  const output = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...javascriptFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) output.push(full);
  }
  return output;
}
