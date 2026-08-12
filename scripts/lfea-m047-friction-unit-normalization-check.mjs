import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  convertCaesarTranslationalStiffnessToSi,
  normalizeDisplayedCaesarFrictionStiffnessFromInputXml,
  parseCaesarInputXmlTranslationalStiffnessUnit,
} from '../src/core/nonlinear-restraint-friction/caesar-friction-unit-normalization.js';
import {
  FRICTION_EXECUTION_READINESS_STATUS,
  assessFrictionExecutionReadiness,
} from '../src/core/nonlinear-restraint-friction/friction-execution-readiness.js';

const authority = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-friction-unit-authority.json', import.meta.url),
  'utf8',
));

assert.equal(authority.schema, 'm047-bm4l-friction-unit-authority/v2');
assert.equal(authority.benchmarkId, 'BM4_L');
assert.equal(authority.officialAuthority.sourceValue, 1_000_000);
assert.equal(authority.officialAuthority.sourceUnit, 'LB/IN');
assert.equal(authority.normalization.siValue, 175126835.24647635);
assert.equal(authority.normalization.siUnit, 'N/m');
assert.equal(authority.decision.frictionStiffnessSI, 175126835.24647635);
assert.equal(authority.decision.unitNormalizationStatus, 'RESOLVED_AND_PRODUCT_VALIDATED');
assert.equal(authority.modelDisplayUnits.formerDiagnosticInterpretationNPerM, 100_000_000);
assert.equal(authority.modelDisplayUnits.formerDiagnosticDisposition, 'SUPERSEDED_BY_OFFICIAL_SOURCE_UNIT_AND_INDEPENDENT_PRODUCT_OBSERVATION');
assert.equal(authority.policy.modelDisplayUnitsMayNotInferStaticFrictionConfigUnit, true);
assert.equal(authority.policy.bm4ResponseFittingUsed, false);
assert.equal(authority.decision.l13ProductionSolveAuthorized, false);

const official = convertCaesarTranslationalStiffnessToSi(1_000_000, 'lb/in');
assert.equal(official.valueNPerM, authority.normalization.siValue);

const syntheticUnitsXml = '<UNITS><TRANS_STIFF LABEL="N. / cm." FACTOR="1.751270"/></UNITS>';
const parsed = parseCaesarInputXmlTranslationalStiffnessUnit(syntheticUnitsXml);
assert.deepEqual(parsed, { label: 'N. / cm.', normalizedUnit: 'n/cm', factor: 1.75127 });
const modelDisplayConversion = normalizeDisplayedCaesarFrictionStiffnessFromInputXml({
  displayedValue: 1_000_000,
  xmlText: syntheticUnitsXml,
});
assert.equal(modelDisplayConversion.valueNPerM, 100_000_000);
assert.notEqual(modelDisplayConversion.valueNPerM, authority.normalization.siValue);

for (const row of authority.independentProductObservation.output.observations) {
  assert.ok(Math.abs(row.relativeDifferenceFromDocumentedDefault) < 0.0001);
}

const bypass = assessFrictionExecutionReadiness({
  caseId: 'L6',
  frictionMultiplier: 0,
  sourceMap: null,
  authority: { frictionStiffness: { status: 'INVALID', value: Number.NaN } },
});
assert.equal(bypass.status, FRICTION_EXECUTION_READINESS_STATUS.READY_LINEAR_BYPASS);
assert.equal(bypass.route, 'QUALIFIED_LINEAR_SOLVER');
assert.equal(bypass.evidence.nonlinearAuthorityInspected, false);

console.log(JSON.stringify({
  check: 'm047-friction-static-stiffness-authority',
  status: 'PASS',
  documentedStaticFrictionStiffnessNPerM: authority.normalization.siValue,
  supersededModelDisplayInterpretationNPerM: modelDisplayConversion.valueNPerM,
  independentProductValidationSites: authority.independentProductObservation.output.observations.length,
  l13ProductionSolveAuthorized: false,
}, null, 2));
