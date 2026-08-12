import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout = fs.readFileSync('src/lfea/standalone-layout.js', 'utf8');
const runtime = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
const api = fs.readFileSync('src/lfea/standalone-runtime-api.js', 'utf8');

assert.match(layout, /lfea-native-verification-root/u,
  'Standalone layout must retain a dedicated native piping Verification root.');
assert.match(runtime, /createLfeaNativeVerificationController/u,
  'Standalone runtime must compose the native Verification controller.');
assert.match(runtime, /this\.layout\.nativeVerificationRoot/u,
  'Native Verification must mount into its dedicated root, not the element-FEA workbench root.');
assert.match(runtime, /this\.verificationController\.refresh\(/u,
  'Standalone currentness refresh must refresh native Verification evidence.');
assert.match(runtime, /this\.verificationController\.destroy\(\)/u,
  'Standalone destruction must destroy native Verification state and listeners.');
assert.match(api, /getNativeVerification/u,
  'Public API must expose native Verification distinctly from the element-FEA workbench.');
assert.match(api, /createNativeEvidenceDossier/u,
  'Public API must expose current-only evidence dossier creation through the runtime boundary.');

console.log(JSON.stringify({
  check: 'lfea-standalone-native-verification-composition',
  status: 'PASS',
  dedicatedRoot: true,
  runtimeComposed: true,
  currentnessRefresh: true,
  publicApiSeparated: true,
}));
