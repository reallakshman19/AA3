#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { semanticHash } from '../src/core/shared-piping-model/index.js';
import {
  EMPIRICAL_COMPONENT_COG_CLASSIFICATION,
  EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
} from '../src/workspace/engineering-loads/empirical-component-load-authority.js';
import {
  createCurrentCommonInputExplicitMomentRetention,
} from '../src/workspace/engineering-loads/current-common-input-explicit-moment-retention.js';
import {
  executeCurrentCommonInputEmpiricalRun,
  CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_SCHEMA,
} from '../src/workspace/engineering-loads/current-common-input-empirical-run-runtime.js';
import {
  CURRENT_COMMON_INPUT_EMPIRICAL_SUPPORT_LOAD_EXECUTION_SCHEMA,
} from '../src/workspace/engineering-loads/current-common-input-empirical-support-load-execution.js';

const V2 = 'CHAINAGE_TRIBUTARY_SPAN_V2';
const V3 = 'CHAINAGE_TRIBUTARY_SPAN_V3_COG';

{
  const fixture = runtimeFixture({ selectedMethod: V3 });
  const result = executeCurrentCommonInputEmpiricalRun(fixture.dependencies);
  assert.equal(result.schema, CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_SCHEMA);
  assert.equal(result.selectedMethod, V3);
  assert.equal(result.resultStatus, 'CALCULATED');
  assert.equal(result.supportExecution.executedMethod, V3);
  assert.equal(result.explicitMomentRetention.status, 'NOT_APPLICABLE');
  assert.deepEqual(fixture.calls, [
    'snapshot',
    'workspace',
    'support-model',
    'route-model',
    'master-data',
    'authorize',
    'method-authority',
    'component-authority-audit',
    'explicit-moment-retention',
    'method-selection',
    'mass-projection',
    'support-execution',
    'record-execution',
  ], 'routine execution order must retain source moments before method selection/statics');
  assert.equal(fixture.counts.supportExecution, 1);
  assert.equal(fixture.counts.methodSelection, 1);
  assert.equal(fixture.lastSupportRequest.method, V3);
  assert.equal(fixture.lastRecordedExecution.resultStatus, 'CALCULATED');
  assert.equal(fixture.lastRecordedExecution.explicitMomentRetention.status, 'NOT_APPLICABLE');
  assert.equal(result.policy.postFailureMethodFallbackAllowed, false);
  assert.equal(result.policy.legacyExplicitAuthorityConsumed, false);
  assert.equal(result.policy.runControllerRouted, false);
}

{
  const fixture = runtimeFixture({ selectedMethod: V2, explicitMoment: true });
  const result = executeCurrentCommonInputEmpiricalRun(fixture.dependencies);
  assert.equal(result.selectedMethod, V2);
  assert.equal(result.supportExecution.distribution.status, 'CALCULATED',
    'raw vertical reaction distribution status must remain unchanged');
  assert.equal(result.resultStatus, 'CALCULATED_WITH_EXCEPTIONS');
  assert.equal(result.supportExecution.resultStatus, 'CALCULATED_WITH_EXCEPTIONS');
  assert.equal(result.explicitMomentRetention.status, 'RETAINED');
  assert.equal(result.explicitMomentRetention.records.length, 1);
  assert.equal(result.explicitMomentRetention.records[0].verticalReactionDistribution,
    'NOT_PERFORMED');
  assert.equal(fixture.lastRecordedExecution.explicitMomentRetentionSemanticHash,
    result.explicitMomentRetentionSemanticHash);
}

{
  const fixture = runtimeFixture({ selectedMethod: V2, supportFailure: true });
  assert.throws(
    () => executeCurrentCommonInputEmpiricalRun(fixture.dependencies),
    /selected support execution failed/u,
  );
  assert.equal(fixture.counts.methodSelection, 1);
  assert.equal(fixture.counts.massProjection, 1);
  assert.equal(fixture.counts.supportExecution, 1,
    'selected support method must be attempted exactly once');
  assert.equal(fixture.counts.recordExecution, 0,
    'failed support execution must never be recorded');
  assert.equal(fixture.lastSupportRequest.method, V2);
}

{
  const fixture = runtimeFixture({ selectedMethod: null });
  assert.throws(
    () => executeCurrentCommonInputEmpiricalRun(fixture.dependencies),
    (error) => error?.code === 'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_METHOD_NOT_SELECTED',
  );
  assert.equal(fixture.counts.authorization, 1);
  assert.equal(fixture.counts.methodSelection, 1);
  assert.equal(fixture.counts.massProjection, 0);
  assert.equal(fixture.counts.supportExecution, 0);
  assert.equal(fixture.counts.recordExecution, 0);
}

