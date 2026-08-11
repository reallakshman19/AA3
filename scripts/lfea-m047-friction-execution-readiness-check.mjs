import fs from 'node:fs';
import { assessFrictionExecutionReadiness as assess, FRICTION_EXECUTION_READINESS_STATUS as S, FRICTION_EXECUTION_READINESS_BLOCKERS as B } from '../src/core/nonlinear-restraint-friction/friction-execution-readiness.js';

const sourceMap = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-source-map-snapshot.json', import.meta.url), 'utf8'));
const snap = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-readiness-snapshot.json', import.meta.url), 'utf8'));
const authority = {
  ...snap.resolvedAuthority,
  frictionSlideMultiplier: { status: 'BLOCKED', source: snap.unresolvedAuthority.frictionSlideMultiplier },
  frictionStateHistorySemantics: { status: 'BLOCKED', source: snap.unresolvedAuthority.frictionStateHistorySemantics },
  gapContactStateSemantics: { status: 'BLOCKED', source: snap.unresolvedAuthority.gapContactStateSemantics },
};

for (const caseId of ['L2','L3','L4','L5','L6']) {
  const row = assess({ caseId, frictionMultiplier: 0 });
  check(row.status === S.READY_LINEAR_BYPASS && row.route === 'QUALIFIED_LINEAR_SOLVER', `${caseId} linear bypass`);
  check(row.blockerCodes.length === 0 && row.evidence.exactZeroFrictionIdentity, `${caseId} zero-friction identity`);
}
for (const caseId of ['L7','L13']) {
  const row = assess({ caseId, frictionMultiplier: 1, sourceMap, authority });
  check(row.status === S.BLOCKED_AUTHORITY, `${caseId} must block`);
  for (const code of [B.SLIDE, B.STATE_HISTORY, B.GAP_CONTACT]) check(row.blockerCodes.includes(code), `${caseId} missing ${code}`);
}

const resolved = {
  ...authority,
  frictionSlideMultiplier: scalar(0.9),
  frictionStateHistorySemantics: semantics('FIXTURE_STATE_HISTORY'),
  gapContactStateSemantics: semantics('FIXTURE_GAP_CONTACT'),
};
check(assess({ caseId: 'FIXTURE', frictionMultiplier: 1, sourceMap, authority: resolved }).status === S.READY_NONLINEAR_INTEGRATION, 'resolved fixture readiness');
const fitted = assess({ caseId: 'FITTED', frictionMultiplier: 1, sourceMap, authority: { ...resolved, frictionSlideMultiplier: { status:'RESOLVED', value:1, source:'RESPONSE_FITTED', provenanceClass:'RESPONSE_FITTED' } } });
check(fitted.status === S.BLOCKED_AUTHORITY && fitted.blockerCodes.includes(B.RESPONSE_FITTED), 'response-fitted authority rejection');
check(assess({ caseId:'NO-MAP', frictionMultiplier:1, sourceMap:null, authority:resolved }).blockerCodes.includes(B.SOURCE_MAP), 'source-map blocker');
check(snap.policy.productionFrictionAuthorized === false && snap.policy.newMechanicsAuthorized === false, 'snapshot policy');

console.log(JSON.stringify({ check:'m047-friction-execution-readiness', status:'PASS', linearBypassCases:['L2','L3','L4','L5','L6'], blockedPrimaryFrictionCases:['L7','L13'], currentBlockers:[B.SLIDE,B.STATE_HISTORY,B.GAP_CONTACT], responseFittingRejected:true, bm4lProductionFrictionAuthorized:false }, null, 2));

function scalar(value) { return { status:'RESOLVED', value, source:'INDEPENDENT_FIXTURE', provenanceClass:'INDEPENDENT_AUTHORITY' }; }
function semantics(method) { return { status:'RESOLVED', method, source:'INDEPENDENT_FIXTURE', provenanceClass:'INDEPENDENT_AUTHORITY' }; }
function check(value, message) { if (!value) throw new Error(message); }
