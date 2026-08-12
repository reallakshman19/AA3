import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sealInterfaceProfile } from '../src/core/linear-piping-interface/index.js';
import { createSharedPipingModel } from '../src/core/shared-piping-model/index.js';
import {
  buildRestraintCapabilityModel,
  buildSupportAttachmentModel,
} from '../src/core/support-restraints/index.js';
import { createLfeaNativeExecutionAuthority } from '../src/lfea/native-execution-authority.js';
import {
  LFEA_PUBLICATION_STATUS,
  createLfeaNativePublicationReadiness,
} from '../src/lfea/native-publication-readiness.js';
import { createLfeaNativeResultsAuthority } from '../src/lfea/native-results-authority.js';
import { createLfeaNativeSupportPublicationAuthority } from '../src/lfea/native-support-publication-authority.js';
import {
  LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID,
  createLinearPipingInputXmlIntake,
} from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import {
  exactTopology,
  pipeComponent,
  point,
  supportEvidence,
  supportRecord,
} from './w10.3-support-restraint-fixtures.mjs';

const preFlight = authorizedPreFlight(fixtureXml(1000));
const executionAuthority = createLfeaNativeExecutionAuthority();
const executionState = executionAuthority.run(preFlight);
const resultsAuthority = createLfeaNativeResultsAuthority();
const resultsState = resultsAuthority.recover(preFlight, executionState);
const supportAuthority = createLfeaNativeSupportPublicationAuthority();
const supportInputHorizontal = supportInput(preFlight, false);

const initiallyBlocked = createLfeaNativePublicationReadiness({ preFlight, resultsState });
assert.equal(initiallyBlocked.supportActions.status, LFEA_PUBLICATION_STATUS.BLOCKED);
assert.ok(initiallyBlocked.supportActions.reasonCodes.includes('GOVERNED_INTERFACE_SET_REQUIRED'));
console.log('LFEA-SUPPORT-PUB-01 PASS native solve/recovery cannot fabricate support authority');

const staged = supportAuthority.stage(preFlight, supportInputHorizontal);
assert.equal(staged.authorityCurrentness, 'REVIEW_REQUIRED');
assert.equal(staged.authorization, null);
assert.equal(supportAuthority.getCurrentAuthority(), null);
assert.throws(
  () => supportAuthority.publish(preFlight, executionState, resultsState),
  (error) => error?.code === 'LFEA_NATIVE_SUPPORT_REVIEW_REQUIRED',
);
const stagedReadiness = createLfeaNativePublicationReadiness({
  preFlight,
  resultsState,
  supportAuthority: supportAuthority.readinessAuthority(preFlight, executionState, resultsState),
});
assert.equal(stagedReadiness.supportActions.status, LFEA_PUBLICATION_STATUS.BLOCKED);
console.log('LFEA-SUPPORT-PUB-02 PASS staged support semantics cannot publish or become READY before review');

assert.throws(
  () => supportAuthority.authorize(preFlight, {
    reviewerIdentity: 'LFEA-SUPPORT-REVIEWER',
    reason: 'Explicit support semantics review.',
    acceptedAuthoritySemanticHash: 'fnv1a64:0000000000000001',
  }),
  (error) => error?.code === 'LFEA_NATIVE_SUPPORT_REVIEW_AUTHORITY_MISMATCH',
);
const reviewed = supportAuthority.authorize(preFlight, reviewApproval(staged.authority));
assert.equal(reviewed.authorityCurrentness, 'CURRENT');
assert.equal(reviewed.authorization.supportAuthoritySemanticHash, staged.authority.semanticHash);
assert.equal(reviewed.authorization.reviewerIdentity, 'LFEA-SUPPORT-REVIEWER');
console.log('LFEA-SUPPORT-PUB-03 PASS exact authority hash + reviewer identity/reason are required for support acceptance');

const readinessAuthority = supportAuthority.readinessAuthority(preFlight, executionState, resultsState);
const readiness = createLfeaNativePublicationReadiness({
  preFlight,
  resultsState,
  supportAuthority: readinessAuthority,
});
assert.equal(readiness.supportActions.status, LFEA_PUBLICATION_STATUS.READY);
assert.equal(readiness.b31Code.status, LFEA_PUBLICATION_STATUS.BLOCKED);
assert.ok(readiness.b31Code.reasonCodes.includes('COMPONENT_CODE_POINT_RECOVERY_REQUIRED'));
console.log('LFEA-SUPPORT-PUB-04 PASS reviewed support chain is READY while B31 remains separately blocked');