for (const snapshotKind of ['PARTIAL', 'STALE', 'BLOCKED']) {
  const fixture = runtimeFixture({ snapshotKind });
  assert.throws(
    () => executeCurrentCommonInputEmpiricalRun(fixture.dependencies),
    (error) => error?.code === 'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_COMMON_INPUT_NOT_READY',
    `${snapshotKind} Common Input must fail before routine authorization`,
  );
  assert.equal(fixture.counts.authorization, 0);
  assert.equal(fixture.counts.methodSelection, 0);
  assert.equal(fixture.counts.massProjection, 0);
  assert.equal(fixture.counts.supportExecution, 0);
}

{
  const fixture = runtimeFixture({ activeDataset: false });
  assert.throws(
    () => executeCurrentCommonInputEmpiricalRun(fixture.dependencies),
    (error) => error?.code === 'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_ACTIVE_DATASET_REQUIRED',
  );
  assert.equal(fixture.counts.authorization, 0,
    'system authorization must not be recorded without an active execution dataset');
}

{
  const fixture = runtimeFixture({ engineeringModels: false });
  assert.throws(
    () => executeCurrentCommonInputEmpiricalRun(fixture.dependencies),
    (error) => error?.code === 'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_ENGINEERING_MODELS_REQUIRED',
  );
  assert.equal(fixture.counts.authorization, 0,
    'system authorization must not be recorded without current support/route models');
}

{
  const fixture = runtimeFixture({ recordMismatch: true });
  assert.throws(
    () => executeCurrentCommonInputEmpiricalRun(fixture.dependencies),
    (error) => error?.code === 'CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RECORD_MISMATCH',
  );
  assert.equal(fixture.counts.supportExecution, 1);
  assert.equal(fixture.counts.recordExecution, 1);
}

const runtimeSource = await readFile(
  new URL('../src/workspace/engineering-loads/current-common-input-empirical-run-runtime.js', import.meta.url),
  'utf8',
);
const storeSource = await readFile(
  new URL('../src/workspace/engineering-loads/engineering-support-load-store.js', import.meta.url),
  'utf8',
);
const staticsSource = await readFile(
  new URL('../src/workspace/engineering-loads/support-load-distribution-v3.js', import.meta.url),
  'utf8',
);
assert.match(runtimeSource, /authorizeCurrentNonFeaEmpiricalRun/u);
assert.match(runtimeSource, /auditEmpiricalComponentLoadAuthority/u);
assert.match(runtimeSource, /createCurrentCommonInputExplicitMomentRetention/u);
assert.match(runtimeSource, /explicitMomentRetentionSemanticHash/u,
  'runtime receipt must bind the retained-moment semantic identity');
assert.match(runtimeSource, /evaluateGovernedEmpiricalGravityMethodSelection/u);
assert.match(runtimeSource, /createCurrentCommonInputEmpiricalMassProjection/u);
assert.match(runtimeSource, /calculateCurrentCommonInputEmpiricalSupportLoads/u);
assert.match(runtimeSource, /recordCurrentCommonInputExecution/u);
assert.doesNotMatch(runtimeSource,
  /authorizedEnrichmentConsumerController|authorizedEmpiricalRuntimeStore|createProductionGovernedEmpiricalProjection/u,
  'routine Common Input runtime must not consume the legacy explicit-authority runtime');
assert.doesNotMatch(runtimeSource, /catch\s*\(/u,
  'runtime coordinator must not catch a failed selected method and retry another method');
assert.doesNotMatch(runtimeSource, /load-calc-consumer-controller/u,
  'runtime must not route the Run button');
assert.match(storeSource, /#currentCommonInputExecution/u);
assert.match(storeSource, /recordCurrentCommonInputExecution/u);
assert.match(storeSource, /#authorizedExecution = null;\s*\n\s*this\.#currentCommonInputExecution = current;/u,
  'routine system execution must not masquerade as legacy authorized-handoff custody');
assert.doesNotMatch(staticsSource,
  /current-common-input-explicit-moment-retention|CURRENT_COMMON_INPUT_EXPLICIT_MOMENT_RETENTION/u,
  'raw support-load statics must not know about the separate moment-retention contract');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME',
  deterministicExecutionOrder: true,
  readyOnly: true,
  contextRequiredBeforeAuthorization: true,
  explicitMomentRetainedBeforeSelection: true,
  retainedMomentDoesNotChangeRawDistribution: true,
  retainedMomentPromotesOverallExceptionStatus: true,
  governedMethodSelectedBeforeExecution: true,
  postFailureMethodRetry: false,
  currentMassProjectionRequired: true,
  currentSupportExecutionRequired: true,
  separateExecutionCustody: true,
  runControllerRouted: false,
}, null, 2));

