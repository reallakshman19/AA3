/**
 * Consume the frozen M4 physics/probes and production mesh-observation callbacks.
 * Return solver responses and governed convergence evidence for each mesh ladder.
 * A failed solve/recovery is retained as FAIL; no physics or recovery fallback is used.
 * The public runner owns predecessor-stage and execution-authority gating.
 */
import assert from 'node:assert/strict';

import {
  MODEL_SCHEMA as CONTINUUM_MODEL_SCHEMA,
  QUALIFICATION_PROFILE as CONTINUUM_QUALIFICATION_PROFILE,
  QUALIFICATION_STATES as CONTINUUM_QUALIFICATION_STATES,
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
} from '../../src/core/local-continuum/index.js';
import {
  BASE_LIMITATIONS as SHELL_BASE_LIMITATIONS,
  CANONICAL_UNITS as SHELL_CANONICAL_UNITS,
  FORMULATION as SHELL_FORMULATION,
  MODEL_SCHEMA as SHELL_MODEL_SCHEMA,
  RESULT_REQUEST as SHELL_RESULT_REQUEST,
  calculateLocalShell,
  createCanonicalLocalShellModel,
} from '../../src/core/local-shell/index.js';
import {
  canonicalQuantityHistory,
  qualifyConvergenceSet,
  requireSufficientMeshLevels,
} from '../../src/core/lafea-meshing/mesh-convergence-framework.js';
import { canonicalLafeaSha256 } from '../../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_CONTINUUM_PHYSICAL_PROBE_SCHEMA,
  evaluateLafeaContinuumPhysicalProbe,
} from '../../src/workspace/lafea-continuum-physical-probe.js';
import { qualificationProfile as shellQualificationProfile } from '../lafea.4-fixtures.mjs';

const CONTINUUM_DOFS = ['UX', 'UY'];
const SHELL_DOFS = ['UX', 'UY', 'UZ', 'R1', 'R2'];
const POINT_TOLERANCE = 1e-10;

