#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LFEA_ENGINEERING_PREPARATION_OWNERS,
  LFEA_ENGINEERING_SOURCE_KINDS,
  createLfeaEngineeringSession,
  lfeaSessionPreFlight,
  lfeaSessionPreparationOwner,
  lfeaSessionSourceKind,
} from '../src/workspace/lfea-session/lfea-engineering-session.js';

const session = createLfeaEngineeringSession();
const events = [];
session.subscribe((state, event) => events.push({ state, event }));

let state = session.getState();
assert.equal(lfeaSessionSourceKind(state), 'NONE');
assert.equal(lfeaSessionPreFlight(state), null);
assert.equal(lfeaSessionPreparationOwner(state), null);

const pfInputA = preFlight('PF-INPUT-A', 'AUTH-A', ['W']);
session.setSource({
  kind: LFEA_ENGINEERING_SOURCE_KINDS.INPUTXML,
  identityKey: 'sha256:input-a',
  preparationOwner: LFEA_ENGINEERING_PREPARATION_OWNERS.INPUTXML,
  fileName: 'A.xml',
  preFlight: pfInputA,
  requestedProfileId: 'APPROX',
  requestedCaseIds: ['W'],
});
state = session.getState();
assert.equal(state.source.kind, 'INPUTXML');
assert.equal(lfeaSessionPreFlight(state), pfInputA);
assert.equal(events.at(-1).event.type, 'SOURCE_LOADED');

const resultA = Object.freeze({ status: 'CURRENT', id: 'RESULT-A' });
session.bindAnalysisResult(resultA);
assert.equal(session.getState().analysis.result, resultA);
assert.equal(session.getState().analysis.parentPreFlightSemanticHash, 'PF-INPUT-A');

// A render/refresh of the exact same authoritative records is display-only;
// it must not invalidate the result or manufacture a new session revision.
const revisionBeforeRefresh = session.getState().revision;
session.refreshPreparation({
  preparationOwner: 'INPUTXML',
  preFlight: pfInputA,
  requestedProfileId: 'APPROX',
  requestedCaseIds: ['W'],
});
assert.equal(session.getState().revision, revisionBeforeRefresh);
assert.equal(session.getState().analysis.result, resultA);

// A newly sealed pre-flight for another case/profile is governing input and
// therefore clears only the presentation's result reference. The underlying
// native execution authority remains the owner of CURRENT/STALE semantics.
const pfInputB = preFlight('PF-INPUT-B', null, ['W', 'W+P1']);
session.refreshPreparation({
  preparationOwner: 'INPUTXML',
  preFlight: pfInputB,
  requestedProfileId: 'STRICT',
  requestedCaseIds: ['W+P1', 'W'],
});
state = session.getState();
assert.equal(state.analysis.result, null);
assert.equal(state.lastInvalidationReason, 'PREFLIGHT_CHANGED');
assert.deepEqual(state.preparation.requestedCaseIds, ['W', 'W+P1']);
assert.equal(events.at(-1).event.analysisInvalidated, true);

session.bindAnalysisResult(Object.freeze({ id: 'RESULT-B' }));
const revisionBeforeInactiveClear = session.getState().revision;
session.clearSource('ACCDB');
assert.equal(session.getState().revision, revisionBeforeInactiveClear,
  'clearing an inactive source owner must not destroy the active session');

const pfAccdb = preFlight('PF-ACCDB-A', 'AUTH-ACCDB', ['W']);
session.setSource({
  kind: 'ACCDB',
  identityKey: 'accdb-intake:1',
  preparationOwner: 'ACCDB',
  fileName: 'BM4_L.ACCDB',
  preFlight: pfAccdb,
  requestedProfileId: 'APPROX',
  requestedCaseIds: ['W'],
});
state = session.getState();
assert.equal(state.source.kind, 'ACCDB');
assert.equal(state.analysis.result, null);
assert.equal(state.lastInvalidationReason, 'SOURCE_REPLACED');
assert.equal(events.at(-1).event.previousSourceKind, 'INPUTXML');

session.clearSource('ACCDB');
state = session.getState();
assert.equal(state.source.kind, 'NONE');
assert.equal(state.preparation.preFlight, null);
assert.equal(events.at(-1).event.type, 'SOURCE_CLEARED');

// Provenance and preparation ownership are intentionally different concepts:
// a StagedJSON file remains the source even though its governed preparation is
// supplied by the existing InputXML path after conversion.
const pfStaged = preFlight('PF-STAGED-DERIVED', null, ['W']);
session.setSource({
  kind: 'STAGED_JSON',
  identityKey: 'staged:source.json',
  providerIdentityKey: 'sha256:derived-inputxml',
  preparationOwner: 'INPUTXML',
  fileName: 'source.json',
  provenance: { derivedInputXmlFileName: 'source.xml' },
  preFlight: pfStaged,
  requestedProfileId: 'APPROX',
  requestedCaseIds: ['W'],
});
state = session.getState();
assert.equal(lfeaSessionSourceKind(state), 'STAGED_JSON');
assert.equal(lfeaSessionPreparationOwner(state), 'INPUTXML');
assert.equal(state.source.providerIdentityKey, 'sha256:derived-inputxml');
assert.equal(state.source.provenance.derivedInputXmlFileName, 'source.xml');

assert.throws(() => createLfeaEngineeringSession().bindAnalysisResult({ id: 'ORPHAN' }), /without a current pre-flight/u);
assert.throws(() => session.setSource({ kind: 'UNKNOWN' }), /Unknown active LFEA source kind/u);
assert.throws(() => session.refreshPreparation({ preparationOwner: 'ACCDB', preFlight: pfStaged }), /does not own active source/u);

// Authority firewall: the pure session module has no import and exposes no
// authorization/solve API. These source checks protect against it slowly
// becoming a second engineering engine during later UI increments.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sessionSource = readFileSync(path.join(
  ROOT,
  'src/workspace/lfea-session/lfea-engineering-session.js',
), 'utf8');
assert.doesNotMatch(sessionSource, /^import\s/mu);
assert.doesNotMatch(sessionSource, /function\s+(authorize|solve|recover|prepare|parse)[A-Z]/u);
assert.doesNotMatch(sessionSource, /compileSolver|stiffnessMatrix|assembleGlobal|factorize/u);
assert.ok(sessionSource.split(/\r?\n/u).length < 300, 'engineering session must remain below the repository file-size ceiling');
for (const forbiddenMember of ['authorize', 'analyze', 'solve', 'recover']) {
  assert.equal(forbiddenMember in session, false, `session must not expose ${forbiddenMember} authority`);
}

console.log(JSON.stringify({
  check: 'lfea-ui-engineering-session',
  status: 'PASS',
  events: events.map(({ event }) => event.type),
  authorityOwned: false,
  stagedJsonIdentityRetained: true,
  stalePresentationInvalidation: true,
}));

function preFlight(semanticHash, authorizationSemanticHash, requestedCaseIds) {
  return Object.freeze({
    semanticHash,
    authorization: authorizationSemanticHash === null
      ? null
      : Object.freeze({ semanticHash: authorizationSemanticHash }),
    preparation: Object.freeze({ requestedCaseIds: Object.freeze([...requestedCaseIds]) }),
  });
}
