#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canonicalProfile,
  defaultProfileFields,
  PROFILE_KINDS,
} from '../src/core/lafea-profile-contract/index.js';
import {
  createLafeaAnalysisGeometry,
  LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
  LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
} from '../src/workspace/lafea-analysis-geometry-contract.js';
import {
  canonicalLafeaAnalysisMesh,
  lafeaAnalysisMeshContentHash,
  qualifyLafeaAnalysisMesh,
} from '../src/workspace/lafea-analysis-mesh-contract.js';
import {
  lafeaMeshGenerationConfiguration,
  planLafeaAnalysisMesh,
} from '../src/workspace/lafea-mesh-producer-binding.js';
import {
  LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  createLafeaShellAnalysisDomain,
  createLafeaShellMidsurfaceEvidence,
  createLafeaShellMidsurfaceGeometry,
} from '../src/workspace/lafea-shell-midsurface-contract.js';
import {
  LAFEA_SHELL_ELEMENT,
  produceLafeaShellAnalysisMesh,
} from '../src/workspace/lafea-shell-mesh-producer.js';
import {
  canonicalJson,
  finalizeAuditRecord,
  sha256File,
  sha256Text,
} from './lib/lafea-benchmark-audit.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const BUCKET_ROOT = path.join(ROOT, 'validation/lafea-benchmark-data/MESH');
const MANIFEST_PATH = path.join(BUCKET_ROOT, 'bucket-manifest.json');
const REGISTRY_PATH = path.join(BUCKET_ROOT, 'sources/source-registry.json');
const CASES_PATH = path.join(BUCKET_ROOT, 'geometry/cases.json');
const ORACLE_PATH = path.join(BUCKET_ROOT, 'oracle/expected-values.json');
const LADDERS_PATH = path.join(BUCKET_ROOT, 'convergence/mesh-ladders.json');
const PROBES_PATH = path.join(BUCKET_ROOT, 'convergence/fixed-probes.json');
const REPORT_ROOT = path.join(ROOT, 'reports/qualification/lafea-benchmark-program');
const STAGE_ORDER = ['M0', 'M1', 'M2', 'M3', 'M4'];

const manifest = readJson(MANIFEST_PATH);
const registry = readJson(REGISTRY_PATH);
const geometryCases = readJson(CASES_PATH);
const oracle = readJson(ORACLE_PATH);
const ladders = readJson(LADDERS_PATH);
const fixedProbes = readJson(PROBES_PATH);
const args = parseArgs(process.argv.slice(2));

if (args.worker) {
  const request = JSON.parse(fs.readFileSync(0, 'utf8'));
  process.stdout.write(JSON.stringify(executeWorkerRequest(request)));
  process.exit(0);
}

const exactHeadSha = git(['rev-parse', 'HEAD']).trim();
if (args.expectedHead && exactHeadSha !== args.expectedHead) {
  throw new Error(`Expected HEAD ${args.expectedHead}, observed ${exactHeadSha}.`);
}
const trackedStatus = git(['status', '--porcelain', '--untracked-files=no']);
if (trackedStatus.trim()) {
  throw new Error(`Tracked worktree must be clean before benchmark execution:\n${trackedStatus}`);
}

validateFrozenInputs();
const custody = verifySourceCustody(exactHeadSha);
if (custody.some((row) => row.status !== 'PASS')) {
  throw new Error(`Source custody mismatch:\n${JSON.stringify(custody, null, 2)}`);
}

const requestedLastStage = args.stage ?? 'M4';
if (!STAGE_ORDER.includes(requestedLastStage)) {
  throw new Error(`Unknown --stage ${requestedLastStage}. Expected one of ${STAGE_ORDER.join(', ')}.`);
}
const selectedStages = STAGE_ORDER.slice(0, STAGE_ORDER.indexOf(requestedLastStage) + 1);
const runId = args.runId ?? defaultRunId(exactHeadSha);
const runDir = path.join(REPORT_ROOT, runId);
fs.mkdirSync(runDir, { recursive: true });