export function runMeshBenchmarkM4({
  m4Fixture,
  fixedProbes,
  refinementLevel,
  continuumObservation,
  shellMultiPatchObservation,
  fixtureHash,
}) {
  validateFixture(m4Fixture, fixedProbes);
  const definitions = [
    ['L3-T3', 'LAFEA.3'],
    ['L3-T6', 'LAFEA.3'],
    ['L3-Q8', 'LAFEA.3'],
    ['L4-CST-DKT', 'LAFEA.4'],
  ];
  const observations = definitions.map(([ladderId, stageId]) => {
    try {
      return stageId === 'LAFEA.3'
        ? runContinuumLadder({
          ladderId, m4Fixture, fixedProbes, refinementLevel, continuumObservation,
        })
        : runShellLadder({
          ladderId, m4Fixture, fixedProbes, refinementLevel, shellMultiPatchObservation,
        });
    } catch (error) {
      return {
        checkId: `M4-${ladderId}`,
        ladderId,
        stageId,
        status: 'FAIL',
        solverExecuted: error?.solverExecuted === true,
        errorCode: error?.code ?? error?.name ?? 'M4_EXECUTION_FAILURE',
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  });
  return {
    schema: 'lafea-mesh-benchmark-stage-evidence/v1',
    status: observations.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
    blocker: null,
    m4PhysicsResponseFixtureHash: fixtureHash,
    solverExecuted: observations.some((row) => row.solverExecuted === true),
    convergenceFramework: {
      minimumLevelCount: 3,
      limitOverridesUsed: false,
      quantities: ['STRAIN_ENERGY', 'SELECTED_DISPLACEMENT'],
    },
    observations,
  };
}

function validateFixture(m4Fixture, fixedProbes) {
  assert.equal(m4Fixture.schema, 'lafea-mesh-m4-physics-response/v1');
  assert.equal(m4Fixture.benchmarkId, 'BM-MESH');
  assert.equal(m4Fixture.authority.solverOrCompilerExecutionAuthorizedInThisLeg, false);
  assert.equal(m4Fixture.authority.convergenceLimitOverrideAuthorized, false);
  assert.deepEqual(
    m4Fixture.convergencePolicy.quantities.map((row) => row.quantity),
    ['STRAIN_ENERGY', 'SELECTED_DISPLACEMENT'],
  );
  assert.equal(m4Fixture.convergencePolicy.requiredLevelCount, 3);
  assert.equal(m4Fixture.convergencePolicy.limitOverrides, null);
  assert.equal(fixedProbes.schema, 'lafea-mesh-fixed-probes/v1');
}

function runContinuumLadder({
  ladderId,
  m4Fixture,
  fixedProbes,
  refinementLevel,
  continuumObservation,
}) {
  const ladder = continuumLadderDefinition(ladderId);
  const fixture = m4Fixture.lafea3;
  const selectedProbeRows = fixture.responses.selectedDisplacement.probes
    .filter((row) => row.applicableLadders.includes(ladderId));
  const levels = ['L0', 'L1', 'L2'].map((levelId) => {
    const h = refinementLevel(levelId).globalTargetSize;
    const produced = continuumObservation(
      ladder.geometryCaseId,
      ladder.elementFamily,
      h,
      'NORMAL',
    );
    return executeContinuumLevel({
      ladderId,
      levelId,
      produced,
      fixture,
      selectedProbeRows,
      fixedProbes,
    });
  });
  return convergenceObservation({
    ladderId,
    stageId: 'LAFEA.3',
    levels,
    selectedProbeRows,
  });
}

function continuumLadderDefinition(ladderId) {
  const table = {
    'L3-T3': { geometryCaseId: 'M2-L-SHAPE-01', elementFamily: 'T3' },
    'L3-T6': { geometryCaseId: 'M2-L-SHAPE-01', elementFamily: 'T6' },
    'L3-Q8': { geometryCaseId: 'M2-UNIT-SQUARE-01', elementFamily: 'Q8' },
  };
  const row = table[ladderId];
  if (!row) throw new Error(`Unknown M4 continuum ladder ${ladderId}.`);
  return row;
}

function executeContinuumLevel({
  ladderId,
  levelId,
  produced,
  fixture,
  selectedProbeRows,
  fixedProbes,
}) {
  const mesh = produced.mesh;
  const boundaryNodeIds = meshBoundaryNodeIds(mesh);
  const loadCaseId = fixture.loadCase.loadCaseId;
  const input = {
    schema: CONTINUUM_MODEL_SCHEMA,
    modelIdentity: `BM-MESH-M4-${ladderId}-${levelId}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: fixture.physicsId,
      sourceVersion: 'lafea-mesh-m4-physics-response/v1',
      adapterIdentity: 'BM_MESH_PRODUCTION_ANALYSIS_MESH_TO_LOCAL_CONTINUUM_M4',
      adapterVersion: '1',
    },
    units: structuredClone(fixture.units),
    formulation: fixture.formulation,
    materials: [{
      materialId: 'MAT',
      elasticModulus: fixture.material.elasticModulus,
      poissonRatio: fixture.material.poissonRatio,
      sourceReference: 'BM-MESH-M4-L3-FROZEN-MATERIAL',
    }],
    nodes: mesh.nodes.map((row) => ({
      nodeId: row.nodeId,
      x: row.x,
      y: row.y,
      sourceReference: `BM-MESH-M4-MESH#${row.nodeId}`,
    })),
    elements: mesh.elements.map((row) => ({
      elementId: row.elementId,
      elementType: row.elementType,
      nodeIds: [...row.nodeIds],
      materialId: 'MAT',
      thickness: fixture.material.thickness,
      sourceReference: `BM-MESH-M4-MESH#${row.elementId}`,
    })),
    elementTypePolicy: {
      allowT3Fallback: produced.elementFamily === 'T3',
      sourceReference: produced.elementFamily === 'T3'
        ? 'BM-MESH-M4-T3-BENCHMARK-FALLBACK'
        : 'BM-MESH-M4-HIGH-ORDER-FAMILY',
    },
    constraints: [],
    loadCases: [{
      loadCaseId,
      nodalForces: [],
      edgeTractions: [],
      pressureLoads: [],
      bodyForces: [],
      temperatureLoads: [],
      imposedDisplacements: boundaryNodeIds.flatMap((nodeId) => {
        const node = mesh.nodes.find((row) => row.nodeId === nodeId);
        return CONTINUUM_DOFS.map((dof) => ({
          imposedDisplacementId: `BM-MESH-M4/${levelId}/${nodeId}/${dof}`,
          nodeId,
          dof,
          value: continuumFieldValue(fixture, dof, node),
          sourceReference: 'BM-MESH-M4-L3-CLOSED-FORM-BOUNDARY-FIELD',
        }));
      }),
      sourceReference: 'BM-MESH-M4-L3-AFFINE-DIRICHLET',
    }],
    resultRequests: { loadCaseIds: [loadCaseId] },
    qualificationProfile: structuredClone(CONTINUUM_QUALIFICATION_PROFILE),
    limitations: [],
  };
  const canonicalInput = createCanonicalLocalContinuumModel(input);
  const result = calculateLocalContinuum(canonicalInput);
  if (result.qualification?.state !== CONTINUUM_QUALIFICATION_STATES.ACCEPTED) {
    const error = new Error(
      `Continuum solver rejected ${ladderId}/${levelId}: ${JSON.stringify(result.diagnostics ?? [])}`,
    );
    error.code = 'M4_CONTINUUM_SOLVER_REJECTED';
    error.solverExecuted = true;
    throw error;
  }
  const resultCase = result.loadCaseResults.find((row) => row.loadCaseId === loadCaseId);
  assert.ok(resultCase, `Missing continuum M4 load case ${loadCaseId}.`);
  const stage = continuumProbeStage({
    fixture,
    produced,
    canonicalInput,
    result,
  });
  const probes = selectedProbeRows.map((row) => {
    const frozen = requireFrozenProbe(fixedProbes, row.probeId);
    const evidence = evaluateLafeaContinuumPhysicalProbe(stage, {
      schema: LAFEA_CONTINUUM_PHYSICAL_PROBE_SCHEMA,
      probeId: row.probeId,
      physicalCoordinate: {
        x: frozen.physicalCoordinate.x,
        y: frozen.physicalCoordinate.y,
      },
      coordinateFrame: 'GLOBAL_XY',
      loadCaseId,
      quantityId: fixture.responses.selectedDisplacement.quantityId,
      representation: fixture.responses.selectedDisplacement.representation,
      recoveryMethod: fixture.responses.selectedDisplacement.recoveryMethod,
      units: fixture.responses.selectedDisplacement.units,
      singularityClassification:
        fixture.responses.selectedDisplacement.singularityClassification,
    });
    return {
      probeId: row.probeId,
      authoritativeValue: evidence.authoritativeValue,
      units: evidence.authoritativeUnits,
      expectedAnalyticalValue: row.expectedValue,
      analyticalAbsoluteDelta: Math.abs(evidence.authoritativeValue - row.expectedValue),
      mapping: evidence.mapping,
      custody: evidence.custody,
      recoveryAuthority: evidence.recoveryAuthority,
    };
  });
  const energyReference = fixture.responses.strainEnergy.analyticalReferences
    .find((row) => row.ladderId === ladderId);
  return {
    levelId,
    globalTargetSize: produced.globalTargetSize,
    meshHash: produced.meshHash,
    nodeCount: produced.nodeCount,
    elementCount: produced.elementCount,
    solverModelHash: canonicalInput.semanticHash,
    executionHash: result.semanticHashes.executionEvidenceHash,
    resultPayloadHash: result.semanticHashes.resultPayloadSemanticHash,
    solverQualification: result.qualification.state,
    solverExecuted: true,
    strainEnergy: resultCase.totalStrainEnergy,
    expectedAnalyticalStrainEnergy: energyReference?.expectedValue ?? null,
    analyticalStrainEnergyAbsoluteDelta: energyReference
      ? Math.abs(resultCase.totalStrainEnergy - energyReference.expectedValue)
      : null,
    probes,
  };
}

