#!/usr/bin/env node
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.qualification) {
  throw new TypeError('Usage: node scripts/lfea-issue947-analysis-geometry-plain-frame-scan.mjs --package <canonical-package.json> --qualification <qualification.json> [--out <json>]');
}

const here = dirname(fileURLToPath(import.meta.url));
const basePath = join(here, 'lfea-issue947-plain-frame-failure-scan.mjs');
const tempPath = join(here, '.issue947-analysis-geometry-plain-frame-scan.tmp.mjs');
let source = readFileSync(basePath, 'utf8');

const coordinateAnchor = "const coordinates = sourceCoordinateIndex(benchmarkPackage.model.tables.INPUT_NODAL_COORDINATES.rows);";
if (!source.includes(coordinateAnchor)) throw new Error('Plain-frame scan coordinate anchor not found.');
source = source.replace(coordinateAnchor, `const rawCoordinates = sourceCoordinateIndex(benchmarkPackage.model.tables.INPUT_NODAL_COORDINATES.rows);\nconst { coordinates, bendFarAdjustments } = analysisCoordinatesWithBendFarNodes(\n  rawCoordinates,\n  [...sourceRows.values()],\n  benchmarkPackage.model.tables.INPUT_BENDS.rows,\n);`);

const gravityPhiAnchor = `    phiXY: stiffness.phiXY,\n    phiXZ: stiffness.phiXZ,`;
if (!source.includes(gravityPhiAnchor)) throw new Error('Plain-frame gravity load-vector anchor not found.');
source = source.replace(gravityPhiAnchor, `    phiXY: 0,\n    phiXZ: 0,`);

source = source.replace(
  "method: 'CAESAR_NODAL_DISPLACEMENT_INJECTED_INTO_CURRENT_CAESAR_PIPE_FRAME_LAW_V1',",
  "method: 'CAESAR_NODAL_DISPLACEMENT_INJECTED_INTO_PRODUCTION_PARITY_PIPE_FRAME_LAW_V3',\n  analysisGeometryCorrection: { rule: 'BEND_SOURCE_TO_NODE_MOVED_FROM_RAW_INTERSECTION_TO_TANGENT_END_FAR_POINT', bendFarAdjustments },\n  gravityLoadVectorParity: { rule: 'ACCDB_PRODUCTION_GRAVITY_VECTOR_PHI_ZERO', phiXY: 0, phiXZ: 0 },",
);

const helperAnchor = 'function sourceCoordinateIndex(rows) {';
if (!source.includes(helperAnchor)) throw new Error('Plain-frame scan helper anchor not found.');
const helpers = `function analysisCoordinatesWithBendFarNodes(rawCoordinates, sourceRows, bendRows) {\n  const coordinates = new Map([...rawCoordinates].map(([id, point]) => [id, [...point]]));\n  const bendByPointer = new Map(bendRows.map((row) => [Number(row.BEND_PTR), row]));\n  const adjustments = [];\n  for (const row of sourceRows) {\n    const pointer = Number(row.BEND_PTR);\n    if (!(pointer > 0)) continue;\n    const bend = bendByPointer.get(pointer);\n    if (!bend) throw new TypeError(\`BEND_PTR \${pointer} declaration missing.\`);\n    const outgoing = sourceRows.filter((candidate) => String(candidate.FROM_NODE) === String(row.TO_NODE));\n    if (outgoing.length !== 1) throw new TypeError(\`BEND_PTR \${pointer} requires one outgoing source element; found \${outgoing.length}.\`);\n    const start = requireCoordinate(rawCoordinates, String(row.FROM_NODE));\n    const intersection = requireCoordinate(rawCoordinates, String(row.TO_NODE));\n    const outletEnd = requireCoordinate(rawCoordinates, String(outgoing[0].TO_NODE));\n    const incomingDirection = vectorUnit(vectorSubtract(intersection, start), \`BEND_PTR \${pointer} incoming\`);\n    const outgoingDirection = vectorUnit(vectorSubtract(outletEnd, intersection), \`BEND_PTR \${pointer} outgoing\`);\n    const bendAngle = Math.acos(clampScalar(vectorDot(incomingDirection, outgoingDirection), -1, 1));\n    const radius = Number(bend.RADIUS) * MM_TO_M;\n    const tangentLength = radius * Math.tan(bendAngle / 2);\n    const tangentEnd = vectorAdd(intersection, vectorScale(outgoingDirection, tangentLength));\n    coordinates.set(String(row.TO_NODE), tangentEnd);\n    adjustments.push({\n      bendPointer: pointer,\n      bendSourceElementId: String(row.ELEMENTID),\n      sourceIntersectionNodeId: String(row.TO_NODE),\n      rawIntersectionM: intersection,\n      tangentEndFarM: tangentEnd,\n      shiftM: vectorSubtract(tangentEnd, intersection),\n      shiftMagnitudeM: distance(tangentEnd, intersection),\n      outgoingSourceElementId: String(outgoing[0].ELEMENTID),\n    });\n  }\n  return { coordinates, bendFarAdjustments: adjustments };\n}\nfunction vectorAdd(left, right) { return left.map((value, index) => value + right[index]); }\nfunction vectorSubtract(left, right) { return left.map((value, index) => value - right[index]); }\nfunction vectorScale(value, factor) { return value.map((entry) => entry * factor); }\nfunction vectorDot(left, right) { return left.reduce((sum, value, index) => sum + value * right[index], 0); }\nfunction vectorUnit(value, field) { const norm = Math.hypot(...value); if (!(norm > 0)) throw new TypeError(\`\${field} is degenerate.\`); return vectorScale(value, 1 / norm); }\nfunction clampScalar(value, min, max) { return Math.min(max, Math.max(min, value)); }\n`;
source = source.replace(helperAnchor, `${helpers}${helperAnchor}`);

writeFileSync(tempPath, source);
try {
  const childArgs = [tempPath, '--package', args.package, '--qualification', args.qualification];
  if (args.out) childArgs.push('--out', args.out);
  const run = spawnSync(process.execPath, childArgs, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  if (run.status !== 0) process.exit(run.status ?? 1);
} finally {
  rmSync(tempPath, { force: true });
}

function parseArgs(tokens) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith('--')) throw new TypeError(`Unexpected argument ${token}.`);
    const value = tokens[index + 1];
    if (value === undefined || value.startsWith('--')) throw new TypeError(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}
