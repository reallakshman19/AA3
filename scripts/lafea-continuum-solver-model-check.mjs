#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import {
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
  createLafeaAnalysisGeometryEvidence,
} from '../src/workspace/lafea-analysis-geometry-evidence.js';
import {
  LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
  LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
  createLafeaAnalysisGeometry,
} from '../src/workspace/lafea-analysis-geometry-contract.js';
import {
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
  LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
  LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
  createLafeaAnalysisMeshEvidenceV2,
} from '../src/workspace/lafea-analysis-mesh-evidence-v2.js';
import { lafeaAnalysisMeshContentHash } from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
  createLafeaContinuumAnalysisDomain,
} from '../src/workspace/lafea-continuum-analysis-domain.js';
import { canonicalLafeaSha256 } from '../src/workspace/lafea-canonical-sha256.js';
import { compileLafeaContinuumSolverModel } from '../src/workspace/lafea-continuum-solver-model.js';
import { requireLafeaStageComposition } from '../src/workspace/lafea-stage-composition-root.js';
import { issueLafeaSourceAuthority } from '../src/workspace/lafea-source-authority.js';
import { createLafeaWorkbenchStore } from '../src/workspace/lafea-workbench.js';
import { patchSource, triangleSource } from './lafea.3-fixtures.mjs';

const fixture = compileFixture(triangleSource());
assert.equal(fixture.compiled.status, 'COMPILED');
assert.equal(fixture.compiled.executionAuthorized, false);
assert.equal(fixture.compiled.releaseQualified, false);
assert.equal(fixture.compiled.parents.sourceHash, fixture.authority.sourceHash);
assert.equal(fixture.compiled.parents.analysisDomainHash, fixture.domain.semanticHash);
assert.equal(fixture.compiled.parents.analysisGeometryHash, fixture.geometry.semanticHash);
assert.equal(fixture.compiled.parents.meshHash, fixture.meshEvidence.meshHash);
assert.equal(fixture.compiled.sourceModel.modelIdentity, fixture.canonicalInput.modelIdentity);
assert.equal(fixture.compiled.sourceModel.modelVersion, fixture.canonicalInput.modelVersion);
assert.deepEqual(
  fixture.compiled.sourceModel.sourceAncestry,
  fixture.canonicalInput.sourceEvidence.sourceAncestry,
);
assert.deepEqual(fixture.compiled.sourceModel.elementTypePolicy, fixture.canonicalInput.elementTypePolicy);
assert.equal(fixture.compiled.materials[0].materialId, 'MAT');
assert.equal(fixture.compiled.sections[0].thickness, 10);
assert.deepEqual(fixture.compiled.dofPolicy, { dofsPerNode: 2, dofOrder: ['UX', 'UY'] });

const fixA = attachment(fixture.compiled, 'FIX-A');
assert.deepEqual(fixA.compiledTarget.nodeIds, ['M-A']);
const traction = attachment(fixture.compiled, 'PULL-EDGE');
assert.deepEqual(traction.compiledTarget.nodeIds, ['M-B', 'M-BC', 'M-C']);
assert.deepEqual(traction.compiledTarget.edgeNodePaths, [['M-B', 'M-BC', 'M-C']]);
assert.deepEqual(traction.compiledTarget.elementIds, ['M-E1']);
const region = attachment(fixture.compiled, 'BODY');
assert.deepEqual(region.compiledTarget.elementIds, ['M-E1']);
assert.ok(!fixture.compiled.nodes.some((row) => ['A', 'B', 'C'].includes(row.nodeId)));
assert.equal(fixture.compiled.elements[0].elementId, 'M-E1');
assert.deepEqual(
  compileLafeaContinuumSolverModel(fixture.input),
  fixture.compiled,
  'same exact parents must compile byte-identically',
);

