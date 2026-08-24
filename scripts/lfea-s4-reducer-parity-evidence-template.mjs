#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  S4_REDUCER_PARITY_EVIDENCE_SCHEMA,
  S4_REDUCER_REQUIRED_PAIRED_FAMILIES,
  S4_REDUCER_SECTION_CANDIDATES,
} from './lfea-s4-reducer-parity-evidence-contract.mjs';

const ORIENTATIONS = Object.freeze(['LARGE_TO_SMALL', 'SMALL_TO_LARGE']);
const STRUCTURAL = new Set([
  'STRUCTURAL_AXIAL',
  'STRUCTURAL_TORSION',
  'STRUCTURAL_TRANSVERSE_FORCE',
  'STRUCTURAL_END_MOMENT',
]);
const GRAVITY = new Set(['GRAVITY_METAL', 'GRAVITY_FLUID', 'GRAVITY_INSULATION']);
const THERMAL = new Set(['THERMAL_FREE', 'THERMAL_FIXED']);
const GEOMETRY = Object.freeze({
  length: 0.500,
  largeOuterDiameter: 0.27305,
  largeWallThickness: 0.015062,
  smallOuterDiameter: 0.21905,
  smallWallThickness: 0.012700,
});

const outputArg = process.argv[2];
if (outputArg === '--help' || outputArg === '-h') {
  console.log('Usage: node scripts/lfea-s4-reducer-parity-evidence-template.mjs <new-package-directory>');
  process.exit(0);
}
if (typeof outputArg !== 'string' || outputArg.trim() === '') {
  console.error('A new S4 evidence package directory is required.');
  process.exit(2);
}

const outputDir = path.resolve(process.cwd(), outputArg);
if (fs.existsSync(outputDir)) {
  console.error(`Refusing to overwrite existing path: ${outputDir}`);
  process.exit(2);
}
fs.mkdirSync(outputDir, { recursive: true });

function sectionFor(orientation, end) {
  const large = {
    outerDiameter: GEOMETRY.largeOuterDiameter,
    wallThickness: GEOMETRY.largeWallThickness,
  };
  const small = {
    outerDiameter: GEOMETRY.smallOuterDiameter,
    wallThickness: GEOMETRY.smallWallThickness,
  };
  const from = orientation === 'LARGE_TO_SMALL' ? large : small;
  const to = orientation === 'LARGE_TO_SMALL' ? small : large;
  return end === 'from' ? from : to;
}

function resultShape(family) {
  if (family === 'STRUCTURAL_AXIAL') {
    return { displacements: { TODO: null }, reactions: { TODO: null } };
  }
  if (family === 'STRUCTURAL_TORSION') {
    return { rotations: { TODO: null }, reactions: { TODO: null } };
  }
  if (family === 'STRUCTURAL_TRANSVERSE_FORCE' || family === 'STRUCTURAL_END_MOMENT') {
    return {
      displacements: { TODO: null },
      rotations: { TODO: null },
      reactions: { TODO: null },
    };
  }
  if (GRAVITY.has(family)) {
    return {
      totalWeight: null,
      firstMomentOrEquivalent: null,
      reactions: { TODO: null },
    };
  }
  if (family === 'THERMAL_FREE') return { displacements: { TODO: null } };
  if (family === 'THERMAL_FIXED') return { reactions: { TODO: null } };
  return {
    structuralResponse: { TODO: null },
    codeSifState: 'REPLACE_WITH_EXACT_CAESAR_CODE_SIF_STATE',
  };
}

function runRecord(family, orientation) {
  const runId = `${family}__${orientation}`;
  const record = {
    runId,
    family,
    modelOrientation: orientation,
    caesarVersion: 'REPLACE_WITH_CAESAR_VERSION',
    build: 'REPLACE_WITH_CAESAR_BUILD',
    length: GEOMETRY.length,
    fromSection: sectionFor(orientation, 'from'),
    toSection: sectionFor(orientation, 'to'),
    materialState: { TODO: 'REPLACE_WITH_EXACT_CONTROLLED_MATERIAL_STATE' },
    jobFileHash: 'REPLACE_WITH_SHA256',
    inputSourceHash: 'REPLACE_WITH_SHA256',
    outputFileHash: 'REPLACE_WITH_SHA256',
    rawArtifacts: {
      jobFile: `raw/${runId}/job-file.bin`,
      inputSource: `raw/${runId}/input-source.bin`,
      outputFile: `raw/${runId}/output-file.bin`,
    },
    units: 'REPLACE_WITH_EXACT_CAESAR_UNITS',
    loadCase: `REPLACE_WITH_EXACT_LOAD_CASE_${family}`,
    restraints: 'REPLACE_WITH_CONTROLLED_RESTRAINT_STATE',
    reportLocator: `REPLACE_WITH_REPORT_LOCATOR_${runId}`,
    artifactLocator: `REPLACE_WITH_ARTIFACT_LOCATOR_${runId}`,
    observer: 'REPLACE_WITH_CAESAR_OPERATOR',
    observationDate: 'YYYY-MM-DD',
    reportedResults: resultShape(family),
  };
  if (STRUCTURAL.has(family)) {
    record.appliedLoad = { TODO: `REPLACE_WITH_CONTROLLED_${family}_LOAD` };
  }
  if (GRAVITY.has(family)) {
    record.gravitySourceState = { TODO: `REPLACE_WITH_CONTROLLED_${family}_SOURCE_STATE` };
  }
  if (THERMAL.has(family)) {
    record.thermalState = { TODO: `REPLACE_WITH_CONTROLLED_${family}_THERMAL_STATE` };
  }
  return record;
}