function continuumFieldValue(fixture, dof, node) {
  if (dof === 'UX') return fixture.closedFormField.epsilonX * node.x;
  if (dof === 'UY') return fixture.closedFormField.epsilonY * node.y;
  throw new Error(`Unsupported continuum M4 DOF ${dof}.`);
}

function continuumProbeStage({ fixture, produced, canonicalInput, result }) {
  const sourceHash = canonicalLafeaSha256({
    schema: 'lafea-mesh-m4-continuum-physics-source/v1',
    physicsId: fixture.physicsId,
    fixture,
  });
  const canonicalExecutionInputHash = canonicalLafeaSha256({
    schema: 'lafea-continuum-compiled-execution-input-hash/v1',
    canonicalInput,
  });
  const compiledExecutionHash = result.semanticHashes.executionEvidenceHash;
  const recoveryHash = canonicalLafeaSha256({
    schema: 'lafea-mesh-m4-continuum-recovery-custody/v1',
    meshHash: produced.meshHash,
    executionHash: compiledExecutionHash,
    resultPayloadHash: result.semanticHashes.resultPayloadSemanticHash,
  });
  return {
    stageId: 'LAFEA.3',
    currentness: {
      currentAuthority: true,
      computationalState: 'CURRENT_RESULT',
    },
    execution: {
      stageId: 'LAFEA.3',
      status: 'QUALIFIED',
      sourceHash,
      meshHash: produced.meshHash,
      solverModelHash: canonicalInput.semanticHash,
      canonicalExecutionInputHash,
      compiledExecutionHash,
      canonicalInput,
      result,
      releaseQualified: false,
    },
    analysisMeshCustodyProjection: {
      state: 'CURRENT_PASS',
      meshHash: produced.meshHash,
    },
    lifecycle: {
      artifacts: {
        RECOVERY: {
          status: 'CURRENT',
          qualification: 'PASS',
          artifactHash: recoveryHash,
        },
      },
    },
  };
}