const rawBefore = executionAuthority.getState();
const recoveryBefore = resultsAuthority.getState();
const published = supportAuthority.publish(preFlight, executionState, resultsState);
assert.equal(published.publicationCurrentness, 'CURRENT');
assert.strictEqual(executionAuthority.getState(), rawBefore);
assert.strictEqual(resultsAuthority.getState(), recoveryBefore);
const firstCase = published.publications[0];
const firstRaw = executionState.execution.caseExecutions.find((row) => row.caseId === firstCase.caseId);
assert.equal(firstCase.publication.executionHash, firstRaw.execution.executionHash);
assert.equal(firstCase.publication.physicalLoadCaseHash, firstRaw.physicalLoadCaseHash);
assert.equal(firstCase.publication.actions[0].triadStatus, 'RESOLVED');
console.log('LFEA-SUPPORT-PUB-05 PASS publication consumes exact retained B-3.3/B-3.4 evidence without re-solving');

assert.throws(
  () => createLfeaNativeSupportPublicationAuthority().stage(preFlight, {
    ...supportInputHorizontal,
    parentModelSemanticHash: 'fnv1a64:0000000000000001',
  }),
  (error) => error?.code === 'LFEA_NATIVE_SUPPORT_PARENT_MISMATCH',
);
assert.throws(
  () => createLfeaNativeSupportPublicationAuthority().stage(
    preFlight,
    supportInput(preFlight, false, 'fnv1a64:0000000000000002'),
  ),
  (error) => error?.code === 'LFEA_NATIVE_SUPPORT_SOURCE_CUSTODY_MISMATCH',
);
console.log('LFEA-SUPPORT-PUB-06 PASS mismatched analysis/support source parents fail closed');

const movedPreFlight = authorizedPreFlight(fixtureXml(1200));
const stale = supportAuthority.reconcile(movedPreFlight, executionState, resultsState);
assert.equal(stale.authorityCurrentness, 'STALE');
assert.equal(stale.publicationCurrentness, 'STALE');
assert.equal(supportAuthority.getCurrentPublications(), null);
const returnedToOld = supportAuthority.reconcile(preFlight, executionState, resultsState);
assert.equal(returnedToOld.authorityCurrentness, 'STALE');
assert.equal(returnedToOld.publicationCurrentness, 'STALE');
console.log('LFEA-SUPPORT-PUB-07 PASS stale authority/publication cannot auto-reactivate when an old hash reappears');

const verticalAuthority = createLfeaNativeSupportPublicationAuthority();
const verticalStaged = verticalAuthority.stage(preFlight, supportInput(preFlight, true));
verticalAuthority.authorize(preFlight, reviewApproval(verticalStaged.authority));
const vertical = verticalAuthority.publish(preFlight, executionState, resultsState);
const verticalAction = vertical.publications[0].publication.actions[0];
assert.equal(verticalAction.triadStatus, 'BLOCKED_AXIS_DEGENERATE');
assert.equal(verticalAction.triadReason, 'AXIAL_PARALLEL_TO_VERTICAL');
assert.equal(verticalAction.fLateral, null);
assert.equal(verticalAction.fVertical, null);
console.log('LFEA-SUPPORT-PUB-08 PASS vertical-riser Fl/Fv remain null/blocked, never false zero');

sourceGuards();
console.log('LFEA-SUPPORT-PUB-09 PASS source guards preserve producer ownership and review authority');
console.log(JSON.stringify({
  check: 'lfea-standalone-native-support-publication',
  status: 'PASS',
  reviewRequired: true,
  secondSolve: false,
  sourceCustodyFailClosed: true,
  stickyStale: true,
  verticalDegeneracyNull: true,
  b31StillSeparate: true,
}));

function reviewApproval(authority) {
  return {
    reviewerIdentity: 'LFEA-SUPPORT-REVIEWER',
    reason: 'Explicit review of support attachment, restraint, interface, gravity-up and tolerance authority.',
    acceptedAuthoritySemanticHash: authority.semanticHash,
  };
}

