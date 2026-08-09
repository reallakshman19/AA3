#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXPECTED_SOURCE_SHA256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const ROTATION_RESOLUTION_DEG = 1e-4;
const ROTATION_RESOLUTION_RAD = ROTATION_RESOLUTION_DEG * Math.PI / 180;
const REDUCER_IDS = Object.freeze(['11', '16']);
const ROTATION_COMPONENTS = Object.freeze(['RX', 'RY', 'RZ']);
const COMPONENT_GATE = 0.1;

const args = parseArgs(process.argv.slice(2));
if (!args.package) {
  throw new TypeError('Usage: node scripts/lfea-issue947-reducer-ten-cylinder-sampling-audit.mjs --package <canonical-package.json> [--out <json>]');
}
const pkg = JSON.parse(readFileSync(args.package, 'utf8'));
assert.equal(pkg?.source?.sha256, EXPECTED_SOURCE_SHA256, 'ACCDB SHA-256 drift.');
assert.equal(pkg?.profile?.linearSolve?.bourdonPressureEffects?.mode, 'TRANSLATION_AND_ROTATION', 'Bourdon mode drift.');

const here = dirname(fileURLToPath(import.meta.url));
const basePath = join(here, 'lfea-issue947-reducer-pressure-shear-audit.mjs');
const baseSource = readFileSync(basePath, 'utf8');
const sourceRows = new Map(pkg.model.tables.INPUT_BASIC_ELEMENT_DATA.rows.map((row) => [String(row.ELEMENTID), row]));
const referenceRows = pkg.references.L19.rows;
const endpointRotationCustody = REDUCER_IDS.map((sourceElementId) => rotationCustody(sourceElementId));
const exactRotationCustodyPass = endpointRotationCustody.every((entry) => entry.allEndpointRotationsResolvedNonzero);

const rules = Object.freeze([
  {
    id: 'MIDPOINT_LINEAR_INTERPOLATION',
    expression: '(index + 0.5) / REDUCER_SEGMENT_COUNT',
    status: 'CURRENT_CANDIDATE_BASELINE',
  },
  {
    id: 'SEGMENT_FROM_ENDPOINT_LINEAR_INTERPOLATION',
    expression: 'index / REDUCER_SEGMENT_COUNT',
    status: 'DISCRETE_BRACKETING_HYPOTHESIS',
  },
  {
    id: 'SEGMENT_TO_ENDPOINT_LINEAR_INTERPOLATION',
    expression: '(index + 1) / REDUCER_SEGMENT_COUNT',
    status: 'DISCRETE_BRACKETING_HYPOTHESIS',
  },
]);

const evaluations = Object.fromEntries(rules.map((rule) => [rule.id, evaluateRule(rule)]));
const baseline = evaluations.MIDPOINT_LINEAR_INTERPOLATION;
for (const candidate of Object.values(evaluations)) addComparisons(candidate, baseline);

const endpointCandidates = rules.slice(1).map((rule) => evaluations[rule.id]);
const supported = endpointCandidates.filter((candidate) =>
  candidate.comparison.improvesL2ForBothReducers
  && candidate.comparison.improvesMaxForBothReducers
  && candidate.comparison.componentsAboveTenPercent <= baseline.componentsAboveTenPercent);