const workbench = compileThroughWorkbench();
assert.equal(workbench.compiled.solverModelHash, workbench.compiledAgain.solverModelHash);
assert.deepEqual(workbench.compiled, workbench.compiledAgain);
assert.equal(workbench.executionBefore, null);
assert.equal(workbench.executionAfter, null);
assert.equal(workbench.compiled.executionAuthorized, false);
assert.equal(workbench.compiled.releaseQualified, false);
assert.equal(workbench.meshState, 'CURRENT_PASS');

expectCode(() => buildMeshEvidence(
  fixture.authority.sourceHash, fixture.domain, fixture.geometry,
  renamedT6Mesh(1), fixture.profile,
), 'LAFEA_ANALYSIS_MESH_CONTINUUM_NODE_NOT_PLANAR');

const missingMaterialDomain = buildDomain(
  fixture.authority.sourceHash, fixture.geometry, 'MISSING-MATERIAL', ['L1', 'L2'],
);
const missingMaterialEvidence = buildMeshEvidence(
  fixture.authority.sourceHash, missingMaterialDomain, fixture.geometry, renamedT6Mesh(), fixture.profile,
);
expectCode(() => compileLafeaContinuumSolverModel({
  ...fixture.input,
  analysisDomain: missingMaterialDomain,
  geometryEvidence: buildGeometryEvidence(fixture.authority.sourceHash, missingMaterialDomain, fixture.geometry),
  meshEvidence: missingMaterialEvidence,
}), 'LAFEA_CONTINUUM_SOLVER_DOMAIN_MATERIAL_NOT_FOUND');

const unitMismatch = compileFixture(triangleSource(), {
  geometry: triangleGeometry('m'), allowCompileFailure: true,
});
expectCode(() => compileLafeaContinuumSolverModel(unitMismatch.input),
  'LAFEA_CONTINUUM_SOLVER_GEOMETRY_UNIT_SYSTEM_MISMATCH');
const meterDocument = triangleSource(); meterDocument.units.length = 'm';
const noncanonical = compileFixture(meterDocument, {
  geometry: triangleGeometry('m'),
  units: { length: 'm', force: 'N', stress: 'MPa', temperature: 'C' },
  allowCompileFailure: true,
});
expectCode(() => compileLafeaContinuumSolverModel(noncanonical.input),
  'LAFEA_CONTINUUM_SOLVER_NONCANONICAL_GEOMETRY_UNITS_UNSUPPORTED');

const nonuniformDocument = patchSource();
nonuniformDocument.elements[1].thickness = 12;
const nonuniform = compileFixture(nonuniformDocument, {
  caseIds: nonuniformDocument.loadCases.map((row) => row.loadCaseId),
  attachments: [], allowCompileFailure: true,
});
expectCode(
  () => compileLafeaContinuumSolverModel(nonuniform.input),
  'LAFEA_CONTINUUM_SOLVER_SECTION_MAPPING_REQUIRED',
);

console.log(JSON.stringify({
  schema: 'lafea-continuum-solver-model-check/v1',
  check: 'lafea-continuum-solver-model',
  status: 'PASS',
  stageId: 'LAFEA.3',
  geometryFeatureMapping: ['VERTEX', 'SEGMENT', 'REGION'],
  sourceMeshIdsUsedAsAuthority: false,
  sourceExecutionPolicyRetained: true,
  noncanonicalGeometryFailsClosed: true,
  deterministicCompilation: true,
  productionWorkbenchCompileAction: true,
  solverExecutedByCompileAction: false,
  executionAuthorized: false,
  releaseQualified: false,
  boundedScope: 'SINGLE_REGION_UNIFORM_THICKNESS_CANONICAL_MM',
}));

