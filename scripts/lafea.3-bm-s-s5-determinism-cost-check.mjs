#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  QUALIFICATION_PROFILE,
  QUALIFICATION_STATES,
  calculateLocalContinuum,
  createCanonicalLocalContinuumModel,
} from '../src/core/local-continuum/index.js';
import { boundaryEdgesWhere, mappedAnnulusSectorQ8 } from './lafea.3-benchmark-mesh-adapter.mjs';
import { patchSource, permuteSource } from './lafea.3-fixtures.mjs';
import {
  loadB02ExpectedCase,
  semanticHashes,
  writeBmSCaseEvidence,
} from './lib/lafea.3-bm-s-evidence.mjs';

const SELF = fileURLToPath(import.meta.url);
const HASH_FIELDS = Object.freeze([
  'canonicalModelSemanticHash',
  'loadCaseInputSemanticHash',
  'resultPayloadSemanticHash',
  'executionEvidenceHash',
  'qualificationEvidenceHash',
]);
const COST_LEVELS = Object.freeze([
  Object.freeze({ levelId: 'L1', radialElements: 2, circumferentialElements: 4 }),
  Object.freeze({ levelId: 'L2', radialElements: 4, circumferentialElements: 8 }),
  Object.freeze({ levelId: 'L3', radialElements: 8, circumferentialElements: 16 }),
]);

if (process.argv[2] === '--child') {
  runChild(JSON.parse(process.argv[3]));
} else {
  runParent();
}

function runParent() {
  const deterministicRuns = [
    spawnObservation({ kind: 'PATCH', variant: 'BASE' }, 1),
    spawnObservation({ kind: 'PATCH', variant: 'BASE' }, 2),
    spawnObservation({ kind: 'PATCH', variant: 'PERMUTED' }, 3),
  ];
  const hashComparisons = HASH_FIELDS.map((field) => ({
    field,
    values: deterministicRuns.map((row) => row.semanticHashes?.[field] ?? null),
    equal: allEqual(deterministicRuns.map((row) => row.semanticHashes?.[field] ?? null)),
  }));
  const deterministicChecks = {
    childProcessesCompleted: deterministicRuns.every((row) => row.childExitStatus === 0),
    accepted: deterministicRuns.every((row) => row.qualificationState === QUALIFICATION_STATES.ACCEPTED),
    expectedDofCount: deterministicRuns.every((row) => row.dofCount === 8),
    hashShape: deterministicRuns.every((row) => HASH_FIELDS.every((field) => isHash(row.semanticHashes?.[field]))),
    semanticHashesEqual: hashComparisons.every((row) => row.equal),
  };

  const costRuns = COST_LEVELS.map((level, index) => spawnObservation({
    kind: 'CYLINDER',
    ...level,
  }, index + 1));
  const costChecks = costRuns.map((row, index) => {
    const level = COST_LEVELS[index];
    const expectedDofCount = q8StructuredDofCount(level.radialElements, level.circumferentialElements);
    return {
      levelId: level.levelId,
      accepted: row.childExitStatus === 0 && row.qualificationState === QUALIFICATION_STATES.ACCEPTED,
      expectedDofCount,
      actualDofCount: row.dofCount,
      dofCountMatchesTopology: row.dofCount === expectedDofCount,
      wallTimeObserved: Number.isFinite(row.workloadWallTimeMs) && row.workloadWallTimeMs >= 0,
      processPeakMemoryObserved: Number.isFinite(row.peakResidentSetKiB) && row.peakResidentSetKiB > 0,
    };
  });
  const dofCounts = costRuns.map((row) => row.dofCount);
  const dofRatios = dofCounts.slice(1).map((value, index) => value / dofCounts[index]);
  const stagePass = Object.values(deterministicChecks).every(Boolean)
    && costChecks.every((row) => row.accepted && row.dofCountMatchesTopology);

  const evidence = {
    schema: 'lafea3-bm-s-s5-determinism-cost-evidence/v1',
    benchmarkId: 'BM-S',
    benchmarkStage: 'S5',
    authority: {
      deterministicIdentity: 'PROCESS_INDEPENDENT_PRODUCTION_SEMANTIC_HASHES',
      comparedHashFields: HASH_FIELDS,
      wholeAuditRecordByteIdentityRequired: false,
      volatileMetricsEnterDeterministicIdentity: false,
      performanceIsInformational: true,
      performanceThresholds: null,
      releaseQualified: false,
    },
    determinism: {
      caseId: 'PATCH-CROSS-PROCESS-01',
      processIsolation: 'SEPARATE_NODE_PROCESS_PER_OBSERVATION',
      runs: deterministicRuns,
      hashComparisons,
      checks: deterministicChecks,
      status: Object.values(deterministicChecks).every(Boolean) ? 'PASS' : 'FAIL',
    },
    informationalCost: {
      caseId: 'CONT-CYL-01-Q8-LADDER-COST',
      meshAuthority: 'BENCHMARK_ONLY_SOLVER_ISOLATION',
      dofFormula: '2*(3*nr*nt + 2*nr + 2*nt + 1)',
      expectedDofCounts: COST_LEVELS.map((level) => ({
        levelId: level.levelId,
        dofCount: q8StructuredDofCount(level.radialElements, level.circumferentialElements),
      })),
      runs: costRuns,
      checks: costChecks,
      derivedDofRatios: dofRatios,
      wallTimeThresholdMs: null,
      peakResidentSetThresholdKiB: null,
      dofScalingThreshold: null,
      qualificationEffectOfPerformanceMetrics: 'NONE_INFORMATIONAL_ONLY',
    },
    stageStatus: stagePass ? 'PASS' : 'FAIL',
    releaseQualified: false,
  };

  writeBmSCaseEvidence('LAFEA_BM_S_S5_REPORT_PATH', evidence);
  console.log(JSON.stringify(evidence));
  assert.equal(
    evidence.stageStatus,
    'PASS',
    'S5 cross-process semantic-hash determinism or structural DOF consistency failed',
  );
}

