import fs from 'node:fs';
import {
  normalizeCaesarStaticFrictionStiffnessToSI,
  normalizeForcePerLengthToNPerM,
  parseCaesarInputXmlForceLengthUnits,
} from '../src/core/nonlinear-restraint-friction/caesar-friction-unit-contract.js';
import {
  assessFrictionExecutionReadiness,
  FRICTION_EXECUTION_READINESS_BLOCKERS as B,
} from '../src/core/nonlinear-restraint-friction/friction-execution-readiness.js';

const authority = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-unit-authority.json', import.meta.url), 'utf8'));
const readiness = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-readiness-snapshot.json', import.meta.url), 'utf8'));
const sourceMap = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-source-map-snapshot.json', import.meta.url), 'utf8'));

check(authority.schema === 'm047-bm4l-friction-unit-authority/v2', 'authority schema');

const normalized = normalizeCaesarStaticFrictionStiffnessToSI({
  value: authority.officialAuthority.sourceValue,
  sourceUnit: authority.officialAuthority.sourceUnit,
});
check(relative(normalized.value, authority.normalization.siValue) < 1e-15, 'documented static stiffness normalization');
check(normalized.unit === 'N/m', 'normalized stiffness unit');

check(normalizeForcePerLengthToNPerM(1, 'N/m') === 1, 'N/m identity');
check(normalizeForcePerLengthToNPerM(1, 'N/cm') === 100, 'N/cm conversion');
check(normalizeForcePerLengthToNPerM(1, 'N/mm') === 1000, 'N/mm conversion');
check(relative(normalizeForcePerLengthToNPerM(1, 'lb/in'), 175.12683524647636) < 1e-15, 'lb/in conversion');

const fixtureXml = '<CAESARII><UNITS>\n<LENGTH LABEL="mm." FACTOR="25.400000"/>\n<FORCE LABEL="N." FACTOR="4.448220"/>\n</UNITS></CAESARII>';
const fixtureUnits = parseCaesarInputXmlForceLengthUnits(fixtureXml);
check(fixtureUnits.stiffnessUnit === 'N/MM', 'model display stiffness unit');
check(fixtureUnits.scaleToNPerM === 1000, 'model display SI scale');
check(authority.modelDisplayUnits.finding === 'MODEL_INPUTXML_DISPLAY_UNITS_DO_NOT_OVERRIDE_THE_DOCUMENTED_STATIC_FRICTION_CONFIGURATION_SOURCE_UNIT', 'display-unit non-inference policy');

let ambiguousRejected = false;
try { normalizeForcePerLengthToNPerM(1, 'DISPLAYED_CAESAR_UNITS'); } catch { ambiguousRejected = true; }
check(ambiguousRejected, 'ambiguous displayed unit must fail closed');

for (const row of authority.independentProductObservation.output.observations) {
  check(Math.abs(row.relativeDifferenceFromDocumentedDefault) < 0.0002, `BM1 node ${row.node} product observation`);
}

const stiffness = readiness.resolvedAuthority.frictionStiffness;
check(relative(stiffness.value, authority.normalization.siValue) < 1e-15 && stiffness.unit === 'N/m', 'readiness snapshot normalized SI stiffness');
check(stiffness.sourceUnit === 'LB/IN', 'readiness source unit custody');

const resolvedNonlinear = {
  ...readiness.resolvedAuthority,
  frictionSlideMultiplier: scalar(1),
  frictionStateHistorySemantics: semantics('FIXTURE_STATE_HISTORY'),
  gapContactStateSemantics: semantics('FIXTURE_GAP_CONTACT'),
};
const unitless = assessFrictionExecutionReadiness({
  caseId: 'UNIT-GATE',
  frictionMultiplier: 1,
  sourceMap,
  authority: {
    ...resolvedNonlinear,
    frictionStiffness: { status: 'RESOLVED', value: 1000000, source: 'AMBIGUOUS_VALUE', provenanceClass: 'INDEPENDENT_AUTHORITY' },
  },
});
check(unitless.blockerCodes.includes(B.STIFFNESS_UNIT), 'readiness gate rejects unitless stiffness');

for (const caseId of ['L2','L3','L4','L5','L6']) {
  const row = assessFrictionExecutionReadiness({ caseId, frictionMultiplier: 0 });
  check(row.status === 'READY_LINEAR_BYPASS' && row.blockerCodes.length === 0, `${caseId} linear bypass`);
}
for (const caseId of ['L7','L13']) {
  const row = assessFrictionExecutionReadiness({
    caseId,
    frictionMultiplier: 1,
    sourceMap,
    authority: {
      ...readiness.resolvedAuthority,
      frictionSlideMultiplier: { status: 'BLOCKED', source: 'PUBLIC_NUMERIC_VALUE_NOT_FOUND' },
      frictionStateHistorySemantics: { status: 'BLOCKED', source: 'EXACT_STATIC_STATE_HISTORY_NOT_PUBLISHED' },
      gapContactStateSemantics: { status: 'BLOCKED', source: 'EXACT_STATIC_GAP_CONTACT_ALGORITHM_NOT_PUBLISHED' },
    },
  });
  for (const code of [B.SLIDE, B.STATE_HISTORY, B.GAP_CONTACT]) check(row.blockerCodes.includes(code), `${caseId} blocker ${code}`);
}

const inputArgIndex = process.argv.indexOf('--inputxml');
let exactInputXmlReplay = 'NOT_RUN';
if (inputArgIndex >= 0) {
  const inputPath = process.argv[inputArgIndex + 1];
  if (!inputPath) throw new Error('--inputxml requires a path');
  const xml = fs.readFileSync(inputPath, 'utf8');
  const units = parseCaesarInputXmlForceLengthUnits(xml);
  check(units.forceUnit === authority.modelDisplayUnits.force, 'exact InputXML force display unit');
  check(units.lengthUnit === authority.modelDisplayUnits.length.toUpperCase(), 'exact InputXML length display unit');
  exactInputXmlReplay = 'PASS';
}

console.log(JSON.stringify({
  check: 'm047-bm4l-friction-unit-contract',
  status: 'PASS',
  staticFrictionStiffness: {
    sourceValue: authority.normalization.sourceValue,
    sourceUnit: authority.normalization.sourceUnit,
    siValue: authority.normalization.siValue,
    siUnit: authority.normalization.siUnit,
  },
  bm1IndependentValidationSites: authority.independentProductObservation.output.observations.length,
  exactInputXmlReplay,
  remainingBlockers: authority.decision.remainingBlockers,
  productionFrictionAuthorized: false,
}, null, 2));

function scalar(value) { return { status:'RESOLVED', value, source:'INDEPENDENT_FIXTURE', provenanceClass:'INDEPENDENT_AUTHORITY' }; }
function semantics(method) { return { status:'RESOLVED', method, source:'INDEPENDENT_FIXTURE', provenanceClass:'INDEPENDENT_AUTHORITY' }; }
function relative(a, b) { return Math.abs(a - b) / Math.max(1, Math.abs(b)); }
function check(value, message) { if (!value) throw new Error(message); }
