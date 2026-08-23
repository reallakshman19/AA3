#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { accdbTablesToCanonicalGeometry } from '../src/core/geometry/adapters/accdb-to-canonical-geometry.js';
import { inputXmlToCanonicalGeometry } from '../src/core/geometry/adapters/inputXmlToCanonicalGeometry.js';
import { buildAccdbFixtureTables } from './accdb-to-canonical-geometry-fixture.mjs';

const RELATIVE_TOLERANCE = 1e-9;

function distance(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y, right.z - left.z);
}

function assertTangentRadiusInvariant(segment, expectedBasis) {
  assert.equal(segment.meta.bendTangentBasis, expectedBasis);
  assert.ok(segment.meta.bendTangentStart, `${segment.id} must retain a bend tangent start.`);
  assert.ok(segment.meta.bendTangentEnd, `${segment.id} must retain a bend tangent end.`);
  assert.ok(segment.meta.bendArcCentre, `${segment.id} must retain the resolved bend centre.`);
  assert.ok(segment.meta.bendComputedRadius > 0, `${segment.id} must retain a positive computed radius.`);

  const radius = segment.meta.bendComputedRadius;
  const startRadius = distance(segment.meta.bendArcCentre, segment.meta.bendTangentStart);
  const endRadius = distance(segment.meta.bendArcCentre, segment.meta.bendTangentEnd);
  const scale = Math.max(radius, startRadius, endRadius);
  assert.ok(Math.abs(startRadius - radius) / scale <= RELATIVE_TOLERANCE,
    `${segment.id} tangent start radius must match the resolved bend radius.`);
  assert.ok(Math.abs(endRadius - radius) / scale <= RELATIVE_TOLERANCE,
    `${segment.id} tangent end radius must match the resolved bend radius.`);
  assert.ok(Math.abs(startRadius - endRadius) / scale <= RELATIVE_TOLERANCE,
    `${segment.id} tangent points must be equidistant from the bend centre.`);
}

const accdbGeometry = accdbTablesToCanonicalGeometry(buildAccdbFixtureTables(), {
  source: 's1-bend-tangent-custody-accdb',
});
const accdbBend = accdbGeometry.segments.find((segment) => segment.meta.sourceElementId === '1');
assert.equal(accdbBend?.type, 'BEND');
assertTangentRadiusInvariant(accdbBend, 'ACCDB_CORNER_INTERSECTION_V1');
assert.notDeepEqual(
  accdbBend.meta.bendTangentEnd,
  accdbGeometry.nodes.find((node) => node.id === accdbBend.endNodeId),
  'ACCDB corner/intersection node must not be relabeled as the physical tangent end.',
);

const validInputXml = `
<PIPINGMODEL JOBNAME="S1_TANGENT_VALID">
  <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1" DELTA_Y="0" DELTA_Z="0" />
  <PIPINGELEMENT FROM_NODE="20" TO_NODE="30" DELTA_X="1" DELTA_Y="1" DELTA_Z="0">
    <BEND RADIUS="1" />
  </PIPINGELEMENT>
</PIPINGMODEL>`;
const inputXmlGeometry = inputXmlToCanonicalGeometry(validInputXml, {
  unit: 'm',
  source: 's1-bend-tangent-custody-inputxml',
  bendRadiusTolerance: RELATIVE_TOLERANCE,
});
const inputXmlBend = inputXmlGeometry.segments.find((segment) => segment.type === 'BEND');
assert.ok(inputXmlBend, 'Expected one resolved InputXML bend.');
assertTangentRadiusInvariant(inputXmlBend, 'INPUTXML_TANGENT_TO_TANGENT_V1');
const startNode = inputXmlGeometry.nodes.find((node) => node.id === inputXmlBend.startNodeId);
const endNode = inputXmlGeometry.nodes.find((node) => node.id === inputXmlBend.endNodeId);
assert.deepEqual(inputXmlBend.meta.bendTangentStart, { x: startNode.x, y: startNode.y, z: startNode.z });
assert.deepEqual(inputXmlBend.meta.bendTangentEnd, { x: endNode.x, y: endNode.y, z: endNode.z });

const internalStationXml = `
<PIPINGMODEL JOBNAME="S1_TANGENT_INTERNAL_STATION">
  <PIPINGELEMENT FROM_NODE="10" TO_NODE="20" DELTA_X="1" DELTA_Y="0" DELTA_Z="0" />
  <PIPINGELEMENT FROM_NODE="20" TO_NODE="30" DELTA_X="1" DELTA_Y="1" DELTA_Z="0">
    <BEND RADIUS="1" NODE1="25" />
  </PIPINGELEMENT>
</PIPINGMODEL>`;
const internalStationGeometry = inputXmlToCanonicalGeometry(internalStationXml, {
  unit: 'm',
  source: 's1-bend-tangent-custody-internal-station',
});
const internalStationBend = internalStationGeometry.segments.find((segment) => segment.type === 'BEND');
assert.ok(internalStationBend, 'Expected one InputXML bend with an internal station.');
assert.equal(internalStationBend.meta.bendInternalStations, true);
assert.equal(internalStationBend.meta.bendArcCentre, undefined);
assert.equal(internalStationBend.meta.bendTangentStart, undefined);
assert.equal(internalStationBend.meta.bendTangentEnd, undefined);
assert.equal(internalStationBend.meta.bendTangentBasis, undefined);
assert.ok(internalStationGeometry.diagnostics.some((row) => row.code === 'BEND_INTERNAL_STATION_GEOMETRY_NOT_SUPPORTED'));

const accdbSource = fs.readFileSync('src/core/geometry/adapters/accdb-to-canonical-geometry.js', 'utf8');
assert.match(accdbSource, /bendTangentBasis = 'ACCDB_CORNER_INTERSECTION_V1'/u);
assert.doesNotMatch(accdbSource, /bendTangentStart\s*=\s*\{\s*x:\s*tangentStart\[0\]/u,
  'ACCDB tangent custody must preserve the live {x,y,z} vector representation, not array-index it.');

const inputXmlSource = fs.readFileSync('src/core/geometry/adapters/inputXmlToCanonicalGeometry.js', 'utf8');
assert.match(inputXmlSource, /bendTangentBasis = 'INPUTXML_TANGENT_TO_TANGENT_V1'/u);
assert.match(inputXmlSource, /bendInternalStations\) return;/u,
  'InputXML internal-station bends must remain fail-closed before tangent custody is assigned.');

console.log(JSON.stringify({
  check: 'lfea-bend-tangent-custody',
  status: 'PASS',
  accdbBasis: accdbBend.meta.bendTangentBasis,
  inputXmlBasis: inputXmlBend.meta.bendTangentBasis,
  relativeTolerance: RELATIVE_TOLERANCE,
}));
