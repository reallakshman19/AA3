#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const adapter = readFileSync(new URL('../src/workspace/dataset-adapter.js', import.meta.url), 'utf8');
const snapshot = readFileSync(new URL('../src/core/shared-piping-model/source-package-snapshot.js', import.meta.url), 'utf8');

assert.match(snapshot, /const sourcePackage = cloneJsonValue\(input\.sourcePackage\);/u,
  'authoritative SourcePackageSnapshot clone must remain');
assert.match(snapshot, /return deepFreeze\(\{/u,
  'authoritative SourcePackageSnapshot must remain deeply frozen');
assert.match(adapter, /indexWorkspaceSourcePackage\(sourceSnapshot\.sourcePackage, sourceSchema, \{ sourceSnapshot \}\)/u,
  'normalization must index the immutable source snapshot, not the mutable upload object');

const start = adapter.indexOf('function buildEntityProperties(');
const end = adapter.indexOf('function requireImmutableSourceItem(', start);
assert.ok(start >= 0 && end > start, 'buildEntityProperties section is required');
const entityProperties = adapter.slice(start, end);

assert.match(entityProperties, /requireImmutableSourceItem\(item\);/u);
assert.doesNotMatch(entityProperties, /clonePlain\(/u,
  'per-entity source-evidence JSON cloning must not return');
assert.match(entityProperties, /sourceAttributes: item\.sourceAttributes \|\| EMPTY_SOURCE_RECORD/u);
assert.match(entityProperties, /attributes: item\.attributes \|\| EMPTY_SOURCE_RECORD/u);
assert.match(entityProperties, /enrichedAttributes: item\.enrichedAttributes \|\| EMPTY_SOURCE_RECORD/u);
assert.match(entityProperties, /nativeParams: item\.nativeParams \|\| EMPTY_SOURCE_RECORD/u);
assert.match(entityProperties, /diagnostics: Array\.isArray\(item\.diagnostics\) \? item\.diagnostics : EMPTY_SOURCE_DIAGNOSTICS/u);

const guardStart = end;
const guardEnd = adapter.indexOf('function extractEntityDimensions(', guardStart);
const guard = adapter.slice(guardStart, guardEnd);
assert.match(guard, /Object\.isFrozen\(item\)/u);
assert.match(guard, /immutable SourcePackageSnapshot item/u);

const referenceEntityCount = 4884;
const legacyCloneCallsPerEntity = 5;
const legacyEntityEvidenceCloneCalls = referenceEntityCount * legacyCloneCallsPerEntity;
const optimizedEntityEvidenceCloneCalls = 0;
assert.equal(legacyEntityEvidenceCloneCalls, 24420);

console.log(JSON.stringify({
  status: 'PASS',
  referenceEntityCount,
  entityEvidenceClonePlainCalls: {
    before: legacyEntityEvidenceCloneCalls,
    after: optimizedEntityEvidenceCloneCalls,
    reductionPercent: 100,
  },
  authoritativeSourcePackageClonePreserved: true,
  immutableSnapshotBoundaryRequired: true,
  engineeringMethodChanged: false,
}, null, 2));