const stageRecords = [];
let contiguousPass = true;
for (const stageId of selectedStages) {
  const stageDir = path.join(runDir, stageId);
  fs.mkdirSync(stageDir, { recursive: true });
  const started = process.hrtime.bigint();
  const evidence = runStage(stageId, contiguousPass);
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  const record = finalizeAuditRecord({
    schema: 'lafea-benchmark-audit-record/v1',
    programId: 'BM-MESH',
    materialLeg: 'LEG-009',
    runId,
    generatedAt: new Date().toISOString(),
    repository: 'reallaksh19/Advanced_Analysis',
    exactHeadSha,
    trackedTreeClean: true,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      hostname: os.hostname(),
    },
    caseId: 'MESH',
    stageId,
    benchmarkStage: stageId,
    benchmarkClass: 'STAGED_MESH_BENCHMARK',
    comparisonPolicy: stageComparisonPolicy(stageId),
    sourceCustody: custody,
    evidence,
    caseStatus: evidence.status,
    nextBenchmarkAuthorized: evidence.status === 'PASS' && contiguousPass,
    baselineDisposition: evidence.status === 'PASS' && contiguousPass
      ? 'ELIGIBLE_EXECUTION_BASELINE'
      : 'NOT_ELIGIBLE',
    stageGate: {
      predecessorGateSatisfied: contiguousPass,
      advancementPolicy: manifest.advancementPolicy,
    },
    elapsedMs: Number(elapsedMs.toFixed(3)),
    governance: {
      productionOutputGeneratedExpectedValues: false,
      benchmarkAuthoredMeshUsed: false,
      benchmarkSideMeshMutationUsed: false,
      fabricatedPhysicsUsed: false,
      solverOrCompilerExecuted: false,
      benchmarkRegistrationGranted: false,
      releaseAuthorityGranted: false,
      temperatureAuthorityGranted: false,
    },
  });
  fs.writeFileSync(path.join(stageDir, 'audit-record.json'), `${JSON.stringify(record, null, 2)}\n`);
  stageRecords.push(record);
  contiguousPass = contiguousPass && record.caseStatus === 'PASS';
}

const overallStatus = stageRecords.some((row) => row.caseStatus === 'FAIL')
  ? 'FAIL'
  : stageRecords.some((row) => row.caseStatus === 'BLOCKED')
    ? 'BLOCKED'
    : 'PASS';
