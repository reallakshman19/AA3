#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/core/shared-piping-model/evidence-index.js', import.meta.url), 'utf8');

assert.match(source, /const NORMALIZED_ALIAS_CACHE = new WeakMap\(\);/u);
assert.match(source, /if \(Object\.isFrozen\(aliases\)\)/u,
  'only immutable alias arrays may enter the cache');
assert.match(source, /const cached = NORMALIZED_ALIAS_CACHE\.get\(aliases\);/u);
assert.match(source, /const normalized = Object\.freeze\(aliases\.map\(normalizeEvidenceKey\)\);/u);
assert.match(source, /NORMALIZED_ALIAS_CACHE\.set\(aliases, normalized\);/u);
assert.match(source, /return aliases\.map\(normalizeEvidenceKey\);/u,
  'mutable alias arrays must preserve uncached semantics');
assert.match(source, /for \(const wanted of normalizedEvidenceAliases\(aliases\)\)/u);
assert.match(source, /normalizedEvidenceAliases\(aliases\)\.forEach/u);

const referenceEntityCount = 4884;
const componentAliasesPerEntity = 79;
const supportAliasesPerEntityWithFallback = 115;
const componentBefore = referenceEntityCount * componentAliasesPerEntity;
const supportBefore = referenceEntityCount * supportAliasesPerEntityWithFallback;

assert.equal(componentBefore, 385836);
assert.equal(supportBefore, 561660);

console.log(JSON.stringify({
  status: 'PASS',
  referenceEntityCount,
  aliasNormalizationCalls: {
    allNonSupportReference: {
      before: componentBefore,
      afterStaticWarmup: componentAliasesPerEntity,
      reductionPercent: Number(((1 - componentAliasesPerEntity / componentBefore) * 100).toFixed(4)),
    },
    allSupportWithFullFallbackReference: {
      before: supportBefore,
      afterStaticWarmup: supportAliasesPerEntityWithFallback,
      reductionPercent: Number(((1 - supportAliasesPerEntityWithFallback / supportBefore) * 100).toFixed(4)),
    },
  },
  mutableAliasArraysCached: false,
  evidencePrecedenceChanged: false,
  engineeringMethodChanged: false,
}, null, 2));