function compileThroughWorkbench() {
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = composition.normalizeDocument(triangleSource());
  const authority = issueLafeaSourceAuthority('LAFEA.3', source, 'STAGE12-WORKBENCH');
  const geometry = triangleGeometry();
  const domain = buildDomain(authority.sourceHash, geometry, 'MAT', ['L1', 'L2']);
  const geometryEvidence = buildGeometryEvidence(authority.sourceHash, domain, geometry);
  const profile = meshProfile('T6', 25);
  const store = createLafeaWorkbenchStore({
    initialStage: 'LAFEA.3', initialDocument: source, initialSourceHash: authority.sourceHash,
  });
  try {
    assert.equal(store.activateDomainFirstProfile().changed, true);
    assert.equal(store.registerAnalysisDomain(domain).projection.state, 'CURRENT_PASS');
    assert.equal(store.registerAnalysisGeometryEvidence(geometryEvidence).projection.state, 'CURRENT_PASS');
    assert.equal(store.bindAnalysisMeshProfile(profile).changed, true);
    const generated = store.generateAnalysisMesh();
    assert.equal(generated?.evidence.qualification, 'PASS');
    const stage = store.getState().stages['LAFEA.3'];
    const executionBefore = stage.execution;
    const meshState = stage.analysisMeshCustodyProjection.state;
    const compiled = store.compileContinuumSolverModel();
    const compiledAgain = store.compileContinuumSolverModel();
    return {
      compiled, compiledAgain, executionBefore,
      executionAfter: store.getState().stages['LAFEA.3'].execution,
      meshState,
    };
  } finally { store.destroy(); }
}

function compileFixture(document, overrides = {}) {
  const composition = requireLafeaStageComposition('LAFEA.3');
  const source = composition.normalizeDocument(document);
  const canonicalInput = composition.canonicalize(source);
  const authority = issueLafeaSourceAuthority('LAFEA.3', source, 'STAGE12-PURE');
  const geometry = overrides.geometry ?? triangleGeometry();
  const caseIds = overrides.caseIds ?? canonicalInput.loadCases.map((row) => row.loadCaseId);
  const domain = buildDomain(
    authority.sourceHash, geometry, 'MAT', caseIds, overrides.attachments, overrides.units,
  );
  const geometryEvidence = buildGeometryEvidence(authority.sourceHash, domain, geometry);
  const profile = meshProfile('T6', 25);
  const meshEvidence = buildMeshEvidence(
    authority.sourceHash, domain, geometry, overrides.mesh ?? renamedT6Mesh(), profile,
  );
  const input = { sourceAuthority: authority, source, canonicalInput, analysisDomain: domain, geometryEvidence, meshEvidence };
  let compiled = null;
  try { compiled = compileLafeaContinuumSolverModel(input); } catch (error) {
    if (!overrides.allowCompileFailure) throw error;
  }
  return { source, canonicalInput, authority, geometry, domain, geometryEvidence, profile, meshEvidence, input, compiled };
}

function buildDomain(sourceHash, geometry, materialRef, caseIds, attachments = null, units = null) {
  return createLafeaContinuumAnalysisDomain({
    schema: LAFEA_CONTINUUM_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.3', sourceHash, applicationRef: 'STAGE12-SOLVER-COMPILER',
    units: units ?? { length: 'mm', force: 'N', stress: 'MPa', temperature: 'C' },
    formulation: 'PLANE_STRESS', region: { regionId: 'REGION-1', materialRef },
    physicalCases: caseIds.map((caseId) => ({ caseId })),
    attachments: attachments ?? [
      domainAttachment('FIX-A', 'RESTRAINT', 'VERTEX', 'A', caseIds, { ux: true, uy: true }),
      domainAttachment('FIX-EDGE', 'RESTRAINT', 'SEGMENT', 'S3', caseIds, { ux: true }),
      domainAttachment('PULL-EDGE', 'TRACTION', 'SEGMENT', 'S2', [caseIds[0]], { tx: 10, ty: 0, unit: 'MPa' }),
      domainAttachment('BODY', 'BODY_FORCE', 'REGION', 'REGION-1', [caseIds[0]], { bx: 0, by: -1, unit: 'N/mm^3' }),
    ],
  }, geometry);
}

