#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const args = parseArgs(process.argv.slice(2));
if (!args.package) throw new TypeError('--package is required');
const outPath = args.out ?? '.work/bm4nl-bend-attachment-audit.json';
const authorityPath = args.settings
  ?? 'benchmarks/LFEA/CAESAR_ACCDB/bm4nl-caesar-settings.authority.json';

const pkg = readJson(args.package);
const authority = readJson(authorityPath);
assert.equal(pkg.benchmarkId, 'BM4_NL');
assert.equal(authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT, 1);

const rows = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows;
const bendRows = pkg.model.tables.INPUT_BENDS.rows;
const bendByPointer = new Map(bendRows.map((row) => [Number(row.BEND_PTR), row]));
const records = [];
for (const row of rows) {
  const pointer = Number(row.BEND_PTR);
  if (!(pointer > 0)) continue;
  const declaration = bendByPointer.get(pointer);
  assert.ok(declaration, `Missing INPUT_BENDS row ${pointer}`);
  const outgoing = rows.filter((candidate) => String(candidate.FROM_NODE) === String(row.TO_NODE));
  assert.equal(outgoing.length, 1, `BEND_PTR ${pointer} must have one leaving source element`);
  const uIn = direction(row);
  const uOut = direction(outgoing[0]);
  const bendAngle = Math.acos(clamp(dot(uIn, uOut), -1, 1));
  const radiusMm = Number(declaration.RADIUS);
  const tangentLengthMm = radiusMm * Math.tan(bendAngle / 2);
  const outgoingSourceLengthMm = length(outgoing[0]);
  const signedDistanceBeyondWeldMm = outgoingSourceLengthMm - tangentLengthMm;
  const attachmentLengthMm = radiusMm * authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT / 100;
  const triggered = Math.abs(signedDistanceBeyondWeldMm) <= attachmentLengthMm;
  records.push({
    sourceElementId: String(row.ELEMENTID),
    bendPointer: pointer,
    farPointNodeId: String(row.TO_NODE),
    leavingSourceElementId: String(outgoing[0].ELEMENTID),
    bendAngleDegrees: bendAngle * 180 / Math.PI,
    radiusMm,
    tangentLengthMm,
    outgoingSourceLengthMm,
    signedDistanceBeyondWeldMm,
    attachmentLengthMm,
    triggerRatio: Math.abs(signedDistanceBeyondWeldMm) / attachmentLengthMm,
    triggered,
  });
}
assert.equal(records.length, bendRows.length);
const triggered = records.filter((entry) => entry.triggered);
assert.deepEqual(triggered.map((entry) => entry.sourceElementId), ['25']);
const e25 = triggered[0];
assert.ok(Math.abs(e25.signedDistanceBeyondWeldMm - 0.4000091552734659) < 1e-6);
assert.ok(Math.abs(e25.attachmentLengthMm - 2.2859999084472656) < 1e-9);

const result = {
  check: 'lfea-issue947-bend-attachment-audit',
  status: 'PASS',
  sourceAccdbSha256: pkg.source.sha256,
  configuration: {
    bendLengthAttachmentPercent: authority.overall.settings.BEND_LENGTH_ATTACHMENT_PERCENT,
    authority: authority.overall.source,
    documentedRule: 'When the leaving-element To node lies within n percent of bend radius on either side of the far weld line, CAESAR inserts a weld-line-to-To element of exactly n percent radius.',
  },
  bendCount: records.length,
  triggeredCount: triggered.length,
  triggeredSourceElementIds: triggered.map((entry) => entry.sourceElementId),
  records,
  classification: 'BM4NL_BEND_ATTACHMENT_RULE_TRIGGERS_ONLY_E25',
  disposition: 'GEOMETRY_CUSTODY_ONLY_NO_PRODUCTION_GEOMETRY_CHANGE_UNTIL_NODE_MOVEMENT_OR_INSERTED_ELEMENT_SEMANTICS_ARE_REPRODUCED',
};
fs.mkdirSync('.work', { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  check: result.check,
  status: result.status,
  bendCount: result.bendCount,
  triggered: triggered.map((entry) => ({
    sourceElementId: entry.sourceElementId,
    leavingSourceElementId: entry.leavingSourceElementId,
    signedDistanceBeyondWeldMm: entry.signedDistanceBeyondWeldMm,
    attachmentLengthMm: entry.attachmentLengthMm,
    triggerRatio: entry.triggerRatio,
  })),
  classification: result.classification,
}, null, 2));

function direction(row) {
  const vector = [Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z)];
  const magnitude = Math.hypot(...vector);
  if (!(magnitude > 0)) throw new TypeError(`Element ${row.ELEMENTID} has zero length`);
  return vector.map((value) => value / magnitude);
}
function length(row) { return Math.hypot(Number(row.DELTA_X), Number(row.DELTA_Y), Number(row.DELTA_Z)); }
function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
function clamp(value, minimum, maximum) { return Math.min(maximum, Math.max(minimum, value)); }
function parseArgs(tokens) {
  const result = {};
  for (let i = 0; i < tokens.length; i += 2) {
    const key = tokens[i]; const value = tokens[i + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid arguments near ${String(key)}`);
    result[key.slice(2)] = value;
  }
  return result;
}
function readJson(path) { return JSON.parse(fs.readFileSync(path, 'utf8')); }
