#!/usr/bin/env node

/**
 * Stage S1 of the piping component promotion.
 *
 * A declared bend arc is only usable if a consumer knows where the arc starts
 * and ends. Both adapters resolve a centre and a radius; only one of them had
 * the tangent points to go with it, and it threw them away.
 *
 * The invariant asserted here is the one `discretiseBend` enforces: both
 * tangent points are equidistant from the centre, and that distance is the
 * computed radius. The raw segment endpoints of an ACCDB bend violate it --
 * they sit 0.867 m and 0.539 m from the centre against a 0.457 m radius,
 * because the element ends at the corner intersection rather than at the
 * tangent. Recording the tangents is what makes the arc placeable at all.
 *
 * See docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { accdbTablesToCanonicalGeometry } from '../src/core/geometry/adapters/accdb-to-canonical-geometry.js';
import { inputXmlToCanonicalGeometry } from '../src/core/geometry/adapters/inputXmlToCanonicalGeometry.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCDB = path.join(ROOT, 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
const INPUTXML = path.join(ROOT, 'benchmarks/LFEA/BM4/InputXML_BM4.xml');
const RELATIVE_TOLERANCE = 1e-9;
const TANGENT_BASES = new Set(['ACCDB_CORNER_INTERSECTION_V1', 'INPUTXML_TANGENT_TO_TANGENT_V1']);

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const finitePoint = (p) => Boolean(p)
  && [p.x, p.y, p.z].every((v) => typeof v === 'number' && Number.isFinite(v));

/**
 * Every bend that resolved an arc must carry a tangent pair that lies on that
 * arc. A bend with no resolved arc must carry no tangents, so a consumer can
 * never read a tangent that was not derived from a real centre.
 */
function auditGeometry(label, geometry) {
  // Every segment, not just those typed BEND. A bend element that also carries
  // a tee/SIF at its node is classified TEE while still resolving a real arc --
  // BM4_L has two of them. Auditing by type would persist their tangents
  // without ever checking them.
  const bends = geometry.segments;
  const typedBends = bends.filter((s) => String(s.type).toUpperCase() === 'BEND').length;
  let withArc = 0;
  let withTangents = 0;
  for (const segment of bends) {
    const meta = segment.meta ?? {};
    const hasArc = finitePoint(meta.bendArcCentre)
      && typeof meta.bendComputedRadius === 'number'
      && Number.isFinite(meta.bendComputedRadius);
    const hasTangents = finitePoint(meta.bendTangentStart) && finitePoint(meta.bendTangentEnd);

    if (!hasArc) {
      assert.ok(!hasTangents,
        `${label} ${segment.id}: tangent points recorded without a resolved arc centre.`);
      continue;
    }
    withArc += 1;
    assert.ok(hasTangents, `${label} ${segment.id}: resolved an arc but recorded no tangent points.`);
    assert.ok(TANGENT_BASES.has(meta.bendTangentBasis),
      `${label} ${segment.id}: unknown bendTangentBasis ${JSON.stringify(meta.bendTangentBasis)}.`);
    withTangents += 1;

    const radius = meta.bendComputedRadius;
    const fromStart = distance(meta.bendTangentStart, meta.bendArcCentre);
    const fromEnd = distance(meta.bendTangentEnd, meta.bendArcCentre);
    assert.ok(Math.abs(fromStart - fromEnd) / radius < RELATIVE_TOLERANCE,
      `${label} ${segment.id}: tangent points are not equidistant from the centre (${fromStart} vs ${fromEnd}).`);
    assert.ok(Math.abs(fromStart - radius) / radius < RELATIVE_TOLERANCE,
      `${label} ${segment.id}: tangent radius ${fromStart} does not equal computed radius ${radius}.`);
  }
  return { segments: bends.length, typedBends, withArc, withTangents };
}

const results = {};

// --- ACCDB: the source whose endpoints are NOT the tangents ---
if (fs.existsSync(ACCDB)) {
  const MDBReaderModule = await import('mdb-reader');
  const MDBReader = MDBReaderModule.default ?? MDBReaderModule;
  const reader = new MDBReader(fs.readFileSync(ACCDB));
  const names = [
    'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
    'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
    'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
  ];
  const tables = Object.fromEntries(names.map((n) => [n, { rows: reader.getTable(n).getData() }]));
  const geometry = accdbTablesToCanonicalGeometry(tables, {});
  results.accdb = auditGeometry('ACCDB', geometry);
  assert.ok(results.accdb.withArc > 0, 'BM4_L must resolve at least one bend arc.');
  assert.equal(results.accdb.withTangents, results.accdb.withArc);

  // The point of the stage: the raw endpoints must NOT satisfy the invariant,
  // otherwise recording the tangents separately would be pointless.
  const nodes = new Map(geometry.nodes.map((n) => [String(n.id), n]));
  const divergent = geometry.segments.filter((s) => {
    const meta = s.meta ?? {};
    if (!finitePoint(meta.bendArcCentre)) return false;
    const a = nodes.get(String(s.startNodeId));
    const b = nodes.get(String(s.endNodeId));
    if (!finitePoint(a) || !finitePoint(b)) return false;
    const r = meta.bendComputedRadius;
    return Math.abs(distance(a, meta.bendArcCentre) - r) / r > 1e-6
      || Math.abs(distance(b, meta.bendArcCentre) - r) / r > 1e-6;
  });
  assert.ok(divergent.length > 0,
    'ACCDB endpoints unexpectedly coincide with the tangents; the recorded tangents would be redundant.');
  results.accdb.endpointsDivergentFromTangents = divergent.length;
} else {
  results.accdb = 'SKIPPED_MODEL_NOT_PRESENT';
}

// --- InputXML: the source whose endpoints ARE the tangents ---
if (fs.existsSync(INPUTXML)) {
  const geometry = inputXmlToCanonicalGeometry(fs.readFileSync(INPUTXML, 'utf8'), {});
  results.inputXml = auditGeometry('InputXML', geometry);
} else {
  results.inputXml = 'SKIPPED_MODEL_NOT_PRESENT';
}

console.log(JSON.stringify({ check: 'lfea-bend-tangent-custody', status: 'PASS', ...results }));
