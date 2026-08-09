#!/usr/bin/env node
import assert from 'node:assert/strict';
import { canonicalLafeaJson } from '../src/workspace/lafea-canonical-sha256.js';
import {
  LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
  createLafeaShellAnalysisDomain,
  createLafeaShellMidsurfaceGeometry,
  validateLafeaShellAnalysisDomain,
} from '../src/workspace/lafea-shell-midsurface-contract.js';

const SOURCE_HASH = `sha256:${'e'.repeat(64)}`;
const ROOT2 = Math.sqrt(0.5);
const geometry = createLafeaShellMidsurfaceGeometry({
  schema: LAFEA_SHELL_MIDSURFACE_GEOMETRY_SCHEMA,
  stageId: 'LAFEA.4',
  geometryId: 'P2-8-HASH-PROBE',
  lengthUnit: 'mm',
  origin: { x: 10, y: -20, z: 30 },
  axisU: { x: ROOT2, y: ROOT2, z: 0 },
  axisV: { x: 0, y: 0, z: 1 },
  orientationPolicy: LAFEA_SHELL_MIDSURFACE_ORIENTATION,
  vertices: [
    { vertexId: 'V1', u: 0, v: 0 },
    { vertexId: 'V2', u: 200, v: 0 },
    { vertexId: 'V3', u: 200, v: 120 },
    { vertexId: 'V4', u: 0, v: 120 },
  ],
  segments: [
    { segmentId: 'S1', startVertexId: 'V1', endVertexId: 'V2' },
    { segmentId: 'S2', startVertexId: 'V2', endVertexId: 'V3' },
    { segmentId: 'S3', startVertexId: 'V3', endVertexId: 'V4' },
    { segmentId: 'S4', startVertexId: 'V4', endVertexId: 'V1' },
  ],
  loops: [{ loopId: 'OUTER', role: 'OUTER', segmentIds: ['S1', 'S2', 'S3', 'S4'] }],
});

const input = {
  schema: LAFEA_SHELL_ANALYSIS_DOMAIN_SCHEMA,
  stageId: 'LAFEA.4',
  domainId: 'P2-8-LAFEA.4-DOMAIN',
  sourceHash: SOURCE_HASH,
  midsurfaceGeometryHash: geometry.semanticHash,
  lengthUnit: 'mm',
  topologyClass: LAFEA_SHELL_MIDSURFACE_TOPOLOGY,
};
const first = createLafeaShellAnalysisDomain(input);
const second = createLafeaShellAnalysisDomain({ ...input });
const fromOutput = createLafeaShellAnalysisDomain({
  schema: first.schema,
  stageId: first.stageId,
  domainId: first.domainId,
  sourceHash: first.sourceHash,
  midsurfaceGeometryHash: first.midsurfaceGeometryHash,
  lengthUnit: first.lengthUnit,
  topologyClass: first.topologyClass,
});

console.log(JSON.stringify({
  schema: 'lafea-shell-domain-hash-probe/v1',
  inputCanonical: canonicalLafeaJson(input),
  firstHash: first.semanticHash,
  secondHash: second.semanticHash,
  fromOutputHash: fromOutput.semanticHash,
  firstCanonical: canonicalLafeaJson(first),
  fromOutputCanonical: canonicalLafeaJson(fromOutput),
}, null, 2));

assert.equal(first.semanticHash, second.semanticHash, 'same literal input must hash identically');
assert.equal(first.semanticHash, fromOutput.semanticHash, 'output-derived input must hash identically');
validateLafeaShellAnalysisDomain(first);
console.log('LAFEA shell domain hash round-trip PASS');
