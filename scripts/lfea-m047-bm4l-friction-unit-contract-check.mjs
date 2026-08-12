import fs from 'node:fs';
import {
  normalizeDisplayedCaesarFrictionStiffnessToSI,
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

const fixtureXml = '<CAESARII><UNITS>\n<LENGTH LABEL="mm." FACTOR="25.400000"/>\n<FORCE LABEL="N." FACTOR="4.448220"/>\n</UNITS></CAESARII>';
const fixtureUnits = parseCaesarInputXmlForceLengthUnits(fixtureXml);
check(fixtureUnits.stiffnessUnit === 'N/MM', 'fixture displayed stiffness unit');
check(fixtureUnits.scaleToNPerM === 1000, 'fixture SI scale');

const normalized = normalizeDisplayedCaesarFrictionStiffnessToSI({ value: authority.derivation.displayedValue, inputXml: fixtureXml });
check(normalized.value === authority.derivation.siValue, 'BM4_L normalized stiffness');
check(normalized.unit === authority.derivation.siUnit, 'BM4_L normalized stiffness unit');
check(normalizeForcePerLengthToNPerM(1, 'N/m') === 1, 'N/m identity');
check(normalizeForcePerLengthToNPerM(1, 'N/cm') === 100, 'N/cm conversion');
check(normalizeForcePerLengthToNPerM(1, 'N/mm') === 1000, 'N/mm conversion');
check(Math.abs(normalizeForcePerLengthToNPerM(1, 'lb/in') - 175.12683524647636) < 1e-12, 'lb/in conversion');

let ambiguousRejected = false;
try { normalizeForcePerLengthToNPerM(1, 'DISPLAYED_CAESAR_UNITS'); } catch { ambiguousRejected = true; }
check(ambiguousRejected, 'ambiguous displayed unit must fail closed');

const stiffness = readiness.resolvedAuthority.frictionStiffness;
check(stiffness.value === authority.derivation.siValue && stiffness.unit === 'N/m', 'readiness snapshot normalized SI stiffness');

const unresolvedUnit = assessFrictionExecutionReadiness({
  caseId: 'UNIT-GATE',
  frictionMultiplier: 1,
  sourceMap,
  authority: {
    ...readiness.resolvedAuthority,
    frictionStiffness: { status: 'RESOLVED', value: 1000000, source: 'AMBIGUOUS_DISPLAY_VALUE', provenanceClass: 'INDEPENDENT_AUTHORITY' },
    frictionSlideMultiplier: { status: 'RESOLVED', value: 1, source: 'FIXTURE', provenanceClass: 'INDEPENDENT_AUTHORITY' },
    frictionStateHistorySemantics: { status: 'RESOLVED', method: 'FIXTURE', source: 'FIXTURE', provenanceClass: 'INDEPENDENT_AUTHORITY' },
    gapContactStateSemantics: { status: 'RESOLVED', method: 'FIXTURE', source: 'FIXTURE', provenanceClass: 'INDEPENDENT_AUTHORITY' }
  }
});
check(unresolvedUnit.blockerCodes.includes(B.STIFFNESS_UNIT), 'readiness gate must reject unnormalized stiffness');

const inputArgIndex = process.argv.indexOf('--inputxml');
let exactInputXmlReplay = 'NOT_RUN';
if (inputArgIndex >= 0) {
  const inputPath = process.argv[inputArgIndex + 1];
  if (!inputPath) throw new Error('--inputxml requires a path');
  const xml = fs.readFileSync(inputPath, 'utf8');
  const units = parseCaesarInputXmlForceLengthUnits(xml);
  check(units.forceUnit === authority.derivation.forceUnit, 'exact InputXML force unit');
  check(units.lengthUnit === authority.derivation.lengthUnit.toUpperCase(), 'exact InputXML length unit');
  const exact = normalizeDisplayedCaesarFrictionStiffnessToSI({ value: authority.derivation.displayedValue, inputXml: xml });
  check(exact.value === authority.derivation.siValue, 'exact InputXML stiffness normalization');
  exactInputXmlReplay = 'PASS';
}

console.log(JSON.stringify({
  check: 'm047-bm4l-friction-unit-contract',
  status: 'PASS',
  displayedValue: authority.derivation.displayedValue,
  displayedUnit: authority.derivation.displayedStiffnessUnit,
  siValue: authority.derivation.siValue,
  siUnit: authority.derivation.siUnit,
  exactInputXmlReplay,
  remainingBlockers: authority.decision.remainingBlockers,
  productionFrictionAuthorized: false
}, null, 2));

function check(value, message) { if (!value) throw new Error(message); }