function runtimeFixture({
  selectedMethod = V3,
  snapshotKind = 'READY',
  activeDataset = true,
  engineeringModels = true,
  explicitMoment = false,
  supportFailure = false,
  recordMismatch = false,
} = {}) {
  const calls = [];
  const counts = {
    authorization: 0,
    methodSelection: 0,
    massProjection: 0,
    supportExecution: 0,
    recordExecution: 0,
  };
  let lastSupportRequest = null;
  let lastRecordedExecution = null;
  const snapshot = fixtureSnapshot(snapshotKind);
  const dataset = {
    datasetId: 'PR1494-DATASET',
    version: 1,
    sourceSha256: 'a'.repeat(64),
    sharedModel: { schema: 'shared-piping-model/v1' },
    entities: [],
  };
  const supportSiteModel = { schema: 'support-site-model/v1' };
  const routePartitionModel = { schema: 'route-partition-model/v1' };
  const masterData = { lineList: {}, pipingClass: {}, weight: {} };

  const decision = receipt('run-authorization');
  const methodAuthorization = receipt('method-authorization');
  const gravityMethodAuthority = receipt('gravity-method-authority');
  const componentAuthorityAudit = componentAudit(explicitMoment);
  const explicitMomentRetention = createCurrentCommonInputExplicitMomentRetention({
    componentAuthorityAudit,
  });
  const massProjection = receipt('mass-projection');
  const supportExecution = validSupportExecution({
    selectedMethod: selectedMethod || V3,
    snapshot,
    decision,
    massProjection,
    dataset,
  });

  return {
    calls,
    counts,
    get lastSupportRequest() { return lastSupportRequest; },
    get lastRecordedExecution() { return lastRecordedExecution; },
    dependencies: {
      authorizedAt: '2026-08-27T16:30:00.000Z',
      snapshotProvider() {
        calls.push('snapshot');
        return snapshot;
      },
      workspaceState: {
        getSnapshot() {
          calls.push('workspace');
          return activeDataset ? { status: 'ready', dataset } : { status: 'empty', dataset: null };
        },
      },
      modelStore: {
        getSupportSiteModel() {
          calls.push('support-model');
          return engineeringModels ? supportSiteModel : null;
        },
        getRoutePartitionModel() {
          calls.push('route-model');
          return engineeringModels ? routePartitionModel : null;
        },
      },
      masterDataProvider() {
        calls.push('master-data');
        return masterData;
      },
      authorizationProvider(receivedSnapshot) {
        calls.push('authorize');
        counts.authorization += 1;
        assert.equal(receivedSnapshot, snapshot);
        return { decision, methodAuthorization };
      },
      gravityMethodAuthorityProvider(profile) {
        calls.push('method-authority');
        assert.equal(profile, snapshot.commonInput.projectDataProfile);
        return gravityMethodAuthority;
      },
      componentAuthorityAuditProvider(input) {
        calls.push('component-authority-audit');
        assert.equal(input.dataset, dataset);
        assert.equal(input.profile, snapshot.commonInput.projectDataProfile);
        assert.equal(input.routePartitionModel, routePartitionModel);
        return componentAuthorityAudit;
      },
      explicitMomentRetentionProvider(input) {
        calls.push('explicit-moment-retention');
        assert.equal(input.componentAuthorityAudit, componentAuthorityAudit);
        return explicitMomentRetention;
      },
      methodSelectionProvider(input) {
        calls.push('method-selection');
        counts.methodSelection += 1;
        assert.equal(input.gravityMethodAuthority, gravityMethodAuthority);
        assert.equal(input.dataset, dataset);
        assert.equal(input.routePartitionModel, routePartitionModel);
        assert.equal(input.explicitMomentRetention, explicitMomentRetention);
        return {
          ...receipt('governed-selection'),
          selection: {
            selectedMethod,
            explicitMomentRetentionSemanticHash: explicitMomentRetention.semanticHash,
          },
        };
      },
      massProjectionProvider(input) {
        calls.push('mass-projection');
        counts.massProjection += 1;
        assert.equal(input.snapshot, snapshot);
        assert.equal(input.runAuthorization, decision);
        return massProjection;
      },
      supportExecutionProvider(input) {
        calls.push('support-execution');
        counts.supportExecution += 1;
        lastSupportRequest = input;
        assert.equal(input.massProjection, massProjection);
        assert.equal(input.dataset, dataset);
        assert.equal(input.supportSiteModel, supportSiteModel);
        assert.equal(input.routePartitionModel, routePartitionModel);
        assert.equal(input.masterData, masterData);
        if (supportFailure) throw new Error('selected support execution failed');
        return supportExecution;
      },
      executionStore: {
        recordCurrentCommonInputExecution(value) {
          calls.push('record-execution');
          counts.recordExecution += 1;
          lastRecordedExecution = value;
          return recordMismatch
            ? { ...value, semanticHash: semanticHash({ mismatch: true }) }
            : value;
        },
      },
    },
  };
}