const pairedRuns = S4_REDUCER_REQUIRED_PAIRED_FAMILIES.flatMap((family) =>
  ORIENTATIONS.map((orientation) => runRecord(family, orientation)));
const codeBaseline = runRecord('CODE_SIF_BASELINE', 'LARGE_TO_SMALL');
const codeVaried = runRecord('CODE_SIF_VARIED', 'LARGE_TO_SMALL');
codeBaseline.appliedLoad = { TODO: 'REPLACE_WITH_IDENTICAL_CODE_BOUNDARY_LOAD' };
codeVaried.appliedLoad = { TODO: 'REPLACE_WITH_IDENTICAL_CODE_BOUNDARY_LOAD' };

const evidence = {
  _templateNotice: 'DRAFT SCAFFOLD ONLY. This file is intentionally not qualified evidence.',
  schema: S4_REDUCER_PARITY_EVIDENCE_SCHEMA,
  protocolId: 'S4_Reducer_Parity_Protocol_20260824',
  evidenceClass: 'CONTROLLED_CAESAR_OBSERVATION',
  caesarVersion: 'REPLACE_WITH_CAESAR_VERSION',
  build: 'REPLACE_WITH_CAESAR_BUILD',
  geometry: GEOMETRY,
  tolerancePolicy: {
    observationTolerance: null,
    source: 'PREDECLARE_BEFORE_VIEWING_CAESAR_RESULTS',
    fittedToCaesar: false,
  },
  productionAuthorizationRequested: false,
  reducerExactMechanicsRequested: false,
  runs: [...pairedRuns, codeBaseline, codeVaried],
  candidateComparisons: S4_REDUCER_SECTION_CANDIDATES.map((candidateId) => ({
    candidateId,
    maximumNormalizedError: null,
    accepted: false,
  })),
  decisions: {
    sectionSamplingRule: 'UNRESOLVED',
    metalGravityRule: 'UNRESOLVED',
    fluidGravityRule: 'UNRESOLVED',
    insulationGravityRule: 'UNRESOLVED',
  },
  acceptance: {
    sectionSamplingUnique: false,
    axialTorsionBendingParity: false,
    metalGravityQualified: false,
    fluidGravityQualified: false,
    insulationGravityQualified: false,
    gravityFirstMomentQualified: false,
    thermalParityQualified: false,
    codeBoundaryQualified: false,
    axialTorsionBendingMaximumNormalizedError: null,
    metalGravityNormalizedError: null,
    fluidGravityNormalizedError: null,
    insulationGravityNormalizedError: null,
    gravityFirstMomentMaximumNormalizedError: null,
    thermalMaximumNormalizedError: null,
    codeBoundaryNormalizedDelta: null,
    expectedValuesRebaselined: false,
    tolerancesWidenedToFitCaesar: false,
  },
  independentReview: {
    status: 'PENDING',
    reviewer: 'REPLACE_WITH_INDEPENDENT_REVIEWER',
    reviewDate: 'YYYY-MM-DD',
    reviewLocator: 'REPLACE_WITH_REVIEW_LOCATOR',
  },
  status: 'DRAFT_NOT_QUALIFIED',
};

for (const run of evidence.runs) {
  for (const relative of Object.values(run.rawArtifacts)) {
    fs.mkdirSync(path.dirname(path.join(outputDir, relative)), { recursive: true });
  }
}
fs.writeFileSync(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  path.join(outputDir, 'README.txt'),
  [
    'S4 reducer parity evidence scaffold.',
    'This package is intentionally DRAFT_NOT_QUALIFIED.',
    'Replace every placeholder from controlled CAESAR observations.',
    'Retain actual raw job/input/output files at the paths declared in evidence.json.',
    'Predeclare the tolerance before viewing CAESAR results.',
    'Run the file-level checker only after the package is complete.',
    '',
  ].join('\n'),
  'utf8',
);

console.log(JSON.stringify({
  status: 'DRAFT_EVIDENCE_SCAFFOLD_CREATED',
  outputDir,
  evidencePath: path.join(outputDir, 'evidence.json'),
  runCount: evidence.runs.length,
  productionUseAuthorized: false,
  reducerExactMechanicsAuthorized: false,
}));
