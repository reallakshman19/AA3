import assert from 'node:assert/strict';
import {
  EMP1_LOCAL_CORRELATION_BLOCKERS,
  EMP1_PUBLIC_PRODUCT,
  buildEmp1ProductProjection,
  emp1StepForBackingStage,
  isEmp1BackingStage,
} from '../src/workspace/emp1-product-projection.js';

const state = {
  activeStageId: 'LAFEA.1',
  stages: {
    'LAFEA.1': { document: { id: 'A' }, execution: { status: 'QUALIFIED' }, orchestration: { sections: { AUTHORIZATION: { state: 'READY' } } } },
    'LAFEA.2': { document: { sourceEvidence: { foundationResult: { semanticHash: 'A-HASH' } } }, execution: null, orchestration: { sections: { AUTHORIZATION: { state: 'READY' } } } },
    'LAFEA.3': { document: { id: 'FE' } },
  },
};
const projection = buildEmp1ProductProjection(state);
assert.equal(EMP1_PUBLIC_PRODUCT.productId, 'EMP.1');
assert.equal(projection.steps.length, 3);
assert.equal(projection.steps[0].stepId, 'EMP.1.A');
assert.equal(projection.steps[0].state, 'CALCULATED');
assert.equal(projection.steps[1].stepId, 'EMP.1.B');
assert.equal(projection.steps[1].state, 'READY_TO_RUN');
assert.equal(projection.steps[2].stepId, 'EMP.1.C');
assert.equal(projection.steps[2].state, 'BLOCKED');
assert.equal(projection.steps[2].runAuthorized, false);
assert.deepEqual(projection.steps[2].blockers, EMP1_LOCAL_CORRELATION_BLOCKERS);
assert.equal(projection.qualificationBoundary.emp1CProductionAuthority, 'NOT_AUTHORIZED');
assert.equal(projection.qualificationBoundary.passIsCodeCompliance, false);
assert.equal(projection.custody.automaticAToBSynchronization, false);
assert.equal(projection.custody.bSourceEvidenceState, 'RETAINED_A_EVIDENCE_SNAPSHOT');
assert.equal(isEmp1BackingStage('LAFEA.1'), true);
assert.equal(isEmp1BackingStage('LAFEA.2'), true);
assert.equal(isEmp1BackingStage('LAFEA.3'), false);
assert.equal(emp1StepForBackingStage('LAFEA.2').stepId, 'EMP.1.B');
console.log(JSON.stringify({ status: 'PASS', product: projection.product, cBlockers: projection.steps[2].blockers }, null, 2));