function buildGeometryEvidence(sourceHash, domain, geometry) {
  return createLafeaAnalysisGeometryEvidence({
    schema: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_SCHEMA,
    stageId: 'LAFEA.3', sourceHash, analysisDomain: domain, geometry,
    producerRef: 'STAGE12/GEOMETRY', profileId: LAFEA_ANALYSIS_GEOMETRY_EVIDENCE_PROFILE,
  });
}

function buildMeshEvidence(sourceHash, domain, geometry, mesh, profile) {
  const meshHash = lafeaAnalysisMeshContentHash(mesh);
  return createLafeaAnalysisMeshEvidenceV2({
    schema: LAFEA_ANALYSIS_MESH_INTAKE_V2_SCHEMA,
    stageId: 'LAFEA.3', sourceHash,
    analysisDomainHash: domain.semanticHash, analysisGeometryHash: geometry.semanticHash,
    meshProfile: profile, mesh,
    authority: {
      schema: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_SCHEMA,
      stageId: 'LAFEA.3', authorityRole: LAFEA_ANALYSIS_MESH_AUTHORITY_V2_ROLE,
      status: 'ACCEPTED_BY_STAGE_CONTRACT', producerRef: 'STAGE12/RENAMED-MESH',
      sourceHash, analysisDomainHash: domain.semanticHash,
      analysisGeometryHash: geometry.semanticHash, meshProfileHash: profile.semanticHash,
      meshHash, capabilityHash: hash('CAPABILITY'), qualificationHash: hash('QUALIFICATION'),
      planHash: hash('PLAN'),
    },
  });
}

function triangleGeometry(lengthUnit = 'mm') {
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3', geometryId: 'TRIANGLE-DOMAIN', coordinateSystemId: 'GLOBAL_XY',
    lengthUnit, orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: [
      { vertexId: 'A', x: 0, y: 0 },
      { vertexId: 'B', x: 100, y: 0 },
      { vertexId: 'C', x: 0, y: 100 },
    ],
    segments: [line('S1', 'A', 'B'), line('S2', 'B', 'C'), line('S3', 'C', 'A')],
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3'] }],
  });
}

function renamedT6Mesh(nonPlanarZ = 0) {
  return {
    schema: 'lafea-analysis-mesh/v1', meshIdentity: 'STAGE12-RENAMED-T6',
    nodes: [
      meshNode('M-A', 0, 0), meshNode('M-B', 100, 0), meshNode('M-C', 0, 100),
      meshNode('M-AB', 50, 0, nonPlanarZ), meshNode('M-BC', 50, 50), meshNode('M-CA', 0, 50),
    ],
    elements: [{
      elementId: 'M-E1', elementType: 'T6',
      nodeIds: ['M-A', 'M-B', 'M-C', 'M-AB', 'M-BC', 'M-CA'],
    }],
  };
}

function meshProfile(element, globalTargetSize) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1', profileIdentity: `STAGE12-${element}`,
    sourceRevision: '12B.2', semanticHash: undefined,
    fields: {
      ...defaults,
      continuumElement: element,
      shellElement: 'CST_DKT_TRI3_THIN_SHELL_V1',
      globalTargetSize,
    },
  });
}

function attachment(model, id) {
  const row = model.attachments.find((candidate) => candidate.attachmentId === id);
  assert.ok(row, `${id} attachment required`); return row;
}
function domainAttachment(attachmentId, kind, targetType, targetId, physicalCaseIds, payload) {
  return { attachmentId, kind, targetType, targetId, physicalCaseIds, payload };
}
function line(segmentId, startVertexId, endVertexId) { return { segmentId, type: 'LINE', startVertexId, endVertexId }; }
function meshNode(nodeId, x, y, z = 0) { return { nodeId, x, y, z }; }
function hash(value) { return canonicalLafeaSha256({ schema: 'stage12-test-hash/v1', value }); }
function expectCode(action, code) {
  assert.throws(action, (error) => error?.code === code, `expected ${code}`);
}
