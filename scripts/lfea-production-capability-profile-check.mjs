#!/usr/bin/env node

/**
 * Stage S0 of the piping component promotion.
 *
 * Guards the single declared answer to "what can the production analysis path
 * represent", and the two ways that answer can go wrong: a limitation reported
 * for a capability that has been promoted, or a capability asserted with no
 * benchmark behind it. Both produce a panel that lies; the second is worse,
 * because it lies in the reassuring direction.
 *
 * See docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRODUCTION_CAPABILITY_PROFILE,
  PRODUCTION_CAPABILITY_PROFILE_SCHEMA,
  REPRESENTABLE_COMPONENT_KINDS,
  componentLimitationFor,
  productionAuthorizedPressureEffects,
  productionComponentLimitation,
} from '../src/core/linear-piping-analysis-consumer/production-capability-profile.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

assert.equal(PRODUCTION_CAPABILITY_PROFILE.schema, PRODUCTION_CAPABILITY_PROFILE_SCHEMA);

// --- 1. What production reports must follow from the profile ---
// Asserted against the profile rather than against today's literal answers, so
// a later stage that legitimately promotes a capability is not blocked here.
// The gate on promoting without evidence is sections 5 and 6, not this one.

const KIND_FLAGS = Object.freeze([
  ['BEND', 'bendExactMechanics', 'GENERIC_APPROX_BEND_STRAIGHT_CHORD'],
  ['REDUCER', 'reducerExactMechanics', 'GENERIC_APPROX_REDUCER_UNIFORM_SECTION'],
  ['TEE', 'teeExactMechanics', 'GENERIC_APPROX_TEE_FRAME_BRANCH_NO_FLEXIBILITY'],
]);

const effects = productionAuthorizedPressureEffects();
assert.equal(effects.codeStress, PRODUCTION_CAPABILITY_PROFILE.pressureCodeStress);
assert.equal(effects.pressureStiffening, PRODUCTION_CAPABILITY_PROFILE.pressureStiffening);
assert.equal(effects.axialThrust, PRODUCTION_CAPABILITY_PROFILE.pressureAxialThrust);
assert.equal(effects.bourdon, PRODUCTION_CAPABILITY_PROFILE.pressureBourdon);

for (const [kind, flag, code] of KIND_FLAGS) {
  assert.equal(productionComponentLimitation(kind),
    PRODUCTION_CAPABILITY_PROFILE[flag] === true ? null : code,
    `${kind} limitation must follow ${flag}.`);
}
assert.equal(productionComponentLimitation('STRAIGHT_PIPE'), null);
assert.equal(productionComponentLimitation('RIGID'), null);
assert.equal(productionComponentLimitation('VALVE'), null, 'An unrepresentable kind declares no limitation.');

// --- 2. Flipping one flag clears exactly one limitation ---

for (const [kind, flag] of KIND_FLAGS) {
  const promoted = { ...PRODUCTION_CAPABILITY_PROFILE, [flag]: true };
  assert.equal(componentLimitationFor(kind, promoted), null,
    `${flag} must clear the ${kind} limitation.`);
  // Isolation is asserted against the base profile rather than against "still
  // limited", so this stays correct once a capability is legitimately promoted.
  for (const [other] of KIND_FLAGS.filter((row) => row[0] !== kind)) {
    assert.equal(componentLimitationFor(other, promoted),
      componentLimitationFor(other, PRODUCTION_CAPABILITY_PROFILE),
      `${flag} must not change the ${other} limitation.`);
  }
}

// --- 3. Representable kinds and limitation kinds must stay in agreement ---
// "No limitation" means represented exactly for a representable kind, and not
// representable otherwise. A limitation for a kind outside the representable
// set would be unreachable.
for (const kind of ['BEND', 'REDUCER', 'TEE']) {
  assert.ok(REPRESENTABLE_COMPONENT_KINDS.has(kind),
    `${kind} declares a limitation but is not in REPRESENTABLE_COMPONENT_KINDS.`);
}

// --- 4. The hardcoded literals must not come back ---

const HARDCODED_EFFECTS = /codeStress:\s*true,\s*pressureStiffening:\s*false/u;
for (const relative of [
  'src/core/linear-piping-analysis-consumer/inputxml-feature-inventory.js',
  'src/core/linear-piping-analysis-consumer/generic-inputxml-solve-case.js',
  'src/core/linear-piping-analysis-consumer/inputxml-linear-preparation-load-authorities.js',
]) {
  assert.doesNotMatch(read(relative), HARDCODED_EFFECTS,
    `${relative} must read pressure effects from the capability profile, not a literal.`);
}

const inventory = read('src/core/linear-piping-analysis-consumer/inputxml-feature-inventory.js');
assert.doesNotMatch(inventory, /componentKind === 'BEND'\s*\?\s*'GENERIC_APPROX_BEND_STRAIGHT_CHORD'/u,
  'componentDispositions must resolve limitations through the capability profile.');
assert.match(inventory, /productionComponentLimitation\(componentKind\)/u);

// --- 5. A capability may not be enabled without its benchmark ---
// An asserted capability with nothing standing behind it is the failure this
// whole stage exists to make impossible.
const BENCHMARK_FOR = Object.freeze({
  bendExactMechanics: 'scripts/lfea-b3.18-bm1-bend-check.mjs',
  teeExactMechanics: 'scripts/lfea-b3.21-b31j-phase2-factor-benchmark-check.mjs',
  reducerExactMechanics: 'scripts/lfea-b3.23-reducer-condensation-check.mjs',
});
const packageJson = JSON.parse(read('package.json'));
const wiredScripts = Object.values(packageJson.scripts ?? {}).join(' ');
const enabled = [];
for (const [flag, script] of Object.entries(BENCHMARK_FOR)) {
  if (PRODUCTION_CAPABILITY_PROFILE[flag] !== true) continue;
  enabled.push(flag);
  assert.ok(fs.existsSync(path.join(ROOT, script)),
    `Capability ${flag} is enabled but its benchmark ${script} is missing.`);
  assert.ok(wiredScripts.includes(path.basename(script)),
    `Capability ${flag} is enabled but ${script} is not wired into an npm script.`);
}

// --- 6. A capability may not be enabled while production never builds a component ---
const consumerDir = path.join(ROOT, 'src/core/linear-piping-analysis-consumer');
const consumerSource = fs.readdirSync(consumerDir)
  .filter((entry) => entry.endsWith('.js'))
  .map((entry) => fs.readFileSync(path.join(consumerDir, entry), 'utf8'))
  .join('\n');
const buildsComponents = /compilePipingComponent\s*\(/u.test(consumerSource);
for (const flag of ['bendExactMechanics', 'teeExactMechanics', 'reducerExactMechanics']) {
  if (PRODUCTION_CAPABILITY_PROFILE[flag] !== true) continue;
  assert.ok(buildsComponents,
    `${flag} is enabled but the production consumer never calls compilePipingComponent.`);
}

console.log(JSON.stringify({
  check: 'lfea-production-capability-profile',
  status: 'PASS',
  profileId: PRODUCTION_CAPABILITY_PROFILE.profileId,
  enabledCapabilities: enabled,
  productionBuildsComponents: buildsComponents,
  hardcodedEffectLiterals: 0,
}));