const output = {
  schema: 'lfea-issue947-reducer-ten-cylinder-sampling-audit/v1',
  issue: 947,
  caseId: 'L19',
  sourceAccdbSha256: EXPECTED_SOURCE_SHA256,
  purpose: 'DISCRETE_TEN_CYLINDER_SECTION_SAMPLING_FALSIFICATION_NO_PRODUCTION_UPDATE',
  authorityBoundary: {
    established: [
      'CAESAR constructs a concentric reducer from ten successively changing pipe cylinders over the entered element length.',
      'Bourdon pressure effects are active for BM4_NL and straight-pipe pressure elongation is independently qualified.',
      'CAESAR pipe shear coefficient 2 maps to repository Timoshenko kappa=0.5.',
    ],
    notEstablishedByPublicDocumentation: 'The representative section location inside each of the ten cylinders is not published.',
    interpretation: 'Endpoint rules are discrete bracketing hypotheses only; they are not vendor claims and are not fitted parameters.',
  },
  fixedMechanics: {
    segmentCount: 10,
    shearDeformation: true,
    shearCorrectionFactorY: 0.5,
    shearCorrectionFactorZ: 0.5,
    pressureIncluded: true,
    gravityIncluded: true,
    sectionVariation: 'LINEAR_DIAMETER_AND_WALL_THICKNESS_FROM_SOURCE_ENDS',
    condensation: 'SCHUR_CONDENSE_K_AND_ALL_LOAD_VECTORS_TO_SOURCE_12_DOF_BOUNDARY',
  },
  endpointRotationCustody: {
    demonstratedPinnedAccdbNonzeroResolutionDeg: ROTATION_RESOLUTION_DEG,
    records: endpointRotationCustody,
    gate: exactRotationCustodyPass ? 'PASS' : 'FAIL',
    rule: 'All E11/E16 endpoint rotations used for injected-displacement qualification must be explicitly nonzero and exceed the pinned 0.0001 degree export-resolution floor.',
  },
  evaluations,
  gates: {
    exactEndpointRotationCustody: exactRotationCustodyPass ? 'PASS' : 'FAIL',
    oneDiscreteEndpointRuleImprovesBothReducers: supported.length === 1 ? 'PASS' : 'FAIL',
    uniqueSupportedEndpointRule: supported.length === 1 ? supported[0].samplingRule : null,
  },
  classification: !exactRotationCustodyPass
    ? 'REDUCER_SAMPLING_AUDIT_BLOCKED_BY_REFERENCE_CUSTODY'
    : supported.length === 1
      ? 'ONE_DISCRETE_ENDPOINT_SAMPLING_RULE_SUPPORTED_FOR_NEXT_WHOLE_MODEL_GATE'
      : supported.length === 0
        ? 'DISCRETE_ENDPOINT_SECTION_SAMPLING_HYPOTHESES_FALSIFIED'
        : 'SAMPLING_HYPOTHESIS_NOT_UNIQUE',
  falsificationRule: 'Do not promote a sampling rule unless the same discrete rule improves normalized L2 and max residual for both E11 and E16, does not increase the total count of components above the unchanged 10% gate, and uses exact resolved commercial endpoint rotations.',
  nextGate: supported.length === 1
    ? 'WHOLE_MODEL_AB_WITH_ONLY_THE_UNIQUE_DISCRETE_SAMPLING_RULE_CHANGED_AND_TIMOSHENKO_PRESSURE_HELD_FIXED'
    : 'RETAIN_MIDPOINT_CANDIDATE_AND_DECOMPOSE_THE_REMAINING_REDUCER_RESIDUAL_BY_INDEPENDENT_MECHANIC',
};

if (args.out) writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
console.log(`Issue 947 reducer ten-cylinder sampling audit: ${output.classification}`);

function evaluateRule(rule) {
  const tempScript = join(here, `.issue947-reducer-sampling-${rule.id}.tmp.mjs`);
  const tempOut = join(here, `.issue947-reducer-sampling-${rule.id}.tmp.json`);
  let source = baseSource;
  if (rule.id !== 'MIDPOINT_LINEAR_INTERPOLATION') {
    const variantAnchor = "['TIMOSHENKO_WITH_PRESSURE', { shearDeformation: true, includePressure: true }],";
    const variantReplacement = `['TIMOSHENKO_WITH_PRESSURE', { shearDeformation: true, includePressure: true, samplingRule: '${rule.id}' }],`;
    const fractionAnchor = '    const fraction = (index + 0.5) / REDUCER_SEGMENT_COUNT;';
    const fractionReplacement = `    const fraction = input.samplingRule === '${rule.id}'\n      ? ${rule.expression}\n      : (index + 0.5) / REDUCER_SEGMENT_COUNT;`;
    assert.equal(count(source, variantAnchor), 1, `${rule.id} Timoshenko+pressure patch-site drift.`);
    assert.equal(count(source, fractionAnchor), 1, `${rule.id} section-fraction patch-site drift.`);
    source = source.replace(variantAnchor, variantReplacement).replace(fractionAnchor, fractionReplacement);
  }
  writeFileSync(tempScript, source);
  try {
    const run = spawnSync(process.execPath, [tempScript, '--package', args.package, '--out', tempOut], {
      encoding: 'utf8',
      maxBuffer: 128 * 1024 * 1024,
    });
    if (run.status !== 0) {
      throw new Error(`${rule.id} reducer audit failed:\n${run.stderr || run.stdout}`);
    }
    const document = JSON.parse(readFileSync(tempOut, 'utf8'));
    const reducers = Object.fromEntries(document.elements.map((element) => {
      const result = element.variants.TIMOSHENKO_WITH_PRESSURE;
      const componentsAboveTenPercent = result.normalizedResidual.filter((value) => Math.abs(value) > COMPONENT_GATE).length;
      return [element.sourceElementId, {
        normalizedResidualL2: result.normalizedResidualL2,
        maxAbsNormalizedResidual: result.maxAbsNormalizedResidual,
        componentsAboveTenPercent,
        residualGlobal: result.residualGlobal,
        normalizedResidual: result.normalizedResidual,
        freePressureGrowthM: result.freePressureGrowthM,
      }];
    }));
    return {
      samplingRule: rule.id,
      sourceStatus: rule.status,
      representativeFractionEquation: rule.expression,
      reducers,
      componentsAboveTenPercent: Object.values(reducers).reduce((sum, entry) => sum + entry.componentsAboveTenPercent, 0),
    };
  } finally {
    rmSync(tempScript, { force: true });
    rmSync(tempOut, { force: true });
  }
}

