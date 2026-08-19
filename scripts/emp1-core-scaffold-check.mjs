import assert from 'node:assert/strict';
import {
  EMP1_COMPONENTS,
  createEmp1Assessment,
  emp1InvalidationSet,
  evaluateEmp1LocalCorrelationGate,
} from '../src/core/emp1/index.js';

const sectionInvalidation = emp1InvalidationSet(['SECTION']);
assert.equal(sectionInvalidation.includes(EMP1_COMPONENTS.LOAD_TRANSFER), false);
assert.equal(sectionInvalidation.includes(EMP1_COMPONENTS.SECTION_SCREENING), true);
assert.equal(sectionInvalidation.includes(EMP1_COMPONENTS.LOCAL_CORRELATION), true);

const blockedGate = evaluateEmp1LocalCorrelationGate();
assert.equal(blockedGate.state, 'BLOCKED');
assert.equal(blockedGate.engineeringUseAuthorized, false);
assert.ok(blockedGate.reasons.includes('EMP1_LOCAL_METHOD_QUALIFICATION_REQUIRED'));
assert.ok(blockedGate.reasons.includes('EMP1_LOCAL_METHOD_BENCHMARK_PASS_REQUIRED'));

const assessment = createEmp1Assessment({
  sourceHash: 'source-hash-placeholder',
  loadTransfer: { qualification: 'PASS', resultHash: 'A' },
  sectionScreening: { qualification: 'PASS', decision: 'ESCALATE', resultHash: 'B' },
  localCorrelation: blockedGate,
});
assert.equal(assessment.decision, 'ESCALATE');
assert.equal(assessment.authority.wrcEngineeringUseAuthorizedByScaffold, false);
assert.equal(assessment.authority.codeComplianceProduced, false);
assert.equal(assessment.authority.releaseQualified, false);

console.log('EMP1_CORE_SCAFFOLD_CHECK_PASS');
