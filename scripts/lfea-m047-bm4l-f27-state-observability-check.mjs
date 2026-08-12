import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const evidence = JSON.parse(fs.readFileSync(path.resolve(
  here,
  '../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-f27-state-observability.json',
), 'utf8'));

assert.equal(evidence.schema, 'm047-bm4l-f27-state-observability/v1');
assert.equal(evidence.status, 'BLOCKED_EXACT_BUILD_STATE_HISTORY_NOT_RETAINED');
assert.equal(evidence.outputPackageAudit.status, 'PASS');
assert.equal(evidence.nonlinearAccdbAudit.status, 'PASS');
assert.equal(evidence.directTypeLookupAudit.status, 'PASS');
assert.equal(evidence.directTypeLookupAudit.bm4lAndBm4NlActiveLookupIdentical, true);
assert.deepEqual(evidence.directTypeLookupAudit.activeMappings, {
  1: 'ANC',
  3: 'Y',
  8: 'GUI',
  9: 'LIM',
});

for (const key of [
  'ACTIVE', 'BOUNDARY', 'STATUS', 'STICK', 'SLID', 'FRICT', 'CONTACT',
  'ITER', 'CONVERG', 'STATE', 'OPEN', 'CLOSED', 'REOPEN',
]) {
  assert.equal(evidence.outputPackageAudit.outputXmlKeywordCounts[key], 0);
}
assert.equal(evidence.outputPackageAudit.outputXmlReportCounts.RESTRAINT_REPORT, 14);
assert.equal(evidence.outputPackageAudit.outputXmlReportCounts.DISPLACEMENT_REPORT, 14);

assert.equal(evidence.nonlinearAccdbAudit.tableCount, 40);
assert.equal(evidence.nonlinearAccdbAudit.inputRestraints.rowCount, 46);
assert.equal(evidence.nonlinearAccdbAudit.inputRestraints.positiveFrictionRowCount, 26);
assert.equal(evidence.nonlinearAccdbAudit.inputRestraints.positiveGapMagnitudeCount, 0);
assert.equal(evidence.nonlinearAccdbAudit.outputRestraints.rowCount, 184);
assert.deepEqual(evidence.nonlinearAccdbAudit.outputRestraints.caseNumbers, [2, 17, 19, 20]);
assert.equal(evidence.nonlinearAccdbAudit.outputRestraints.containsStateHistory, false);
for (const value of Object.values(evidence.nonlinearAccdbAudit.explicitStateHistoryFields)) {
  assert.equal(value, 0);
}
for (const value of Object.values(evidence.requiredStateEvidence)) {
  assert.equal(value, false);
}

assert.equal(evidence.evidenceRule.finalResponseMaySelectState, false);
assert.equal(evidence.evidenceRule.responseFittingAllowed, false);
assert.equal(evidence.evidenceRule.absenceOfStateHistoryMayAuthorizeAssumption, false);
assert.equal(evidence.decision.f27RetainedSourceAuditComplete, true);
assert.equal(evidence.decision.f27StateSemanticsClosed, false);
assert.equal(evidence.decision.externalExactBuildStateTraceRequired, true);
assert.equal(evidence.decision.productionNonlinearMechanicsAuthorized, false);
assert.equal(evidence.decision.l13RescoreAuthorized, false);
assert.equal(evidence.decision.historicalL13Passed, 1719);
assert.equal(evidence.decision.historicalL13Failed, 195);
assert.equal(evidence.decision.historicalL13Total, 1914);
assert.equal(evidence.decision.historicalL13AccuracyPercent, 89.8119122257);

console.log(JSON.stringify({
  check: 'm047-bm4l-f27-state-observability',
  status: 'PASS',
  engineeringDecision: evidence.status,
  retainedTablesAudited: evidence.nonlinearAccdbAudit.tableCount,
  requiredStateEvidenceClosed: false,
  externalExactBuildStateTraceRequired: evidence.decision.externalExactBuildStateTraceRequired,
  productionMechanicsAuthorized: evidence.decision.productionNonlinearMechanicsAuthorized,
  l13RescoreAuthorized: evidence.decision.l13RescoreAuthorized,
  historicalAccuracyPercent: evidence.decision.historicalL13AccuracyPercent,
}, null, 2));
