#!/usr/bin/env node
/**
 * M047 Stage 2 R5/R6 restraint-boundary diagnostic.
 *
 * R5: inventory effective friction restraints against bend stations and physical
 *     tee nodes. Bend-adjacent source nodes are recorded separately: adjacency
 *     is not the same as a support lying on the discretised arc.
 * R6: fail closed if INPUT_RESTRAINTS.STIFFNESS, GAP or CNODE is nonblank.
 *
 * This is data-only evidence; it changes no solver mechanic.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import { requiredCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-package.js';

const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const BOUNDARY_FIELDS = Object.freeze(['STIFFNESS', 'GAP', 'CNODE']);

function isBlankNumericSentinel(value) {
  return Number.isFinite(Number(value)) && Number(value) < 0;
}

async function buildRestraintBoundaryDiagnostic(input) {
  const profile = JSON.parse(readFileSync(resolve(input.profilePath ?? PROFILE_PATH), 'utf8'));
  const raw = await extractCaesarAccdbTables({
    accdbPath: input.accdbPath,
    tableNames: requiredCaesarAccdbTables(profile),
    expectedSha256: input.expectedSha256,
  });
  const iteration = JSON.parse(readFileSync(resolve(input.iterationPath), 'utf8'));
  if (iteration.caseId !== 'L13' || !iteration.converged || !Array.isArray(iteration.restraints)) {
    throw new TypeError('R5/R6 diagnostic requires a converged real L13 friction iteration artifact.');
  }
  if (iteration.sourceAccdbSha256 !== raw.source.sha256) {
    throw new TypeError(`Iteration source ${iteration.sourceAccdbSha256} does not match ACCDB ${raw.source.sha256}.`);
  }

  const restraintRows = raw.tables.INPUT_RESTRAINTS.rows;
  const basicRows = raw.tables.INPUT_BASIC_ELEMENT_DATA.rows;
  const bendRows = raw.tables.INPUT_BENDS.rows;
  const sifRows = raw.tables.INPUT_SIFTEES.rows;

  const declaredFrictionRows = restraintRows.filter((row) => Number(row.FRIC_COEF) > 0);
  const effectiveIds = new Set(iteration.restraints.map((entry) => String(entry.restraintId)));

  const bendDeclarationNodes = new Set(bendRows.flatMap((row) =>
    ['NODE1', 'NODE2', 'NODE3']
      .map((field) => Number(row[field]))
      .filter((value) => value > 0)
      .map(String)));

  const outgoingByFrom = new Map();
  for (const row of basicRows) {
    const from = String(row.FROM_NODE);
    const list = outgoingByFrom.get(from) ?? [];
    list.push(row);
    outgoingByFrom.set(from, list);
  }
  const bendAdjacent = new Map();
  for (const row of basicRows.filter((entry) => Number(entry.BEND_PTR) > 0)) {
    const pointer = Number(row.BEND_PTR);
    for (const nodeId of [String(row.FROM_NODE), String(row.TO_NODE)]) {
      const pointers = bendAdjacent.get(nodeId) ?? new Set();
      pointers.add(pointer);
      bendAdjacent.set(nodeId, pointers);
    }
    for (const outgoing of outgoingByFrom.get(String(row.TO_NODE)) ?? []) {
      const nodeId = String(outgoing.TO_NODE);
      const pointers = bendAdjacent.get(nodeId) ?? new Set();
      pointers.add(pointer);
      bendAdjacent.set(nodeId, pointers);
    }
  }

  const incidentCount = new Map();
  for (const row of basicRows) {
    for (const nodeId of [String(row.FROM_NODE), String(row.TO_NODE)]) {
      incidentCount.set(nodeId, (incidentCount.get(nodeId) ?? 0) + 1);
    }
  }
  const declaredTeeNodes = [...new Set(sifRows
    .filter((row) => Number(row.TYPE) === 3 && Number(row.NODE) > 0)
    .map((row) => String(row.NODE)))].sort(compareText);
  const physicalTeeNodes = declaredTeeNodes
    .filter((nodeId) => (incidentCount.get(nodeId) ?? 0) === 3)
    .sort(compareText);

  const effectiveRows = iteration.restraints.map((entry) => ({
    restraintId: String(entry.restraintId),
    nodeId: String(entry.nodeId),
    normalDof: entry.normalDof,
    frictionDofs: entry.frictionDofs,
    onDeclaredBendStation: bendDeclarationNodes.has(String(entry.nodeId)),
    bendAdjacentPointers: [...(bendAdjacent.get(String(entry.nodeId)) ?? [])].sort((a, b) => a - b),
    onPhysicalTeeNode: physicalTeeNodes.includes(String(entry.nodeId)),
  }));

  const boundaryRows = restraintRows.map((row) => ({
    nodeId: String(row.NODE_NUM),
    restraintPointer: Number(row.REST_PTR),
    restraintTypeId: Number(row.RES_TYPEID),
    frictionDeclared: Number(row.FRIC_COEF) > 0,
    fields: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, Number(row[field])])),
    blank: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [field, isBlankNumericSentinel(row[field])])),
  }));
  const unsupported = boundaryRows.flatMap((row) => BOUNDARY_FIELDS
    .filter((field) => !row.blank[field])
    .map((field) => ({ ...row, field, value: row.fields[field] })));

  const record = {
    schema: 'm047-bm4l-stage2-restraint-boundary-diagnostic/v1',
    sourceAccdbSha256: raw.source.sha256,
    iterationSemanticHash: iteration.iterationSemanticHash ?? null,
    rule: 'DATA_ONLY_R5_GEOMETRY_INVENTORY_AND_R6_BLANK_RESTRAINT_BOUNDARY_ASSERTION',
    R5: {
      effectiveFrictionRestraintCount: effectiveRows.length,
      declaredFrictionRowCount: declaredFrictionRows.length,
      declaredBendStationNodes: [...bendDeclarationNodes].sort(compareText),
      declaredPhysicalTeeNodes: physicalTeeNodes,
      frictionOnDeclaredBendStation: effectiveRows.filter((row) => row.onDeclaredBendStation),
      frictionOnPhysicalTeeNode: effectiveRows.filter((row) => row.onPhysicalTeeNode),
      frictionAdjacentToBendSourceElement: effectiveRows.filter((row) => row.bendAdjacentPointers.length > 0),
      interpretation:
        'A source support adjacent to a bend-bearing element is recorded but is not itself a generated discretised-arc station. Only coincidence with a declared bend station or physical tee node would require a local tangent-plane friction authority check.',
    },
    R6: {
      restraintRowCount: restraintRows.length,
      declaredFrictionRowCount: declaredFrictionRows.length,
      effectiveFrictionRestraintCount: effectiveIds.size,
      fields: BOUNDARY_FIELDS,
      blankRule: 'NEGATIVE_NUMERIC_VALUE_IS_CAESAR_BLANK_SENTINEL',
      uniqueValues: Object.fromEntries(BOUNDARY_FIELDS.map((field) => [
        field,
        [...new Set(restraintRows.map((row) => Number(row[field])))].sort((a, b) => a - b),
      ])),
      allRestraintRowsBlank: unsupported.length === 0,
      allDeclaredFrictionRowsBlank: declaredFrictionRows.every((row) =>
        BOUNDARY_FIELDS.every((field) => isBlankNumericSentinel(row[field]))),
      unsupportedRows: unsupported,
      requiredFutureBehavior:
        'Any nonblank STIFFNESS, GAP or CNODE must fail the friction qualification boundary until that mechanic has an explicit governed implementation.',
    },
    status: unsupported.length === 0 ? 'PASS' : 'FAIL',
  };
  return Object.freeze({ ...record, diagnosticSemanticHash: semanticHash(record) });
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'en');
}

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new TypeError(`Expected --name value pairs; got ${String(key)} ${String(value)}.`);
    }
    args.set(key, value);
  }
  const accdbPath = args.get('--accdb');
  const iterationPath = args.get('--iteration');
  if (!accdbPath || !iterationPath) {
    throw new TypeError('Usage: --accdb <BM4_L.ACCDB> --iteration <converged-L13.json> [--out file].');
  }
  return {
    accdbPath,
    iterationPath,
    expectedSha256: args.get('--expected-sha256'),
    profilePath: args.get('--profile'),
    outPath: args.get('--out'),
  };
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const input = parseArguments(process.argv.slice(2));
  const record = await buildRestraintBoundaryDiagnostic(input);
  if (input.outPath) {
    const out = resolve(input.outPath);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${canonicalPrettyStringify(record)}\n`, 'utf8');
  }
  process.stdout.write([
    `status                         ${record.status}`,
    `source                         ${record.sourceAccdbSha256}`,
    `effective friction restraints ${record.R5.effectiveFrictionRestraintCount}`,
    `on declared bend station       ${record.R5.frictionOnDeclaredBendStation.length}`,
    `on physical tee node           ${record.R5.frictionOnPhysicalTeeNode.length}`,
    `bend-adjacent source nodes      ${record.R5.frictionAdjacentToBendSourceElement.length}`,
    `R6 all restraint rows blank    ${record.R6.allRestraintRowsBlank}`,
    `R6 all friction rows blank     ${record.R6.allDeclaredFrictionRowsBlank}`,
    input.outPath ? `artifact                       ${resolve(input.outPath)}` : '',
  ].filter(Boolean).join('\n') + '\n');
  if (record.status !== 'PASS') process.exitCode = 2;
}

export { buildRestraintBoundaryDiagnostic, isBlankNumericSentinel };