function runShellLadder({
  ladderId,
  m4Fixture,
  fixedProbes,
  refinementLevel,
  shellMultiPatchObservation,
}) {
  const fixture = m4Fixture.lafea4;
  const selectedProbeRows = fixture.responses.selectedDisplacement.probes;
  const levels = ['L0', 'L1', 'L2'].map((levelId) => {
    const h = refinementLevel(levelId).globalTargetSize;
    const produced = shellMultiPatchObservation(h, 'NORMAL');
    return executeShellLevel({
      ladderId,
      levelId,
      produced,
      fixture,
      selectedProbeRows,
      fixedProbes,
    });
  });
  return convergenceObservation({
    ladderId,
    stageId: 'LAFEA.4',
    levels,
    selectedProbeRows,
  });
}

function executeShellLevel({
  ladderId,
  levelId,
  produced,
  fixture,
  selectedProbeRows,
  fixedProbes,
}) {
  const mesh = produced.mesh;
  const boundaryNodeIds = meshBoundaryNodeIds(mesh);
  const field = fixture.closedFormField;
  const constraints = boundaryNodeIds.flatMap((nodeId) => {
    const node = mesh.nodes.find((row) => row.nodeId === nodeId);
    const values = {
      UX: field.epsilonX * node.x + 0.5 * field.gammaXY * node.y,
      UY: field.epsilonY * node.y + 0.5 * field.gammaXY * node.x,
      UZ: 0,
      R1: 0,
      R2: 0,
    };
    return SHELL_DOFS.map((dof) => ({
      constraintId: `BM-MESH-M4/${levelId}/${nodeId}/${dof}`,
      nodeId,
      dof,
      value: values[dof],
      sourceReference: 'BM-MESH-M4-L4-PRESCRIBED-MEMBRANE-BOUNDARY-FIELD',
    }));
  });
  const source = {
    schema: SHELL_MODEL_SCHEMA,
    modelIdentity: `BM-MESH-M4-${ladderId}-${levelId}`,
    modelVersion: '1',
    sourceAncestry: [
      fixture.physicsId,
      'validation/lafea-benchmark-data/MESH/convergence/m4-physics-response.json',
    ],
    units: structuredClone(SHELL_CANONICAL_UNITS),
    formulation: SHELL_FORMULATION,
    materials: [{
      materialId: 'MAT',
      elasticModulus: fixture.material.elasticModulus,
      poissonRatio: fixture.material.poissonRatio,
      sourceReference: 'BM-MESH-M4-L4-FROZEN-MATERIAL',
    }],
    nodes: mesh.nodes.map((row) => ({
      nodeId: row.nodeId,
      position: [row.x, row.y, row.z],
      director: [0, 0, 1],
      rotationBasis1: [1, 0, 0],
      rotationBasis2: [0, 1, 0],
      sourceReference: `BM-MESH-M4-MESH#${row.nodeId}`,
    })),
    elements: mesh.elements.map((row) => ({
      elementId: row.elementId,
      nodeIds: [...row.nodeIds],
      materialId: 'MAT',
      thickness: fixture.material.thickness,
      sourceReference: `BM-MESH-M4-MESH#${row.elementId}`,
    })),
    constraints,
    loadCases: [{
      loadCaseId: fixture.loadCase.loadCaseId,
      nodalLoads: [],
      pressureLoads: [],
      sourceReference: 'BM-MESH-M4-L4-PRESCRIBED-MEMBRANE',
    }],
    resultRequests: structuredClone(SHELL_RESULT_REQUEST),
    qualificationProfile: shellQualificationProfile(),
    limitations: [...SHELL_BASE_LIMITATIONS],
  };
  const canonicalInput = createCanonicalLocalShellModel(source);
  const result = calculateLocalShell(canonicalInput);
  if (result.qualification?.accepted !== true) {
    const error = new Error(
      `Shell solver rejected ${ladderId}/${levelId}: ${result.qualification?.summary ?? 'unknown'}`,
    );
    error.code = 'M4_SHELL_SOLVER_REJECTED';
    error.solverExecuted = true;
    throw error;
  }
  const resultCase = result.loadCaseResults.find(
    (row) => row.loadCaseId === fixture.loadCase.loadCaseId,
  );
  assert.ok(resultCase, `Missing shell M4 load case ${fixture.loadCase.loadCaseId}.`);
  const probes = selectedProbeRows.map((row) => {
    const frozen = requireFrozenProbe(fixedProbes, row.probeId);
    const recovered = recoverShellUxAtPhysicalPoint(
      mesh,
      resultCase,
      frozen.physicalCoordinate,
    );
    return {
      probeId: row.probeId,
      authoritativeValue: recovered.authoritativeValue,
      units: fixture.responses.selectedDisplacement.units,
      expectedAnalyticalValue: row.expectedValue,
      analyticalAbsoluteDelta: Math.abs(recovered.authoritativeValue - row.expectedValue),
      mapping: recovered.mapping,
      supportingNodalDisplacements: recovered.supportingNodalDisplacements,
      recoveryAuthority: fixture.responses.selectedDisplacement.recoveryMethod,
    };
  });
  return {
    levelId,
    globalTargetSize: produced.globalTargetSize,
    meshHash: produced.meshHash,
    nodeCount: produced.nodeCount,
    elementCount: produced.elementCount,
    solverModelHash: canonicalInput.semanticHash,
    executionHash: result.semanticHashes.executionEvidenceHash
      ?? result.semanticHashes.resultPayloadSemanticHash
      ?? null,
    resultPayloadHash: result.semanticHashes.resultPayloadSemanticHash ?? null,
    solverQualification: result.qualification.state,
    solverExecuted: true,
    strainEnergy: resultCase.totalStrainEnergy,
    expectedAnalyticalStrainEnergy:
      fixture.responses.strainEnergy.analyticalReference.expectedValue,
    analyticalStrainEnergyAbsoluteDelta: Math.abs(
      resultCase.totalStrainEnergy
      - fixture.responses.strainEnergy.analyticalReference.expectedValue
    ),
    probes,
  };
}

