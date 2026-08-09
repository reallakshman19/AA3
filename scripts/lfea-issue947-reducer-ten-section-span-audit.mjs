#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const REDUCER_IDS = Object.freeze(['11', '16']);
const ROTATION_RESOLUTION_RAD = 1e-4 * Math.PI / 180;
const COMPONENT_GATE = 0.1;
const args = parseArgs(process.argv.slice(2));
if (!args.package) throw new TypeError('Usage: node scripts/lfea-issue947-reducer-ten-section-span-audit.mjs --package <canonical-package.json> [--out <json>]');
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
assert.equal(pkg?.source?.sha256, EXPECTED_SOURCE_SHA256, 'ACCDB SHA-256 drift.');

const here = dirname(fileURLToPath(import.meta.url));
const basePath = join(here, 'lfea-issue947-reducer-pressure-shear-audit.mjs');
const source = readFileSync(basePath, 'utf8');
const baseline = runVariant('MIDPOINT_LINEAR_INTERPOLATION', null);
const span = runVariant('TEN_SECTION_VALUES_SPAN_BOTH_DECLARED_ENDS', 'index / (REDUCER_SEGMENT_COUNT - 1)');
const rotationCustody = REDUCER_IDS.map(rotationRecord);
const custodyPass = rotationCustody.every((record) => record.pass);

const comparison = Object.fromEntries(REDUCER_IDS.map((id) => {
  const b = baseline[id];
  const c = span[id];
  return [id, {
    l2RatioToMidpoint: c.normalizedResidualL2 / b.normalizedResidualL2,
    maxRatioToMidpoint: c.maxAbsNormalizedResidual / b.maxAbsNormalizedResidual,
    l2Improves: c.normalizedResidualL2 < b.normalizedResidualL2,
    maxImproves: c.maxAbsNormalizedResidual < b.maxAbsNormalizedResidual,
    midpointComponentsAboveTenPercent: b.componentsAboveTenPercent,
    spanComponentsAboveTenPercent: c.componentsAboveTenPercent,
    worsenedNormalizedComponentCount: c.normalizedResidual.reduce((sum, value, index) =>
      sum + (Math.abs(value) > Math.abs(b.normalizedResidual[index]) + 1e-12 ? 1 : 0), 0),
  }];
}));
const improvesBoth = REDUCER_IDS.every((id) => comparison[id].l2Improves && comparison[id].maxImproves);
const totalBaselineFailures = REDUCER_IDS.reduce((sum, id) => sum + baseline[id].componentsAboveTenPercent, 0);
const totalSpanFailures = REDUCER_IDS.reduce((sum, id) => sum + span[id].componentsAboveTenPercent, 0);
const supported = custodyPass && improvesBoth && totalSpanFailures <= totalBaselineFailures;

