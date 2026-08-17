import assert from 'node:assert/strict';
import { screeningRequestFixture } from './lafea.2-fixtures.mjs';
import { calculateLocalAttachmentScreening } from '../src/core/local-attachment-screening/index.js';
import {
  calculateEngineeringCorrelationFromLafea2,
} from '../src/core/local-attachment-correlation/index.js';

const screeningResult = calculateLocalAttachmentScreening(screeningRequestFixture());
assert.equal(screeningResult.qualification.state, 'ACCEPTED');

const assessment = calculateEngineeringCorrelationFromLafea2({
  methodIdentity: 'UNREGISTERED-ENGINEERING-METHOD',
  methodEdition: '1',
  requestIdentity: 'ENGINEERING-ASSESSMENT-NEGATIVE-001',
  screeningResult,
  screeningCaseId: 'CASE-A',
  geometryIdentity: 'ATTACHMENT-GEOMETRY-001',
  attachmentDiameter: 250,
  attachmentSourceReference: 'QUALIFICATION_FIXTURE/ATTACHMENT_DIAMETER',
  targetMappings: [{ targetId: 'CROWN_OUTER', evaluationLocationId: 'L0' }],
});

assert.equal(assessment.status, 'BLOCKED');
assert.equal(assessment.result, null);
assert.equal(assessment.request, null);
assert.equal(assessment.geometryEvidence, null);
assert.equal(assessment.diagnostics[0].code, 'CORRELATION_ENGINEERING_PROFILE_NOT_REGISTERED');

console.log(JSON.stringify({
  check: 'lafea2-engineering-correlation-assessment-fail-closed',
  status: 'PASS',
  engineeringAssessmentStatus: assessment.status,
  registeredMethodRequiredBeforeGeometryOrCalculation: true,
  diagnostic: assessment.diagnostics[0],
  syntheticMethodExposedAsEngineeringMethod: false,
}));
