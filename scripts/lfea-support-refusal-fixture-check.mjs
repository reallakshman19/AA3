import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import { prepareLinearPipingInputXmlPreFlight } from '../src/workspace/linear-piping-inputxml-prefea.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE as APPROXIMATE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE as STRICT,
} from '../src/core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';

const deliberateBreak = process.argv.includes('--deliberate-break');
const DIR = 'benchmarks/LFEA/SPRING_DRAFT';
const profiles = [STRICT, APPROXIMATE];
const refusalCodes = Object.freeze([
  'MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED',
  'MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE',
  'MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED',
]);

const fixtures = [
  {
    fileName: 'UnsupportedCnodeSupport.xml',
    expected: 'MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED',
    breakXml(xml) {
      return xml.replace(
        'TYPE="2.000000" STIFFNESS="-1.010100"',
        'TYPE="2.000000" STIFFNESS="1000.000000"',
      );
    },
  },
  {
    fileName: 'UnsupportedHanger.xml',
    expected: 'MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE',
    breakXml(xml) {
      return xml.replace('COLD_LOAD="-1.010100"', 'COLD_LOAD="4500.000000"');
    },
  },
  {
    fileName: 'UnsupportedSkewSupport.xml',
    expected: 'MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED',
    breakXml(xml) {
      return xml.replace(
        'XCOSINE="0.600000" YCOSINE="0.800000" ZCOSINE="0.000000" TAG="RIGID_SKEW_CONTROL"',
        'XCOSINE="1.000000" YCOSINE="0.000000" ZCOSINE="0.000000" TAG="RIGID_SKEW_CONTROL"',
      );
    },
  },
];

const evidence = [];
for (const fixture of fixtures) {
  const source = readFileSync(`${DIR}/${fixture.fileName}`, 'utf8');
  const xml = deliberateBreak ? fixture.breakXml(source) : source;
  for (const profile of profiles) {
    const intake = createLinearPipingInputXmlIntake(
      { fileName: fixture.fileName, content: xml },
      { fallbackUnit: 'mm', requestedProfileId: profile },
    );
    const preFlight = prepareLinearPipingInputXmlPreFlight(intake);
    const blocked = preFlight.preparation.findings
      .filter((row) => row.disposition === 'BLOCK')
      .map((row) => row.code);
    assert.equal(preFlight.status, 'BLOCK',
      `${fixture.fileName} must remain a retained refusal model under ${profile}`);
    assert.ok(blocked.includes(fixture.expected),
      `${fixture.fileName} must refuse by ${fixture.expected}; got ${JSON.stringify(blocked)}`);
    const unrelated = refusalCodes.filter((code) => code !== fixture.expected);
    for (const code of unrelated) {
      assert.equal(blocked.includes(code), false,
        `${fixture.fileName} must not depend on unrelated refusal ${code}`);
    }
    evidence.push({ fileName: fixture.fileName, profile, blocked });
  }
}

console.log(JSON.stringify({
  check: 'lfea-support-refusal-fixtures',
  status: 'PASS',
  state: 'SOURCE_REFUSAL_CUSTODY',
  dedicatedRefusalModels: fixtures.map((row) => ({
    fileName: row.fileName,
    expectedRefusal: row.expected,
  })),
  profiles,
  evidence,
  combinedLegacyFixtureRetained: 'UnsupportedSupports.xml',
  deliberateBreakMode: '--deliberate-break makes every dedicated deferred feature representable and must turn this refusal gate red',
}, null, 2));
