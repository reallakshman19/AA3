#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
} from '../src/core/linear-piping-analysis-consumer/inputxml-linear-prefea-contract.js';
import { diagnoseInputXmlLinearPreFea } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-prefea-diagnostics.js';
import { prepareInputXmlLinearPreFea } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-prefea-preparation.js';
import { authorizeInputXmlLinearSolve } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-solve-authorization.js';
import { parseInputXmlModelHealthSource } from '../src/core/linear-piping-analysis-consumer/inputxml-source-binding.js';
import {
  authorizeLinearPipingRunGate,
  createLinearPipingRunGate,
  requireLinearPipingRunGate,
} from '../src/workspace/linear-piping-run-gate.js';
import {
  LINEAR_PIPING_WORKBENCH_RUN_REQUEST_SCHEMA,
} from '../src/workspace/linear-piping-run-request.js';

const CASE_ID = 'P09-W';
const PROFILE_ID = 'STRICT_INPUTXML_LINEAR_STATIC_V1';
const XML = `<PIPINGMODEL JOBNAME="P09">
  <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1000" DELTA_Y="0" DELTA_Z="0"
    DIAMETER="100" WALL_THICK="5" MATERIAL_NAME="A106-B">
    <RESTRAINT NODE="10" TYPE="1" XCOSINE="1" YCOSINE="0" ZCOSINE="0"/>
  </PIPINGELEMENT>
</PIPINGMODEL>`;

const results = [];

