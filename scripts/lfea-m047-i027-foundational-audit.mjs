#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCKED_SHA = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';

function args(argv) {
  const out = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) throw new TypeError(`Invalid argument near ${String(argv[i])}`);
    out.set(argv[i], argv[i + 1]);
  }
  for (const key of ['--raw', '--out', '--summary']) if (!out.has(key)) throw new TypeError(`Missing ${key}`);
  return Object.fromEntries([...out].map(([k, v]) => [k.slice(2), resolve(v)]));
}

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function activePointer(value) { const n = num(value); return n !== null && n > 0; }
function nonzero(value, tol = 1e-12) { const n = num(value); return n !== null && Math.abs(n) > tol; }
function text(value) { return String(value ?? '').trim(); }
function table(raw, name) {
  const t = raw.tables?.[name];
  if (!t || !Array.isArray(t.rows)) throw new TypeError(`Missing table ${name}`);
  return t.rows;
}
function sha256Text(value) { return createHash('sha256').update(value, 'utf8').digest('hex'); }
function sortText(a, b) { return String(a).localeCompare(String(b), 'en'); }

const input = args(process.argv.slice(2));
const rawText = readFileSync(input.raw, 'utf8').replace(/^\uFEFF/u, '');
const raw = JSON.parse(rawText);
if (raw?.source?.sha256 !== LOCKED_SHA) throw new Error(`Locked ACCDB mismatch: ${String(raw?.source?.sha256)}`);

const basic = table(raw, 'INPUT_BASIC_ELEMENT_DATA');
const restraints = table(raw, 'INPUT_RESTRAINTS');
const forces = table(raw, 'INPUT_FORCMNT');
const coords = table(raw, 'INPUT_NODAL_COORDINATES');
const offsets = table(raw, 'INPUT_OFFSETS');
const outDisp = table(raw, 'OUTPUT_DISPLACEMENTS');
const outForce = table(raw, 'OUTPUT_GLOBAL_ELEMENT_FORCES');
const outRest = table(raw, 'OUTPUT_RESTRAINTS_SUMMARY');

const pointerFields = ['BEND_PTR','RIGID_PTR','EXPJ_PTR','REST_PTR','DISP_PTR','FORCMNT_PTR','ULOAD_PTR','WLOAD_PTR','EOFF_PTR','INT_PTR','HGR_PTR','NOZ_PTR','REDUCER_PTR','FLANGE_PTR'];
const pointerCounts = Object.fromEntries(pointerFields.map((field) => [field, basic.filter((row) => activePointer(row[field])).length]));

const restraintRows = restraints.map((row) => ({
  restPtr: num(row.REST_PTR), node: text(row.NODE_NUM), typeId: num(row.RES_TYPEID),
  stiffness: num(row.STIFFNESS), gap: num(row.GAP), friction: num(row.FRIC_COEF), cnode: text(row.CNODE),
  direction: [num(row.XCOSINE), num(row.YCOSINE), num(row.ZCOSINE)], tag: text(row.RES_TAG),
}));
const explicitStiffness = restraintRows.filter((row) => row.stiffness !== null && row.stiffness > 0);
const nonzeroGaps = restraintRows.filter((row) => nonzero(row.gap));
const nonzeroFriction = restraintRows.filter((row) => nonzero(row.friction));
const activeCnodes = restraintRows.filter((row) => row.cnode !== '' && row.cnode !== '0');
const restraintTypes = [...new Set(restraintRows.map((row) => row.typeId))].sort((a, b) => (a ?? 0) - (b ?? 0));

