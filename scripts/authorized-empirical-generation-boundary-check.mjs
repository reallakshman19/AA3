#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const activePaths = [
  '../src/workspace/engineering-loads/engineering-support-load-store.js',
  '../src/workspace/engineering-loads/authorized-empirical-runtime-store.js',
  '../src/workspace/engineering-loads/authorized-empirical-runtime-store-v2.js',
];
const packagePaths = [3, 4, 5, 6, 7, 8].map((version) => (
  `../src/workspace/engineering-loads/authorized-empirical-load-execution-v${version}.js`
));

const activeSources = await Promise.all(activePaths.map((path) => read(path)));
const packageSources = await Promise.all(packagePaths.map((path) => read(path)));

const activeJoined = activeSources.join('\n');
assert.match(activeJoined, /authorized-empirical-load-execution\.js/u,
  'Active Load Calc path no longer references V1 execution contract.');
assert.match(activeJoined, /authorized-empirical-load-execution-v2\.js/u,
  'Active Load Calc path no longer references V2 execution contract.');
assert.doesNotMatch(activeJoined, /authorized-empirical-load-execution-v[3-8]\.js/u,
  'A Package 5 V3-V8 execution contract entered the active V1/V2 runtime-store chain without explicit migration.');

for (let index = 0; index < packageSources.length; index += 1) {
  const version = index + 3;
  const source = packageSources[index];
  assert.match(source, /support-load-distribution-v3\.js/u,
    `V${version} no longer owns a direct gravity-distribution call boundary.`);
  assert.match(source, /calculateSupportLoadDistribution/u,
    `V${version} no longer directly executes support-load distribution.`);
  assert.match(source, /sealed|Enrichment|ENRICHMENT/u,
    `V${version} no longer exposes its independent sealed-enrichment authority.`);
  assert.doesNotMatch(source, /createAuthorizedEmpiricalEffectiveExecutionProjection/u,
    `V${version} unexpectedly inherited the V1/V2 target-level effective projection without contract migration.`);
  assert.doesNotMatch(source, /calculateAuthorizedEmpiricalEffectiveSupportLoads/u,
    `V${version} unexpectedly inherited the V1/V2 effective-support guard without contract migration.`);
}

console.log(JSON.stringify({
  status: 'PASS',
  activeRuntimeStoreContracts: ['V1', 'V2'],
  parallelStandalonePackage5Contracts: ['V3', 'V4', 'V5', 'V6', 'V7', 'V8'],
  disposition: 'DO_NOT_MIGRATE_SILENTLY',
  rationale: 'V3-V8 own independently sealed enrichment overlays and direct gravity execution; they require a separate authority migration design if reactivated in the active runtime-store chain.',
}, null, 2));

async function read(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}
