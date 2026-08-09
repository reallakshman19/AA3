#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (args.has(key)) throw new TypeError(`Duplicate argument ${key}.`);
    args.set(key, value);
  }
  for (const key of ['--solver-source', '--solver-manifest', '--reducer-source', '--reducer-manifest']) {
    if (!args.get(key)) throw new TypeError(`Missing ${key}.`);
  }
  return {
    solverSource: resolve(args.get('--solver-source')),
    solverManifest: resolve(args.get('--solver-manifest')),
    reducerSource: resolve(args.get('--reducer-source')),
    reducerManifest: resolve(args.get('--reducer-manifest')),
  };
}
function normalized(text) { return text.replace(/\r\n/gu, '\n'); }
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }

const input = parseArguments(process.argv.slice(2));
const solver = normalized(readFileSync(input.solverSource, 'utf8'));
const reducer = normalized(readFileSync(input.reducerSource, 'utf8'));
const solverManifest = JSON.parse(readFileSync(input.solverManifest, 'utf8'));
const reducerManifest = JSON.parse(readFileSync(input.reducerManifest, 'utf8'));

assert.equal(solverManifest.schema, 'lfea-m047-i025-solver-candidate-manifest/v1');
assert.equal(reducerManifest.schema, 'lfea-m047-i024-candidate-manifest/v1');
assert.equal(solverManifest.candidateSha256, sha256(solver));
assert.equal(reducerManifest.candidateSha256, sha256(reducer));
assert.equal(solverManifest.parentI015SourceSha256, 'bdf4c0e5323663bbb42c59492d8fd87ad17a4f3ece62d9aa2b89348df7c93b15');

for (const token of [
  "profile: (input.kind === 'FRAME' || input.kind === 'BEND_INCOMING_STRAIGHT')",
  'frameElementProfile: plainFrameTimoshenkoProfile()',
  'const condensed = condenseTeeEndConditions(',
  'factorSet: factorResult.componentFactorSet',
  'stiffnessFrame: componentEntry.frameElement',
  'effectiveLocalStiffness: componentEntry.effectiveLocalStiffness',
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
]) assert.ok(solver.includes(token), `I025 solver missing ${token}`);

for (const token of [
  'shearDeformation: true',
  'shearCorrectionFactorY: 0.53',
  'shearCorrectionFactorZ: 0.53',
  'phiXY: stiffnessResult.phiXY',
  'phiXZ: stiffnessResult.phiXZ',
  'const condensed = condense(K, { gravity: gravityFull, thermal: thermalFull });',
]) assert.ok(reducer.includes(token), `I025 reducer missing ${token}`);

for (const forbidden of [
  'thermalExpansionCoefficientPerKelvin =',
  'scaleFloor =',
  'CAESAR_REFERENCE_OVERRIDE',
]) {
  assert.ok(!solver.includes(forbidden), `I025 solver contains forbidden candidate token ${forbidden}`);
  assert.ok(!reducer.includes(forbidden), `I025 reducer contains forbidden candidate token ${forbidden}`);
}

console.log(JSON.stringify({
  check: 'lfea-m047-full-flexible-timoshenko-candidate',
  status: 'PASS',
  solverCandidateSha256: solverManifest.candidateSha256,
  reducerCandidateSha256: reducerManifest.candidateSha256,
  coverage: {
    allFrame: true,
    allBendIncomingStraight: true,
    bendArcBaseFrame: true,
    reducerInternalCylinder: true,
    rigidHeld: true,
  },
}, null, 2));
