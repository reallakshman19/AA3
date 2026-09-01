import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classifyRestraint,
  restraintDispositions,
} from '../src/core/linear-piping-analysis-consumer/inputxml-feature-inventory-restraints.js';
import {
  classifyPredefinedHanger,
  predefinedHangerDispositions,
} from '../src/core/linear-piping-analysis-consumer/inputxml-predefined-hanger.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE as APPROXIMATE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE as STRICT,
} from '../src/core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';

const breakAll = process.argv.includes('--deliberate-break');
const breakCnode = breakAll || process.argv.includes('--deliberate-break-cnode');
const breakSkew = breakAll || process.argv.includes('--deliberate-break-skew');
const breakHanger = breakAll || process.argv.includes('--deliberate-break-hanger');
const DIR = 'benchmarks/LFEA/SPRING_DRAFT';
const profiles = [STRICT, APPROXIMATE];

function attributesOf(fileName, tagName, tagValue) {
  const xml = readFileSync(`${DIR}/${fileName}`, 'utf8');
  const pattern = new RegExp(`<${tagName}\\b[^>]*TAG="${tagValue}"[^>]*/>`, 'u');
  const match = xml.match(pattern);
  assert.ok(match, `${fileName} must retain ${tagName} TAG=${tagValue}`);
  const attributes = {};
  for (const attribute of match[0].matchAll(/([A-Z0-9_-]+)="([^"]*)"/gu)) {
    attributes[attribute[1]] = attribute[2];
  }
  return attributes;
}

function assertRefusal(dispositions, expectedCode, label) {
  for (const profile of profiles) {
    assert.equal(dispositions[profile].limitationCode, expectedCode,
      `${label} must refuse by ${expectedCode} under ${profile}`);
    assert.ok(
      ['UNSUPPORTED_BY_GENERIC_SOLVER', 'INVALID_SOURCE_DATA'].includes(dispositions[profile].disposition),
      `${label} must remain a blocking refusal classification under ${profile}`,
    );
  }
}

const cnodeAttributes = attributesOf(
  'UnsupportedCnodeSupport.xml', 'RESTRAINT', 'RIGID_CNODE_CONTROL',
);
if (breakCnode) cnodeAttributes.STIFFNESS = '1000.000000';
const cnode = classifyRestraint(
  cnodeAttributes,
  { fromNodeId: '20', toNodeId: '30' },
  { startNodeId: '20', endNodeId: '30' },
  1000,
);
const cnodeDispositions = restraintDispositions(cnode);
assertRefusal(cnodeDispositions, 'MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED', 'rigid CNODE');

const skewAttributes = attributesOf(
  'UnsupportedSkewSupport.xml', 'RESTRAINT', 'RIGID_SKEW_CONTROL',
);
if (breakSkew) {
  skewAttributes.XCOSINE = '1.000000';
  skewAttributes.YCOSINE = '0.000000';
  skewAttributes.ZCOSINE = '0.000000';
}
const skew = classifyRestraint(
  skewAttributes,
  { fromNodeId: '20', toNodeId: '30' },
  { startNodeId: '20', endNodeId: '30' },
  1000,
);
const skewDispositions = restraintDispositions(skew);
assertRefusal(skewDispositions, 'MODEL_RESTRAINT_SKEW_DIRECTION_UNSUPPORTED', 'rigid skew');

const hangerAttributes = attributesOf(
  'UnsupportedHanger.xml', 'HANGER', 'INCOMPLETE_HANGER_CONTROL',
);
if (breakHanger) hangerAttributes.COLD_LOAD = '4500.000000';
const hanger = classifyPredefinedHanger(hangerAttributes, 1000, 'mm');
const hangerDispositions = predefinedHangerDispositions(hanger);
assertRefusal(hangerDispositions, 'MODEL_HANGER_PREDEFINED_DATA_INCOMPLETE', 'incomplete HANGER');

console.log(JSON.stringify({
  check: 'lfea-support-refusal-classifier',
  status: 'PASS',
  scope: 'CLASSIFIER_REFUSAL_CUSTODY_ONLY',
  profiles,
  evidence: {
    cnode: {
      fileName: 'UnsupportedCnodeSupport.xml',
      terminalCode: cnodeDispositions[STRICT].limitationCode,
      connectingNodeId: cnode.connectingNodeId,
      finiteStiffnessActive: cnode.finiteStiffnessActive,
    },
    skew: {
      fileName: 'UnsupportedSkewSupport.xml',
      terminalCode: skewDispositions[STRICT].limitationCode,
      direction: skew.direction.unit,
      finiteStiffnessActive: skew.finiteStiffnessActive,
    },
    hanger: {
      fileName: 'UnsupportedHanger.xml',
      terminalCode: hangerDispositions[STRICT].limitationCode,
      springRateDeclaredPerHanger: hanger.springRateDeclaredPerHanger,
      coldLoadDeclaredPerHanger: hanger.coldLoadDeclaredPerHanger,
      numberOfHangers: hanger.numberOfHangers,
    },
  },
  deliberateBreakModes: {
    cnode: '--deliberate-break-cnode adds finite stiffness to the rigid CNODE fixture and must turn the retained refusal assertion red',
    skew: '--deliberate-break-skew axis-aligns the rigid skew fixture and must turn the retained refusal assertion red',
    hanger: '--deliberate-break-hanger supplies the missing cold load and must turn the retained refusal assertion red',
    aggregate: '--deliberate-break applies all three mutations and must turn the gate red',
  },
}, null, 2));