const summary = {
  schema: 'lafea-mesh-benchmark-program-run/v1',
  benchmarkId: 'BM-MESH',
  materialLeg: 'LEG-009',
  runId,
  generatedAt: new Date().toISOString(),
  exactHeadSha,
  requestedLastStage,
  stageOrder: selectedStages,
  stages: stageRecords.map((row) => ({
    stageId: row.stageId,
    caseStatus: row.caseStatus,
    nextBenchmarkAuthorized: row.nextBenchmarkAuthorized,
    recordHash: row.recordHash,
    recordPath: path.relative(ROOT, path.join(runDir, row.stageId, 'audit-record.json')),
  })),
  overallStatus,
  releaseAuthorityGranted: false,
  temperatureAuthorityGranted: false,
};
fs.writeFileSync(path.join(runDir, 'run-summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
process.exit(overallStatus === 'PASS' ? 0 : overallStatus === 'BLOCKED' ? 2 : 1);

function runStage(stageId, predecessorGateSatisfied) {
  if (!predecessorGateSatisfied) {
    return {
      schema: 'lafea-mesh-benchmark-stage-evidence/v1',
      status: 'BLOCKED',
      blocker: 'PREDECESSOR_STAGE_NOT_PASS',
      observations: [],
    };
  }
  if (stageId === 'M0') return runM0();
  if (stageId === 'M1') return runM1();
  if (stageId === 'M2') return runM2();
  if (stageId === 'M3') {
    return {
      schema: 'lafea-mesh-benchmark-stage-evidence/v1',
      status: 'BLOCKED',
      blocker: 'M3_SHELL_THICKNESS_AUTHORITY_NOT_FROZEN',
      note: 'No h/t qualification or stage-level quality-distribution acceptance is synthesized.',
      observations: [],
    };
  }
  return {
    schema: 'lafea-mesh-benchmark-stage-evidence/v1',
    status: 'BLOCKED',
    blocker: 'M4_PHYSICS_RESPONSE_SOLVER_AND_CONVERGENCE_AUTHORITY_NOT_FROZEN',
    fixedProbeDefinitionHash: sha256File(PROBES_PATH),
    note: 'No material, loads, restraints, loadCaseId, response quantity, recovery method, response acceptance, solver execution or convergence outcome is synthesized.',
    observations: [],
  };
}

function runM0() {
  const observations = [];
  for (const ladderId of ['L3-T3', 'L3-T6', 'L3-Q8']) {
    const row = executeWorkerRequest({ kind: 'LADDER_LEVEL', ladderId, levelId: 'L0', variant: 'NORMAL' });
    assert.equal(row.schema, 'lafea-mesh-producer-observation/v1');
    assert.equal(row.meshSchema, 'lafea-analysis-mesh/v1');
    assert.equal(row.resourceDisposition, 'WITHIN_LIMITS');
    assert.equal(row.estimatedDofs, row.nodeCount * 2);
    assert.equal(row.qualityWorstStatus === 'BLOCK', false);
    observations.push({ checkId: `M0-${ladderId}`, status: 'PASS', ...row });
  }
  const shell = executeWorkerRequest({ kind: 'SHELL_UNIT_SQUARE', levelId: 'L0', variant: 'NORMAL' });
  assert.equal(shell.meshSchema, 'lafea-analysis-mesh/v1');
  assert.equal(shell.elementFamily, LAFEA_SHELL_ELEMENT);
  assert.equal(shell.resourceDisposition, 'WITHIN_LIMITS');
  assert.equal(shell.estimatedDofs, shell.nodeCount * 5);
  assert.equal(shell.qualityWorstStatus === 'BLOCK', false);
  observations.push({ checkId: 'M0-LAFEA4-SINGLE-PATCH-PRODUCER', status: 'PASS', ...shell });
  return {
    schema: 'lafea-mesh-benchmark-stage-evidence/v1',
    status: 'PASS',
    observations,
  };
}

function runM1() {
  const fixtures = [
    { fixtureId: 'L3-T3', request: { kind: 'LADDER_LEVEL', ladderId: 'L3-T3', levelId: 'L0' } },
    { fixtureId: 'L3-T6', request: { kind: 'LADDER_LEVEL', ladderId: 'L3-T6', levelId: 'L0' } },
    { fixtureId: 'L3-Q8', request: { kind: 'LADDER_LEVEL', ladderId: 'L3-Q8', levelId: 'L0' } },
    { fixtureId: 'L4-SINGLE-PATCH', request: { kind: 'SHELL_UNIT_SQUARE', levelId: 'L0' } },
  ];
  const observations = fixtures.map(({ fixtureId, request }) => {
    const first = executeWorkerRequest({ ...request, variant: 'NORMAL' });
    const second = executeWorkerRequest({ ...request, variant: 'NORMAL' });
    const crossProcess = runChild({ ...request, variant: 'NORMAL' });
    const shuffled = runChild({ ...request, variant: 'SHUFFLED' });
    const hashes = [first.meshHash, second.meshHash, crossProcess.meshHash, shuffled.meshHash];
    const pass = hashes.every((value) => value === hashes[0]);
    return {
      checkId: `M1-${fixtureId}`,
      status: pass ? 'PASS' : 'FAIL',
      inProcessMeshHashes: [first.meshHash, second.meshHash],
      crossProcessMeshHash: crossProcess.meshHash,
      shuffledInputMeshHash: shuffled.meshHash,
      canonicalMeshStable: pass,
    };
  });
  return {
    schema: 'lafea-mesh-benchmark-stage-evidence/v1',
    status: observations.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
    observations,
  };
}

function runM2() {
  const observations = [];
  const l0 = refinementLevel('L0');

  const unit = continuumObservation('M2-UNIT-SQUARE-01', 'Q8', l0.globalTargetSize, 'NORMAL');
  const unitArea = meshArea(unit.mesh);
  observations.push(exactAreaObservation('M2-UNIT-SQUARE-01', unit, unitArea, expectedNumber('M2-UNIT-SQUARE-01', 'AREA')));

  for (const family of ['T3', 'T6']) {
    const lshape = continuumObservation('M2-L-SHAPE-01', family, l0.globalTargetSize, 'NORMAL');
    const area = meshArea(lshape.mesh);
    const overlap = maximumLShapeVoidOverlap(lshape.mesh);
    const areaCheck = exactAreaObservation('M2-L-SHAPE-01', lshape, area, expectedNumber('M2-L-SHAPE-01', 'AREA'));
    observations.push({
      ...areaCheck,
      checkId: `M2-L-SHAPE-01-${family}`,
      removedVoidMaximumElementOverlapArea: overlap,
      noElementSpansReentrantVoid: overlap <= roundoffTolerance(5),
      status: areaCheck.status === 'PASS' && overlap <= roundoffTolerance(5) ? 'PASS' : 'FAIL',
    });
  }

  const annulus = continuumObservation('M2-ANNULUS-SECTOR-01', 'T3', l0.globalTargetSize, 'NORMAL');
  const annulusArea = meshArea(annulus.mesh);
  const outerSagitta = maximumCircularBoundarySagitta(annulus.mesh, { centerX: 0, centerY: 0, radius: 2 });
  const innerSagitta = maximumCircularBoundarySagitta(annulus.mesh, { centerX: 0, centerY: 0, radius: 1 });
  const outerBound = expectedNumber('M2-ANNULUS-SECTOR-01', 'OUTER_ARC_MAXIMUM_CHORD_SAGITTA_BOUND');
  const innerBound = expectedNumber('M2-ANNULUS-SECTOR-01', 'INNER_ARC_MAXIMUM_CHORD_SAGITTA_BOUND');
  observations.push({
    checkId: 'M2-ANNULUS-SECTOR-01',
    status: outerSagitta <= outerBound + roundoffTolerance(outerBound)
      && innerSagitta <= innerBound + roundoffTolerance(innerBound) ? 'PASS' : 'FAIL',
    meshHash: annulus.meshHash,
    nodeCount: annulus.nodeCount,
    elementCount: annulus.elementCount,
    analyticArea: expectedNumber('M2-ANNULUS-SECTOR-01', 'AREA'),
    observedChordalMeshArea: annulusArea,
    areaComparisonDisposition: 'OBSERVED_ONLY_NO_UNFROZEN_CURVED_AREA_TOLERANCE',
    outerArcMaximumChordSagitta: outerSagitta,
    outerArcFrozenMaximum: outerBound,
    innerArcMaximumChordSagitta: innerSagitta,
    innerArcFrozenMaximum: innerBound,
  });

  const hole = continuumObservation('M2-SQUARE-HOLE-01', 'T3', l0.globalTargetSize, 'NORMAL');
  const holeBoundaryEdges = circularBoundaryEdges(hole.mesh, { centerX: 2, centerY: 2, radius: 1 });
  const minimumSegments = expectedInteger('M2-SQUARE-HOLE-01', 'HOLE_BOUNDARY_SEGMENT_COUNT_MINIMUM');
  observations.push({
    checkId: 'M2-SQUARE-HOLE-01',
    status: holeBoundaryEdges.length >= minimumSegments ? 'PASS' : 'FAIL',
    meshHash: hole.meshHash,
    nodeCount: hole.nodeCount,
    elementCount: hole.elementCount,
    analyticNetArea: expectedNumber('M2-SQUARE-HOLE-01', 'NET_AREA'),
    observedChordalMeshArea: meshArea(hole.mesh),
    areaComparisonDisposition: 'OBSERVED_ONLY_NO_UNFROZEN_CURVED_AREA_TOLERANCE',
    holeBoundarySegmentCount: holeBoundaryEdges.length,
    frozenProductionGeneralMinimum: minimumSegments,
    codeSclMinimumApplied: false,
  });

  observations.push({
    checkId: 'M2-TWO-PATCH-SHELL-01-CONFORMING-SHARED-SEAM',
    status: 'BLOCKED',
    caseId: 'M2-TWO-PATCH-SHELL-01',
    requiredIdentity: 'TOPOLOGICAL_IDENTITY_NOT_COORDINATE_PROXIMITY',
    productionScope: 'PLANAR_SINGLE_PATCH_ONLY',
    productionLimitation: 'NO_MULTI_PATCH_SEAMS',
    benchmarkSideNodeMergeUsed: false,
    note: 'The production LAFEA.4 producer cannot currently instantiate the frozen two-patch topology; coordinate-coincident patch meshes are not accepted as a conforming seam.',
  });

  const executableFailed = observations.some((row) => row.status === 'FAIL');
  return {
    schema: 'lafea-mesh-benchmark-stage-evidence/v1',
    status: executableFailed ? 'FAIL' : 'BLOCKED',
    observations,
    blocker: executableFailed ? null : 'LAFEA4_MULTIPATCH_SHARED_NODE_IDENTITY_OUTSIDE_CURRENT_PRODUCTION_SCOPE',
  };
}

function executeWorkerRequest(request) {
  if (request.kind === 'LADDER_LEVEL') {
    const ladder = requireLadder(request.ladderId);
    if (ladder.stageId !== 'LAFEA.3') {
      throw new Error(`Ladder ${ladder.ladderId} is not executable through the LAFEA.3 production binding.`);
    }
    const level = refinementLevel(request.levelId);
    assert.ok(ladder.levelIds.includes(level.levelId));
    return compactObservation(
      continuumObservation(ladder.geometryCaseId, ladder.elementFamily, level.globalTargetSize, request.variant),
    );
  }
  if (request.kind === 'SHELL_UNIT_SQUARE') {
    const level = refinementLevel(request.levelId);
    return compactObservation(shellUnitSquareObservation(level.globalTargetSize, request.variant));
  }
  throw new Error(`Unknown worker request kind ${request.kind}.`);
}

function continuumObservation(caseId, family, h, variant = 'NORMAL') {
  const caseDef = requireCase(caseId);
  const geometry = continuumGeometry(caseDef, variant);
  const sourceHash = sha256File(CASES_PATH);
  const stage = {
    stageId: 'LAFEA.3',
    domainFirstProfileActive: true,
    sourceAuthority: { stageId: 'LAFEA.3', sourceHash },
    retainedAnalysisGeometryEvidence: { geometry },
    analysisDomainProjection: {
      state: 'CURRENT_PASS',
      analysisDomainHash: sourceHash,
      benchmarkProjectionClass: 'FROZEN_GEOMETRY_SOURCE_CUSTODY_ONLY_NO_PHYSICS',
    },
    analysisGeometryProjection: {
      state: 'CURRENT_PASS',
      analysisDomainHash: sourceHash,
      analysisGeometryHash: geometry.semanticHash,
      benchmarkProjectionClass: 'FROZEN_GEOMETRY_SOURCE_CUSTODY_ONLY_NO_PHYSICS',
    },
  };
  const profile = meshProfile({
    stageId: 'LAFEA.3',
    family,
    h,
    identity: `BM-MESH-${caseId}-${family}-H${encodeNumber(h)}`,
  });
  const planned = planLafeaAnalysisMesh(stage, lafeaMeshGenerationConfiguration(profile));
  const mesh = canonicalLafeaAnalysisMesh(planned.generated.mesh);
  const quality = qualifyLafeaAnalysisMesh('LAFEA.3', mesh, profile);
  return {
    schema: 'lafea-mesh-producer-observation/v1',
    stageId: 'LAFEA.3',
    caseId,
    meshSchema: mesh.schema,
    elementFamily: family,
    globalTargetSize: h,
    profileHash: profile.semanticHash,
    meshHash: lafeaAnalysisMeshContentHash(mesh),
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    estimatedDofs: planned.plan.estimatedDofs,
    resourceDisposition: planned.plan.resourceDisposition,
    qualityWorstStatus: quality.worstStatus,
    quality,
    domainProjectionClass: 'FROZEN_GEOMETRY_SOURCE_CUSTODY_ONLY_NO_PHYSICS',
    mesh,
  };
}

function shellUnitSquareObservation(h, variant = 'NORMAL') {
  const caseDef = requireCase('M2-UNIT-SQUARE-01');
  const sourceHash = sha256File(CASES_PATH);
  const geometry = shellGeometryFromUnitSquare(caseDef, variant);
  const domain = createLafeaShellAnalysisDomain({
    schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
    stageId: 'LAFEA.4',
    domainId: 'BM-MESH-M0M1-UNIT-SQUARE-SINGLE-PATCH',
    sourceHash,
    midsurfaceGeometryHash: geometry.semanticHash,
    lengthUnit: 'mm',
    topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  });
  const midsurfaceEvidence = createLafeaShellMidsurfaceEvidence({
    schema: LAFEA_SHELL_MIDSURFACE_INTAKE_SCHEMA,
    stageId: 'LAFEA.4',
    sourceHash,
    analysisDomain: domain,
    geometry,
    producerRef: 'BM-MESH:FROZEN-M2-UNIT-SQUARE:SINGLE-PATCH',
  });
  const profile = meshProfile({
    stageId: 'LAFEA.4',
    family: LAFEA_SHELL_ELEMENT,
    h,
    identity: `BM-MESH-LAFEA4-UNIT-SQUARE-H${encodeNumber(h)}`,
  });
  const produced = produceLafeaShellAnalysisMesh({ midsurfaceEvidence, meshProfile: profile });
  const mesh = canonicalLafeaAnalysisMesh(produced.evidence.mesh);
  return {
    schema: 'lafea-mesh-producer-observation/v1',
    stageId: 'LAFEA.4',
    caseId: 'M2-UNIT-SQUARE-01',
    meshSchema: mesh.schema,
    elementFamily: LAFEA_SHELL_ELEMENT,
    globalTargetSize: h,
    profileHash: profile.semanticHash,
    meshHash: lafeaAnalysisMeshContentHash(mesh),
    nodeCount: mesh.nodes.length,
    elementCount: mesh.elements.length,
    estimatedDofs: produced.plan.estimatedDofs,
    resourceDisposition: produced.plan.resourceDisposition,
    qualityWorstStatus: produced.evidence.quality.worstStatus,
    quality: produced.evidence.quality,
    domainProjectionClass: 'PRODUCTION_SHELL_MIDSURFACE_GEOMETRY_ONLY',
    mesh,
  };
}

function compactObservation(value) {
  const { mesh: ignored, quality, ...rest } = value;
  return {
    ...rest,
    quality: compactQuality(quality),
  };
}

function compactQuality(value) {
  if (!value || typeof value !== 'object') return value ?? null;
  return {
    schema: value.schema ?? null,
    worstStatus: value.worstStatus ?? null,
    maximumAspectRatio: value.maximumAspectRatio ?? null,
    minimumScaledJacobian: value.minimumScaledJacobian ?? null,
    blockingElementIds: Array.isArray(value.blockingElementIds) ? value.blockingElementIds : [],
  };
}

function meshProfile({ stageId, family, h, identity }) {
  const defaults = defaultProfileFields(PROFILE_KINDS.MESH);
  const fields = {
    ...defaults,
    globalTargetSize: h,
    continuumElement: stageId === 'LAFEA.3' ? family : defaults.continuumElement,
    shellElement: stageId === 'LAFEA.4' ? family : defaults.shellElement,
  };
  return canonicalProfile(PROFILE_KINDS.MESH, {
    schema: 'lafea-mesh-profile/v1',
    profileIdentity: identity,
    sourceRevision: 'BM-MESH-LEG-009-FROZEN-LADDER-REQUEST',
    semanticHash: undefined,
    fields,
  });
}

function continuumGeometry(caseDef, variant) {
  if (caseDef.topology.type === 'PLANAR_MULTI_PATCH_SHELL') {
    throw new Error(`${caseDef.caseId} is not a LAFEA.3 planar continuum case.`);
  }
  const loops = [caseDef.topology.outerLoop, ...(caseDef.topology.holes ?? [])];
  const vertices = [];
  const segments = [];
  const loopRows = [];
  loops.forEach((loop, loopIndex) => {
    const prefix = loopIndex === 0 ? 'OUTER' : `HOLE${loopIndex}`;
    const localVertexIds = loop.vertices.map((coords, index) => {
      const vertexId = `${prefix}-V${index}`;
      vertices.push({ vertexId, x: Number(coords[0]), y: Number(coords[1]) });
      return vertexId;
    });
    const segmentIds = loop.curves.map((curve, index) => {
      const segmentId = `${prefix}-S${index}`;
      const base = {
        segmentId,
        startVertexId: localVertexIds[curve.from],
        endVertexId: localVertexIds[curve.to],
      };
      if (curve.type === 'LINE') {
        segments.push({ ...base, type: 'LINE' });
      } else {
        segments.push({
          ...base,
          type: 'CIRCULAR_ARC',
          centerX: Number(curve.center[0]),
          centerY: Number(curve.center[1]),
          radius: Number(curve.radius),
          sweep: Number(curve.sweepAngleDegrees) > 0 ? 'CCW' : 'CW',
        });
      }
      return segmentId;
    });
    loopRows.push({
      loopId: prefix,
      role: loopIndex === 0 ? 'OUTER' : 'HOLE',
      segmentIds,
    });
  });
  return createLafeaAnalysisGeometry({
    schema: LAFEA_ANALYSIS_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.3',
    geometryId: `BM-MESH-${caseDef.caseId}`,
    coordinateSystemId: 'GLOBAL_XY',
    lengthUnit: 'mm',
    orientationPolicy: LAFEA_ANALYSIS_GEOMETRY_ORIENTATION_POLICY,
    vertices: variant === 'SHUFFLED' ? [...vertices].reverse() : vertices,
    segments: variant === 'SHUFFLED' ? [...segments].reverse() : segments,
    loops: variant === 'SHUFFLED' ? [...loopRows].reverse() : loopRows,
  });
}

function shellGeometryFromUnitSquare(caseDef, variant) {
  const coords = caseDef.topology.outerLoop.vertices.map(([x, y]) => [Number(x), Number(y)]);
  const vertices = coords.map(([u, v], index) => ({ vertexId: `V${index}`, u, v }));
  const segments = coords.map((ignored, index) => ({
    segmentId: `S${index}`,
    startVertexId: `V${index}`,
    endVertexId: `V${(index + 1) % coords.length}`,
  }));
  return createLafeaShellMidsurfaceGeometry({
    schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
    stageId: 'LAFEA.4',
    geometryId: 'BM-MESH-M2-UNIT-SQUARE-01-SINGLE-PATCH',
    lengthUnit: 'mm',
    origin: { x: 0, y: 0, z: 0 },
    axisU: { x: 1, y: 0, z: 0 },
    axisV: { x: 0, y: 1, z: 0 },
    orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
    vertices: variant === 'SHUFFLED' ? [...vertices].reverse() : vertices,
    segments: variant === 'SHUFFLED' ? [...segments].reverse() : segments,
    loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: segments.map((row) => row.segmentId) }],
  });
}