function convergenceObservation({
  ladderId,
  stageId,
  levels,
  selectedProbeRows,
}) {
  const levelGate = requireSufficientMeshLevels({
    levelCount: levels.length,
    benchmarkTemplateExemption: null,
  });
  const histories = [
    canonicalQuantityHistory(
      'STRAIN_ENERGY',
      levels.map((row) => row.strainEnergy),
    ),
    ...selectedProbeRows.map((probe) => canonicalQuantityHistory(
      'SELECTED_DISPLACEMENT',
      levels.map((level) => (
        level.probes.find((row) => row.probeId === probe.probeId).authoritativeValue
      )),
    )),
  ];
  const convergence = qualifyConvergenceSet(histories);
  return {
    checkId: `M4-${ladderId}`,
    ladderId,
    stageId,
    status: convergence.accepted ? 'PASS' : 'FAIL',
    solverExecuted: levels.every((row) => row.solverExecuted === true),
    levelGate,
    levels,
    histories: histories.map((row, index) => ({
      historyId: index === 0
        ? `${ladderId}/STRAIN_ENERGY`
        : `${ladderId}/SELECTED_DISPLACEMENT/${selectedProbeRows[index - 1].probeId}`,
      quantity: row.quantity,
      valuesByLevel: [...row.valuesByLevel],
    })),
    convergence: {
      accepted: convergence.accepted,
      results: convergence.results.map((row, index) => ({
        historyId: index === 0
          ? `${ladderId}/STRAIN_ENERGY`
          : `${ladderId}/SELECTED_DISPLACEMENT/${selectedProbeRows[index - 1].probeId}`,
        ...row,
      })),
      limitOverridesUsed: false,
    },
  };
}

function requireFrozenProbe(fixedProbes, probeId) {
  const row = fixedProbes.probes.find((candidate) => candidate.probeId === probeId);
  if (!row) throw new Error(`Missing frozen physical probe ${probeId}.`);
  return row;
}

