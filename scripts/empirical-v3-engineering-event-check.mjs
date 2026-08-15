import assert from 'node:assert/strict';
import {
  EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA,
  empiricalV3SeverityForRiskClass,
  sealEmpiricalV3EngineeringEvent,
} from '../src/core/empirical-v3-safety/engineering-event.js';

function event(auditMetadata, overrides = {}) {
  return sealEmpiricalV3EngineeringEvent({
    schema: EMPIRICAL_V3_ENGINEERING_EVENT_SCHEMA,
    eventType: 'RISK_RAISED',
    severity: 'REVIEW',
    runId: 'run:1',
    branchId: 'branch:A',
    entityIds: ['entity:2', 'entity:1'],
    quantityIds: ['quantity:wall'],
    fromWorkflowState: 'SAFETY_REVIEW_REQUIRED',
    toWorkflowState: 'HIGH_CONFIRM_PENDING',
    authorityRefs: [
      { ref: 'authority:B', semanticHash: 'hash:b' },
      { ref: 'authority:A', semanticHash: 'hash:a' },
    ],
    riskRefs: [{ ref: 'risk:1', semanticHash: 'hash:risk' }],
    confirmationRefs: [],
    calculationEvidenceRefs: [],
    messageCode: 'WALL_THICKNESS_INFERRED',
    messageParameters: { value: 7.11, unit: 'mm' },
    auditMetadata,
    presentationState: { expanded: true, sortIndex: 100 },
    ...overrides,
  });
}

const first = event({ actor: 'engineer:A', timestamp: '2026-08-15T09:50:00Z' });
const second = event({ actor: 'engineer:B', timestamp: '2026-08-15T09:51:00Z' }, {
  entityIds: ['entity:1', 'entity:2'],
  authorityRefs: [
    { ref: 'authority:A', semanticHash: 'hash:a' },
    { ref: 'authority:B', semanticHash: 'hash:b' },
  ],
  presentationState: { expanded: false, sortIndex: 1 },
});
assert.equal(first.semanticHash, second.semanticHash);
assert.equal(first.eventId, second.eventId);
assert.notEqual(first.evidenceHash, second.evidenceHash);

assert.equal(empiricalV3SeverityForRiskClass('HIGH_BLOCK'), 'ERROR');
assert.equal(empiricalV3SeverityForRiskClass('HIGH_CONFIRM'), 'REVIEW');
assert.equal(empiricalV3SeverityForRiskClass('MEDIUM'), 'WARNING');
assert.equal(empiricalV3SeverityForRiskClass('LOW'), 'INFO');
assert.throws(() => empiricalV3SeverityForRiskClass('UNKNOWN'), /Unsupported engineering risk class/);

const stale = event({ actor: 'engineer:A', timestamp: '2026-08-15T09:50:00Z' }, {
  eventType: 'CONFIRMATION_INVALIDATED', severity: 'REVIEW',
  fromWorkflowState: 'CALCULATION_AUTHORIZED', toWorkflowState: 'HIGH_CONFIRM_PENDING',
  messageCode: 'CONFIRMATION_STALE_AFTER_BRANCH_CHANGE',
});
assert.notEqual(first.semanticHash, stale.semanticHash);
assert.notEqual(first.eventId, stale.eventId);

const reviewed = event(null, {
  eventType: 'RESULT_REVIEWED', severity: 'INFO', branchId: null, entityIds: [], quantityIds: [],
  fromWorkflowState: 'RESULT_REVIEW_REQUIRED', toWorkflowState: 'RESULT_REVIEWED',
  authorityRefs: [], riskRefs: [], calculationEvidenceRefs: [{ ref: 'evidence:1', semanticHash: 'hash:evidence' }],
  messageCode: 'EMP_V3_RESULT_REVIEWED', messageParameters: {},
});
const ready = event(null, {
  eventType: 'AUDIT_READY', severity: 'INFO', branchId: null, entityIds: [], quantityIds: [],
  fromWorkflowState: 'RESULT_REVIEWED', toWorkflowState: 'AUDIT_EXPORT_READY',
  authorityRefs: [], riskRefs: [], calculationEvidenceRefs: [{ ref: 'evidence:1', semanticHash: 'hash:evidence' }],
  messageCode: 'EMP_V3_AUDIT_READY', messageParameters: {},
});
assert.equal(reviewed.eventType, 'RESULT_REVIEWED');
assert.equal(ready.eventType, 'AUDIT_READY');
assert.notEqual(reviewed.semanticHash, ready.semanticHash);

console.log('PASS empirical v3 engineering event contract');