function runChild(spec) {
  const started = process.hrtime.bigint();
  const { source, expectedDofCount, topology } = sourceFor(spec);
  const canonical = createCanonicalLocalContinuumModel(source);
  const result = calculateLocalContinuum(canonical);
  const ended = process.hrtime.bigint();
  const usage = process.resourceUsage();
  const dofCount = result.meshEvidence?.dofOrdering?.length ?? canonical.nodes.length * 2;
  const observation = {
    caseId: spec.kind === 'PATCH' ? 'PATCH-CROSS-PROCESS-01' : `CONT-CYL-01-${spec.levelId}`,
    inputVariant: spec.variant ?? spec.levelId,
    pid: process.pid,
    qualificationState: result.qualification.state,
    expectedDofCount,
    dofCount,
    topology,
    semanticHashes: semanticHashes(result),
    workloadWallTimeMs: Number(ended - started) / 1e6,
    peakResidentSetKiB: usage.maxRSS,
    peakResidentSetMetric: 'process.resourceUsage().maxRSS',
    peakResidentSetUnit: 'KiB',
  };
  console.log(JSON.stringify(observation));
  if (result.qualification.state !== QUALIFICATION_STATES.ACCEPTED || dofCount !== expectedDofCount) {
    process.exitCode = 1;
  }
}

