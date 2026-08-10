#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';

const SCHEMA_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/profile.schema.json';
const PROFILE_PATH = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json';
const PACKAGE_PATH = 'src/core/fea-benchmarks/caesar-accdb-package.js';
const SOLVER_PATH = 'src/core/fea-benchmarks/caesar-accdb-linear-solve.js';

const AUTHORITY_SOURCE = 'BM4_L.ACCDB-only straight-span constitutive audit: source SHA-256 64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8; run 31398521355 / artifact 9066681744. In both L3 and L4, all 54 usable ordinary straight spans favor section-derived Cowper/Timoshenko over Euler; no LFEA comparison rows or failure counts are consumed.';

patchSchema();
patchProfile();
patchPackage();
patchSolver();
console.log('BM4_L ACCDB straight-pipe Cowper/Timoshenko promotion staged.');

function patchSchema() {
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  const linearSolve = schema.properties?.linearSolve;
  if (!linearSolve?.properties) throw new Error('profile.schema.json linearSolve properties not found.');
  linearSolve.properties.straightPipeTransverseShear = {
    type: 'object',
    additionalProperties: false,
    required: ['mode', 'authorityStatus', 'source'],
    properties: {
      mode: { enum: ['EULER_BERNOULLI', 'COWPER_HOLLOW_CIRCLE_TIMOSHENKO'] },
      authorityStatus: { enum: ['RESOLVED', 'PROVISIONAL'] },
      source: { type: 'string', minLength: 1 },
    },
  };
  writeJson(SCHEMA_PATH, schema);
}

function patchProfile() {
  const profile = JSON.parse(readFileSync(PROFILE_PATH, 'utf8'));
  if (!profile.linearSolve) throw new Error('BM4_L profile linearSolve block not found.');
  profile.linearSolve.straightPipeTransverseShear = {
    mode: 'COWPER_HOLLOW_CIRCLE_TIMOSHENKO',
    authorityStatus: 'RESOLVED',
    source: AUTHORITY_SOURCE,
  };
  writeJson(PROFILE_PATH, profile);
}

function patchPackage() {
  let text = readFileSync(PACKAGE_PATH, 'utf8');
  if (!text.includes("from './caesar-accdb-straight-pipe-profile.js';")) {
    text = replaceOnce(text,
      "} from './caesar-configuration-authority.js';\n",
      "} from './caesar-configuration-authority.js';\nimport { CAESAR_ACCDB_STRAIGHT_PIPE_MODES } from './caesar-accdb-straight-pipe-profile.js';\n",
      'ACCDB package straight-pipe mode import');
  }

  if (!text.includes('straightPipeTransverseShear: normalizeAuthorityDecision(')) {
    text = replaceOnce(text,
      "    reducerCondensation: requiredBoolean(\n      value.reducerCondensation,\n      'linearSolve.reducerCondensation',\n    ),\n    b31jSmooth90FlexibilityCorrection: normalizeAuthorityDecision(\n",
      "    reducerCondensation: requiredBoolean(\n      value.reducerCondensation,\n      'linearSolve.reducerCondensation',\n    ),\n    straightPipeTransverseShear: normalizeAuthorityDecision(\n      value.straightPipeTransverseShear ?? {\n        mode: 'EULER_BERNOULLI',\n        authorityStatus: 'PROVISIONAL',\n        source: 'PROFILE_COMPATIBILITY_DEFAULT_EULER_BERNOULLI',\n      },\n      'linearSolve.straightPipeTransverseShear',\n      'mode',\n      ['RESOLVED', 'PROVISIONAL'],\n    ),\n    b31jSmooth90FlexibilityCorrection: normalizeAuthorityDecision(\n",
      'ACCDB package linearSolve straight-pipe authority');
  }

  if (!text.includes('Unsupported linearSolve.straightPipeTransverseShear.mode')) {
    text = replaceOnce(text,
      "  if (result.teeNominalDiameterRelativeTolerance > 0.01) {\n",
      "  if (!CAESAR_ACCDB_STRAIGHT_PIPE_MODES.includes(result.straightPipeTransverseShear.mode)) {\n    throw new TypeError(\n      `Unsupported linearSolve.straightPipeTransverseShear.mode ${result.straightPipeTransverseShear.mode}.`,\n    );\n  }\n  if (result.teeNominalDiameterRelativeTolerance > 0.01) {\n",
      'ACCDB package straight-pipe mode validation');
  }
  writeText(PACKAGE_PATH, text);
}