const forceRows = forces.map((row) => ({
  pointer: num(row.FORCMNT_PTR), number: num(row.FORCMNT_NUM), node: text(row.NODE_NUM), vector: num(row.VECTOR_NUM),
  fx: num(row.FX), fy: num(row.FY), fz: num(row.FZ), mx: num(row.MX), my: num(row.MY), mz: num(row.MZ),
}));
const nonzeroForceRows = forceRows.filter((row) => ['fx','fy','fz','mx','my','mz'].some((key) => nonzero(row[key])));
const nonzeroForceVectors = [...new Set(nonzeroForceRows.map((row) => row.vector).filter((v) => Number.isInteger(v)))].sort((a,b)=>a-b);

const caseMap = new Map();
for (const [name, rows] of [['OUTPUT_DISPLACEMENTS', outDisp], ['OUTPUT_GLOBAL_ELEMENT_FORCES', outForce], ['OUTPUT_RESTRAINTS_SUMMARY', outRest]]) {
  for (const row of rows) {
    const n = num(row.LCASE_NUM);
    if (!Number.isInteger(n)) continue;
    const rec = { lcaseNumber: n, caseText: text(row.CASE), name: text(row.LCASE_NAME) };
    const prior = caseMap.get(n);
    if (prior && (prior.caseText !== rec.caseText || prior.name !== rec.name)) throw new Error(`Inconsistent output case ${n} across ${name}`);
    caseMap.set(n, rec);
  }
}
const cases = [...caseMap.values()].sort((a,b)=>a.lcaseNumber-b.lcaseNumber).map((row) => {
  const match = /^CASE\s+\d+\s+\(([^)]+)\)\s*(.*)$/iu.exec(row.caseText);
  const formula = match ? match[2].trim().toUpperCase() : '';
  const forceSets = [...formula.matchAll(/(?:^|[^A-Z0-9])F([1-9])(?:$|[^A-Z0-9])/gu)].map((m) => Number(m[1]));
  return { ...row, caseClass: match ? match[1].trim().toUpperCase() : '', formula, forceSets };
});
const selected = cases.filter((row) => row.lcaseNumber === 19 || row.lcaseNumber === 20);
const primitiveLike = cases.filter((row) => /^(W|WNC|WW|P[1-9]|T[1-9]|F[1-9]|D[1-9]|U[1-3])$/u.test(row.formula));

const coordByElement = new Map(coords.map((row) => [`${text(row.FROM_NODE)}->${text(row.TO_NODE)}`, row]));
const geometryResiduals = [];
for (const row of basic) {
  const key = `${text(row.FROM_NODE)}->${text(row.TO_NODE)}`;
  const c = coordByElement.get(key);
  if (!c) {
    geometryResiduals.push({ elementId: text(row.ELEMENTID), issue: 'MISSING_COORDINATE_ROW' });
    continue;
  }
  const expected = [num(row.DELTA_X), num(row.DELTA_Y), num(row.DELTA_Z)];
  const actual = [
    num(c.TO_NODE_X) - num(c.FROM_NODE_X),
    num(c.TO_NODE_Y) - num(c.FROM_NODE_Y),
    num(c.TO_NODE_Z) - num(c.FROM_NODE_Z),
  ];
  const residual = actual.map((v, i) => v - expected[i]);
  const maxAbsMm = Math.max(...residual.map(Math.abs));
  if (maxAbsMm > 1e-6) geometryResiduals.push({ elementId: text(row.ELEMENTID), maxAbsMm, residualMm: residual });
}

