#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  createLinearPipingInputXmlIntake,
  inspectLinearPipingInputXmlSource,
  requireLinearPipingInputXmlIntake,
} from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
  requireLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';

const DECLARED_MM_XML = fullInputXml({ withUnits: true });
const NO_UNITS_GEOMETRY_XML = `<PIPINGMODEL JOBNAME="P07-NO-UNITS">
  <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1000" DELTA_Y="0" DELTA_Z="0"/>
</PIPINGMODEL>`;
const GOVERNED_WEIGHT_CASE_ID = 'IXP-W';

const results = [];

const declaredInspection = inspectLinearPipingInputXmlSource({
  fileName: 'P07_declared_mm.xml',
  content: DECLARED_MM_XML,
});
assert.equal(declaredInspection.status, 'READY');
assert.equal(declaredInspection.unitDeclared, true);
assert.equal(declaredInspection.sourceUnit, 'mm');
assert.match(declaredInspection.contentSha256, /^[0-9a-f]{64}$/u);
results.push({
  id: 'P07-INTAKE-01',
  status: 'PASS',
  statement: 'Supported file LENGTH declaration is detected without a coordinate heuristic.',
  sourceUnit: declaredInspection.sourceUnit,
});

const declaredIntake = createLinearPipingInputXmlIntake({
  fileName: 'P07_declared_mm.xml',
  content: DECLARED_MM_XML,
}, {
  fallbackUnit: 'in',
  requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
  requestedCaseIds: [GOVERNED_WEIGHT_CASE_ID],
});
assert.equal(declaredIntake.unitAuthority.declared, true);
assert.equal(declaredIntake.unitAuthority.sourceUnit, 'mm');
assert.equal(declaredIntake.ingestionOptions.unit, 'mm');
assert.equal(declaredIntake.requestedCaseIds[0], GOVERNED_WEIGHT_CASE_ID);
assert.match(declaredIntake.inputXmlSource.semanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.match(declaredIntake.contentSha256, /^[0-9a-f]{64}$/u);
assert.equal(
  Object.hasOwn(declaredIntake, 'sourceAnalysisRequest'),
  false,
  'Native source intake must not require a hand-authored downstream sourceAnalysisRequest.',
);
results.push({
  id: 'P07-INTAKE-02',
  status: 'PASS',
  statement: 'Declared file unit overrides a supplied fallback and is sealed with source SHA-256 custody.',
  contentSha256: declaredIntake.contentSha256,
  sourceSemanticHash: declaredIntake.inputXmlSource.semanticHash,
  requestedPhysicalCaseId: GOVERNED_WEIGHT_CASE_ID,
});

const missingInspection = inspectLinearPipingInputXmlSource({
  fileName: 'P07_no_units.xml',
  content: NO_UNITS_GEOMETRY_XML,
});
assert.equal(missingInspection.status, 'UNIT_AUTHORITY_REQUIRED');
assert.equal(missingInspection.sourceUnit, null);
assert.throws(
  () => createLinearPipingInputXmlIntake({
    fileName: 'P07_no_units.xml',
    content: NO_UNITS_GEOMETRY_XML,
  }),
  (error) => error?.code === 'PIPING_INPUTXML_INTAKE_UNIT_AUTHORITY_REQUIRED',
);
const explicitMm = createLinearPipingInputXmlIntake({
  fileName: 'P07_no_units.xml',
  content: NO_UNITS_GEOMETRY_XML,
}, { fallbackUnit: 'mm' });
assert.equal(explicitMm.unitAuthority.declared, false);
assert.equal(explicitMm.unitAuthority.sourceUnit, 'mm');
assert.equal(explicitMm.unitAuthority.authority, 'LFEA_ENGINEER_DECLARED_FALLBACK_LENGTH_UNIT');
results.push({
  id: 'P07-INTAKE-03',
  status: 'PASS',
  statement: 'Missing LENGTH declaration fails closed until explicit fallback-unit authority is supplied.',
});

const sameLargeCoordinateInches = createLinearPipingInputXmlIntake({
  fileName: 'P07_no_units.xml',
  content: NO_UNITS_GEOMETRY_XML,
}, { fallbackUnit: 'in' });
assert.equal(sameLargeCoordinateInches.ingestionOptions.unit, 'in');
assert.notEqual(sameLargeCoordinateInches.semanticHash, explicitMm.semanticHash);
assert.equal(sameLargeCoordinateInches.contentSha256, explicitMm.contentSha256);
results.push({
  id: 'P07-INTAKE-04',
  status: 'PASS',
  statement: 'Identical source bytes can carry distinct explicit unit authority; coordinate magnitude never selects the unit.',
});

const tampered = structuredClone(declaredIntake);
tampered.inputXmlSource.content = tampered.inputXmlSource.content.replace('DELTA_X="1000"', 'DELTA_X="1001"');
assert.throws(
  () => requireLinearPipingInputXmlIntake(tampered),
  (error) => ['PIPING_INPUTXML_INTAKE_SHA256_INVALID', 'PIPING_INPUTXML_CONTENT_HASH_MISMATCH'].includes(error?.code),
);
results.push({
  id: 'P07-INTAKE-05',
  status: 'PASS',
  statement: 'Source-byte tamper invalidates intake custody before pre-flight.',
});

let preFlight = prepareLinearPipingInputXmlPreFlight(declaredIntake);
if (preFlight.status === 'BLOCK') {
  console.error(JSON.stringify({
    diagnostic: 'P07_NATIVE_PREFLIGHT_BLOCK',
    requestedCaseIds: preFlight.preparation.requestedCaseIds,
    availableCaseIds: preFlight.sourceSummary.availableCaseIds,
    findings: preFlight.preparation.findings
      .filter((row) => row.disposition === 'BLOCK')
      .map((row) => ({
        code: row.code,
        message: row.message,
        physicalCaseIds: row.physicalCaseIds,
        evidence: row.evidence,
        remediation: row.remediation,
      })),
    physicalSummary: preFlight.preparation.physicalPreparation?.summary ?? null,
    physicalCases: (preFlight.preparation.physicalPreparation?.physicalCases ?? []).map((row) => ({
      caseId: row.caseId,
      caseRole: row.caseRole,
      primitiveIds: row.primitiveIds,
    })),
    loadLedger: preFlight.preparation.physicalPreparation?.loadLedger ?? [],
  }, null, 2));
}
assert.notEqual(preFlight.status, 'BLOCK', `Native governed preparation unexpectedly blocked: ${preFlight.preparation.findings
  .filter((row) => row.disposition === 'BLOCK').map((row) => row.code).join(', ')}`);
assert.equal(preFlight.sourceSummary.fileName, 'P07_declared_mm.xml');
assert.equal(preFlight.sourceSummary.contentSha256, declaredIntake.contentSha256);
assert.equal(preFlight.sourceSummary.sourceUnit, 'mm');
assert.equal(preFlight.sourceSummary.unitDeclared, true);
assert.equal(preFlight.sourceSummary.nodeCount, 2);
assert.equal(preFlight.sourceSummary.elementCount, 1);
assert.ok(preFlight.sourceSummary.availableCaseIds.includes(GOVERNED_WEIGHT_CASE_ID));
assert.equal(preFlight.preparation.requestedCaseIds.includes(GOVERNED_WEIGHT_CASE_ID), true);
assert.equal(preFlight.preparation.executionBoundary.solverRuntime, 'NOT_CREATED');
assert.equal(preFlight.preparation.executionBoundary.factorizationHandle, 'NOT_RETAINED');
if (preFlight.status === 'WARN') {
  assert.equal(preFlight.solveAuthorized, false);
  preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
    approverIdentity: 'P07-QUALIFICATION-ENGINEER',
    reason: 'Reviewed and accepted the complete disclosed native InputXML pre-flight limitations.',
  });
}
const validatedPreFlight = requireLinearPipingInputXmlPreFlight(preFlight);
assert.equal(validatedPreFlight.solveAuthorized, true);
assert.match(validatedPreFlight.authorization.semanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.equal(validatedPreFlight.authorization.authorizedPhysicalCaseIds.includes(GOVERNED_WEIGHT_CASE_ID), true);
results.push({
  id: 'P07-INTAKE-06',
  status: 'PASS',
  statement: 'Raw native InputXML reaches the real diagnostics/preparation/authorization chain without hand-authored run JSON.',
  readiness: validatedPreFlight.status,
  availableCaseIds: validatedPreFlight.sourceSummary.availableCaseIds,
  authorizationSemanticHash: validatedPreFlight.authorization.semanticHash,
});

const preFlightTamper = structuredClone(validatedPreFlight);
preFlightTamper.sourceSummary.contentSha256 = `${'0'.repeat(63)}1`;
assert.throws(
  () => requireLinearPipingInputXmlPreFlight(preFlightTamper),
  (error) => error?.code === 'PIPING_INPUTXML_NATIVE_PREFLIGHT_SOURCE_SUMMARY_STALE',
);
results.push({
  id: 'P07-INTAKE-07',
  status: 'PASS',
  statement: 'Native pre-flight receipt tamper is rejected by parent-derived source-summary custody before reuse.',
});

const repeated = createLinearPipingInputXmlIntake({
  fileName: 'P07_declared_mm.xml',
  content: DECLARED_MM_XML,
}, {
  fallbackUnit: 'in',
  requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
  requestedCaseIds: [GOVERNED_WEIGHT_CASE_ID],
});
assert.equal(JSON.stringify(repeated), JSON.stringify(declaredIntake));
results.push({
  id: 'P07-INTAKE-08',
  status: 'PASS',
  statement: 'Identical source bytes and declared intake decisions are byte deterministic.',
});

console.log(JSON.stringify({
  check: 'linear-piping-inputxml-native-intake',
  status: 'PASS',
  normalPathRequiresHandAuthoredRunJson: false,
  inferredUnits: false,
  results,
}));

function fullInputXml({ withUnits }) {
  const units = withUnits ? `<UNITS>
    <LENGTH LABEL="MM" FACTOR="25.4"/>
    <FORCE LABEL="N" FACTOR="4.4482216152605"/>
    <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/>
    <STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
    <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/>
    <EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
    <TEMP LABEL="C" FACTOR="0.5555555555555556"/>
    <PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    <FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS>` : '';
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
    ${units}
    <PIPINGMODEL xmlns="" JOBNAME="P07-NATIVE">
      <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1000" DELTA_Y="0" DELTA_Z="0"
        DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
        MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
        <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
      </PIPINGELEMENT>
    </PIPINGMODEL>
  </CAESARII>`;
}
