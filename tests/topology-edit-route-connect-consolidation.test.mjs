import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyConnectWorkflowDefaults,
  applyStartRouteWorkflowDefaults,
  connectWorkflowReadyForPlanning,
  continueRouteWorkflowActive,
  startRouteWorkflowReady,
} from '../src/workspace/viewport-productivity/topology-edit-route-connect-consolidation.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runtime(overrides = {}) {
  return {
    startRouteActive: false,
    connectEndpointsActive: false,
    startRouteValues: {
      inputMode: 'TYPED', catalogueRecordId: '', minimumLengthMm: '', overlapToleranceMm: '',
      startX: '', startY: '', startZ: '', endX: '', endY: '', endZ: '',
    },
    connectValues: {
      catalogueRecordId: '', minimumLengthMm: '', overlapToleranceMm: '',
      allowDirect: false, allowOrthogonal: false, maxAlternatives: '', alternativeId: '',
    },
    startAcquisition: null,
    endAcquisition: null,
    connectStartEndpoint: null,
    connectEndEndpoint: null,
    state: { tool: null },
    ...overrides,
  };
}

test('Start Route defaults to viewport-first capture without manufacturing canonical data', () => {
  const value = runtime();
  applyStartRouteWorkflowDefaults(value);
  assert.equal(value.startRouteValues.inputMode, 'VIEWPORT');
  assert.equal(value.startRouteValues.minimumLengthMm, '6');
  assert.equal(value.startRouteValues.overlapToleranceMm, '0.001');
  assert.equal(startRouteWorkflowReady(value), false);
  value.startRouteValues.catalogueRecordId = 'PIPE-1';
  value.startAcquisition = { modelPointMm: { x: 0, y: 0, z: 0 } };
  value.endAcquisition = { modelPointMm: { x: 100, y: 0, z: 0 } };
  assert.equal(startRouteWorkflowReady(value), true);
});

test('typed Start Route remains available as an explicit engineering-input path', () => {
  const value = runtime();
  Object.assign(value.startRouteValues, {
    catalogueRecordId: 'PIPE-1',
    startX: '0', startY: '0', startZ: '0',
    endX: '100', endY: '0', endZ: '0',
  });
  assert.equal(startRouteWorkflowReady(value), true);
});

test('Connect defaults expose useful deterministic route policy while requiring exact endpoints and pipe', () => {
  const value = runtime();
  applyConnectWorkflowDefaults(value);
  assert.equal(value.connectValues.allowDirect, true);
  assert.equal(value.connectValues.allowOrthogonal, true);
  assert.equal(value.connectValues.maxAlternatives, '5');
  assert.equal(connectWorkflowReadyForPlanning(value), false);
  value.connectStartEndpoint = { nodeId: 'node:a' };
  value.connectEndEndpoint = { nodeId: 'node:b' };
  value.connectValues.catalogueRecordId = 'PIPE-1';
  assert.equal(connectWorkflowReadyForPlanning(value), true);
});

test('Continue route consolidation is presentation/orchestration over ROUTE_ELBOW authority only', () => {
  assert.equal(continueRouteWorkflowActive(runtime({ state: { tool: 'ROUTE_ELBOW' } })), true);
  assert.equal(continueRouteWorkflowActive(runtime({ state: { tool: 'MOVE' } })), false);
  assert.equal(continueRouteWorkflowActive(runtime({
    startRouteActive: true,
    state: { tool: 'ROUTE_ELBOW' },
  })), false);
});

test('final runtime keeps certification and transaction calls while adding stale automatic-run rejection', async () => {
  const source = await readFile(path.join(
    ROOT,
    'src/workspace/viewport-productivity/topology-edit-connect-endpoints-authoring-runtime.js',
  ), 'utf8');
  assert.match(source, /prepareConnectEndpointsPlanning/);
  assert.match(source, /prepareConnectEndpointsAuthoring/);
  assert.match(source, /validateConnectEndpointsAuthoring/);
  assert.match(source, /applyConnectEndpointsAuthoring/);
  assert.match(source, /routeConnectWorkflowRevision/);
  assert.match(source, /discardStaleAutomaticCandidate/);
  assert.match(source, /queueMicrotask/);
  assert.doesNotMatch(source, /Date\.now|Math\.random|randomUUID/);
  assert.doesNotMatch(source, /WorkspaceState|zustand/i);
});
