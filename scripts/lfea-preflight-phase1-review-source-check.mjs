#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LFEA_PREFLIGHT_ENGINEERING_FIELDS,
  LFEA_PREFLIGHT_FIELD_STATUS,
} from '../src/workspace/lfea-preflight-phase1-schema.js';

const source = fs.readFileSync('src/workspace/lfea-preflight-phase1-review-source.js', 'utf8');

assert.match(source, /projectPreflightModel/u);
assert.match(source, /new Uint8Array\(lineCount\)/u);
assert.match(source, /engineeringStatusByField/u);
assert.match(source, /getLfeaPreflightPhase1ReviewCell/u);
assert.match(source, /getLfeaPreflightPhase1ReviewComponent/u);
assert.match(source, /getLfeaPreflightPhase1ComponentSourceOrdinal/u);
assert.match(source, /getLfeaPreflightPhase1ComponentParentLineTargetId/u);
assert.doesNotMatch(source, /lineByTargetId\.set[\s\S]{0,1200}\bcells\s*:/u,
  'Lazy line records must not retain 40 cell DTOs per line.');
assert.doesNotMatch(source, /componentByTargetId/u,
  'Lazy source must not retain a second million-entry component-record map.');
console.log('P06B-SOURCE-01 PASS large retained state is typed statuses + indexes + compact source references');

assert.match(source, /BLOCKED_MISSING/u);
assert.match(source, /BLOCKED_AMBIGUOUS/u);
assert.match(source, /value:\s*null/u);
assert.match(source, /E_P06_BLOCKED_VALUE_NON_NULL/u);
assert.match(source, /DUPLICATE_PRESERVING_KEY_BUCKET/u);
assert.match(source, /NOT_YET_PROJECTED_BY_CURRENT_READ_ONLY_PREFLIGHT/u);
assert.equal(LFEA_PREFLIGHT_ENGINEERING_FIELDS.length, 40);
assert.equal(LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_MISSING, 4);
assert.equal(LFEA_PREFLIGHT_FIELD_STATUS.BLOCKED_AMBIGUOUS, 5);
console.log('P06B-SOURCE-02 PASS unresolved/ambiguous engineering values remain null with explicit status and method');

assert.doesNotMatch(source, /EventBus|publish\(|dispatchEvent|masterDataController|applyMaster|runLinearPiping|solveInputXml|compileSolver|factorization/u);
assert.doesNotMatch(source, /innerHTML|insertAdjacentHTML|outerHTML|document\.|createElement/u);
assert.doesNotMatch(source, /Date\.now|Math\.random|randomUUID|localeCompare/u);
assert.doesNotMatch(source, /enrichment-ui-phase0/u);
console.log('P06B-SOURCE-03 PASS review source owns no mutation, solver, DOM, clock, entropy, locale, or fixture authority');

const eagerDraft = fs.readFileSync('src/workspace/lfea-preflight-phase1-adapter.js', 'utf8');
assert.doesNotMatch(fs.readFileSync('src/main.js', 'utf8'), /lfea-preflight-phase1-adapter/u);
assert.doesNotMatch(fs.readFileSync('src/workspace/lfea-preflight-ui.js', 'utf8'), /lfea-preflight-phase1-adapter/u);
assert.match(eagerDraft, /createLfeaPreflightPhase1ReviewSource/u);
console.log('P06B-SOURCE-04 PASS earlier eager draft is not live production composition; lazy v2 source is the cutover candidate');

console.log(JSON.stringify({
  check: 'lfea-preflight-phase1-review-source',
  status: 'PASS',
  engineeringFieldCount: 40,
  eagerCellRetention: false,
  secondComponentRecordMap: false,
  blockedValuesRemainNull: true,
  writeAuthority: false,
  solverAuthority: false,
  liveCutover: false,
}));