function exactAreaObservation(caseId, producer, observed, expected) {
  const tolerance = roundoffTolerance(expected);
  return {
    checkId: caseId,
    status: Math.abs(observed - expected) <= tolerance ? 'PASS' : 'FAIL',
    meshHash: producer.meshHash,
    nodeCount: producer.nodeCount,
    elementCount: producer.elementCount,
    expectedArea: expected,
    observedArea: observed,
    absoluteDelta: Math.abs(observed - expected),
    comparisonToleranceClass: 'FLOAT_ROUNDOFF_ONLY_NOT_ENGINEERING_ACCEPTANCE',
    comparisonTolerance: tolerance,
  };
}

function meshArea(mesh) {
  const nodes = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  return mesh.elements.reduce((sum, element) => {
    const cornerCount = element.elementType === 'Q8' ? 4 : 3;
    const polygon = element.nodeIds.slice(0, cornerCount).map((nodeId) => nodes.get(nodeId));
    return sum + Math.abs(polygonArea(polygon));
  }, 0);
}

function polygonArea(points) {
  let twice = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    twice += a.x * b.y - b.x * a.y;
  }
  return twice / 2;
}

function maximumLShapeVoidOverlap(mesh) {
  const nodes = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  let maximum = 0;
  for (const element of mesh.elements) {
    const cornerCount = element.elementType === 'Q8' ? 4 : 3;
    let polygon = element.nodeIds.slice(0, cornerCount).map((nodeId) => {
      const node = nodes.get(nodeId);
      return { x: node.x, y: node.y };
    });
    polygon = clipPolygon(polygon, (p) => p.x >= 1, (a, b) => intersectVertical(a, b, 1));
    polygon = clipPolygon(polygon, (p) => p.x <= 3, (a, b) => intersectVertical(a, b, 3));
    polygon = clipPolygon(polygon, (p) => p.y >= 1, (a, b) => intersectHorizontal(a, b, 1));
    polygon = clipPolygon(polygon, (p) => p.y <= 3, (a, b) => intersectHorizontal(a, b, 3));
    maximum = Math.max(maximum, polygon.length >= 3 ? Math.abs(polygonArea(polygon)) : 0);
  }
  return maximum;
}