function spawnObservation(spec, processOrdinal) {
  const started = process.hrtime.bigint();
  const child = spawnSync(process.execPath, [SELF, '--child', JSON.stringify(spec)], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  const processWallTimeMs = Number(process.hrtime.bigint() - started) / 1e6;
  const stdout = child.stdout?.trim() ?? '';
  let parsed = null;
  let parseError = null;
  try {
    parsed = stdout ? JSON.parse(stdout) : null;
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }
  return {
    processOrdinal,
    childExitStatus: child.status,
    processWallTimeMs,
    ...(parsed ?? {
      caseId: spec.kind === 'PATCH' ? 'PATCH-CROSS-PROCESS-01' : `CONT-CYL-01-${spec.levelId}`,
      inputVariant: spec.variant ?? spec.levelId,
      qualificationState: null,
      expectedDofCount: spec.kind === 'PATCH'
        ? 8
        : q8StructuredDofCount(spec.radialElements, spec.circumferentialElements),
      dofCount: null,
      topology: null,
      semanticHashes: null,
      workloadWallTimeMs: null,
      peakResidentSetKiB: null,
      peakResidentSetMetric: 'process.resourceUsage().maxRSS',
      peakResidentSetUnit: 'KiB',
    }),
    stderr: child.stderr?.trim() || null,
    parseError,
  };
}

function sourceFor(spec) {
  if (spec.kind === 'PATCH') {
    const source = spec.variant === 'PERMUTED' ? permuteSource(patchSource()) : patchSource();
    return {
      source,
      expectedDofCount: 8,
      topology: { nodeCount: 4, dofPerNode: 2, sourcePermutationApplied: spec.variant === 'PERMUTED' },
    };
  }
  assert.equal(spec.kind, 'CYLINDER');
  return cylinderSource(spec);
}

function cylinderSource(level) {
  const oracle = loadB02ExpectedCase('CONT-CYL-01');
  const { inputs } = oracle;
  const { nodes, elements } = mappedAnnulusSectorQ8(
    inputs.innerRadiusMm,
    inputs.outerRadiusMm,
    Math.PI / 2,
    level.radialElements,
    level.circumferentialElements,
  );
  const nodesById = new Map(nodes.map((row) => [row.nodeId, row]));
  const constraints = [];
  nodes.forEach((row) => {
    if (Math.abs(row.y) < 1e-6) constraints.push(constraint(row.nodeId, 'UY'));
    if (Math.abs(row.x) < 1e-6) constraints.push(constraint(row.nodeId, 'UX'));
  });
  const innerEdges = boundaryEdgesWhere(
    elements,
    nodesById,
    (node) => Math.hypot(node.x, node.y) <= inputs.innerRadiusMm + 1e-6,
  );
  assert.ok(innerEdges.length > 0, `${level.levelId} inner boundary edges required`);
  const pressureLoads = innerEdges.map((edge, index) => ({
    pressureLoadId: `P${index}`,
    elementId: edge.elementId,
    edgeNodeIds: edge.edgeNodeIds,
    pressure: inputs.internalPressureMPa,
    sourceReference: `PRESSURE#P${index}`,
  }));
  const source = {
    schema: 'local-continuum-model/v1',
    modelIdentity: `BM_S_S5_CONT_CYL_${level.levelId}`,
    modelVersion: '1',
    sourceAncestry: {
      sourceModelIdentity: 'BENCHMARK', sourceVersion: '1',
      adapterIdentity: 'LAFEA3_BM_S_S5', adapterVersion: '1',
    },
    units: { length: 'mm', force: 'N', stress: 'MPa', modulus: 'MPa' },
    formulation: inputs.formulation,
    materials: [{
      materialId: 'MAT',
      elasticModulus: inputs.elasticModulusMPa,
      poissonRatio: inputs.poissonRatio,
      sourceReference: 'MATERIAL#MAT',
    }],
    nodes: nodes.map((row) => ({
      nodeId: row.nodeId, x: row.x, y: row.y, sourceReference: `NODE#${row.nodeId}`,
    })),
    elements: elements.map((row) => ({
      elementId: row.elementId,
      elementType: row.elementType,
      nodeIds: row.nodeIds,
      materialId: 'MAT',
      thickness: inputs.thicknessMm,
      sourceReference: `ELEMENT#${row.elementId}`,
    })),
    elementTypePolicy: { allowT3Fallback: false, sourceReference: 'BM_S_S5_Q8_COST' },
    constraints,
    loadCases: [{
      loadCaseId: 'INTERNAL_PRESSURE',
      nodalForces: [], edgeTractions: [], pressureLoads,
      bodyForces: [], temperatureLoads: [], imposedDisplacements: [],
      sourceReference: 'CASE#INTERNAL_PRESSURE',
    }],
    resultRequests: { loadCaseIds: ['INTERNAL_PRESSURE'] },
    qualificationProfile: structuredClone(QUALIFICATION_PROFILE),
    limitations: [],
  };
  return {
    source,
    expectedDofCount: q8StructuredDofCount(level.radialElements, level.circumferentialElements),
    topology: {
      levelId: level.levelId,
      radialElements: level.radialElements,
      circumferentialElements: level.circumferentialElements,
      nodeCount: nodes.length,
      elementCount: elements.length,
    },
  };
}

function constraint(nodeId, dof) {
  return {
    constraintId: `${nodeId}-${dof}`,
    nodeId,
    dof,
    value: 0,
    sourceReference: `CONSTRAINT#${nodeId}-${dof}`,
  };
}

function q8StructuredDofCount(nr, nt) {
  return 2 * (3 * nr * nt + 2 * nr + 2 * nt + 1);
}

function allEqual(values) {
  return values.length > 0 && values.every((value) => value === values[0]);
}

function isHash(value) {
  return typeof value === 'string' && /^fnv1a64:[0-9a-f]{16}$/u.test(value);
}
