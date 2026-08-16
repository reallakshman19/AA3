import assert from 'node:assert/strict';
import { buildLafeaEngineeringOverview } from '../src/workspace/lafea-engineering-overview.js';

const stage = {
  stageId: 'LAFEA.3',
  document: {
    modelIdentity: 'VISIBLE_UI_TEST',
    formulation: 'PLANE_STRESS',
    units: { length: 'mm', stress: 'MPa' },
    materials: [{ materialId: 'MAT' }],
    nodes: [{ nodeId: 'N1' }, { nodeId: 'N2' }],
    elements: [{ elementId: 'E1', elementType: 'T6' }],
    constraints: [{ constraintId: 'C1' }],
    loadCases: [{ loadCaseId: 'LC1' }],
    qualificationProfile: { identity: 'B01_PROFILE' },
  },
  analysisMeshCustodyProjection: { state: 'CURRENT' },
  retainedAnalysisMeshEvidenceV2: {
    qualification: 'PASS',
    meshProfile: { profileIdentity: 'T6_10MM' },
    mesh: {
      nodes: [{ nodeId: 'N1' }, { nodeId: 'N2' }, { nodeId: 'N3' }],
      elements: [{ elementId: 'E1', elementType: 'T6' }, { elementId: 'E2', elementType: 'T6' }],
    },
  },
  execution: {
    status: 'QUALIFIED',
    result: {
      qualification: { state: 'ACCEPTED' },
      loadCaseResults: [{
        totalStrainEnergy: 12.5,
        nodalDisplacements: [
          { nodeId: 'N1', ux: 0.3, uy: 0.4 },
          { nodeId: 'N2', ux: 0.1, uy: 0 },
        ],
        elementResults: [{
          elementId: 'E1',
          vonMises: 90,
          stress: { sigmaX: -80 },
          gaussPointResults: [{ stress: { sigmaX: 100, sigmaY: 20, tauXY: 10 } }],
        }],
      }],
    },
  },
};
const registry = {
  stageId: 'LAFEA.3',
  enginePackage: 'local-continuum',
  authority: 'T3_T6_Q8_LINEAR_CONTINUUM',
  engineState: 'QUALIFIED_ROUTE_REGISTERED',
  presenterRole: 'CONTINUUM_RESULT_EVIDENCE',
};

const model = buildLafeaEngineeringOverview(stage, registry);
assert.equal(model.schema, 'lafea-engineering-overview/v1');
assert.equal(model.model.nodeCount, 2);
assert.equal(model.model.elementCount, 1);
assert.deepEqual(model.model.elementFamilies, ['T6']);
assert.equal(model.mesh.nodeCount, 3);
assert.equal(model.mesh.elementCount, 2);
assert.equal(model.solver.engine, 'src/core/local-continuum');
assert.equal(model.solver.recovery, 'Integration-point stress (authoritative)');
assert.equal(model.execution.accepted, true);
assert.equal(model.execution.metrics.find((row) => row.label === 'Max displacement').value, 0.5);
assert.equal(model.execution.metrics.find((row) => row.label === 'Max von Mises').value, 90);
assert.equal(model.execution.metrics.find((row) => row.label === 'Max |σx|').value, 100);
assert.equal(model.execution.metrics.find((row) => row.label === 'Max load-case elastic energy').value, 12.5);
assert.equal(model.qualification.baseRuns, 'NOT EMBEDDED IN WORKBENCH STATE');
assert.equal(model.qualification.releaseAuthority, false);

console.log('LAFEA visible engineering overview projection passed.');