const audit = {
  schema: 'lfea-m047-i027-foundational-audit/v1',
  issueId: 'M047', iterationId: 'M047-I027', sourceAccdbSha256: raw.source.sha256,
  rawExportSha256: sha256Text(rawText),
  sourceElementCount: basic.length,
  pointerCounts,
  restraints: {
    rowCount: restraintRows.length,
    typeIds: restraintTypes,
    explicitPositiveStiffnessCount: explicitStiffness.length,
    explicitPositiveStiffnessRows: explicitStiffness,
    blankOrNonpositiveStiffnessCount: restraintRows.length - explicitStiffness.length,
    nonzeroGapCount: nonzeroGaps.length,
    nonzeroGapRows: nonzeroGaps,
    nonzeroFrictionCount: nonzeroFriction.length,
    activeCnodeCount: activeCnodes.length,
    rows: restraintRows,
  },
  forceMoments: {
    rowCount: forceRows.length,
    nonzeroRowCount: nonzeroForceRows.length,
    nonzeroVectorNumbers: nonzeroForceVectors,
    nonzeroRows: nonzeroForceRows,
    l19l20ForceSets: selected.map((row) => ({ lcaseNumber: row.lcaseNumber, formula: row.formula, forceSets: row.forceSets })),
  },
  offsets: { tableRowCount: offsets.length, activeElementPointerCount: pointerCounts.EOFF_PTR },
  outputCases: { count: cases.length, cases, primitiveLike },
  geometry: { mismatchCount: geometryResiduals.length, mismatches: geometryResiduals },
  conclusions: [],
};

if (explicitStiffness.length > 0) audit.conclusions.push('EXPLICIT_RESTRAINT_STIFFNESS_PRESENT_AUDIT_FIXED_DOF_APPROXIMATION');
else audit.conclusions.push('NO_EXPLICIT_POSITIVE_RESTRAINT_STIFFNESS_IN_EXPORTED_ROWS');
if (nonzeroGaps.length || nonzeroFriction.length || activeCnodes.length) audit.conclusions.push('NONIDEAL_RESTRAINT_FIELDS_PRESENT');
else audit.conclusions.push('NO_ACTIVE_GAP_FRICTION_OR_CNODE_FIELDS');
if (selected.some((row) => row.forceSets.length > 0)) audit.conclusions.push('L19_OR_L20_CONTAINS_FORCE_SET');
else audit.conclusions.push('L19_L20_DO_NOT_REFERENCE_F1_F9');
if (primitiveLike.length > 0) audit.conclusions.push('PRIMITIVE_LIKE_CAESAR_OUTPUT_CASES_AVAILABLE');
else audit.conclusions.push('NO_PRIMITIVE_LIKE_CAESAR_OUTPUT_CASES_EXPORTED');
if (geometryResiduals.length > 0) audit.conclusions.push('SOURCE_DELTA_COORDINATE_MISMATCH_PRESENT');
else audit.conclusions.push('ALL_SOURCE_DELTAS_MATCH_EXPORTED_NODE_COORDINATES');

writeFileSync(input.out, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const lines = [
  '# M047 I027 foundational ACCDB audit', '',
  `- ACCDB: \`${audit.sourceAccdbSha256}\``,
  `- source elements: ${audit.sourceElementCount}`,
  `- restraint rows: ${restraintRows.length}`,
  `- explicit positive restraint stiffness rows: ${explicitStiffness.length}`,
  `- nonzero gaps / friction / CNodes: ${nonzeroGaps.length} / ${nonzeroFriction.length} / ${activeCnodes.length}`,
  `- force/moment rows: ${forceRows.length}; nonzero: ${nonzeroForceRows.length}; vectors: ${nonzeroForceVectors.join(', ') || 'none'}`,
  `- L19/L20 F-set participation: ${selected.map((r)=>`L${r.lcaseNumber}=${r.forceSets.join(',')||'none'}`).join('; ')}`,
  `- output cases discovered: ${cases.length}; primitive-like: ${primitiveLike.map((r)=>`L${r.lcaseNumber}:${r.formula}`).join(', ') || 'none'}`,
  `- active EOFF_PTR: ${pointerCounts.EOFF_PTR}; INPUT_OFFSETS rows: ${offsets.length}`,
  `- source delta/coordinate mismatches: ${geometryResiduals.length}`,
  '', '## Conclusions', ...audit.conclusions.map((x)=>`- ${x}`), '',
];
writeFileSync(input.summary, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ conclusions: audit.conclusions, primitiveLike: primitiveLike.map((r)=>r.formula) }));