function clipPolygon(points, inside, intersection) {
  if (!points.length) return [];
  const output = [];
  let previous = points.at(-1);
  let previousInside = inside(previous);
  for (const current of points) {
    const currentInside = inside(current);
    if (currentInside !== previousInside) output.push(intersection(previous, current));
    if (currentInside) output.push(current);
    previous = current;
    previousInside = currentInside;
  }
  return output;
}

function intersectVertical(a, b, x) {
  const t = (x - a.x) / (b.x - a.x);
  return { x, y: a.y + t * (b.y - a.y) };
}

function intersectHorizontal(a, b, y) {
  const t = (y - a.y) / (b.y - a.y);
  return { x: a.x + t * (b.x - a.x), y };
}

function boundaryEdges(mesh) {
  const nodes = new Map(mesh.nodes.map((node) => [node.nodeId, node]));
  const counts = new Map();
  for (const element of mesh.elements) {
    const cornerCount = element.elementType === 'Q8' ? 4 : 3;
    const ids = element.nodeIds.slice(0, cornerCount);
    for (let index = 0; index < ids.length; index += 1) {
      const a = ids[index];
      const b = ids[(index + 1) % ids.length];
      const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
      const existing = counts.get(key) ?? { count: 0, a, b };
      existing.count += 1;
      counts.set(key, existing);
    }
  }
  return [...counts.values()]
    .filter((row) => row.count === 1)
    .map((row) => ({ a: nodes.get(row.a), b: nodes.get(row.b) }));
}

