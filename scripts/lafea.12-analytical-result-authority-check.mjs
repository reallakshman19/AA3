import assert from 'node:assert/strict';
import {
  calculateLocalAttachmentFoundation,
} from '../src/core/local-stress/index.js';
import {
  calculateLocalAttachmentScreening,
} from '../src/core/local-attachment-screening/index.js';
import {
  assertLafeaAnalyticalResultAuthority,
} from '../src/workspace/lafea-analytical-result-authority.js';
import {
  presentLafeaResult,
} from '../src/workspace/lafea-result-presenters/index.js';
import { canonicalFixture } from './lafea.1-fixtures.mjs';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';

const units = { force: 'N', moment: 'N·mm', stress: 'MPa' };
const foundation = calculateLocalAttachmentFoundation(canonicalFixture());
const screening = calculateLocalAttachmentScreening(screeningRequestFixture());

assert.equal(foundation.qualification.state, 'ACCEPTED');
assert.equal(screening.qualification.state, 'ACCEPTED');
assert.equal(assertLafeaAnalyticalResultAuthority('LAFEA.1', foundation).stageId, 'LAFEA.1');
assert.equal(assertLafeaAnalyticalResultAuthority('LAFEA.2', screening).stageId, 'LAFEA.2');
assert.doesNotThrow(() => presentLafeaResult('LAFEA.1', foundation, units));
assert.doesNotThrow(() => presentLafeaResult('LAFEA.2', screening, units));

assertAuthorityRejects('cross-stage result', () => presentLafeaResult('LAFEA.2', foundation, units), 'result.schema');
assertAuthorityRejects('wrong engineering level', () => {
  const forged = clone(screening);
  forged.qualification.engineeringLevel = 'LOCAL_ATTACHMENT_STRESS';
  presentLafeaResult('LAFEA.2', forged, units);
}, 'result.qualification.engineeringLevel');
assertAuthorityRejects('accepted-state bypass', () => {
  const forged = clone(screening);
  forged.qualification.state = 'REJECTED_REQUEST';
  presentLafeaResult('LAFEA.2', forged, units);
}, 'result.qualification.state');
assertAuthorityRejects('missing mandatory limitation', () => {
  const forged = clone(screening);
  forged.limitations = forged.limitations.filter((value) => value !== 'NO_LOCAL_ATTACHMENT_STRESS');
  presentLafeaResult('LAFEA.2', forged, units);
}, 'result.limitations');
assertAuthorityRejects('missing result evidence', () => presentLafeaResult('LAFEA.1', null, units), 'result');

console.log('LAFEA.1/.2 analytical result authority and presenter fail-closed checks passed.');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertAuthorityRejects(label, action, path) {
  assert.throws(action, (error) => {
    assert.equal(error?.code, 'LAFEA_ANALYTICAL_RESULT_AUTHORITY_MISMATCH', label);
    assert.equal(error?.path, path, label);
    return true;
  });
}
