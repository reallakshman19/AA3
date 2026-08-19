#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  executeLameBbarQualificationCase,
  lameOracle,
} from './lib/lafea-plane-strain-bbar-lame-fixture.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const definition = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'validation/lafea-incompressible/plane-strain-bbar-v1.json'),
  'utf8',
));
const probeMeshPolicy = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'validation/lafea-incompressible/plane-strain-bbar-probe-mesh-policy-v1.json'),
  'utf8',
));
const benchmark = definition.benchmarks.THICK_CYLINDER;
const distortion = definition.distortionMatrix.find((row) => row.distortionId === 'REGULAR');
const frozenProbe = benchmark.fixedPhysicalProbes.find(
  (row) => row.probeId === 'LAME-R90-T30-SX',
);
if (!distortion || !frozenProbe) throw new TypeError('Frozen diagnostic target missing');

// Execute the historical governing sparse case first. A solver candidate that
// cannot clear this exact production case must be rejected before spending time
// on the four-level nu=0.30 convergence trace or the 120-solve integrated matrix.
const governingLevel = benchmark.meshLadder.levels.find((row) => row.levelId === 'L4');
if (!governingLevel) throw new TypeError('Frozen governing L4 level missing');
const governingRun = executeLameBbarQualificationCase(definition, probeMeshPolicy, {
  elementType: 'T6',
  poissonRatio: 0.4999,
  level: governingLevel,
  distortion,
});

const values = benchmark.meshLadder.levels.map((level) => {
  const run = executeLameBbarQualificationCase(definition, probeMeshPolicy, {
    elementType: 'T6',
    poissonRatio: 0.30,
    level,
    distortion,
  });
  const probe = run.probes.find((row) => row.probe.probeId === frozenProbe.probeId);
  if (!probe) throw new TypeError(`Probe ${frozenProbe.probeId} missing at ${level.levelId}`);
  return Object.freeze({
    levelId: level.levelId,
    h: level.targetElementLength,
    value: probe.authoritativeValue,
    mappingResidual: probe.mapping.mappingResidual,
    meanDilatation: probe.meanDilatation,
    elementId: probe.mapping.elementId,
  });
});
const oracle = lameOracle(definition, 0.30, frozenProbe);

console.log(JSON.stringify({
  schema: 'lafea-b01-bbar-lame-convergence-diagnostic/v1',
  status: 'EVIDENCE_ONLY',
  studyId: `${definition.programmeId}/T6/REGULAR/NU-0.3/${frozenProbe.probeId}`,
  expectedValue: oracle.expectedValue,
  levels: values.map((row) => ({
    ...row,
    relativeError: Math.abs(row.value - oracle.expectedValue) / Math.max(Math.abs(oracle.expectedValue), 1e-30),
  })),
  allFour: sequenceEvidence(values),
  finestThree: sequenceEvidence(values.slice(-3)),
  governingSolverVeto: {
    elementType: 'T6',
    poissonRatio: 0.4999,
    levelId: governingLevel.levelId,
    targetElementLength: governingLevel.targetElementLength,
    distortionId: distortion.distortionId,
    qualificationState: governingRun.result.qualification.state,
    nodeCount: governingRun.mesh.nodes.length,
    elementCount: governingRun.mesh.elements.length,
    executionEvidenceHash: governingRun.result.semanticHashes.executionEvidenceHash,
  },
  qualificationChanged: false,
  releaseAuthorityGranted: false,
}, null, 2));

function sequenceEvidence(rows) {
  const differences = rows.slice(0, -1).map((row, index) => row.value - rows[index + 1].value);
  const orders = differences.slice(0, -1).map((difference, index) =>
    Math.log(Math.abs(difference) / Math.abs(differences[index + 1])) / Math.log(2));
  const observedOrder = orders.at(-1) ?? null;
  const orderSpreadRelative = orders.length > 1 && Number.isFinite(observedOrder)
    ? (Math.max(...orders) - Math.min(...orders)) / Math.max(Math.abs(observedOrder), 1e-15)
    : null;
  return Object.freeze({
    levelIds: rows.map((row) => row.levelId),
    differences,
    observedOrders: orders,
    observedOrder,
    orderSpreadRelative,
  });
}
