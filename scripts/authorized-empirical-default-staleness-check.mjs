#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { createEmptyProjectDataProfile } from '../src/workspace/project-data/project-data-contract.js';
import {
  LOAD_CALC_STANDARD_DEFAULTS_V1,
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';

const empty = structuredClone(createEmptyProjectDataProfile());
empty.projectId = 'PRODUCT-DEFAULT-STALENESS-CHECK';

const baseline = createNonFeaProductDefaultProvider({ profile: empty });
const changedProfile = structuredClone(LOAD_CALC_STANDARD_DEFAULTS_V1);
const gravity = changedProfile.defaults.find((row) => row.defaultId === 'PD-GRAVITY');
assert.ok(gravity, 'Built-in gravity default was not found.');
gravity.value = 9.81;
gravity.semanticHash = semanticHash({
  defaultId: gravity.defaultId,
  projectDataPath: gravity.projectDataPath,
  value: gravity.value,
  unit: gravity.unit,
  basis: gravity.basis,
});
const changed = createNonFeaProductDefaultProvider({
  profile: empty,
  defaultProfile: changedProfile,
});

assert.notEqual(
  baseline.productDefaultProfileSemanticHash,
  changed.productDefaultProfileSemanticHash,
  'Changing a calculation-affecting Product default did not change the Product-default profile hash.',
);
assert.notEqual(
  baseline.effectiveProjectDataProfileSemanticHash,
  changed.effectiveProjectDataProfileSemanticHash,
  'Changing a calculation-affecting Product default did not change effective Project Data identity.',
);

const coordinatorSource = await read('../src/workspace/non-fea-method-execution-coordinator.js');
const consumerSource = await read('../src/workspace/enrichment/authorized-enrichment-consumer-controller.js');
const runtimeSource = await read('../src/workspace/non-fea-common-input-runtime.js');
const storeSource = await read('../src/workspace/non-fea-common-input-store.js');

assert.match(
  coordinatorSource,
  /commonInputProvider = requireCurrentNonFeaMethods/u,
  'Execution coordinator no longer defaults to live common-input re-evaluation.',
);
assert.match(
  consumerSource,
  /new NonFeaMethodExecutionCoordinator\(\{ commonInputStore \}\)/u,
  'Production authorized consumer is not using the coordinator live common-input provider.',
);
assert.doesNotMatch(
  consumerSource,
  /commonInputProvider:\s*\(methodIds\)\s*=>\s*commonInputStore\.requireReadyMethods/u,
  'Production authorized consumer reverted to snapshot-only common-input freshness.',
);
assert.match(
  runtimeSource,
  /export function requireCurrentNonFeaMethods\(methodIds\)\s*\{[\s\S]*evaluateCurrentNonFeaCommonInput\(\)/u,
  'Current-method provider does not re-evaluate live engineering authority.',
);
assert.match(
  runtimeSource,
  /const projectDataProfile = productDefaultProvider\.effectiveProfile/u,
  'Live common-input request does not consume effective Product-default Project Data.',
);
assert.match(
  storeSource,
  /projectDataProfileSemanticHash:\s*semanticHash\(request\.projectDataProfile\)/u,
  'Common-input currentness does not bind effective Project Data semantic identity.',
);

console.log(JSON.stringify({
  status: 'PASS',
  productDefaultProfileHashChanges: true,
  effectiveProjectDataHashChanges: true,
  authorizationFreshnessReevaluatesLiveCommonInput: true,
  snapshotOnlyProviderRemovedFromProductionConsumer: true,
}, null, 2));

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8');
}