const output = {
  schema: 'lfea-issue947-reducer-ten-section-span-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'TEST_TEN_DISCRETE_CYLINDER_SECTION_VALUES_SPANNING_BOTH_DECLARED_END_SECTIONS_NO_PRODUCTION_UPDATE',
  authorityBoundary: {
    established: 'Hexagon documents ten successively changing pipe cylinders and declares Diameter 2 / Thickness 2 at the To node.',
    notEstablished: 'Hexagon public documentation does not state that the ten cylinder representative sections include both end sections.',
    hypothesisStatus: 'DISCRETE_FALSIFICATION_ONLY_NOT_VENDOR_AUTHORITY',
  },
  fixedMechanics: {
    cylinderCount: 10,
    timoShearKappa: 0.5,
    bourdonPressure: true,
    gravity: true,
    staticCondensation: true,
  },
  candidateRule: {
    id: 'TEN_SECTION_VALUES_SPAN_BOTH_DECLARED_ENDS',
    fraction: 'index/(10-1), index=0..9',
  },
  rotationCustody,
  evaluations: { midpoint: baseline, tenSectionSpan: span },
  comparison,
  gates: {
    exactEndpointRotationCustody: custodyPass ? 'PASS' : 'FAIL',
    improvesL2AndMaxForBothReducers: improvesBoth ? 'PASS' : 'FAIL',
    doesNotIncreaseComponentsAboveExistingTenPercentGate: totalSpanFailures <= totalBaselineFailures ? 'PASS' : 'FAIL',
  },
  classification: supported
    ? 'TEN_SECTION_SPAN_RULE_SUPPORTED_FOR_NEXT_WHOLE_MODEL_GATE'
    : 'TEN_SECTION_SPAN_RULE_FALSIFIED',
  falsificationRule: 'Reject this rule unless it improves both normalized L2 and maximum residual on both E11 and E16 without increasing components above the unchanged 10% gate.',
  nextGate: supported
    ? 'WHOLE_MODEL_AB_CHANGING_ONLY_REDUCER_SECTION_SAMPLING_WITH_TIMOSHENKO_AND_PRESSURE_FIXED'
    : 'KEEP_MIDPOINT_AS_UNVERIFIED_PLACEHOLDER_AND_INVESTIGATE_ANOTHER_REDUCER_MECHANIC',
};
if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 reducer ten-section span audit: ${output.classification}`);

function runVariant(id, fractionExpression) {
  const tempScript = join(here, `.issue947-reducer-span-${id}.tmp.mjs`);
  const tempOut = join(here, `.issue947-reducer-span-${id}.tmp.json`);
  let patched = source;
  if (fractionExpression !== null) {
    const variantAnchor = "['TIMOSHENKO_WITH_PRESSURE', { shearDeformation: true, includePressure: true }],";
    const fractionAnchor = '    const fraction = (index + 0.5) / REDUCER_SEGMENT_COUNT;';
    assert.equal(count(patched, variantAnchor), 1, 'Timoshenko+pressure patch-site drift.');
    assert.equal(count(patched, fractionAnchor), 1, 'Reducer fraction patch-site drift.');
    patched = patched.replace(
      variantAnchor,
      `['TIMOSHENKO_WITH_PRESSURE', { shearDeformation: true, includePressure: true, samplingRule: '${id}' }],`,
    ).replace(
      fractionAnchor,
      `    const fraction = input.samplingRule === '${id}' ? ${fractionExpression} : (index + 0.5) / REDUCER_SEGMENT_COUNT;`,
    );
  }
  writeFileSync(tempScript, patched);
  try {
    const run = spawnSync(process.execPath, [tempScript, '--package', args.package, '--out', tempOut], {
      encoding: 'utf8', maxBuffer: 128 * 1024 * 1024,
    });
    if (run.status !== 0) throw new Error(`${id} reducer evaluation failed:\n${run.stderr || run.stdout}`);
    const document = JSON.parse(readFileSync(tempOut, 'utf8'));
    return Object.fromEntries(document.elements.map((element) => {
      const result = element.variants.TIMOSHENKO_WITH_PRESSURE;
      return [element.sourceElementId, {
        normalizedResidualL2: result.normalizedResidualL2,
        maxAbsNormalizedResidual: result.maxAbsNormalizedResidual,
        componentsAboveTenPercent: result.normalizedResidual.filter((value) => Math.abs(value) > COMPONENT_GATE).length,
        normalizedResidual: result.normalizedResidual,
        residualGlobal: result.residualGlobal,
        freePressureGrowthM: result.freePressureGrowthM,
      }];
    }));
  } finally {
    rmSync(tempScript, { force: true });
    rmSync(tempOut, { force: true });
  }
}

function rotationRecord(sourceElementId) {
  const row = pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.find((entry) => String(entry.ELEMENTID) === sourceElementId);
  if (!row) throw new TypeError(`Missing E${sourceElementId}.`);
  const values = [];
  for (const nodeId of [String(row.FROM_NODE), String(row.TO_NODE)]) {
    for (const component of ['RX', 'RY', 'RZ']) {
      const matches = pkg.references.L19.rows.filter((entry) => entry.entityKind === 'NODE'
        && String(entry.entityId) === nodeId && entry.quantity === 'ROTATION' && entry.component === component);
      if (matches.length !== 1) throw new TypeError(`Expected one ${nodeId} ${component} rotation; found ${matches.length}.`);
      const radians = Number(matches[0].value);
      values.push({ nodeId, component, radians, degrees: radians * 180 / Math.PI,
        resolved: radians !== 0 && Math.abs(radians) >= ROTATION_RESOLUTION_RAD });
    }
  }
  return { sourceElementId, values, pass: values.every((entry) => entry.resolved) };
}

function count(text, needle) { return text.split(needle).length - 1; }
function parseArgs(tokens) {
  const result = { package: null, out: null };
  for (let index = 0; index < tokens.length; index += 2) {
    const key = tokens[index]; const value = tokens[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--package') result.package = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
