#!/usr/bin/env node

/**
 * Static anti-drift guard for the StagedJSON -> InputXML conversion
 * engine (src/core/geometry/adapters/stagedjson-to-inputxml-*.js).
 * Mirrors the forbidden-pattern/line-ceiling convention in
 * linear-piping-analysis-consumer-anti-drift-check.mjs, scoped to what's
 * actually relevant for this module family: this is conversion
 * orchestration glue (launch Python, pass messages), not engineering-
 * authority derivation, so it does not carry over that file's
 * domain-specific engineering-default/reimplementation guards verbatim.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/core/geometry/adapters');
const FILE_NAMES = [
  'stagedjson-to-inputxml-argv.js',
  'stagedjson-to-inputxml-worker.js',
  'stagedjson-to-inputxml-worker-client.js',
];
const files = FILE_NAMES.map((name) => path.join(ROOT, name));
const source = Object.fromEntries(
  files.map((file) => [path.basename(file), fs.readFileSync(file, 'utf8')]),
);

const LINE_CEILINGS = {
  'stagedjson-to-inputxml-argv.js': 120,
  'stagedjson-to-inputxml-worker.js': 220,
  'stagedjson-to-inputxml-worker-client.js': 150,
};

const forbidden = [
  ['RANDOM_IDENTITY', /Math\.random|randomUUID/u],
  ['LOCALE_ORDERING', /localeCompare/u],
  // The job directory this worker writes StagedJSON/InputXML into on
  // Pyodide's virtual FS must be derived from the message's own
  // requestId, not from wall-clock time -- a Date.now()-based path was
  // the original (fixed) form of exactly the RANDOM_IDENTITY problem
  // above, so it's called out by name too.
  ['NON_DETERMINISTIC_JOB_DIR', /Date\.now\(\)/u],
];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const name = path.basename(file);
  const lines = text.split(/\r?\n/u).length;
  assert.ok(lines < LINE_CEILINGS[name], `${name} has ${lines} physical lines; limit is <${LINE_CEILINGS[name]}`);
  forbidden.forEach(([code, pattern]) => {
    assert.doesNotMatch(text, pattern, `${code}: ${file}`);
  });
}

// The Pyodide job directory must be keyed by the RUN message's own
// requestId (regression guard for the fix that replaced Date.now()/
// Math.random() naming).
assert.match(source['stagedjson-to-inputxml-worker.js'], /jobDir\s*=\s*`\/work\/\$\{sanitizeFileName\(requestId\)\}`/u);
assert.match(source['stagedjson-to-inputxml-worker.js'], /runConversion\(\{[\s\S]*?requestId:\s*request\.requestId\s*\}\)/u);

// Vendored assets must resolve against the app's configured base URL,
// not a relative import.meta.url path -- a relative path would silently
// break only in the production build, where Vite relocates this worker
// file, never in dev (regression guard, see the code's own comment).
assert.match(source['stagedjson-to-inputxml-worker.js'], /import\.meta\.env\.BASE_URL/u);

// Worker message protocol tokens must stay present -- this is the exact
// contract stagedjson-to-inputxml-worker-client-check.mjs's FakeWorker
// drives against.
for (const messageType of ['RUN', 'COMPLETE', 'FAILURE']) {
  assert.match(source['stagedjson-to-inputxml-worker.js'], new RegExp(`['"]${messageType}['"]`, 'u'));
  assert.match(source['stagedjson-to-inputxml-worker-client.js'], new RegExp(`['"]${messageType}['"]`, 'u'));
}

// SCRIPT_FILE_NAMES (the list of files the worker fetches at runtime)
// must exactly match what's actually vendored on disk -- a renamed,
// added, or removed script would otherwise only break the browser path,
// silently, at first real use.
const scriptFileNamesMatch = source['stagedjson-to-inputxml-worker.js'].match(
  /SCRIPT_FILE_NAMES = Object\.freeze\(\[([^\]]*)\]\)/u,
);
assert.ok(scriptFileNamesMatch, 'Expected a SCRIPT_FILE_NAMES declaration in the worker.');
const declaredScriptFileNames = [...scriptFileNamesMatch[1].matchAll(/'([^']+)'/gu)].map((m) => m[1]).sort();
const vendoredScriptFileNames = fs.readdirSync(path.resolve('public/vendor/stagedjson-to-inputxml-scripts'))
  .filter((name) => name.endsWith('.py'))
  .sort();
assert.deepEqual(declaredScriptFileNames, vendoredScriptFileNames, 'SCRIPT_FILE_NAMES drifted from the vendored script directory listing.');

// The client's public surface (this repo's established
// run/isRunning/cancel/destroy worker-lifecycle convention).
assert.match(source['stagedjson-to-inputxml-worker-client.js'], /export function createStagedJsonToInputXmlWorkerClient/u);
for (const member of ['convert', 'cancel', 'isRunning', 'destroy']) {
  assert.match(source['stagedjson-to-inputxml-worker-client.js'], new RegExp(`\\b${member}\\b`, 'u'));
}
// The Worker factory is injectable -- the seam every check/test in this
// family (and stagedjson-to-inputxml-worker-client-check.mjs) relies on
// to avoid needing a real browser Worker.
assert.match(source['stagedjson-to-inputxml-worker-client.js'], /createStagedJsonToInputXmlWorkerClient\(workerFactory\)/u);

// package.json wiring: the umbrella check script must exist, chain all
// five sibling checks, and be reachable from `gate`.
const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const umbrella = packageJson.scripts['check:stagedjson-to-inputxml'];
assert.ok(umbrella, 'Expected a check:stagedjson-to-inputxml npm script.');
for (const scriptName of [
  'stagedjson-to-inputxml-argv-check.mjs',
  'stagedjson-to-inputxml-worker-client-check.mjs',
  'stagedjson-to-inputxml-python-check.mjs',
  'stagedjson-to-inputxml-vendor-check.mjs',
  'stagedjson-to-inputxml-anti-drift-check.mjs',
]) {
  assert.ok(umbrella.includes(scriptName), `check:stagedjson-to-inputxml must chain ${scriptName}`);
}
assert.ok(packageJson.scripts.gate.includes('check:stagedjson-to-inputxml'), 'gate must run check:stagedjson-to-inputxml.');

console.log(JSON.stringify({
  check: 'stagedjson-to-inputxml-anti-drift',
  status: 'PASS',
}));
