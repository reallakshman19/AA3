#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const TARGET_NODES = Object.freeze(['22125', '22130', '22140']);
const TARGET_ELEMENTS = Object.freeze([
  Object.freeze({ elementId: '79', fromNode: '22125', toNode: '22130' }),
  Object.freeze({ elementId: '80', fromNode: '22130', toNode: '22140' }),
  Object.freeze({ elementId: '81', fromNode: '22140', toNode: '22190' }),
]);
const CASES = Object.freeze([
  Object.freeze({ caseId: 'L19', lcaseNumber: 19 }),
  Object.freeze({ caseId: 'L20', lcaseNumber: 20 }),
]);

const args = parseArgs(process.argv.slice(2));
if (!args.raw) {
  throw new TypeError('Usage: node scripts/lfea-issue947-node22130-reference-custody.mjs --raw <raw-export.json> [--out <json>]');
}
const raw = JSON.parse(readFileSync(args.raw, 'utf8'));
requirePinnedRaw(raw);

const basicRows = table(raw, 'INPUT_BASIC_ELEMENT_DATA').rows;
const elementRows = Object.fromEntries(TARGET_ELEMENTS.map((identity) => {
  const row = basicRows.find((candidate) => String(candidate.ELEMENTID) === identity.elementId);
  if (!row) throw new TypeError(`Missing INPUT_BASIC_ELEMENT_DATA element ${identity.elementId}.`);
  assert.equal(String(row.FROM_NODE), identity.fromNode, `Element ${identity.elementId} FROM_NODE drift.`);
  assert.equal(String(row.TO_NODE), identity.toNode, `Element ${identity.elementId} TO_NODE drift.`);
  return [identity.elementId, row];
}));

const displacementInputRows = table(raw, 'INPUT_DISPLMNT').rows;
const restraintRows = table(raw, 'INPUT_RESTRAINTS').rows;
const rigidRows = table(raw, 'INPUT_RIGIDS').rows;
const coordinateRows = table(raw, 'INPUT_NODAL_COORDINATES').rows;
const outputDisplacements = table(raw, 'OUTPUT_DISPLACEMENTS').rows;
const outputActions = table(raw, 'OUTPUT_GLOBAL_ELEMENT_FORCES').rows;

const sourcePointers = Object.fromEntries(TARGET_ELEMENTS.map(({ elementId }) => {
  const row = elementRows[elementId];
  return [elementId, {
    fromNode: String(row.FROM_NODE),
    toNode: String(row.TO_NODE),
    dispPtr: numberOrNull(row.DISP_PTR),
    restPtr: numberOrNull(row.REST_PTR),
    rigidPtr: numberOrNull(row.RIGID_PTR),
    bendPtr: numberOrNull(row.BEND_PTR),
    reducerPtr: numberOrNull(row.REDUCER_PTR),
  }];
}));

const activeDispPointers = [...new Set(
  Object.values(sourcePointers)
    .map((entry) => entry.dispPtr)
    .filter((value) => Number.isFinite(value) && value !== 0),
)].sort((a, b) => a - b);

const directInputDisplacementRows = displacementInputRows
  .filter((row) => rowReferencesAnyNode(row, TARGET_NODES))
  .map(stableObject);
const pointerInputDisplacementRows = displacementInputRows
  .filter((row) => activeDispPointers.includes(Number(row.DISP_PTR)))
  .map(stableObject);
const targetRestraintRows = restraintRows
  .filter((row) => rowReferencesAnyNode(row, TARGET_NODES))
  .map(stableObject);
const targetRigidRows = rigidRows
  .filter((row) => {
    const ptr = Number(row.RIGID_PTR);
    return Object.values(sourcePointers).some((entry) => entry.rigidPtr !== 0 && entry.rigidPtr === ptr)
      || rowReferencesAnyNode(row, TARGET_NODES);
  })
  .map(stableObject);
const targetCoordinateRows = coordinateRows
  .filter((row) => rowReferencesAnyNode(row, TARGET_NODES))
  .map(stableObject);

const cases = Object.fromEntries(CASES.map(({ caseId, lcaseNumber }) => {
  const displacements = outputDisplacements
    .filter((row) => Number(row.LCASE_NUM) === lcaseNumber && TARGET_NODES.includes(String(row.NODE)))
    .sort((left, right) => compareText(left.NODE, right.NODE))
    .map((row) => stableObject(row));
  const actions = TARGET_ELEMENTS.flatMap((identity) => outputActions
    .filter((row) => Number(row.LCASE_NUM) === lcaseNumber
      && String(row.FROM_NODE) === identity.fromNode
      && String(row.TO_NODE) === identity.toNode)
    .map((row) => ({ sourceElementId: identity.elementId, ...stableObject(row) })));

  const node22130 = displacements.find((row) => String(row.NODE) === '22130');
  if (!node22130) throw new TypeError(`${caseId} is missing OUTPUT_DISPLACEMENTS node 22130.`);
  if (actions.filter((row) => row.sourceElementId === '79').length !== 1) {
    throw new TypeError(`${caseId} must contain exactly one E79 global-action row.`);
  }
  if (actions.filter((row) => row.sourceElementId === '80').length !== 1) {
    throw new TypeError(`${caseId} must contain exactly one E80 global-action row.`);
  }

  return [caseId, {
    lcaseNumber,
    displacementRows: displacements,
    node22130RawRotation: {
      rx: numberOrNull(node22130.RX),
      ry: numberOrNull(node22130.RY),
      rz: numberOrNull(node22130.RZ),
      rotationUnit: node22130.RUNITS ?? null,
    },
    globalElementActionRows: actions,
  }];
}));