function patchSolver() {
  let text = readFileSync(SOLVER_PATH, 'utf8');
  if (!text.includes("from './caesar-accdb-straight-pipe-profile.js';")) {
    text = replaceOnce(text,
      "import { resolveCaesarConfigurationSetting } from './caesar-configuration-authority.js';\n",
      "import { resolveCaesarConfigurationSetting } from './caesar-configuration-authority.js';\nimport { cowperAccdbStraightPipeFrameProfile } from './caesar-accdb-straight-pipe-profile.js';\n",
      'ACCDB solver Cowper profile import');
  }

  if (!text.includes('kind: input.kind,\n    solveProfile: input.solveProfile,')) {
    text = replaceOnce(text,
      "  const frame = input.stiffnessFrame ?? compileUnloadedFrame({\n    elementId: input.elementId,\n    axesResult,\n    material: input.material,\n    section: input.section,\n  });\n",
      "  const frame = input.stiffnessFrame ?? compileUnloadedFrame({\n    elementId: input.elementId,\n    axesResult,\n    material: input.material,\n    section: input.section,\n    kind: input.kind,\n    solveProfile: input.solveProfile,\n  });\n",
      'ACCDB solver compileUnloadedFrame call');
  }

  if (!text.includes('straightPipeTransverseShear.mode === \'COWPER_HOLLOW_CIRCLE_TIMOSHENKO\'')) {
    text = replaceOnce(text,
      "function compileUnloadedFrame(input) {\n  return compileFrameElement({\n    elementId: input.elementId,\n    material: input.material,\n    section: input.section,\n    localAxes: { result: input.axesResult, profile: FRAME_LOCAL_AXIS_PROFILE },\n    profile: frameProfile(),\n    distributedLoads: [],\n    temperature: null,\n    releases: [],\n    endSprings: [],\n    rigidOffsets: null,\n  });\n}\n",
      "function compileUnloadedFrame(input) {\n  const useCowperStraightPipe = input.kind !== 'RIGID'\n    && input.solveProfile.straightPipeTransverseShear.mode === 'COWPER_HOLLOW_CIRCLE_TIMOSHENKO';\n  const profile = useCowperStraightPipe\n    ? cowperAccdbStraightPipeFrameProfile({\n        materialResolution: input.material,\n        sectionResolution: input.section,\n        source: input.solveProfile.straightPipeTransverseShear.source,\n      })\n    : frameProfile();\n  return compileFrameElement({\n    elementId: input.elementId,\n    material: input.material,\n    section: input.section,\n    localAxes: { result: input.axesResult, profile: FRAME_LOCAL_AXIS_PROFILE },\n    profile,\n    distributedLoads: [],\n    temperature: null,\n    releases: [],\n    endSprings: [],\n    rigidOffsets: null,\n  });\n}\n",
      'ACCDB solver compileUnloadedFrame implementation');
  }
  writeText(SOLVER_PATH, text);
}

function replaceOnce(text, before, after, label) {
  const first = text.indexOf(before);
  if (first < 0) throw new Error(`${label}: expected source block not found.`);
  if (text.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: source block is not unique.`);
  return `${text.slice(0, first)}${after}${text.slice(first + before.length)}`;
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(path, value) {
  writeFileSync(path, value, 'utf8');
}
