#!/usr/bin/env node

/**
 * Verifies mergeAuthoredInputXmlLinearPhysicalCase() against the real,
 * production pre-flight pipeline and the real Run-path entry point, end to
 * end, using the same small real InputXML fixture
 * inputxml-run-request-cases-check.mjs uses. Confirms: the re-sealed
 * preparation still validates via requireInputXmlLinearPhysicalCasePreparation
 * (the exact contract inputxml-run-request-cases.js's own preparation
 * shape is expected to satisfy); buildInputXmlRunRequestCase finds and
 * correctly assembles the authored caseId exactly like any other case;
 * the assembled request reaches the real Run entry point
 * (compileLinearPipingInputXmlAnalysisContext) with the authored nodal
 * force present in the compiled frame elements; and the original W/WP/WT/
 * WPT cases are untouched by the merge.
 */
import assert from 'node:assert/strict';
import { compileLinearPipingInputXmlAnalysisContext } from '../src/core/linear-piping-analysis-consumer/index.js';
import { mergeAuthoredInputXmlLinearPhysicalCase } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-authored-physical-cases.js';
import { requireInputXmlLinearPhysicalCasePreparation } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-physical-cases-contract.js';
import { buildInputXmlRunRequestCase } from '../src/core/linear-piping-analysis-consumer/inputxml-run-request-cases.js';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import { prepareLinearPipingInputXmlPreFlight, authorizeLinearPipingInputXmlPreFlight } from '../src/workspace/linear-piping-inputxml-prefea.js';

const XML = `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input">
  <UNITS>
    <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
    <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
    <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
    <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
    <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS>
  <PIPINGMODEL xmlns="" JOBNAME="AUTHORED-CHECK">
    <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1200" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="168.3" WALL_THICK="7.11" MATERIAL_NAME="A106 B" MATERIAL_NUM="106"
      MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
      <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
    </PIPINGELEMENT>
    <PIPINGELEMENT FROM_NODE="20" TO_NODE="30" DELTA_X="1200" DELTA_Y="0" DELTA_Z="0"
      DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 B" MATERIAL_NUM="106"
      MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100"/>
  </PIPINGMODEL>
</CAESARII>`;

function authorizedPreFlight() {
  const intake = createLinearPipingInputXmlIntake(
    { fileName: 'authored-check.xml', content: XML },
    { fallbackUnit: 'mm', requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1' },
  );
  let preFlight = prepareLinearPipingInputXmlPreFlight(intake);
  assert.notEqual(preFlight.status, 'BLOCK', `Expected a non-BLOCK pre-flight, got ${preFlight.status}.`);
  if (!preFlight.solveAuthorized) {
    preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
      approverIdentity: 'AUTHORED-CASE-CHECK-SCRIPT',
      reason: 'Deterministic anti-drift verification run.',
    });
  }
  return preFlight;
}

const preFlight = authorizedPreFlight();
const originalPhysicalPreparation = preFlight.preparation.physicalPreparation;
const originalCaseIds = originalPhysicalPreparation.physicalCases.map((row) => row.caseId).sort();
assert.ok(originalCaseIds.length > 0, 'Expected the real fixture to compile at least one auto-synthesized case.');

// 1. Merge a real authored nodal-force/moment case and confirm the
// re-sealed preparation still validates against the same contract
// inputxml-run-request-cases.js expects.
const mergedPreparation = mergeAuthoredInputXmlLinearPhysicalCase(originalPhysicalPreparation, {
  label: 'Wind on node 20',
  description: 'Engineer-authored lateral load for anti-drift verification.',
  loads: [{ nodeId: '20', force: { fx: 1000, fy: 0, fz: 0 }, moment: { mx: 0, my: 0, mz: 0 } }],
});
requireInputXmlLinearPhysicalCasePreparation(mergedPreparation);

const mergedCaseIds = mergedPreparation.physicalCases.map((row) => row.caseId).sort();
const newCaseIds = mergedCaseIds.filter((id) => !originalCaseIds.includes(id));
assert.equal(newCaseIds.length, 1, `Expected exactly one new case; got ${JSON.stringify(newCaseIds)}.`);
const authoredCaseId = newCaseIds[0];

