/**
 * The high-value governance check for the StagedJSON -> InputXML
 * converter: runs the exact vendored `python3` files (not a copy) against
 * the real public/Sjson.json fixture, then feeds the resulting InputXML
 * text into the real, completely unmodified inputXmlToCanonicalGeometry
 * adapter -- the automated version of the manual proof already run once
 * by hand: real Python, real vendored bytes, real downstream pipeline, no
 * mocks anywhere in the chain. This is what actually proves the vendored
 * files still behave correctly; stagedjson-to-inputxml-worker-client-check
 * only proves the JS message-passing wrapper around them is wired right.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inputXmlToCanonicalGeometry } from '../src/core/geometry/adapters/inputXmlToCanonicalGeometry.js';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scriptsDir = path.join(repoRoot, 'public', 'vendor', 'stagedjson-to-inputxml-scripts');
const converterScript = path.join(scriptsDir, 'stagedjson_to_inputxml.py');
const sjsonFixture = path.join(repoRoot, 'public', 'Sjson.json');

for (const requiredFile of [
  'stagedjson_to_inputxml.py',
  'stagedjson_inputxml_diagnostics.py',
  'support_restraint.py',
  'inputxml_bookmark.py',
]) {
  assert.ok(
    fs.existsSync(path.join(scriptsDir, requiredFile)),
    `Expected vendored converter file ${requiredFile} to exist at ${scriptsDir}.`,
  );
}
assert.ok(fs.existsSync(sjsonFixture), `Expected the real fixture at ${sjsonFixture}.`);

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stagedjson-to-inputxml-check-'));
const outputPath = path.join(workDir, 'Sjson_check.xml');
const diagnosticsPath = path.join(workDir, 'Sjson_check_stagedjson_to_inputxml_diagnostics.json');

try {
  execFileSync('python3', [
    converterScript,
    '--input', sjsonFixture,
    '--output', outputPath,
    '--job-name', 'stagedjson_to_inputxml_check',
    '--infer-od-from-nominal-bore',
  ], {
    stdio: 'pipe',
    // Importing sibling modules from the vendored scripts directory would
    // otherwise write __pycache__/*.pyc bytecode files into that tree as
    // a side effect of every check run, dirtying the working tree and the
    // vendor-manifest hash. The vendored files are read-only source, not
    // a place this check should be writing to.
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });
} catch (error) {
  throw new Error(`Real python3 conversion failed: ${error.stderr?.toString() || error.message}`);
}

// 1. Real CAESAR II InputXML came out, not a placeholder or partial write.
const inputXmlText = fs.readFileSync(outputPath, 'utf8');
assert.match(inputXmlText, /<CAESARII[^>]*XML_TYPE="Input"/);
assert.match(inputXmlText, /<PIPINGELEMENT /);
const elementMatchCount = (inputXmlText.match(/<PIPINGELEMENT /g) ?? []).length;
assert.ok(elementMatchCount > 0, 'Expected at least one PIPINGELEMENT in the converted XML.');

// 2. Structured diagnostics were written, and the run is clean (0 errors)
// against this real, real-world fixture -- not just "didn't crash".
assert.ok(fs.existsSync(diagnosticsPath), 'Expected a diagnostics sidecar next to the converted XML.');
const diagnostics = JSON.parse(fs.readFileSync(diagnosticsPath, 'utf8'));
assert.equal(diagnostics.outputReady, true);
assert.equal(diagnostics.summary.error, 0);
assert.equal(diagnostics.summary.total, diagnostics.records.length);

// 3. The converted XML flows, unmodified, through the real InputXML
// pipeline this app already ships -- the actual point of Phase 3.
const canonicalGeometry = inputXmlToCanonicalGeometry(inputXmlText, { unit: 'mm' });
assert.equal(canonicalGeometry.schemaVersion, 'canonical-geometry-v1');
assert.ok(canonicalGeometry.segments.length > 0, 'Expected at least one segment in the canonical geometry.');
assert.equal(canonicalGeometry.segments.length, elementMatchCount);
assert.ok(
  Object.keys(canonicalGeometry.nodes).length >= canonicalGeometry.segments.length,
  'Expected at least as many nodes as segments.',
);

fs.rmSync(workDir, { recursive: true, force: true });

console.log(JSON.stringify({
  check: 'stagedjson-to-inputxml-python',
  status: 'PASS',
  elementCount: elementMatchCount,
  segmentCount: canonicalGeometry.segments.length,
  diagnosticsTotal: diagnostics.summary.total,
  diagnosticsErrors: diagnostics.summary.error,
}));
