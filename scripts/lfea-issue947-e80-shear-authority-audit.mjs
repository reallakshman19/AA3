#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = parseArgs(process.argv.slice(2));
if (!args.package || !args.qualification) {
  throw new TypeError('Usage: node scripts/lfea-issue947-e80-shear-authority-audit.mjs --package <canonical-package.json> --qualification <qualification.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
const EXPECTED = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
if (pkg?.source?.sha256 !== EXPECTED) throw new TypeError(`Unexpected source hash ${pkg?.source?.sha256}`);

const here = dirname(fileURLToPath(import.meta.url));
const base = readFileSync(join(here, 'lfea-issue947-plain-frame-failure-scan.mjs'), 'utf8');
const work = mkdtempSync(join(tmpdir(), 'issue947-e80-shear-'));
const authorities = [
  { id: 'CAESAR_PIPE_COEFFICIENT_2', kappa: 0.5, authority: 'current production mapping; pipe shear coefficient 2 -> kappa 0.5' },
  { id: 'REPOSITORY_COWPER_PIPE', kappa: 0.53, authority: 'retained generic repository pipe-frame qualification' },
  { id: 'UNIT_SHEAR_AREA', kappa: 1.0, authority: 'diagnostic bound; no shear-area reduction' },
  { id: 'EULER_BERNOULLI_LIMIT', kappa: 1e12, authority: 'diagnostic limiting case phi -> 0; not a candidate pipe authority' },
];

try {
  const results = [];
  for (const item of authorities) {
    const scriptPath = join(here, `.issue947-e80-${item.id.toLowerCase()}.tmp.mjs`);
    const outPath = join(work, `${item.id}.json`);
    writeFileSync(scriptPath, variantSource(base, item.kappa, item.id));
    try {
      const run = spawnSync(process.execPath, [scriptPath, '--package', args.package, '--qualification', args.qualification, '--out', outPath], {
        encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      });
      if (run.status !== 0) throw new Error(`${item.id} failed\n${run.stdout}\n${run.stderr}`);
      const scan = JSON.parse(readFileSync(outPath, 'utf8'));
      const e80 = scan.rows.find((row) => row.sourceElementId === '80');
      if (!e80) throw new Error(`${item.id} scan did not contain E80.`);
      results.push({
        ...item,
        phiXY: e80.phiXY,
        phiXZ: e80.phiXZ,
        actionGlobal: e80.actionGlobal,
        referenceGlobal: e80.referenceGlobal,
        residualGlobal: e80.residualGlobal,
        normalizedResidual: e80.normalizedResidual,
        normalizedResidualL2: e80.normalizedResidualL2,
        maxAbsNormalizedResidual: e80.maxAbsNormalizedResidual,
        governingResidualDof: e80.governingResidualDof,
        constitutiveStatusAtTenPercent: e80.constitutiveStatusAtTenPercent,
      });
    } finally {
      rmSync(scriptPath, { force: true });
    }
  }

  const output = {
    schema: 'lfea-issue947-e80-shear-authority-audit/v1',
    issue: 947,
    caseId: 'L19',
    sourceAccdbSha256: pkg.source.sha256,
    sourceElementId: '80',
    sourceNodes: ['22130', '22140'],
    referenceUsage: 'DIAGNOSTIC_ONLY_NO_PARAMETER_FIT_NO_UPDATE_RULE',
    invariantTerms: 'same CAESAR endpoint u/theta, production bend-FAR geometry corrections, section, E, nu, gravity and closed-end pressure strain; only Timoshenko shear correction changes',
    results,
    ranking: [...results].sort((a, b) => a.normalizedResidualL2 - b.normalizedResidualL2).map((entry) => ({
      id: entry.id,
      kappa: entry.kappa,
      phiXY: entry.phiXY,
      normalizedResidualL2: entry.normalizedResidualL2,
      maxAbsNormalizedResidual: entry.maxAbsNormalizedResidual,
      governingResidualDof: entry.governingResidualDof,
    })),
    decisionRule: 'Do not change production kappa from this sensitivity audit. A different shear authority requires independent CAESAR formulation evidence and must also preserve earlier E3/E4 qualification.',
  };
  if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
  console.log('Issue 947 E80 shear authority audit PASS');
} finally {
  rmSync(work, { recursive: true, force: true });
}

function variantSource(base, kappa, id) {
  let source = base;
  const kappaAnchor = 'const CAESAR_PIPE_KAPPA = 0.5;';
  if (!source.includes(kappaAnchor)) throw new Error('Kappa anchor not found.');
  source = source.replace(kappaAnchor, `const CAESAR_PIPE_KAPPA = ${kappa};`);
  const coordinateAnchor = "const coordinates = sourceCoordinateIndex(benchmarkPackage.model.tables.INPUT_NODAL_COORDINATES.rows);";
  if (!source.includes(coordinateAnchor)) throw new Error('Coordinate anchor not found.');
  source = source.replace(coordinateAnchor, `const rawCoordinates = sourceCoordinateIndex(benchmarkPackage.model.tables.INPUT_NODAL_COORDINATES.rows);\nconst coordinates = analysisCoordinatesWithBendFarNodes(rawCoordinates, [...sourceRows.values()], benchmarkPackage.model.tables.INPUT_BENDS.rows);`);
  source = source.replace(
    "method: 'CAESAR_NODAL_DISPLACEMENT_INJECTED_INTO_CURRENT_CAESAR_PIPE_FRAME_LAW_V1',",
    `method: 'E80_SHEAR_AUTHORITY_${id}',`,
  );
  const helperAnchor = 'function sourceCoordinateIndex(rows) {';
  if (!source.includes(helperAnchor)) throw new Error('Helper anchor not found.');
  source = source.replace(helperAnchor, `${bendHelpers()}${helperAnchor}`);
  return source;
}

function bendHelpers() {
  return `function analysisCoordinatesWithBendFarNodes(rawCoordinates, sourceRows, bendRows) {\n  const coordinates = new Map([...rawCoordinates].map(([id, point]) => [id, [...point]]));\n  const bendByPointer = new Map(bendRows.map((row) => [Number(row.BEND_PTR), row]));\n  for (const row of sourceRows) {\n    const pointer = Number(row.BEND_PTR);\n    if (!(pointer > 0)) continue;\n    const bend = bendByPointer.get(pointer);\n    if (!bend) throw new TypeError(\`BEND_PTR \${pointer} missing.\`);\n    const outgoing = sourceRows.filter((candidate) => String(candidate.FROM_NODE) === String(row.TO_NODE));\n    if (outgoing.length !== 1) throw new TypeError(\`BEND_PTR \${pointer} outgoing count \${outgoing.length}.\`);\n    const start = requireCoordinate(rawCoordinates, String(row.FROM_NODE));\n    const intersection = requireCoordinate(rawCoordinates, String(row.TO_NODE));\n    const outletEnd = requireCoordinate(rawCoordinates, String(outgoing[0].TO_NODE));\n    const incoming = vunit(vsub(intersection, start));\n    const outgoingDir = vunit(vsub(outletEnd, intersection));\n    const angle = Math.acos(Math.min(1, Math.max(-1, vdot(incoming, outgoingDir))));\n    const tangentLength = Number(bend.RADIUS) * MM_TO_M * Math.tan(angle / 2);\n    coordinates.set(String(row.TO_NODE), vadd(intersection, vscale(outgoingDir, tangentLength)));\n  }\n  return coordinates;\n}\nfunction vadd(a,b){return a.map((v,i)=>v+b[i]);}\nfunction vsub(a,b){return a.map((v,i)=>v-b[i]);}\nfunction vscale(a,s){return a.map((v)=>v*s);}\nfunction vdot(a,b){return a.reduce((sum,v,i)=>sum+v*b[i],0);}\nfunction vunit(a){const n=Math.hypot(...a);if(!(n>0))throw new TypeError('degenerate direction');return vscale(a,1/n);}\n`;
}

function parseArgs(tokens) {
  const result = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const key = tokens[i];
    const value = tokens[i + 1];
    if (!key?.startsWith('--') || value === undefined || value.startsWith('--')) throw new TypeError(`Invalid argument near ${key}`);
    result[key.slice(2)] = value;
    i += 1;
  }
  return result;
}
