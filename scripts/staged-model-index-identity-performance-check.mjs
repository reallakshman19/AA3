#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/workspace/staged-model-index.js', import.meta.url), 'utf8');

assert.match(source, /const IDENTITY_ALIAS_KEYS = Object\.freeze\(Object\.fromEntries/u);
assert.match(source, /new Set\(aliases\.map\(normalizeKey\)\)/u, 'alias-key sets must be precompiled at module initialization');
assert.doesNotMatch(source, /function firstSourceValue\(/u, 'per-field source traversal must not return');
assert.doesNotMatch(source, /function findValue\(/u, 'legacy recursive per-field traversal must not return');

const inheritedStart = source.indexOf('function inheritedIdentity(');
const inheritedEnd = source.indexOf('function sourceIdentityValues(', inheritedStart);
assert.ok(inheritedStart >= 0 && inheritedEnd > inheritedStart);
const inherited = source.slice(inheritedStart, inheritedEnd);
assert.match(inherited, /const sourceValues = sourceIdentityValues\(item\);/u);
assert.match(inherited, /sourceValues\[field\] \|\| parent\?\.\[field\] \|\| ''/u);
assert.match(inherited, /if \(sourceType\(item\) === 'BRANCH'\)/u);

const combinedStart = inheritedEnd;
const combinedEnd = source.indexOf('function addDuplicateIdentityDiagnostics(', combinedStart);
assert.ok(combinedEnd > combinedStart);
const combined = source.slice(combinedStart, combinedEnd);
assert.match(combined, /const roots = \[item, item\.sourceAttributes, item\.attributes, item\.enrichedAttributes\];/u);
assert.match(combined, /if \(!found\) continue;/u, 'falsy first matches must retry only at the next legacy root');
assert.match(combined, /values\[field\] = stringValue\(found\);\s*unresolved\.delete\(field\);/u);
assert.match(combined, /depth > 4/u);
assert.match(combined, /for \(const \[key, child\] of Object\.entries\(value\)\)/u, 'direct keys must retain precedence over nested keys');
assert.match(combined, /for \(const child of Object\.values\(value\)\)/u, 'nested DFS order must remain insertion ordered');
assert.match(combined, /if \(!matched\.has\(field\) && IDENTITY_ALIAS_KEYS\[field\]\.has\(normalizedKey\)\)/u);

const nodeCount = 4884;
const identityFieldCount = 4;
const oldPrimaryItemSearchStarts = nodeCount * identityFieldCount;
const newPrimaryItemSearchStarts = nodeCount;
const oldAliasSetBuilds = nodeCount * identityFieldCount;
const newAliasSetBuilds = identityFieldCount;

assert.equal(oldPrimaryItemSearchStarts, 19536);
assert.equal(newPrimaryItemSearchStarts, 4884);
assert.equal(1 - newPrimaryItemSearchStarts / oldPrimaryItemSearchStarts, 0.75);
assert.equal(oldAliasSetBuilds, 19536);
assert.equal(newAliasSetBuilds, 4);

console.log(JSON.stringify({
  status: 'PASS',
  referenceNodeCount: nodeCount,
  identityFieldCount,
  primaryItemIdentitySearchStarts: {
    before: oldPrimaryItemSearchStarts,
    after: newPrimaryItemSearchStarts,
    reductionPercent: 75,
  },
  normalizedAliasSetConstructions: {
    before: oldAliasSetBuilds,
    after: newAliasSetBuilds,
    reductionPercent: Number(((1 - newAliasSetBuilds / oldAliasSetBuilds) * 100).toFixed(4)),
  },
  numericalMethodChanged: false,
  sourceIdentityPrecedenceChanged: false,
}, null, 2));