function circularBoundaryEdges(mesh, circle) {
  const tolerance = roundoffTolerance(circle.radius) * 128;
  return boundaryEdges(mesh).filter(({ a, b }) =>
    Math.abs(Math.hypot(a.x - circle.centerX, a.y - circle.centerY) - circle.radius) <= tolerance
    && Math.abs(Math.hypot(b.x - circle.centerX, b.y - circle.centerY) - circle.radius) <= tolerance);
}

function maximumCircularBoundarySagitta(mesh, circle) {
  const edges = circularBoundaryEdges(mesh, circle);
  assert.ok(edges.length > 0, `No boundary edges resolved for radius ${circle.radius}.`);
  return Math.max(...edges.map(({ a, b }) => {
    const chord = Math.hypot(b.x - a.x, b.y - a.y);
    const half = Math.min(circle.radius, chord / 2);
    return circle.radius - Math.sqrt(Math.max(0, circle.radius ** 2 - half ** 2));
  }));
}

function expectedNumber(caseId, quantity) {
  const row = requireOracleCase(caseId).expectations.find((candidate) => candidate.quantity === quantity);
  if (!row) throw new Error(`Missing oracle ${caseId}/${quantity}.`);
  return Number(row.decimalValue);
}

function expectedInteger(caseId, quantity) {
  const row = requireOracleCase(caseId).expectations.find((candidate) => candidate.quantity === quantity);
  if (!row || !Number.isInteger(row.integerValue)) throw new Error(`Missing integer oracle ${caseId}/${quantity}.`);
  return row.integerValue;
}

