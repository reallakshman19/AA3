#!/usr/bin/env node

/**
 * Static anti-drift guard for Phase 6 (Verification/ACCDB-QA relocation):
 * the new persistent drawer must reuse the exact same FeaBenchmarkPanel/
 * CaesarAccdbBenchmarkPanel classes the continuum LFEA Workbench composed
 * inline before this phase, not a re-derived copy; the Workbench's own
 * instance must opt out of composing them a second time (default
 * unchanged for every other caller, e.g. the standalone lfea.html app);
 * and its T3/Q4 mesh-editing/solving code must stay untouched.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relativePath) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8');
}

const drawerSource = read('src/workspace/lfea-pipeline-verification-drawer.js');
const controllerSource = read('src/workspace/lfea-workbench-controller.js');
const bootstrapSource = read('src/workspace/bootstrap.js');
const viewSource = read('src/workspace/lfea-workbench-view.js');
const shellViewSource = read('src/workspace/lfea-pipeline-shell-view.js');
const iconManifestSource = read('src/workspace/lfea-pipeline-icon-manifest.js');

// The drawer must import and construct the real panel classes, not
// reimplement benchmark/ACCDB-comparison logic itself.
assert.match(drawerSource, /import\s*\{\s*FeaBenchmarkPanel\s*\}\s*from\s*'\.\/fea-benchmark-panel\.js'/u);
assert.match(drawerSource, /import\s*\{\s*CaesarAccdbBenchmarkPanel\s*\}\s*from\s*'\.\/caesar-accdb-benchmark-panel\.js'/u);
assert.match(drawerSource, /new FeaBenchmarkPanel\(/u);
assert.match(drawerSource, /new CaesarAccdbBenchmarkPanel\(/u);

// The Workbench controller must default to composing its own panels
// (composeQaBenchmarkPanels defaults true) so every caller other than the
// pipeline shell's own instance keeps its current, unchanged behavior --
// only workspace/bootstrap.js opts out.
assert.match(controllerSource, /composeQaBenchmarkPanels\s*\?\?\s*true/u);
assert.match(bootstrapSource, /new LfeaWorkbenchController\(lfeaRoot,\s*\{\s*composeQaBenchmarkPanels:\s*false\s*\}\)/u);
// The standalone runtime's own instance must not be touched by this phase.
const standaloneRuntimeSource = read('src/lfea/standalone-runtime.js');
assert.doesNotMatch(standaloneRuntimeSource, /composeQaBenchmarkPanels/u, 'The standalone lfea.html runtime must keep its default (inline) composition.');

// Panels stay constructed regardless of the flag (runBenchmark()/
// getBenchmarkReport() must keep working for every caller).
assert.match(controllerSource, /this\.benchmarkPanel = new FeaBenchmarkPanel\(/u);
assert.match(controllerSource, /this\.caesarAccdbBenchmarkPanel = new CaesarAccdbBenchmarkPanel\(/u);
assert.doesNotMatch(controllerSource, /runBenchmark\(\)\s*\{\s*if/u, 'runBenchmark() must not be gated by composeQaBenchmarkPanels -- the API stays available regardless.');

// The view's null-safe host rendering (if (this.benchmarkHost) {...}) must
// stay intact -- it is what makes the controller-side gating sufficient
// with zero view.js changes.
assert.match(viewSource, /if \(this\.benchmarkHost\)/u);
assert.match(viewSource, /if \(this\.caesarAccdbBenchmarkHost\)/u);

// T3/Q4 mesh-editing/solving code must be untouched by this phase --
// spot-check a handful of core mesh-domain methods are still present.
for (const method of ['loadFile', 'run(', 'undo()', 'redo()', 'downloadDocument()']) {
  assert.match(controllerSource, new RegExp(method.replace(/[()]/gu, '\\$&'), 'u'));
}

// Icon sprite install must guard against double-install by returning the
// existing sprite rather than throwing or duplicating it (this shell
// mounts/unmounts across tests and hot navigation more casually than the
// 3D-Edit surface this pattern is modeled on).
assert.match(iconManifestSource, /if \(existing\) return existing;/u);

// The drawer toggle must be wired into the shell's own toolbar (a
// persistent, always-reachable slot, not gated behind step content).
assert.match(shellViewSource, /lfea-pipeline-toggle-verification-drawer/u);
assert.match(shellViewSource, /getVerificationDrawerHost/u);

const forbidden = [
  ['RANDOM_IDENTITY', /Math\.random|randomUUID/u],
];
for (const [code, pattern] of forbidden) {
  for (const [name, source] of [['drawer', drawerSource], ['icon-manifest', iconManifestSource]]) {
    assert.doesNotMatch(source, pattern, `${code}: ${name}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
assert.ok(packageJson.scripts['check:lfea-pipeline-verification-drawer'], 'Expected a check:lfea-pipeline-verification-drawer npm script.');
assert.ok(packageJson.scripts.gate.includes('check:lfea-pipeline-verification-drawer'), 'gate must run check:lfea-pipeline-verification-drawer.');

console.log(JSON.stringify({
  check: 'lfea-pipeline-verification-drawer-anti-drift',
  status: 'PASS',
}));