function supportInput(currentPreFlight, vertical, sourceHash = null) {
  const compilation = currentPreFlight.preparation.structuralPreparation.compilation;
  const constrained = compilation.model.constraints[0];
  assert.ok(constrained, 'Fixture requires a governed constraint.');
  const node = compilation.model.nodes.find((row) => row.nodeId === constrained.nodeId);
  const sourceEntityId = node?.sourceAncestry?.sourceComponentIds?.[0];
  assert.ok(sourceEntityId, 'Constrained node must retain source-component ancestry.');
  const snapshotHash = sourceHash ?? currentPreFlight.preparation.sourceBundleSemanticHash;
  const evidence = supportEvidence({
    componentReferences: sourceEntityId,
    supportTypes: 'ANCHOR',
    vertical: 'FIXED', lateral: 'FIXED', longitudinal: 'FIXED', rotational: 'FIXED',
  });
  const shared = createSharedPipingModel({
    project: { datasetId: 'LFEA-NATIVE-SUPPORT', name: 'LFEA Native Support', sourceName: 'governed-support.json' },
    units: { length: 'mm', force: 'N', mass: 'kg' },
    sourceSnapshotRef: {
      schema: 'source-package-snapshot/v1', datasetId: 'LFEA-NATIVE-SUPPORT',
      sourceSchema: 'fea-inputxml-source-bundle/v1', sourceSemanticHash: snapshotHash, sourceByteHash: null,
    },
    components: [pipeComponent(sourceEntityId, point(0), point(1000), { sourceEntityId })],
    supports: [supportRecord('SUP-NATIVE-01', point(0), { sourceType: 'ANCHOR', supportEvidence: evidence })],
    sourceReferences: { nodes: [] }, diagnostics: [],
  });
  const attachment = buildSupportAttachmentModel(shared, exactTopology(shared));
  const restraint = buildRestraintCapabilityModel(attachment);
  const attached = attachment.attachments[0];
  const restrained = restraint.restraints[0];
  const dofMappings = compilation.model.constraints
    .filter((row) => row.nodeId === node.nodeId)
    .map((row) => ({
      dof: row.dof, behavior: row.behavior,
      constraintId: row.constraintId, stiffness: row.stiffness ?? null,
    }));
  const basis = vertical
    ? { origin: node.position, e1: { x: 0, y: 0, z: 1 }, e2: { x: 1, y: 0, z: 0 }, e3: { x: 0, y: 1, z: 0 } }
    : { origin: node.position, e1: { x: 1, y: 0, z: 0 }, e2: { x: 0, y: 1, z: 0 }, e3: { x: 0, y: 0, z: 1 } };
  return {
    parentSourceBundleSemanticHash: currentPreFlight.preparation.sourceBundleSemanticHash,
    parentModelSemanticHash: currentPreFlight.preparation.modelSemanticHash,
    supportSharedModel: shared,
    supportAttachmentModel: attachment,
    restraintCapabilityModel: restraint,
    definitions: [{
      interfaceId: vertical ? 'IF-NATIVE-VERTICAL' : 'IF-NATIVE-HORIZONTAL',
      interfaceKind: 'SUPPORT', nodeId: node.nodeId, sourceEntityId,
      supportBinding: {
        supportKey: attached.supportKey,
        attachmentId: attached.attachmentId,
        restraintId: restrained.restraintId,
      },
      basis,
      referencePointGlobal: node.position,
      leverReferenceToNodeLocal: { x: 0, y: 0, z: 0 },
      dofMappings,
      reportingSignConvention: 'FORCE_ON_INTERFACE_FROM_PIPE',
      sourceEvidence: {
        sourceId: 'LFEA-NATIVE-SUPPORT-QUALIFICATION', sourceRevision: '01',
        sourceSemanticHash: currentPreFlight.preparation.sourceBundleSemanticHash,
      },
      allowableProfileHash: null,
    }],
    interfaceProfile: sealInterfaceProfile({
      schema: 'linear-piping-interface-profile/v1',
      profileId: 'LFEA-NATIVE-SUPPORT-INTERFACE-R1',
      basisTolerance: { value: 1e-12, source: 'LFEA-NATIVE-SUPPORT-QUALIFICATION' },
      positionTolerance: { value: 1e-12, source: 'LFEA-NATIVE-SUPPORT-QUALIFICATION' },
      offsetTolerance: { value: 1e-12, source: 'LFEA-NATIVE-SUPPORT-QUALIFICATION' },
      semanticHash: '',
    }),
    upGlobal: { value: { x: 0, y: 0, z: 1 }, source: 'LFEA-NATIVE-SUPPORT-QUALIFICATION' },
    parallelTolerance: { value: 1e-10, source: 'LFEA-NATIVE-SUPPORT-QUALIFICATION' },
    modelVersion: { value: 1, source: 'LFEA-NATIVE-SUPPORT-QUALIFICATION' },
  };
}