const e79e80DirectPointersAreZero = sourcePointers['79'].dispPtr === 0 && sourcePointers['80'].dispPtr === 0;
const node22130InputDisplacementRows = directInputDisplacementRows.filter((row) => rowReferencesAnyNode(row, ['22130']));
const node22130RestraintRows = targetRestraintRows.filter((row) => rowReferencesAnyNode(row, ['22130']));
const node22140RestraintRows = targetRestraintRows.filter((row) => rowReferencesAnyNode(row, ['22140']));
const noNode22130InputPrescriptionFound = e79e80DirectPointersAreZero
  && node22130InputDisplacementRows.length === 0
  && pointerInputDisplacementRows.length === 0;

const output = {
  schema: 'lfea-issue947-node22130-reference-custody/v1',
  issue: 947,
  sourceAccdbSha256: raw.source.sha256,
  purpose: 'READ_ONLY_REFERENCE_CUSTODY_NO_SOLVER_OR_MECHANICS_CHANGE',
  sourcePointers,
  inputDisplacement: {
    tableRowCount: displacementInputRows.length,
    activeTargetElementPointers: activeDispPointers,
    rowsReferencingTargetNodes: directInputDisplacementRows,
    rowsReferencedByTargetElementPointers: pointerInputDisplacementRows,
    node22130Rows: node22130InputDisplacementRows,
  },
  restraints: {
    rowsReferencingTargetNodes: targetRestraintRows,
    node22130Rows: node22130RestraintRows,
    node22140Rows: node22140RestraintRows,
  },
  rigids: {
    rowsRelevantToTargetElementsOrNodes: targetRigidRows,
  },
  coordinates: {
    rowsReferencingTargetNodes: targetCoordinateRows,
  },
  cases,
  gates: {
    e79e80DirectDisplacementPointersZero: {
      status: e79e80DirectPointersAreZero ? 'PASS' : 'FAIL',
      rule: 'E79 and E80 DISP_PTR shall both be zero before treating node 22130 as an unconstrained output-displacement custody witness.',
    },
    noNode22130InputDisplacementPrescriptionFound: {
      status: noNode22130InputPrescriptionFound ? 'PASS' : 'FAIL',
      rule: 'No INPUT_DISPLMNT row may reference node 22130 directly or through an active E79/E80 DISP_PTR.',
    },
    node22130NoDirectRestraintRow: {
      status: node22130RestraintRows.length === 0 ? 'PASS' : 'FAIL',
      rule: 'No INPUT_RESTRAINTS row may reference node 22130 before its RZ output is treated as a free kinematic result.',
    },
    node22140HasRestraintEvidence: {
      status: node22140RestraintRows.length > 0 ? 'PASS' : 'FAIL',
      rule: 'Node 22140 shall retain source restraint evidence so the local neighborhood is not mistaken for an entirely free span.',
    },
  },
  classification: noNode22130InputPrescriptionFound && node22130RestraintRows.length === 0
    ? 'NO_INPUT_PRESCRIPTION_OR_DIRECT_RESTRAINT_FOUND_AT_NODE_22130'
    : 'INPUT_CONSTRAINT_OR_PRESCRIPTION_REQUIRES_MECHANICS_RECONCILIATION',
  nextGate: 'TWO_SIDED_E79_E80_ACTION_TO_SHARED_RZ_RECONSTRUCTION_USING_PRODUCTION_PARITY_MECHANICS',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 node 22130 reference custody audit: ${output.classification}`);

function requirePinnedRaw(value) {
  if (!value || value.schema !== 'caesar-accdb-raw-export/v1') throw new TypeError('Exact ACCDB raw export is required.');
  assert.equal(value.source?.sha256, EXPECTED_SOURCE_SHA256, 'ACCDB SHA-256 drift.');
  for (const name of [
    'INPUT_BASIC_ELEMENT_DATA', 'INPUT_DISPLMNT', 'INPUT_RESTRAINTS', 'INPUT_RIGIDS',
    'INPUT_NODAL_COORDINATES', 'INPUT_UNITS', 'OUTPUT_DISPLACEMENTS', 'OUTPUT_GLOBAL_ELEMENT_FORCES',
  ]) table(value, name);
}

function table(rawExport, name) {
  const value = rawExport.tables?.[name];
  if (!value || !Array.isArray(value.rows) || !Array.isArray(value.columns)) {
    throw new TypeError(`Raw export is missing valid table ${name}.`);
  }
  return value;
}

function rowReferencesAnyNode(row, nodeIds) {
  const wanted = new Set(nodeIds.map(String));
  return Object.entries(row).some(([key, value]) => {
    if (!/NODE/iu.test(key)) return false;
    if (value === null || value === undefined || value === '') return false;
    return wanted.has(String(value));
  });
}

function stableObject(row) {
  return Object.fromEntries(Object.keys(row).sort(compareText).map((key) => [key, row[key]]));
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function compareText(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function parseArgs(argv) {
  const result = { raw: null, out: null };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--raw') result.raw = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
