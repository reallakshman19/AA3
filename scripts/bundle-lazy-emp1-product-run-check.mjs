#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const productSource = fs.readFileSync('src/workspace/emp1-workbench-product-run.js', 'utf8');
const executionSource = fs.readFileSync(
  'src/workspace/emp1-workbench-product-execution.js',
  'utf8',
);
const controllerSource = fs.readFileSync('src/workspace/lafea-workbench-controller.js', 'utf8');
const viteSource = fs.readFileSync('vite.config.js', 'utf8');
const chunkPolicySource = fs.readFileSync('scripts/bundle-chunk-check.mjs', 'utf8');

const authorityStart = productSource.indexOf(
  'export function currentEmp1WorkbenchRouteAuthority() {',
);
const authorityEnd = productSource.indexOf('\n\nfunction uniqueSorted', authorityStart);
assert.ok(authorityStart >= 0 && authorityEnd > authorityStart,
  'The single currentEmp1WorkbenchRouteAuthority owner must remain in product-run.');
const authorityFunctionSource = productSource.slice(authorityStart, authorityEnd);
const authorityFunctionSha256 = crypto
  .createHash('sha256')
  .update(authorityFunctionSource)
  .digest('hex');

// Frozen from merged-main 6e6c4062fffbd173aa9c4d2a2b34c2586df47f4e before LEG-002.
assert.equal(
  authorityFunctionSha256,
  '74f6ebdacfff23d14dd12262b23535f49dc901538c4cbfa013cc458666c3d197',
  'LEG-002 must not mutate currentEmp1WorkbenchRouteAuthority decision/payload/hash source.',
);

assert.match(
  productSource,
  /export async function executeEmp1WorkbenchProduct\(options = \{\}\)[\s\S]*await import\(\s*['"]\.\/emp1-workbench-product-execution\.js['"]\s*\)/u,
  'The public EMP.1 product API must lazy-load its heavy implementation.',
);
assert.match(
  productSource,
  /executeEmp1WorkbenchProductTransaction\(\s*options,\s*currentEmp1WorkbenchRouteAuthority,\s*EMP1_WORKBENCH_RETAINED_C_EVIDENCE_SCHEMA/u,
  'The lazy transaction must receive the existing authority resolver and retained-evidence schema.',
);
assert.doesNotMatch(
  productSource,
  /from ['"]\.\.\/core\/emp1\/index\.js['"]/u,
  'The eager authority owner must not import the complete EMP.1 execution barrel.',
);
assert.doesNotMatch(
  productSource,
  /from ['"]\.\/lafea-workbench-model\.js['"]/u,
  'The eager authority owner must not import LAFEA stage execution.',
);

assert.match(executionSource, /from ['"]\.\.\/core\/emp1\/index\.js['"]/u);
assert.match(executionSource, /from ['"]\.\/lafea-workbench-model\.js['"]/u);
assert.match(
  executionSource,
  /export async function executeEmp1WorkbenchProductTransaction\(/u,
);
assert.doesNotMatch(
  executionSource,
  /from ['"]\.\/emp1-workbench-product-run\.js['"]/u,
  'The lazy implementation must not statically import its eager owner.',
);
assert.doesNotMatch(
  executionSource,
  /import\(\s*['"]\.\/emp1-workbench-product-run\.js['"]\s*\)/u,
  'The lazy implementation must not dynamically import its eager owner.',
);
assert.match(
  executionSource,
  /const routeAuthority = currentRouteAuthority\(\);/u,
  'The transaction must resolve live route authority through the injected existing owner.',
);

assert.match(
  controllerSource,
  /import \{ currentEmp1WorkbenchRouteAuthority \} from ['"]\.\/emp1-workbench-product-run\.js['"]/u,
  'The synchronous UI authority projection must keep using the existing product-run owner.',
);
assert.match(
  controllerSource,
  /await import\(['"]\.\/emp1-workbench-product-run\.js['"]\)/u,
  'The controller product transaction entry remains asynchronous.',
);

assert.equal(
  viteSource.includes('emp1-workbench-product-execution.js'),
  false,
  'LEG-002 must establish laziness through source imports, not a forced manual chunk.',
);
assert.equal(chunkPolicySource.includes('const maximumBytes = 1.125 * 1024 * 1024;'), true);

console.log(JSON.stringify({
  check: 'bundle-lazy-emp1-product-run',
  status: 'PASS',
  authorityOwner: 'src/workspace/emp1-workbench-product-run.js',
  authorityFunctionSha256,
  lazyImplementation: 'src/workspace/emp1-workbench-product-execution.js',
  manualChunkMutation: false,
  chunkSizeSafetyCeilingBytes: 1.125 * 1024 * 1024,
}));