function sourceGuards() {
  const authority = fs.readFileSync('src/lfea/native-support-publication-authority.js', 'utf8');
  const authorization = fs.readFileSync('src/lfea/native-support-authorization.js', 'utf8');
  const caseChain = fs.readFileSync('src/lfea/native-support-publication-case-chain.js', 'utf8');
  const view = fs.readFileSync('src/lfea/native-results-view.js', 'utf8');
  const runtime = fs.readFileSync('src/lfea/standalone-runtime.js', 'utf8');
  const api = fs.readFileSync('src/lfea/standalone-runtime-api.js', 'utf8');
  for (const source of [authority, caseChain, view, runtime]) {
    assert.doesNotMatch(source, /forceLocal\s*\.|fAxial\s*=|fLateral\s*=|fVertical\s*=/u);
  }
  assert.doesNotMatch(`${authority}\n${caseChain}`, /compileSolverExecution|compileResultRecovery/u);
  assert.match(caseChain, /composeLinearPipingAnalysisResult/u);
  assert.match(authority, /sealLfeaNativeSupportAuthorization/u);
  assert.match(authority, /recoverLinearPipingInterfaceLoads/u);
  assert.match(authorization, /reviewerIdentity/u);
  assert.match(api, /stageNativeSupportAuthority/u);
  assert.match(api, /authorizeNativeSupportAuthority/u);
  assert.doesNotMatch(api, /installNativeSupportAuthority/u);
  assert.match(view, /action\.fAxial/u);
  assert.match(view, /value === null[^\n]*\|\| value === undefined/u);
  assert.ok(lineCount(authority) < 300, `support authority is ${lineCount(authority)} lines`);
  assert.ok(lineCount(caseChain) < 300, `support case chain is ${lineCount(caseChain)} lines`);
  assert.ok(lineCount(runtime) < 300, `runtime is ${lineCount(runtime)} lines`);
  assert.ok(lineCount(api) < 120, `runtime API is ${lineCount(api)} lines`);
}
function lineCount(source) { return source.split(/\r?\n/u).length; }

function authorizedPreFlight(content) {
  const intake = createLinearPipingInputXmlIntake({ fileName: 'support-publication.xml', content }, {
    requestedProfileId: 'STRICT_INPUTXML_LINEAR_STATIC_V1',
    requestedCaseIds: [LINEAR_PIPING_INPUTXML_DEFAULT_CASE_ID],
  });
  let record = prepareLinearPipingInputXmlPreFlight(intake);
  if (record.status === 'BLOCK') throw new Error('Support publication fixture unexpectedly BLOCKED.');
  if (!record.solveAuthorized) {
    record = authorizeLinearPipingInputXmlPreFlight(record, {
      approverIdentity: 'LFEA-NATIVE-SUPPORT-QUALIFICATION',
      reason: 'Test-only acceptance of the complete disclosed conditional limitation set.',
    });
  }
  return record;
}

function fixtureXml(length) {
  return `<CAESARII xmlns="COADE" VERSION="14.00" XML_TYPE="Input"><UNITS>
  <LENGTH LABEL="MM" FACTOR="25.4"/><FORCE LABEL="N" FACTOR="4.4482216152605"/>
  <MOMENT-INPUT LABEL="N-M" FACTOR="0.1129848290276167"/><STRESS LABEL="MPA" FACTOR="0.006894757293168"/>
  <PRESSURE LABEL="MPA" FACTOR="0.006894757293168"/><EMOD LABEL="MPA" FACTOR="0.006894757293168"/>
  <TEMP LABEL="C" FACTOR="0.5555555555555556"/><PDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  <IDENS LABEL="KG/M3" FACTOR="27679.9047102"/><FDENS LABEL="KG/M3" FACTOR="27679.9047102"/>
  </UNITS><PIPINGMODEL xmlns="" JOBNAME="LFEA-SUPPORT-PUBLICATION">
  <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="${length}" DELTA_Y="0" DELTA_Z="0"
  DIAMETER="114.3" WALL_THICK="6.02" MATERIAL_NAME="A106 Grade B" MATERIAL_NUM="106"
  MODULUS="200000" POISSONS="0.3" PIPE_DENSITY="7850" TEMP_EXP_C1="100">
  <RESTRAINT NODE="10" TYPE="0" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
  </PIPINGELEMENT></PIPINGMODEL></CAESARII>`;
}
