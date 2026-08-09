#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_I015_SOURCE_SHA256 = 'bdf4c0e5323663bbb42c59492d8fd87ad17a4f3ece62d9aa2b89348df7c93b15';
const SELECTION = `(input.kind === 'FRAME' || input.kind === 'BEND_INCOMING_STRAIGHT')\n      && teeModifier === null`;

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
if (manifest.schema !== 'lfea-m047-i021-candidate-manifest/v1') throw new TypeError('I021 manifest schema drifted.');
if (manifest.parentI015SourceSha256 !== EXPECTED_I015_SOURCE_SHA256) throw new Error('I021 parent I015 source hash drifted.');
if (sha256(source) !== manifest.candidateSha256) throw new Error('I021 candidate source hash does not match manifest.');
if (count(source, SELECTION) !== 1) throw new Error(`I021 exact selection boundary count drifted: ${count(source, SELECTION)}.`);
if (!source.includes("straightPipeFormulation: 'PIPE_FRAME3D_TIMOSHENKO_V1'")) throw new Error('I021 lost Timoshenko formulation authority.');
if (!source.includes("shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }")) throw new Error('I021 kappa-Y authority drifted.');
if (!source.includes("shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }")) throw new Error('I021 kappa-Z authority drifted.');

const selectionStart = source.indexOf('profile: (input.kind');
const selectionEnd = source.indexOf('frameProfile(),', selectionStart);
if (selectionStart < 0 || selectionEnd < 0) throw new Error('I021 profile selection fragment is missing.');
const selectionFragment = source.slice(selectionStart, selectionEnd);
if (selectionFragment.includes('BEND_ARC')) throw new Error('I021 selection leaked into BEND_ARC.');
if (!source.includes("kind: 'BEND_ARC'")) throw new Error('I021 bend-arc carrier construction is missing.');
for (const token of [
  'stiffnessFrame: componentEntry.frameElement',
  'effectiveLocalStiffness: componentEntry.effectiveLocalStiffness',
  'effectiveGlobalStiffness: componentEntry.effectiveGlobalStiffness',
]) {
  if (!source.includes(token)) throw new Error(`I021 bend-arc ownership token missing: ${token}.`);
}

const delta = manifest.mechanicsDelta;
for (const [field, expected] of Object.entries({
  bendIncomingStraightsChanged: true,
  teeModifiedBendIncomingStraightsChanged: false,
  bendArcsChanged: false,
  teesChanged: false,
  reducersChanged: false,
  rigidsChanged: false,
  bourdonChanged: false,
  pressureChanged: false,
  thermalAuthorityChanged: false,
  toleranceChanged: false,
})) {
  if (delta?.[field] !== expected) throw new Error(`I021 manifest ${field} drifted from ${expected}.`);
}

process.stdout.write(`M047 I021 boundary check PASS ${manifest.parentI015SourceSha256} -> ${manifest.candidateSha256}\n`);
