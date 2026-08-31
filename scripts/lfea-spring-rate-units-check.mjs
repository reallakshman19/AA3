/*
 * A spring rate must be converted out of the file's units.
 *
 * This was a real defect, shipped and then found by asking the plainest
 * possible question about the feature: what units does a user type the rate in?
 *
 * CAESAR declares stiffness in the model's own force-per-length -- N/mm, lb/in
 * -- while the solver works in N/m. The InputXML adapter converts forces
 * (units.force) and lengths (convertInputXmlLengthToMetres) separately, and
 * stiffness is the quotient of the two, so it belonged to neither and got
 * neither. The declared number reached the solver raw: a rate given in N/mm was
 * used as N/m, wrong by a factor of 1000, silently, in the direction of a
 * support far softer than the engineer asked for.
 *
 * Nothing caught it because the only models exercising springs were written
 * against the broken behaviour.
 */
import assert from 'node:assert/strict';
import { inputXmlStiffnessToSiFactor } from '../src/core/geometry/adapters/inputxml-unit-system.js';
import { classifyRestraint } from '../src/core/linear-piping-analysis-consumer/inputxml-feature-inventory-restraints.js';
import { compileInputXmlStructuralConstraints } from '../src/core/linear-piping-analysis-consumer/inputxml-linear-structural-constraints.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE as APPROXIMATE,
} from '../src/core/linear-piping-analysis-consumer/inputxml-model-health-profile.js';

const breakRate = process.argv.includes('--deliberate-break')
  || process.argv.includes('--deliberate-break-rate');
const breakUnresolved = process.argv.includes('--deliberate-break-unresolved');

// force scale 1 (newtons), length mm -> N/mm becomes N/m
const nPerMmFactor = inputXmlStiffnessToSiFactor({ scale: 1 }, 'mm');
assert.equal(nPerMmFactor, 1000);
assert.equal(inputXmlStiffnessToSiFactor({ scale: 1 }, 'm'), 1);
assert.equal(inputXmlStiffnessToSiFactor({ scale: 1 }, 'cm'), 100);
// pounds-force per inch is the other common pairing
const lbfPerInch = inputXmlStiffnessToSiFactor({ scale: 4.4482216152605 }, 'in');
assert.ok(Math.abs(lbfPerInch - 175.1268) < 1e-3,
  `lbf/in must convert to N/m by ~175.13, got ${lbfPerInch}`);

// An undeclared or unusable force unit yields null, never an assumed 1.
assert.equal(inputXmlStiffnessToSiFactor(null, 'mm'), null);
assert.equal(inputXmlStiffnessToSiFactor({ scale: Number.NaN }, 'mm'), null);
assert.equal(inputXmlStiffnessToSiFactor({ scale: 1 }, 'furlong'), null);

// ------------------------------------------------------- through the classifier
const attributes = { TYPE: '2.000000', NODE: '30.000000', STIFFNESS: '400.000000',
  XCOSINE: '0.000000', YCOSINE: '1.000000', ZCOSINE: '0.000000',
  GAP: '-1.010100', FRIC_COEF: '-1.010100', CNODE: '-1.010100' };
const element = { toNodeId: '30', fromNodeId: '20' };

// Deliberate rate break reproduces the legacy defect at the consumer boundary:
// the declared N/mm number is passed with factor 1 as if it were already N/m.
const converted = classifyRestraint(attributes, element, null, breakRate ? 1 : nPerMmFactor);
assert.equal(converted.stiffnessDeclared, 400, 'the declared number must be retained as declared');
assert.equal(converted.stiffnessValue, 400000, 'the compiled rate must be in solver units');
assert.equal(converted.stiffnessUnitsResolvable, true);

/*
 * The refusal case matters more than the conversion. A model whose units cannot
 * be resolved must not fall back to using the declared number as if it were
 * already SI -- that is the exact failure this check exists to prevent, and it
 * is invisible in results: the model still solves, on a support up to three
 * orders of magnitude too soft.
 */
// Deliberate unresolved break reproduces the forbidden null -> factor-1 fallback.
const unresolved = classifyRestraint(attributes, element, null, breakUnresolved ? 1 : null);
assert.equal(unresolved.stiffnessDeclared, 400,
  'the declared rate is still evidence even when it cannot be converted');
assert.equal(unresolved.stiffnessValue, null,
  'an unconvertible rate must not reach the solver as an assumed-SI number');
assert.equal(unresolved.stiffnessUnitsResolvable, false);
assert.equal(unresolved.finiteStiffnessActive, true,
  'the restraint still declares a spring; only the usable value is withheld');

// ------------------------------------------------ structural declaration guard
function inventoryRow(classification) {
  return Object.freeze({
    active: true,
    sourceKind: 'RESTRAINT',
    inventoryId: 'IXF:RESTRAINT:UNITS-CHECK',
    sourceFeatureId: 'PIPINGELEMENT[0]/RESTRAINT[0]',
    sourceRecordSemanticHash: 'units-check-source',
    classification,
    // Deliberately forge an upstream "implemented" disposition. The structural
    // declaration owner must still fail closed if unit custody was lost; this
    // prevents a later classifier regression from restoring null -> FIXED.
    dispositionByProfile: Object.freeze({
      [APPROXIMATE]: Object.freeze({ disposition: 'IMPLEMENTED_EXACTLY', limitationCode: null }),
    }),
  });
}

const compiled = compileInputXmlStructuralConstraints({
  inventory: [inventoryRow(converted)],
  modelId: 'UNITS',
  analysisProfileId: APPROXIMATE,
  conditionedNodeIds: ['30'],
});
assert.equal(compiled.declarations.length, 1);
assert.equal(compiled.declarations[0].kind, 'PARTIAL_RELEASE_SPRING');
assert.equal(compiled.declarations[0].stiffness, 400000);

assert.throws(
  () => compileInputXmlStructuralConstraints({
    inventory: [inventoryRow(unresolved)],
    modelId: 'UNITS',
    analysisProfileId: APPROXIMATE,
    conditionedNodeIds: ['30'],
  }),
  (error) => error?.code === 'INPUTXML_STRUCTURAL_SPRING_RATE_UNRESOLVED'
    && error?.data?.stiffnessDeclared === 400,
  'a finite spring with unresolved units must BLOCK before null can become FIXED',
);

console.log(JSON.stringify({
  check: 'lfea-spring-rate-units',
  status: 'PASS',
  factors: { 'N/mm': 1000, 'N/cm': 100, 'N/m': 1, 'lbf/in': Number(lbfPerInch.toFixed(4)) },
  declaredRetained: converted.stiffnessDeclared,
  compiledRate: converted.stiffnessValue,
  resolvedDeclarationKind: compiled.declarations[0].kind,
  unresolvableUnitsWithholdValue: true,
  unresolvableUnitsStructuralBlock: 'INPUTXML_STRUCTURAL_SPRING_RATE_UNRESOLVED',
  deliberateBreakModes: {
    rate: '--deliberate-break / --deliberate-break-rate passes N/mm as factor 1 and must turn the 400000 N/m assertion red',
    unresolved: '--deliberate-break-unresolved substitutes factor 1 for unresolved units and must turn the withheld-value assertion red',
  },
}, null, 2));
