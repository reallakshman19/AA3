#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_I015_SOURCE_SHA256 = 'bdf4c0e5323663bbb42c59492d8fd87ad17a4f3ece62d9aa2b89348df7c93b15';
const SELECTION = `profile: input.kind === 'FRAME'\n      ? plainFrameTimoshenkoProfile()\n      : frameProfile(),`;

function normalized(text) { return text.replace(/\r\n/gu, '\n'); }
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }
function count(text, needle) { return text.split(needle).length - 1; }

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
  args.set(key, value);
}
const sourcePath = args.get('--source');
const manifestPath = args.get('--manifest');
if (!sourcePath || !manifestPath) throw new TypeError('Usage: --source <solver.js> --manifest <manifest.json>.');
const source = normalized(readFileSync(resolve(sourcePath), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
if (manifest.schema !== 'lfea-m047-i023-candidate-manifest/v1') throw new TypeError('I023 manifest schema drifted.');
if (manifest.parentI015SourceSha256 !== EXPECTED_I015_SOURCE_SHA256) throw new Error('I023 parent I015 source hash drifted.');
if (sha256(source) !== manifest.candidateSha256) throw new Error('I023 candidate source hash does not match manifest.');
if (count(source, SELECTION) !== 1) throw new Error(`I023 exact FRAME selection count drifted: ${count(source, SELECTION)}.`);
if (source.includes("input.kind === 'FRAME' && teeModifier === null")) throw new Error('I023 still contains the I015 tee exclusion.');

for (const token of [
  'const condensed = condenseTeeEndConditions(',
  'baseEffectiveLocalStiffness,',
  'baseEquivalentLocal,',
  'baseInitialLocal,',
  'teeModifier,',
  'teeJunctionNodeId: teeModifier?.junctionNodeId ?? null',
  "kind: 'BEND_INCOMING_STRAIGHT'",
  "kind: 'BEND_ARC'",
  "kind: 'REDUCER'",
  "straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'",
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
]) {
  if (!source.includes(token)) throw new Error(`I023 required ownership token missing: ${token}.`);
}
const delta = manifest.mechanicsDelta;
for (const [field, expected] of Object.entries({
  retainedI015OrdinaryFrameShear: true,
  teeModifiedFrameShear: true,
  teeModifiedBendIncomingStraightShear: false,
  teeCondensationCodeChanged: false,
  teeDirectionalFactorAuthorityChanged: false,
  teeRigidOffsetAuthorityChanged: false,
  bendMechanicsChanged: false,
  reducerMechanicsChanged: false,
  rigidMechanicsChanged: false,
  bourdonChanged: false,
  pressureLoadChanged: false,
  thermalAuthorityChanged: false,
  gravityLoadChanged: false,
  toleranceChanged: false,
})) {
  if (delta?.[field] !== expected) throw new Error(`I023 manifest ${field} drifted from ${expected}.`);
}
console.log(`M047 I023 boundary check PASS ${manifest.parentI015SourceSha256} -> ${manifest.candidateSha256}`);
