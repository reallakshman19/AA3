#!/usr/bin/env node

/**
 * UI00 custody gate for the LFEA engineering-session/UI program.
 *
 * This deliberately freezes the engineering-authority seam, not the current
 * controller-precedence UI defect. UI01+ may change workspace presentation
 * ownership, but must not silently change source parsing, governed pre-flight,
 * solve authorization, production execution/recovery, or conversion mechanics.
 *
 * The expected values are Git blob identities from main@
 * a222e18c38bd20fb55c1c6c95f724f40e40e8532, captured before any production
 * implementation in PR #1322. Updating one is an engineering-authority change
 * requiring explicit re-grounding and independent review; it is not normal
 * maintenance for a presentation refactor.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_MAIN = 'a222e18c38bd20fb55c1c6c95f724f40e40e8532';

const FROZEN_AUTHORITY = Object.freeze([
  ['src/workspace/linear-piping-inputxml-prefea.js', 'e6905dae832bc7efaef804c3756570f2e92d9892', 'governed pre-flight wrapper'],
  ['src/workspace/linear-piping-accdb-intake.js', '1cf14aacbded4fea5380312550d4884d7353989a', 'ACCDB governed intake bridge'],
  ['src/lfea/native-execution-authority.js', '8bb52b9df81876e0dee3af63566a1112c2e45ed0', 'native execution currentness/authority'],
  ['src/core/linear-piping-analysis-consumer/inputxml-source-binding.js', 'b191ef26897e17fc38bae1c396cf03c848aaa5ca', 'InputXML source binding'],
  ['src/core/linear-piping-analysis-consumer/accdb-source-binding.js', '0c777a1a78d84348f3506e6123f30df72c3989f4', 'ACCDB source binding'],
  ['src/core/geometry/adapters/accdb-to-canonical-geometry.js', '05c281085913f6b6f629582424a43e64bd16fa46', 'ACCDB canonical geometry'],
  ['src/core/geometry/adapters/stagedjson-to-inputxml-worker-client.js', 'f7c3e1dedb115b2626850f7f93c4012c0c3f59d0', 'StagedJSON conversion execution client'],
  ['src/core/linear-piping-analysis-consumer/inputxml-linear-solve-authorization.js', 'f13b39983b9a19ba33be9ec38639626f9492bab2', 'solve authorization'],
  ['src/core/linear-piping-analysis-consumer/inputxml-linear-governed-solve.js', '0a33cb013c9cb18440dd0732cfdb44191719ba05', 'authorization-only solve gateway'],
  ['src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js', '5f55011d14f56961fb125e0ebdba139cc3bbd992', 'production raw-case execution'],
  ['src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js', 'e4f1554605316d3c518cf3153a91dc21c6038fe7', 'production result recovery'],
]);

function gitBlobSha(filePath) {
  const bytes = readFileSync(path.join(ROOT, filePath));
  return createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
}

for (const [filePath, expectedBlob, role] of FROZEN_AUTHORITY) {
  assert.equal(
    gitBlobSha(filePath),
    expectedBlob,
    `${role} drifted during the UI-only program: ${filePath}`,
  );
}

// Negative-assurance checks explain why these frozen files are safety
// significant rather than treating their hashes as unexplained golden data.
const authorization = readFileSync(path.join(
  ROOT,
  'src/core/linear-piping-analysis-consumer/inputxml-linear-solve-authorization.js',
), 'utf8');
assert.match(authorization, /INVALIDATE_ON_PARENT_IDENTITY_CHANGE/u);
assert.match(authorization, /PREFEA_BLOCK_OVERRIDE_PROHIBITED/u);

const governedSolve = readFileSync(path.join(
  ROOT,
  'src/core/linear-piping-analysis-consumer/inputxml-linear-governed-solve.js',
), 'utf8');
assert.match(governedSolve, /PREFEA_WARN_REQUIRES_EXPLICIT_APPROVER/u);
assert.match(governedSolve, /requireInputXmlLinearSolveAuthorization/u);

const nativeExecution = readFileSync(path.join(ROOT, 'src/lfea/native-execution-authority.js'), 'utf8');
assert.match(nativeExecution, /requireLinearPipingInputXmlPreFlight/u);
assert.match(nativeExecution, /preFlight\.solveAuthorized/u);
assert.match(nativeExecution, /parentIdentity\(preFlight\)/u);
assert.match(nativeExecution, /SOURCE_OR_PREFLIGHT_CLEARED/u);

const accdbIntake = readFileSync(path.join(ROOT, 'src/workspace/linear-piping-accdb-intake.js'), 'utf8');
assert.match(accdbIntake, /prepareLinearPipingInputXmlPreFlight/u);
assert.match(accdbIntake, /canonicalStringify\(modelTablePayload\(tables\)\)/u);

// Existing independent anti-drift families must remain reachable. UI00 adds
// no replacement oracle and no new engineering calculation.
const packageValue = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
for (const scriptName of [
  'check:linear-piping-analysis-consumer',
  'check:stagedjson-to-inputxml',
  'check:accdb-to-canonical-geometry',
  'check:lfea-pipeline-analysis',
]) {
  assert.ok(packageValue.scripts[scriptName], `Missing existing authority guard ${scriptName}.`);
}

// This check is deliberately chained through the already-governed pipeline
// step-guidance check, which is already part of check:lfea-workbench. No
// package.json or workflow mutation is needed merely to add the custody gate.
const guidanceCheck = readFileSync(path.join(ROOT, 'scripts/lfea-pipeline-step-guidance-check.mjs'), 'utf8');
assert.match(guidanceCheck, /lfea-ui-numerical-custody-check\.mjs/u,
  'UI00 custody gate must remain wired through the existing LFEA workbench check path.');

console.log(JSON.stringify({
  check: 'lfea-ui-numerical-custody',
  status: 'PASS',
  baselineMain: BASE_MAIN,
  frozenAuthorityFiles: FROZEN_AUTHORITY.length,
  numericalAuthorityChanged: false,
  presentationPrecedenceFrozen: false,
}));