const passRequest = workbenchRequest('PASS');
const passGate = createLinearPipingRunGate(passRequest, operations({ status: 'PASS' }));
assert.equal(passGate.status, 'PASS');
assert.equal(passGate.solveAuthorized, true);
assert.equal(passGate.cases.length, 1);
assert.match(passGate.semanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.match(passGate.cases[0].diagnosticsSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.match(passGate.cases[0].preparationSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.match(passGate.cases[0].authorizationSemanticHash, /^fnv1a64:[0-9a-f]{16}$/u);
assert.equal(passGate.cases[0].approverIdentity, 'SYSTEM_POLICY');
assert.equal(requireLinearPipingRunGate(passGate, passRequest).semanticHash, passGate.semanticHash);
results.push({
  id: 'P09-GATE-01',
  status: 'PASS',
  statement: 'PASS preparation receives the existing automatic sealed authorization.',
  gateSemanticHash: passGate.semanticHash,
  authorizationSemanticHash: passGate.cases[0].authorizationSemanticHash,
});

const warnRequest = workbenchRequest('WARN');
const warnGate = createLinearPipingRunGate(warnRequest, operations({ status: 'WARN' }));
assert.equal(warnGate.status, 'WARN');
assert.equal(warnGate.solveAuthorized, false);
assert.equal(warnGate.cases[0].authorization, null);
assert.throws(
  () => requireLinearPipingRunGate(warnGate, warnRequest),
  (error) => error?.code === 'PIPING_RUN_GATE_AUTHORIZATION_REQUIRED',
);
assert.throws(
  () => authorizeLinearPipingRunGate(warnGate, { approverIdentity: '', reason: 'reviewed' }),
  (error) => error?.code === 'PIPING_RUN_GATE_REVIEW_FIELD_REQUIRED',
);
const authorizedWarnGate = authorizeLinearPipingRunGate(warnGate, {
  approverIdentity: 'P09-QUALIFICATION-ENGINEER',
  reason: 'Reviewed the retained stiffness-conditioning warning and accept the complete limitation set.',
});
assert.equal(authorizedWarnGate.status, 'WARN');
assert.equal(authorizedWarnGate.solveAuthorized, true);
assert.equal(authorizedWarnGate.cases[0].approverIdentity, 'P09-QUALIFICATION-ENGINEER');
assert.deepEqual(
  authorizedWarnGate.cases[0].limitationsAccepted,
  authorizedWarnGate.cases[0].limitations,
  'WARN authorization must accept the complete retained limitation set.',
);
assert.ok(authorizedWarnGate.cases[0].conditionalFindingIds.length > 0);
assert.equal(
  requireLinearPipingRunGate(authorizedWarnGate, warnRequest).semanticHash,
  authorizedWarnGate.semanticHash,
);
results.push({
  id: 'P09-GATE-02',
  status: 'PASS',
  statement: 'WARN remains disabled until explicit reviewer acceptance seals the complete limitation set.',
  gateSemanticHash: authorizedWarnGate.semanticHash,
  acceptedLimitations: authorizedWarnGate.cases[0].limitationsAccepted,
});

const blockRequest = workbenchRequest('BLOCK');
const blockGate = createLinearPipingRunGate(blockRequest, operations({ status: 'BLOCK' }));
assert.equal(blockGate.status, 'BLOCK');
assert.equal(blockGate.solveAuthorized, false);
assert.ok(blockGate.cases[0].blockingFindingIds.length > 0);
assert.throws(
  () => authorizeLinearPipingRunGate(blockGate, {
    approverIdentity: 'P09-QUALIFICATION-ENGINEER',
    reason: 'Attempted prohibited override.',
  }),
  (error) => error?.code === 'PIPING_RUN_GATE_BLOCK_OVERRIDE_PROHIBITED',
);
assert.throws(
  () => requireLinearPipingRunGate(blockGate, blockRequest),
  (error) => error?.code === 'PIPING_RUN_GATE_BLOCKED',
);
results.push({
  id: 'P09-GATE-03',
  status: 'PASS',
  statement: 'BLOCK cannot be overridden and cannot reach runtime authorization.',
  blockingFindingIds: blockGate.cases[0].blockingFindingIds,
});

const stale = structuredClone(passRequest);
stale.applicationId = 'P09-APPLICATION-MODIFIED';
assert.throws(
  () => requireLinearPipingRunGate(passGate, stale),
  (error) => error?.code === 'PIPING_RUN_GATE_STALE'
    && error?.analysisStage === 'PRE_FEA_RUN_GATE',
);
results.push({
  id: 'P09-GATE-04',
  status: 'PASS',
  statement: 'Any workbench request identity change invalidates the sealed gate.',
});

const tampered = structuredClone(authorizedWarnGate);
tampered.cases[0].authorizationSemanticHash = 'fnv1a64:0000000000000000';
assert.throws(
  () => requireLinearPipingRunGate(tampered, warnRequest),
  (error) => error?.code === 'PIPING_RUN_GATE_HASH_INVALID',
);
results.push({
  id: 'P09-GATE-05',
  status: 'PASS',
  statement: 'Receipt-field tamper fails the top-level gate semantic hash before runtime.',
});

const repeatedPass = createLinearPipingRunGate(passRequest, operations({ status: 'PASS' }));
assert.equal(repeatedPass.semanticHash, passGate.semanticHash);
assert.equal(JSON.stringify(repeatedPass), JSON.stringify(passGate));
results.push({
  id: 'P09-GATE-06',
  status: 'PASS',
  statement: 'Identical request and authorities produce a byte-deterministic run-gate receipt.',
});

console.log(JSON.stringify({
  check: 'linear-piping-run-gate',
  status: 'PASS',
  authority: 'EXISTING_PREFEA_PREPARATION_AND_SOLVE_AUTHORIZATION',
  runtimeCreated: false,
  results,
}));

function workbenchRequest(label) {
  return {
    schema: LINEAR_PIPING_WORKBENCH_RUN_REQUEST_SCHEMA,
    applicationId: `P09-APPLICATION-${label}`,
    cases: [{
      caseId: CASE_ID,
      inputXmlAnalysisRequest: acceptedAnalysisRequest(label),
    }],
    interfaceAuthority: { fixture: 'P09-CONTRACT-ONLY' },
    nozzleAllowableProfiles: [],
    b31Authority: { fixture: 'P09-CONTRACT-ONLY' },
  };
}

function acceptedAnalysisRequest(label) {
  return {
    inputXmlSource: {
      content: XML,
      fileName: `p09-${label.toLowerCase()}.xml`,
      semanticHash: `P09-SOURCE-${label}`,
      contentHash: `P09-CONTENT-${label}`,
    },
    ingestionOptions: {
      unit: 'mm',
      source: 'P09',
      componentOrigins: {},
      restraintTypeCodeMap: { 1: 'ANCHOR' },
      restraintTypeMutation: { enabled: false, rows: [] },
      bendRadiusTolerance: { value: 0.001 },
    },
    conditioning: {},
    sourceAnalysisRequest: {},
  };
}

function operations({ status }) {
  const warningFinding = status === 'WARN'
    ? [{
      code: 'CONDITION_NUMBER_WARNING',
      disposition: 'WARN',
      message: 'Controlled P-09 conditioning warning.',
      technicalBasis: 'Qualification fixture exercises the existing conditional authorization path.',
      evidence: { conditionEstimate: 1e9 },
      remediation: 'Review conditioning evidence and explicitly accept the limitation.',
    }]
    : [];
  return {
    requestedProfileId: PROFILE_ID,
    diagnose: ({ analysisRequest, requestedProfileId, requestedCaseIds }) => diagnoseInputXmlLinearPreFea({
      schema: INPUTXML_LINEAR_PREFEA_REQUEST_SCHEMA,
      analysisRequest,
      requestedProfileId,
      requestedCaseIds,
    }, {
      validateSourceRequest: (value) => value,
      parseSource: parseInputXmlModelHealthSource,
      diagnoseTopology: () => ({ findings: [] }),
      diagnoseProximity: () => ({ findings: [] }),
      diagnoseRepresentability: () => ({
        findings: [],
        capabilities: [{
          capabilityId: 'LINEAR_STRUCTURAL_MODEL',
          status: 'PASS',
          findingIds: [],
          limitationCodes: [],
        }],
      }),
    }),
    prepare: (diagnostics) => prepareInputXmlLinearPreFea(diagnostics, authorityStubs({
      status,
      preflightFindings: warningFinding,
    })),
    authorize: authorizeInputXmlLinearSolve,
  };
}

function authorityStubs({ status, preflightFindings }) {
  return {
    prepareAuthorities: () => ({
      semanticHash: 'P09-AUTH-SEM',
      evidenceHash: 'P09-AUTH-EVID',
      limitations: [],
      summary: { materialResolutionCount: 1, sectionResolutionCount: 1, rigidAuthorityCount: 0 },
    }),
    compileStructure: () => ({
      semanticHash: 'P09-STRUCT-SEM',
      evidenceHash: 'P09-STRUCT-EVID',
      limitations: [],
      compilation: { mechanicalModelSemanticHash: 'P09-MODEL-A' },
      summary: { mechanicalModelSemanticHash: 'P09-MODEL-A', constraintCount: 6 },
    }),
    compilePhysicalCases: () => ({
      semanticHash: 'P09-PHYS-SEM',
      evidenceHash: 'P09-PHYS-EVID',
      physicalCases: [{
        caseId: CASE_ID,
        caseRole: 'WEIGHT_BASE',
        primitiveIds: [`${CASE_ID}-P1`],
        loadCase: {
          semanticHash: `P09-LOAD-${CASE_ID}`,
          physicalLoadCaseHash: `P09-PHYSICAL-${CASE_ID}`,
        },
      }],
      loadLedger: [],
      limitations: [],
      summary: { physicalCaseCount: 1 },
    }),
    preflightStiffness: () => ({
      semanticHash: `P09-PREFLIGHT-${status}`,
      evidenceHash: `P09-PREFLIGHT-EVID-${status}`,
      status,
      stiffnessStateHash: `P09-STIFFNESS-${status}`,
      genericPreflight: {
        findings: preflightFindings,
        components: [],
        assembly: { partitionIdentity: 'P09-FREE-PARTITION' },
        factorization: { kind: 'CHOLESKY', conditionEstimate: status === 'WARN' ? 1e9 : 100 },
      },
      summary: {
        freeDofCount: 6,
        constrainedDofCount: 6,
        conditionEstimate: status === 'WARN' ? 1e9 : 100,
      },
    }),
  };
}