function meshBoundaryNodeIds(mesh) {
  const uses = new Map();
  for (const element of mesh.elements) {
    for (const sequence of topologyEdgeSequences(element)) {
      const corners = [sequence[0], sequence.at(-1)].sort();
      const key = corners.join('\0');
      const owners = uses.get(key) ?? [];
      owners.push(sequence);
      uses.set(key, owners);
    }
  }
  const ids = new Set();
  for (const owners of uses.values()) {
    if (owners.length !== 1) continue;
    owners[0].forEach((nodeId) => ids.add(nodeId));
  }
  return [...ids].sort();
}

function topologyEdgeSequences(element) {
  const ids = element.nodeIds;
  if (element.elementType === 'T3'
    || element.elementType === 'CST_DKT_TRI3_THIN_SHELL_V1') {
    return [[ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[0]]];
  }
  if (element.elementType === 'T6') {
    return [
      [ids[0], ids[3], ids[1]],
      [ids[1], ids[4], ids[2]],
      [ids[2], ids[5], ids[0]],
    ];
  }
  if (element.elementType === 'Q8') {
    return [
      [ids[0], ids[4], ids[1]],
      [ids[1], ids[5], ids[2]],
      [ids[2], ids[6], ids[3]],
      [ids[3], ids[7], ids[0]],
    ];
  }
  throw new Error(`Unsupported M4 element family ${element.elementType}.`);
}

function recoverShellUxAtPhysicalPoint(mesh, resultCase, physicalCoordinate) {
  const nodeById = new Map(mesh.nodes.map((row) => [row.nodeId, row]));
  const displacementById = new Map(
    resultCase.nodalDisplacements.map((row) => [row.nodeId, row]),
  );
  const candidates = [];
  for (const element of mesh.elements) {
    const nodes = element.nodeIds.map((nodeId) => nodeById.get(nodeId));
    const barycentric = triangleBarycentric(nodes, physicalCoordinate);
    if (!barycentric) continue;
    const minimum = Math.min(...barycentric);
    const maximum = Math.max(...barycentric);
    if (minimum < -POINT_TOLERANCE || maximum > 1 + POINT_TOLERANCE) continue;
    candidates.push({ element, nodes, barycentric, minimum });
  }
  const interior = candidates.filter((row) => row.minimum > POINT_TOLERANCE);
  if (interior.length !== 1) {
    const error = new Error(
      `Shell physical probe requires one interior owner; observed ${interior.length} interior and ${candidates.length} total candidates.`,
    );
    error.code = interior.length === 0
      ? 'M4_SHELL_PROBE_OWNER_NOT_UNIQUE'
      : 'M4_SHELL_PROBE_MULTIPLE_INTERIOR_OWNERS';
    throw error;
  }
  const located = interior[0];
  const supportingNodalDisplacements = located.element.nodeIds.map((nodeId) => {
    const row = displacementById.get(nodeId);
    if (!row) throw new Error(`Missing shell displacement for node ${nodeId}.`);
    return { nodeId, ux: row.ux };
  });
  const authoritativeValue = located.barycentric.reduce(
    (sum, weight, index) => sum + weight * supportingNodalDisplacements[index].ux,
    0,
  );
  const mapped = located.barycentric.reduce(
    (point, weight, index) => ({
      x: point.x + weight * located.nodes[index].x,
      y: point.y + weight * located.nodes[index].y,
      z: point.z + weight * located.nodes[index].z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  return {
    authoritativeValue,
    supportingNodalDisplacements,
    mapping: {
      mappingClass: 'INTERIOR_UNIQUE_OWNER_CST_TRIANGLE',
      elementId: located.element.elementId,
      elementType: located.element.elementType,
      barycentricCoordinates: located.barycentric,
      mappedPhysicalCoordinate: mapped,
      mappingResidual: Math.hypot(
        mapped.x - physicalCoordinate.x,
        mapped.y - physicalCoordinate.y,
        mapped.z - (physicalCoordinate.z ?? 0),
      ),
      containmentCandidateCount: candidates.length,
      crossElementAveragingUsed: false,
    },
  };
}

function triangleBarycentric(nodes, point) {
  if (!nodes || nodes.length !== 3 || nodes.some((row) => !row)) return null;
  const [a, b, c] = nodes;
  const denominator = (b.y - c.y) * (a.x - c.x)
    + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(denominator) <= Number.EPSILON) return null;
  const l1 = ((b.y - c.y) * (point.x - c.x)
    + (c.x - b.x) * (point.y - c.y)) / denominator;
  const l2 = ((c.y - a.y) * (point.x - c.x)
    + (a.x - c.x) * (point.y - c.y)) / denominator;
  const l3 = 1 - l1 - l2;
  return [l1, l2, l3];
}
