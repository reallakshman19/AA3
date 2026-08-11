import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_AUTHORITY = path.resolve(
  'benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-authority.json',
);
const args = parseArgs(process.argv.slice(2));
const authorityPath = path.resolve(args.authority ?? DEFAULT_AUTHORITY);
const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));

const expected = [
  ['L1', 1, 'HYD', 'WW+HP', 1, null, 'Disp/Force/Stress'],
  ['L2', 2, 'SUS', 'W', 0, null, 'Disp/Force/Stress'],
  ['L3', 3, 'OPE', 'T1', 0, null, 'Disp/Force/Stress'],
  ['L4', 4, 'SUS', 'P1', 0, null, 'Disp/Force/Stress'],
  ['L5', 5, 'OPE', 'W+T1+P1', 0, null, 'Disp/Force/Stress'],
  ['L6', 6, 'SUS', 'W+P1', 0, null, 'Disp/Force/Stress'],
  ['L7', 7, 'OPE', 'W+T1+P1', 1, null, 'Disp/Force/Stress'],
  ['L8', 8, 'Alt-SUS', 'W+P1', 1, null, 'Stress'],
  ['L9', 9, 'OPE', 'W+T2+P1', 1, null, 'Disp/Force/Stress'],
  ['L10', 10, 'Alt-SUS', 'W+P1', 1, null, 'Stress'],
  ['L11', 11, 'OPE', 'W+T3+P1', 1, null, 'Disp/Force/Stress'],
  ['L12', 12, 'Alt-SUS', 'W+P1', 1, null, 'Stress'],
  ['L13', 13, 'SUS', 'W+P1', 1, null, 'Disp/Force/Stress'],
  ['L14', 14, 'EXP', 'L14=L5-L6', null, 'ALG', 'Disp/Force/Stress'],
  ['L15', 15, 'EXP', 'L15=L7-L13', null, 'ALG', 'Disp/Force/Stress'],
  ['L16', 16, 'EXP', 'L16=L9-L13', null, 'ALG', 'Disp/Force/Stress'],
  ['L17', 17, 'EXP', 'L17=L7-L9', null, 'ALG', 'Disp/Force/Stress'],
  ['L18', 18, 'EXP', 'L18=L11-L13', null, 'ALG', 'Disp/Force/Stress'],
  ['L19', 19, 'EXP', 'L19=L7-L11', null, 'ALG', 'Disp/Force/Stress'],
  ['L20', 20, 'EXP', 'L20=L9-L11', null, 'ALG', 'Disp/Force/Stress'],
];

assert(authority.schema === 'm047-bm4l-friction-authority/v1', 'authority schema mismatch');
assert(authority.benchmarkId === 'BM4_L', 'benchmark mismatch');
assert(authority.stackBase?.sha === 'b25500333399bcc74e93ab8ed843900bb2a2aa51', 'stack base mismatch');
assert(authority.configurationAuthority?.modelCoefficientOfFrictionMu === 0.3, 'BM4_L model mu must remain 0.3');
assert(authority.configurationAuthority?.currentLinearSolverBoundary === 'POSITIVE_EFFECTIVE_FRICTION_IS_UNSUPPORTED', 'linear friction boundary mismatch');
assert(authority.result?.newMechanicsAuthorized === false, 'F0 must not authorize mechanics');
assert(Array.isArray(authority.cases) && authority.cases.length === 20, 'expected exactly 20 load cases');

for (const [id, number, stressType, definition, frictionMultiplier, combinationMethod, output] of expected) {
  const row = authority.cases.find((candidate) => candidate.caseId === id);
  assert(row, `missing ${id}`);
  assert(row.number === number, `${id} number mismatch`);
  assert(row.stressType === stressType, `${id} stress type mismatch`);
  assert(row.definition === definition, `${id} definition mismatch`);
  assert(row.frictionMultiplier === frictionMultiplier, `${id} friction multiplier mismatch`);
  assert((row.combinationMethod ?? null) === combinationMethod, `${id} combination method mismatch`);
  assert(row.output === output, `${id} output mismatch`);
}

const pairL13 = byId('L13');
const pairL6 = byId('L6');
assert(pairL13.definition === pairL6.definition, 'L13/L6 must have identical nominal loads');
assert(pairL13.frictionMultiplier === 1 && pairL6.frictionMultiplier === 0, 'L13/L6 must isolate friction multiplier');
const pairL7 = byId('L7');
const pairL5 = byId('L5');
assert(pairL7.definition === pairL5.definition, 'L7/L5 must have identical nominal loads');
assert(pairL7.frictionMultiplier === 1 && pairL5.frictionMultiplier === 0, 'L7/L5 must isolate friction multiplier');
assert(byId('L15').definition === 'L15=L7-L13' && byId('L15').combinationMethod === 'ALG', 'L15 algebra mismatch');