function roundoffTolerance(scale) {
  return Number.EPSILON * 256 * Math.max(1, Math.abs(scale));
}

function requireCase(caseId) {
  const row = geometryCases.cases.find((candidate) => candidate.caseId === caseId);
  if (!row) throw new Error(`Unknown frozen geometry case ${caseId}.`);
  return row;
}

function requireOracleCase(caseId) {
  const row = oracle.cases.find((candidate) => candidate.caseId === caseId);
  if (!row) throw new Error(`Unknown oracle case ${caseId}.`);
  return row;
}

function requireLadder(ladderId) {
  const row = ladders.ladders.find((candidate) => candidate.ladderId === ladderId);
  if (!row) throw new Error(`Unknown ladder ${ladderId}.`);
  return row;
}

function refinementLevel(levelId) {
  const row = ladders.refinement.levels.find((candidate) => candidate.levelId === levelId);
  if (!row) throw new Error(`Unknown refinement level ${levelId}.`);
  return row;
}

function runChild(request) {
  const child = spawnSync(process.execPath, [SCRIPT_PATH, '--worker'], {
    cwd: ROOT,
    encoding: 'utf8',
    input: JSON.stringify(request),
    maxBuffer: 32 * 1024 * 1024,
  });
  if (child.status !== 0) {
    throw new Error(`Worker failed (${child.status}): ${child.stderr || child.stdout}`);
  }
  return JSON.parse(child.stdout);
}

