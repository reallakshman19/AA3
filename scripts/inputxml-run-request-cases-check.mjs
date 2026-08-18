/**
 * Verifies buildInputXmlRunRequestCase() against the real, production
 * pre-flight pipeline and the real Run-path entry point
 * (compileLinearPipingInputXmlAnalysisContext), end to end, using a real
 * (small) InputXML string -- not a mock. Confirms the assembled request's
 * independently-supplied hashes match what the Run path recomputes on its
 * own from the raw source, and that requesting a physical case the
 * pre-flight chain never compiled fails closed with a diagnostic rather
 * than silently fabricating one. (Missing-material fail-closed behavior is
 * inherited for free from the reused prepareInputXmlLinearPreFea chain --
 * it already BLOCKs pre-flight before this module ever runs, exercised by
 * that module's own check scripts.)
 */
import assert from 'node:assert/strict';
import { compileLinearPipingInputXmlAnalysisContext } from '../src/core/linear-piping-analysis-consumer/index.js';
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
  <PIPINGMODEL xmlns="" JOBNAME="RRC-CHECK">
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

function authorizedPreFlight({ fileName = 'rrc-check.xml', requestedCaseIds } = {}) {
  const intake = createLinearPipingInputXmlIntake(
    { fileName, content: XML },
    { fallbackUnit: 'mm', requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1', requestedCaseIds },
  );
  let preFlight = prepareLinearPipingInputXmlPreFlight(intake);
  assert.notEqual(preFlight.status, 'BLOCK', `Expected a non-BLOCK pre-flight, got ${preFlight.status}.`);
  if (!preFlight.solveAuthorized) {
    preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
      approverIdentity: 'RRC-CHECK-SCRIPT',
      reason: 'Deterministic anti-drift verification run.',
    });
  }
  return preFlight;
}

// 1. Real end-to-end: assembled request reaches the real Run entry point
// with no hash mismatch against its own independent re-derivation.
{
  const preFlight = authorizedPreFlight();
  const request = buildInputXmlRunRequestCase({
    intake: preFlight.intake,
    preparation: preFlight.preparation,
    caseId: `${preFlight.preparation.structuralPreparation.modelId}-W`,
    analysisIdentity: 'RRC-CHECK-W',
    analysisRevision: 1,
  });
  const context = compileLinearPipingInputXmlAnalysisContext(request, { factorizationCache: null });
  assert.equal(context.sourceAnalysisContext.analysisResult.status, 'QUALIFIED');
  assert.equal(
    context.sourceAnalysisContext.compilation.sourceSemanticHash,
    request.inputXmlSource.semanticHash,
    'Expected the compiled model to be bound to the real, re-parsed InputXML source hash.',
  );
  assert.equal(context.sourceAnalysisContext.compilation.model.elements.length, 2);
}

// 2. Fail closed, not silently default: an unavailable case ID is rejected
// with a diagnostic rather than fabricating one.
{
  const preFlight = authorizedPreFlight();
  assert.throws(
    () => buildInputXmlRunRequestCase({
      intake: preFlight.intake,
      preparation: preFlight.preparation,
      caseId: 'NOT-A-REAL-CASE-ID',
      analysisIdentity: 'RRC-CHECK-MISSING',
      analysisRevision: 1,
    }),
    (error) => error.code === 'INPUTXML_RUN_REQUEST_CASE_UNAVAILABLE',
    'Expected a fail-closed diagnostic for an unavailable case ID.',
  );
}

console.log(JSON.stringify({
  check: 'inputxml-run-request-cases',
  status: 'PASS',
  realRunPathReached: true,
  hashesMatchIndependentRederivation: true,
  unavailableCaseFailsClosed: true,
}));