let reportSummary = null;
if (args.report) {
  reportSummary = verifyReport(fs.readFileSync(path.resolve(args.report), 'utf8'));
}

let inputXmlSummary = null;
if (args.inputxml) {
  inputXmlSummary = inspectInputXml(fs.readFileSync(path.resolve(args.inputxml), 'utf8'));
}

console.log(JSON.stringify({
  check: 'm047-bm4l-friction-authority',
  status: 'PASS',
  authorityPath,
  caseCount: authority.cases.length,
  firstPrimaryTarget: 'L13',
  zeroFrictionCounterpart: 'L6',
  secondPrimaryTarget: 'L7',
  secondZeroFrictionCounterpart: 'L5',
  derivedFirstTarget: 'L15=L7-L13',
  reportSummary,
  inputXmlSummary,
  newMechanicsAuthorized: false,
}, null, 2));

function verifyReport(text) {
  const sections = [...text.matchAll(/CASE\s+(\d+)\s+\(([^)]+)\)\s+([^\r\n]+)([\s\S]*?)(?=CASE\s+\d+\s+\(|$)/g)];
  assert(sections.length === 20, `report case count ${sections.length} != 20`);
  for (const [id, number, stressType, definition, frictionMultiplier, combinationMethod, output] of expected) {
    const match = sections.find((candidate) => Number(candidate[1]) === number);
    assert(match, `report missing ${id}`);
    assert(match[2].trim() === stressType, `report ${id} stress type mismatch`);
    assert(match[3].trim() === definition, `report ${id} definition mismatch`);
    const body = match[4];
    const display = /Display:\s*([^\r\n]+)/.exec(body)?.[1]?.trim() ?? null;
    assert(display === output, `report ${id} display mismatch: ${display}`);
    const friction = /Friction Mult\.:\s*([+-]?\d+(?:\.\d+)?)/.exec(body)?.[1];
    const parsedFriction = friction === undefined ? null : Number(friction);
    assert(parsedFriction === frictionMultiplier, `report ${id} friction mismatch: ${parsedFriction}`);
    const method = /Combination Method:\s*([^\r\n]+)/.exec(body)?.[1]?.trim() ?? null;
    assert(method === combinationMethod, `report ${id} combination method mismatch: ${method}`);
  }
  return { caseCount: sections.length, status: 'PASS' };
}

function inspectInputXml(text) {
  const restraintTags = [...text.matchAll(/<RESTRAINT\b[^>]*\/>/g)].map((match) => attributes(match[0]));
  const active = restraintTags.filter((row) => finiteSourceNumber(row.NODE) !== null);
  const positiveFriction = active.filter((row) => {
    const value = finiteSourceNumber(row.FRIC_COEF);
    return value !== null && value > 0;
  });
  assert(positiveFriction.length > 0, 'input XML contains no positive-friction restraints');
  const coefficients = [...new Set(positiveFriction.map((row) => finiteSourceNumber(row.FRIC_COEF)))].sort((a, b) => a - b);
  assert(coefficients.includes(0.3), `input XML positive friction coefficients do not include 0.3: ${coefficients}`);

  const byNode = new Map();
  for (const row of active) {
    const node = String(Number(row.NODE));
    if (!byNode.has(node)) byNode.set(node, []);
    byNode.get(node).push(row);
  }
  const frictionSites = [...new Set(positiveFriction.map((row) => String(Number(row.NODE))))].sort(numericText);
  const sitesWithCompanionPositiveGap = frictionSites.filter((node) =>
    (byNode.get(node) ?? []).some((row) => {
      const gap = finiteSourceNumber(row.GAP);
      return gap !== null && gap > 0;
    }));

  return {
    activeRestraintCount: active.length,
    positiveFrictionRestraintCount: positiveFriction.length,
    frictionSiteCount: frictionSites.length,
    positiveFrictionCoefficients: coefficients,
    sitesWithCompanionPositiveGapCount: sitesWithCompanionPositiveGap.length,
    frictionSites,
    sitesWithCompanionPositiveGap,
  };
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([A-Z0-9_]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]));
}

function finiteSourceNumber(value) {
  if (value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number + 1.0101) < 1e-3) return null;
  return number;
}

function parseArgs(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!key.startsWith('--')) throw new Error(`unexpected argument ${key}`);
    const value = values[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${key}`);
    result[key.slice(2)] = value;
    index += 1;
  }
  return result;
}

function byId(caseId) {
  return authority.cases.find((row) => row.caseId === caseId);
}

function numericText(a, b) {
  return Number(a) - Number(b);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