// 2. The original W/WP/WT/WPT cases are untouched (same loadCase content
// hashes as before the merge).
for (const caseId of originalCaseIds) {
  const before = originalPhysicalPreparation.physicalCases.find((row) => row.caseId === caseId);
  const after = mergedPreparation.physicalCases.find((row) => row.caseId === caseId);
  assert.equal(after.loadCase.physicalLoadCaseHash, before.loadCase.physicalLoadCaseHash, `Case ${caseId} was mutated by the merge.`);
}

// 3. buildInputXmlRunRequestCase finds the authored case exactly like any
// other case (no special-casing needed downstream).
const preparationWithAuthoredCase = { ...preFlight.preparation, physicalPreparation: mergedPreparation };
const request = buildInputXmlRunRequestCase({
  intake: preFlight.intake,
  preparation: preparationWithAuthoredCase,
  caseId: authoredCaseId,
  analysisIdentity: 'AUTHORED-CHECK',
  analysisRevision: 1,
});

// 4. Real end-to-end: the assembled request reaches the real Run entry
// point and the authored nodal force is present in the compiled model.
const context = compileLinearPipingInputXmlAnalysisContext(request, { factorizationCache: null });
assert.equal(context.sourceAnalysisContext.analysisResult.status, 'QUALIFIED');
const expectedBoundNodeId = `${preFlight.preparation.structuralPreparation.modelId}.N20`;
assert.equal(
  request.sourceAnalysisRequest.physicalLoadCaseInput.primitives.some(
    (primitive) => primitive.kind === 'NODAL_FORCE_MOMENT' && primitive.nodeId === expectedBoundNodeId,
  ),
  true,
  'Expected the authored NODAL_FORCE_MOMENT primitive to be present in the assembled request.',
);

// 5. Fail closed: a nodeId that doesn't exist in the compiled model is
// rejected, not silently coerced or dropped.
assert.throws(
  () => mergeAuthoredInputXmlLinearPhysicalCase(originalPhysicalPreparation, {
    loads: [{ nodeId: 'NOT-A-REAL-NODE', force: { fx: 1, fy: 0, fz: 0 } }],
  }),
  undefined,
  'Expected an unbound nodeId to fail closed.',
);

// 6. Fail closed: an empty loads array is rejected.
assert.throws(
  () => mergeAuthoredInputXmlLinearPhysicalCase(originalPhysicalPreparation, { loads: [] }),
  (error) => error.code === 'INPUTXML_AUTHORED_PHYSICAL_CASE_INVALID',
  'Expected an empty loads array to fail closed.',
);

// 7. Sequentially authoring a second case (the real UI pattern -- each
// merge builds on the previous result) produces two distinct,
// non-colliding case IDs, and both authored cases survive together.
const secondMerge = mergeAuthoredInputXmlLinearPhysicalCase(mergedPreparation, {
  loads: [{ nodeId: '10', force: { fx: 0, fy: 500, fz: 0 } }],
});
const secondMergeCaseIds = secondMerge.physicalCases.map((row) => row.caseId);
const secondCaseId = secondMergeCaseIds.find((id) => id !== authoredCaseId && !originalCaseIds.includes(id));
assert.ok(secondCaseId, 'Expected a second, distinct authored case ID.');
assert.ok(secondMergeCaseIds.includes(authoredCaseId), 'Expected the first authored case to survive the second merge.');
assert.equal(secondMergeCaseIds.length, originalCaseIds.length + 2, 'Expected exactly two authored cases added on top of the originals.');

console.log(JSON.stringify({
  check: 'inputxml-linear-authored-physical-cases',
  status: 'PASS',
  originalCaseCount: originalCaseIds.length,
  authoredCaseId,
  realRunPathReached: true,
  originalCasesUntouched: true,
  unboundNodeFailsClosed: true,
  emptyLoadsFailsClosed: true,
  noCaseIdCollision: true,
}));
