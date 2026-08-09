#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXPECTED_I015_SOURCE_SHA256 = 'bdf4c0e5323663bbb42c59492d8fd87ad17a4f3ece62d9aa2b89348df7c93b15';
const CARRIER_SELECTION = `(input.kind === 'FRAME' || input.kind === 'BEND_INCOMING_STRAIGHT')\n      && teeModifier === null`;
const BEND_PROFILE = `frameElementProfile: plainFrameTimoshenkoProfile(),\n      localAxisProfile: FRAME_LOCAL_AXIS_PROFILE,\n      referenceVector: null,\n      factorSet: factorResult.componentFactorSet`;

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
if (manifest.schema !== 'lfea-m047-i022-candidate-manifest/v1') throw new TypeError('I022 manifest schema drifted.');
if (manifest.parentI015SourceSha256 !== EXPECTED_I015_SOURCE_SHA256) throw new Error('I022 parent I015 source hash drifted.');
if (sha256(source) !== manifest.candidateSha256) throw new Error('I022 candidate source hash does not match manifest.');
if (count(source, CARRIER_SELECTION) !== 1) throw new Error(`I022 carrier selection count drifted: ${count(source, CARRIER_SELECTION)}.`);
if (count(source, BEND_PROFILE) !== 1) throw new Error(`I022 bend base-frame selection count drifted: ${count(source, BEND_PROFILE)}.`);

const carrierStart = source.indexOf('profile: (input.kind');
const carrierEnd = source.indexOf('frameProfile(),', carrierStart);
if (carrierStart < 0 || carrierEnd < 0) throw new Error('I022 analysis-carrier profile predicate is missing.');
const carrierFragment = source.slice(carrierStart, carrierEnd);
if (carrierFragment.includes('BEND_ARC')) throw new Error('I022 analysis-carrier predicate must not directly select BEND_ARC; arcs receive their base frame through the component compiler.');

for (const token of [
  "componentType: 'BEND'",
  'frameElementProfile: plainFrameTimoshenkoProfile()',
  'factorSet: factorResult.componentFactorSet',
  'stiffnessFrame: componentEntry.frameElement',
  'effectiveLocalStiffness: componentEntry.effectiveLocalStiffness',
  'effectiveGlobalStiffness: componentEntry.effectiveGlobalStiffness',
  "shearCorrectionFactorY: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
  "shearCorrectionFactorZ: { value: 0.53, source: 'COWPER-1966-THIN-ANNULUS-INPUT' }",
]) {
  if (!source.includes(token)) throw new Error(`I022 ownership token missing: ${token}.`);
}

const delta = manifest.mechanicsDelta;
for (const [field, expected] of Object.entries({
  retainedI015OrdinaryFrameShear: true,
  nonTeeBendIncomingStraightShear: true,
  teeModifiedBendIncomingStraightShear: false,
  bendArcBaseFrameShear: true,
  bendFlexibilityFactorCalculationChanged: false,
  bendFlexibilityCorrectionCodeChanged: false,
  bendPressureStiffeningChanged: false,
  bendSubdivisionChanged: false,
  teeMechanicsChanged: false,
  reducerMechanicsChanged: false,
  rigidMechanicsChanged: false,
  bourdonChanged: false,
  pressureLoadChanged: false,
  thermalAuthorityChanged: false,
  gravityLoadChanged: false,
  toleranceChanged: false,
})) {
  if (delta?.[field] !== expected) throw new Error(`I022 manifest ${field} drifted from ${expected}.`);
}

console.log(`M047 I022 boundary check PASS ${manifest.parentI015SourceSha256} -> ${manifest.candidateSha256}`);
