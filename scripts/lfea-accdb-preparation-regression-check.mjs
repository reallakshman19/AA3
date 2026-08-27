#!/usr/bin/env node

/**
 * Drive a real arc-bearing model through the whole governed preparation chain.
 *
 * This exists because nothing else does. Bend tangent persistence, re-topology
 * and the exact-flexibility capability flips all landed without any runnable
 * check driving `compileInputXmlLinearStructure` with a model that carries a
 * resolvable arc: BM4's InputXML declares internal bend stations and resolves
 * none, and the BM4_L ACCDB harness stops before structural preparation. The
 * result was that a change could be correct against geometry, wired into
 * preparation, pass every check, and still block every ACCDB model in the UI.
 *
 * That is not hypothetical -- it is what happened. `bendTangentStart` and
 * `bendTangentEnd` were added to the adapters without being classified in
 * `inputxml-unit-normalization.js`, which rejects numeric metadata it does not
 * recognise. Every ACCDB model reached BLOCK with
 * PIPING_INPUTXML_UNIT_FIELD_UNCLASSIFIED before structural preparation ran.
 *
 * The chain used here is the production one, entered where the UI enters it.
 * Nothing is reconstructed for the test.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLinearPipingAccdbSession,
  prepareLinearPipingAccdbPreFlight,
} from '../src/workspace/linear-piping-accdb-intake.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACCDB = path.join(ROOT, 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB');
const MODEL_TABLES = Object.freeze([
  'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'INPUT_CONTROL', 'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES', 'INPUT_OFFSETS', 'INPUT_REDUCERS', 'INPUT_RESTRAINTS',
  'INPUT_RIGIDS', 'INPUT_SIFTEES', 'INPUT_UNITS',
]);

if (!fs.existsSync(ACCDB)) {
  // The model is untracked, so a clean clone cannot run this. Say so rather
  // than reporting a pass that proves nothing.
  console.log(JSON.stringify({
    check: 'lfea-accdb-preparation-regression',
    status: 'SKIPPED_MODEL_NOT_PRESENT',
    requiredModel: 'benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB',
  }));
  process.exit(0);
}

const MDBReaderModule = await import('mdb-reader');
const MDBReader = MDBReaderModule.default ?? MDBReaderModule;
const reader = new MDBReader(fs.readFileSync(ACCDB));
const tables = Object.fromEntries(MODEL_TABLES.map((name) => [name, { rows: reader.getTable(name).getData() }]));

const session = createLinearPipingAccdbSession(tables, { fileName: 'BM4_L.ACCDB' });
const preFlight = prepareLinearPipingAccdbPreFlight(session.intake, session.sourceBundle);
const findings = preFlight?.preparation?.findings ?? [];
const blocks = findings.filter((row) => row.disposition === 'BLOCK');
const codes = [...new Set(blocks.map((row) => String(row.code)))].sort();

// --- 1. Geometry metadata must be unit-classified -------------------------
// Every coordinate the adapters attach has to convert with the model. An
// unconverted length would put a tangent point a factor of a thousand from its
// own centre on a millimetre model while still looking structurally valid, so
// the normalizer refuses metadata it cannot classify. Adding geometry metadata
// without classifying it here is the regression this asserts against.
assert.ok(!codes.includes('PIPING_INPUTXML_UNIT_FIELD_UNCLASSIFIED'),
  `Geometry metadata reached preparation unclassified: ${JSON.stringify(blocks.map((b) => b.message).slice(0, 3))}`);

// --- 2. Tangent metadata survived unit normalization ----------------------
const arcSegments = session.sourceBundle.geometry.segments
  .filter((segment) => segment.meta?.bendArcCentre && segment.meta?.bendTangentStart);
assert.ok(arcSegments.length > 0, 'BM4_L must present resolvable bend arcs to preparation.');
for (const segment of arcSegments) {
  const { bendArcCentre: centre, bendTangentStart: start, bendComputedRadius: radius } = segment.meta;
  for (const point of [centre, start, segment.meta.bendTangentEnd]) {
    assert.ok([point.x, point.y, point.z].every((v) => typeof v === 'number' && Number.isFinite(v)),
      `${segment.id}: arc metadata is not finite after normalization.`);
  }
  // The tangent must still sit on its own arc once every coordinate has been
  // scaled. If the centre converted and the tangents did not, this is where a
  // silent unit mismatch surfaces.
  const onArc = Math.abs(Math.hypot(start.x - centre.x, start.y - centre.y, start.z - centre.z) - radius) / radius;
  assert.ok(onArc < 1e-9,
    `${segment.id}: tangent is ${onArc} off its arc after unit normalization; coordinates scaled inconsistently.`);
}

// --- 3. A capability may not be claimed while preparation cannot complete --
// A flag asserting the path represents bends exactly, on a model whose
// preparation never produces a structural model, is a claim with nothing
// behind it. Reported rather than asserted, because whether to block on it is
// an engineering call, not this check's to make.
const capability = await import('../src/core/linear-piping-analysis-consumer/production-capability-profile.js');
const profile = capability.PRODUCTION_CAPABILITY_PROFILE;
const structuralPresent = Boolean(preFlight?.preparation?.structuralPreparation);
const claimedButUnprepared = structuralPresent
  ? []
  : ['bendExactMechanics', 'teeExactMechanics', 'reducerExactMechanics']
    .filter((flag) => profile[flag] === true);

console.log(JSON.stringify({
  check: 'lfea-accdb-preparation-regression',
  status: 'PASS',
  preparationStatus: preFlight?.preparation?.status ?? null,
  structuralPreparationPresent: structuralPresent,
  resolvedArcs: arcSegments.length,
  unitClassificationBlocks: 0,
  remainingBlockCodes: codes,
  capabilitiesClaimedWithoutPreparation: claimedButUnprepared,
}));