function addComparisons(candidate, baselineEvaluation) {
  const perReducer = {};
  for (const sourceElementId of REDUCER_IDS) {
    const current = candidate.reducers[sourceElementId];
    const base = baselineEvaluation.reducers[sourceElementId];
    perReducer[sourceElementId] = {
      l2RatioToMidpoint: current.normalizedResidualL2 / base.normalizedResidualL2,
      maxRatioToMidpoint: current.maxAbsNormalizedResidual / base.maxAbsNormalizedResidual,
      l2Improves: current.normalizedResidualL2 < base.normalizedResidualL2,
      maxImproves: current.maxAbsNormalizedResidual < base.maxAbsNormalizedResidual,
      worsenedNormalizedComponentCount: current.normalizedResidual.reduce((sum, value, index) =>
        sum + (Math.abs(value) > Math.abs(base.normalizedResidual[index]) + 1e-12 ? 1 : 0), 0),
    };
  }
  candidate.comparison = {
    versus: 'MIDPOINT_LINEAR_INTERPOLATION',
    perReducer,
    improvesL2ForBothReducers: REDUCER_IDS.every((id) => perReducer[id].l2Improves),
    improvesMaxForBothReducers: REDUCER_IDS.every((id) => perReducer[id].maxImproves),
  };
}

function rotationCustody(sourceElementId) {
  const row = sourceRows.get(sourceElementId);
  if (!row) throw new TypeError(`Missing reducer source E${sourceElementId}.`);
  const nodes = [String(row.FROM_NODE), String(row.TO_NODE)];
  const records = [];
  for (const nodeId of nodes) {
    for (const component of ROTATION_COMPONENTS) {
      const matches = referenceRows.filter((entry) => entry.entityKind === 'NODE'
        && String(entry.entityId) === nodeId
        && entry.quantity === 'ROTATION'
        && entry.component === component);
      if (matches.length !== 1) throw new TypeError(`Expected one L19 ${nodeId} ROTATION:${component}; found ${matches.length}.`);
      const radians = Number(matches[0].value);
      const degrees = radians * 180 / Math.PI;
      records.push({
        nodeId,
        component,
        radians,
        degrees,
        resolvedNonzeroAbovePinnedFloor: radians !== 0 && Math.abs(radians) >= ROTATION_RESOLUTION_RAD,
      });
    }
  }
  return {
    sourceElementId,
    fromNode: nodes[0],
    toNode: nodes[1],
    rotations: records,
    allEndpointRotationsResolvedNonzero: records.every((entry) => entry.resolvedNonzeroAbovePinnedFloor),
  };
}

function count(source, needle) {
  return source.split(needle).length - 1;
}

function parseArgs(tokens) {
  const result = { package: null, out: null };
  for (let index = 0; index < tokens.length; index += 2) {
    const key = tokens[index];
    const value = tokens[index + 1];
    if (!key?.startsWith('--') || value === undefined) throw new TypeError(`Invalid argument near ${String(key)}.`);
    if (key === '--package') result.package = value;
    else if (key === '--out') result.out = value;
    else throw new TypeError(`Unknown argument ${key}.`);
  }
  return result;
}
