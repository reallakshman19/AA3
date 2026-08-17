import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CORE = path.join(ROOT, 'src/core/local-attachment-correlation');
const files = fs.readdirSync(CORE).filter((name) => name.endsWith('.js')).sort();
assert.ok(files.length >= 6, 'Correlation core source set is incomplete.');

const forbidden = [
  'Math.random', 'Date.now(', 'performance.now(', 'new Date(',
  'node:fs', 'node:path', 'fetch(', 'XMLHttpRequest', 'WebSocket',
  'document.', 'window.', 'eval(', 'Function(',
  'WRC', 'Kellogg',
];
for (const name of files) {
  const source = fs.readFileSync(path.join(CORE, name), 'utf8');
  const lines = source.split(/\r?\n/).length;
  assert.ok(lines < 300, `${name} must remain below 300 lines; found ${lines}.`);
  assert.equal(/export\s+default\b/u.test(source), false, `${name} must use named exports.`);
  assert.deepEqual(externalImports(source), [], `${name} must use only relative imports.`);
  forbidden.forEach((token) => assert.equal(source.includes(token), false,
    `${name} contains forbidden production token ${token}.`));
}

const synthetic = fs.readFileSync(path.join(CORE, 'synthetic-profile.js'), 'utf8');
assert.match(synthetic, /engineeringUseAuthorized:\s*false/u);
assert.match(synthetic, /SYNTHETIC_QUALIFICATION_ONLY/u);
assert.doesNotMatch(synthetic, /engineeringUseAuthorized:\s*true/u);

const interpolation = fs.readFileSync(path.join(CORE, 'interpolation.js'), 'utf8');
assert.match(interpolation, /OUTSIDE_CORRELATION_DOMAIN/u);
assert.match(interpolation, /BILINEAR_NO_EXTRAPOLATION/u);

const bridge = fs.readFileSync(path.join(CORE, 'lafea2-bridge.js'), 'utf8');
assert.match(bridge, /combinedForceLocal/u);
assert.match(bridge, /combinedMomentLocal/u);
assert.match(bridge, /screeningRequestSemanticHash/u);
assert.match(bridge, /screeningResultPayloadSemanticHash/u);
assert.doesNotMatch(bridge, /mechanicalTerms\s*\[\s*\d+/u);

console.log(JSON.stringify({
  check: 'lafea-correlation-source-authority',
  status: 'PASS',
  files,
  licensedMethodDataEmbedded: false,
  syntheticEngineeringAuthority: false,
  extrapolationAuthorized: false,
  lafea2SourceCustodyRetained: true,
}));

function externalImports(source) {
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/gu)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith('.'));
}
