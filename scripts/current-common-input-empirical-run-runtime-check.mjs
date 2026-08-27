#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { semanticHash } from '../src/core/shared-piping-model/index.js';
import {
  executeCurrentCommonInputEmpiricalRun,
  CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_SCHEMA,
} from '../src/workspace/engineering-loads/current-common-input-empirical-run-runtime.js';

const V2 = 'CHAINAGE_TRIBUTARY_SPAN_V2';
const V3 = 'CHAINAGE_TRIBUTARY_SPAN_V3_COG';

{
  const fixture = runtimeFixture({ selectedMethod: V3 });
  const result = executeCurrentCommonInputEmpiricalRun(fixture.dependencies);
  assert.equal(result.schema, CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME_SCHEMA);
  assert.equal(result.selectedMethod, V3);
  assert.equal(result.supportExecution.executedMethod, V3);
  assert.deepEqual(fixture.calls, [
    'snapshot',
    'workspace',
    'support-model',
    'route-model',
    'master-data',
    'authorize',
    'method-authority',
    'method-selection',
    'mass-projection',
    'support-execution',
    'record-execution',
  ], 'routine execution order must be deterministic and select before mass/statics');
  assert.equal(fixture.counts.supportExecution, 1);
  assert.equal(fixture.counts.methodSelection, 1);
  assert.equal(fixture.lastSupportRequest.method, V3);
  assert.equal(result.policy.postFailureMethodFallbackAllowed, false);
  assert.equal(result.policy.legacyExplicitAuthorityConsumed, false);
  assert.equal(result.policy.runControllerRouted, false);
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
assert.match(runtimeSource, /authorizeCurrentNonFeaEmpiricalRun/u);
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
  'PR1478 must not route the Run button');
assert.match(storeSource, /#currentCommonInputExecution/u);
assert.match(storeSource, /recordCurrentCommonInputExecution/u);
assert.match(storeSource, /#authorizedExecution = null;\s*\n\s*this\.#currentCommonInputExecution = current;/u,
  'routine system execution must not masquerade as legacy authorized-handoff custody');

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_CURRENT_COMMON_INPUT_EMPIRICAL_RUN_RUNTIME',
  deterministicExecutionOrder: true,
  readyOnly: true,
  contextRequiredBeforeAuthorization: true,
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
  const snapshot = fixtureSnapshot(snapshotKind);
  const dataset = {
    datasetId: 'PR1478-DATASET',
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
  const governedSelection = {
    ...receipt('governed-selection'),
    selection: { selectedMethod },
  };
  const massProjection = receipt('mass-projection');
  const distribution = { method: selectedMethod || V3, status: 'CALCULATED' };
  const supportExecution = {
    ...receipt('support-execution'),
    executedMethod: selectedMethod || V3,
    distribution,
  };

  return {
    calls,
    counts,
    get lastSupportRequest() { return lastSupportRequest; },
    dependencies: {
      authorizedAt: '2026-08-26T15:00:00.000Z',
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
      methodSelectionProvider(input) {
        calls.push('method-selection');
        counts.methodSelection += 1;
        assert.equal(input.gravityMethodAuthority, gravityMethodAuthority);
        assert.equal(input.dataset, dataset);
        assert.equal(input.routePartitionModel, routePartitionModel);
        return governedSelection;
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
          assert.equal(value, supportExecution);
          return recordMismatch
            ? { ...supportExecution, semanticHash: semanticHash({ mismatch: true }) }
            : supportExecution;
        },
      },
    },
  };
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