function validSupportExecution({ selectedMethod, snapshot, decision, massProjection, dataset }) {
  const distribution = {
    method: selectedMethod,
    status: 'CALCULATED',
    loadCases: [],
  };
  const material = {
    schema: CURRENT_COMMON_INPUT_EMPIRICAL_SUPPORT_LOAD_EXECUTION_SCHEMA,
    requestedMethod: selectedMethod,
    executedMethod: selectedMethod,
    projectId: null,
    datasetId: dataset.datasetId,
    datasetVersion: dataset.version,
    commonInputSemanticHash: snapshot.commonInput.semanticHash,
    commonInputSealSemanticHash: snapshot.commonInput.seal.semanticHash,
    runAuthorizationSemanticHash: decision.semanticHash,
    massProjectionSemanticHash: massProjection.semanticHash,
    qualifiedCaseMassBindingSemanticHash: hash('qualified-case-mass-binding'),
    sourceDatasetSha256: dataset.sourceSha256,
    sourceModelSemanticHash: hash('source-model'),
    supportSiteModelSemanticHash: hash('support-site-model'),
    routePartitionModelSemanticHash: hash('route-partition-model'),
    distributionSemanticHash: semanticHash(distribution),
    mappingSummary: {},
    policy: {
      legacyPublicationOrHandoffAuthorityAsserted: false,
      legacyMassMapsConsumed: false,
      massRecompositionPerformed: false,
      zeroMassPermitted: true,
      projectDataWorkflow: 'loadCalcProjectBasis',
      forceFormula: 'massKg * gravityMPerS2 * loadFactor',
      allocationMechanicsChanged: false,
      equilibriumMechanicsChanged: false,
    },
    distribution,
  };
  return { ...material, semanticHash: semanticHash(material) };
}

function componentAudit(explicitMoment) {
  const records = explicitMoment ? [{
    entityId: 'VALVE-M1',
    sourceEntityId: 'SRC-VALVE-M1',
    entityType: 'VALVE',
    routeId: 'R1',
    currentMethodPointChainageMm: 1000,
    cogClassification: EMPIRICAL_COMPONENT_COG_CLASSIFICATION.ON_ROUTE,
    cogEvidence: null,
    projection: null,
    candidateChainageMm: 1000,
    explicitMoment: {
      magnitudeNm: 250,
      axis: 'Z',
      magnitudeEvidence: { source: 'RUNTIME-FIXTURE' },
      axisEvidence: { source: 'RUNTIME-FIXTURE' },
    },
    integrationEligible: false,
    integrationDisposition: 'BLOCKED_PENDING_POLICY_OR_EVIDENCE',
    blockers: [{ code: 'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED' }],
  }] : [];
  const base = {
    schema: EMPIRICAL_COMPONENT_LOAD_AUTHORITY_AUDIT_SCHEMA,
    datasetId: 'PR1494-DATASET',
    datasetVersion: 1,
    sourceDatasetHash: 'sha256:runtime-fixture',
    sharedModelSemanticHash: hash('audit-source-model'),
    routePartitionModelSemanticHash: hash('audit-route-model'),
    projectDataProfileSemanticHash: hash('audit-project-data'),
    toleranceMm: 1,
    status: explicitMoment ? 'BLOCKED' : 'READY_FOR_INTEGRATION_DESIGN',
    records,
    blockers: explicitMoment ? [{
      code: 'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED',
      entityId: 'VALVE-M1',
      routeId: 'R1',
    }] : [],
    summary: {},
    numericalMethodChanged: false,
  };
  return { ...base, semanticHash: semanticHash(base) };
}

function fixtureSnapshot(kind) {
  const ready = kind === 'READY' || kind === 'STALE';
  const partial = kind === 'PARTIAL';
  const commonInputMaterial = {
    packageState: ready ? 'READY' : partial ? 'PARTIALLY_READY' : 'BLOCKED',
    sealedMethodIds: ready || partial ? ['WEIGHT_AND_GRAVITY'] : [],
    blockedMethodIds: partial ? ['SUSTAINED_REACTIONS'] : kind === 'BLOCKED' ? ['WEIGHT_AND_GRAVITY'] : [],
    projectDataProfile: { schema: 'project-data-profile/v1' },
    seal: { semanticHash: semanticHash({ seal: kind }) },
  };
  return {
    commonInput: {
      ...commonInputMaterial,
      semanticHash: semanticHash(commonInputMaterial),
    },
    staleness: { stale: kind === 'STALE' },
    error: null,
  };
}

function receipt(id) {
  return { id, semanticHash: semanticHash({ id }) };
}

function hash(id) {
  return semanticHash({ id });
}