function verifySourceCustody(headSha) {
  return registry.sources.map((source) => {
    const observed = git(['rev-parse', `${headSha}:${source.path}`]).trim();
    return {
      sourceId: source.sourceId,
      path: source.path,
      expectedBlobSha: source.blobSha,
      observedBlobSha: observed,
      status: observed === source.blobSha ? 'PASS' : 'FAIL',
    };
  });
}

function validateFrozenInputs() {
  assert.equal(manifest.schema, 'lafea-mesh-benchmark-manifest/v1');
  assert.equal(manifest.benchmarkId, 'BM-MESH');
  assert.equal(ladders.schema, 'lafea-mesh-ladders/v1');
  assert.equal(ladders.refinement.adjacentHRefinementRatio, 2);
  assert.deepEqual(ladders.refinement.levels.map((row) => row.levelId), ['L0', 'L1', 'L2']);
  assert.deepEqual(ladders.refinement.levels.map((row) => row.globalTargetSize), [1, 0.5, 0.25]);
  assert.equal(fixedProbes.schema, 'lafea-mesh-fixed-probes/v1');
  assert.equal(oracle.authority.productionOutputUsed, false);
  for (const ladder of ladders.ladders) {
    assert.equal(ladder.levelIds.at(-1), 'L2');
  }
  const ids = new Set(registry.sources.map((row) => row.sourceId));
  assert.ok(ids.has('S-014'));
  assert.ok(ids.has('S-015'));
}

function stageComparisonPolicy(stageId) {
  return {
    M0: 'PRODUCTION_CONTRACT_CONFORMANCE',
    M1: 'BYTE_STABLE_CANONICAL_MESH_HASH_ACROSS_REPLAY_PROCESS_AND_INPUT_ORDER',
    M2: 'FROZEN_CLOSED_FORM_AND_EXPLICIT_POLICY_COMPARISONS_ONLY',
    M3: 'BLOCK_IF_GOVERNED_THICKNESS_OR_STAGE_ACCEPTANCE_IS_ABSENT',
    M4: 'BLOCK_IF_PHYSICS_RESPONSE_SOLVER_OR_CONVERGENCE_AUTHORITY_IS_ABSENT',
  }[stageId];
}

function parseArgs(values) {
  const out = { worker: false, stage: null, expectedHead: null, runId: null };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--worker') out.worker = true;
    else if (value === '--stage') out.stage = requireArg(values, ++index, '--stage');
    else if (value === '--expected-head') out.expectedHead = requireArg(values, ++index, '--expected-head');
    else if (value === '--run-id') out.runId = requireArg(values, ++index, '--run-id');
    else throw new Error(`Unknown argument ${value}.`);
  }
  return out;
}

function requireArg(values, index, flag) {
  const value = values[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`);
  return value;
}

function defaultRunId(headSha) {
  return `BM-MESH-${new Date().toISOString().replace(/[:.]/gu, '-')}-${headSha.slice(0, 12)}`;
}

function encodeNumber(value) {
  return String(value).replace('.', '_');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}
