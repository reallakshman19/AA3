#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED,
  EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  createEmp1Wrc537ApplicabilitySourceAuthority,
} from '../src/core/emp1/emp1-wrc537-applicability-source-authority.js';
import {
  EMP1_WRC537_MIN_CYLINDER_LENGTH_RATIO_FOR_RADIAL_LOAD,
  EMP1_WRC537_MIN_END_DISTANCE_RATIO_FOR_EXTERNAL_MOMENT,
  EMP1_WRC537_STRESS_DOMAIN,
  evaluateEmp1Wrc537CylindricalApplicability,
  requireEmp1Wrc537CylindricalApplicabilityForNumerics,
  requireEmp1Wrc537QualifiedCylindricalApplicability,
} from '../src/core/emp1/emp1-wrc537-cylindrical-applicability.js';

const ledger = await readFile('docs/emp1/WRC537_2013_Applicability.md', 'utf8');
assert.match(ledger, /4\.5\.1[^\n]*l < Rm[^\n]*not applicable/u);
assert.match(ledger, /4\.5\.2[^\n]*0\.5 Rm/u);
assert.match(ledger, /4\.5\.3[^\n]*shell[^\n]*not[^\n]*attachment/u);
assert.equal(EMP1_WRC537_MIN_CYLINDER_LENGTH_RATIO_FOR_RADIAL_LOAD, 1);
assert.equal(EMP1_WRC537_MIN_END_DISTANCE_RATIO_FOR_EXTERNAL_MOMENT, 0.5);

const legacyBoundary = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: -1000, Mc: 500000, Ml: -600000 },
  evidence: legacyEvidence(100, 50),
});
assert.equal(legacyBoundary.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_COMPARISON_ONLY');
assert.equal(legacyBoundary.comparisonApplicabilitySatisfied, true);
assert.equal(legacyBoundary.engineeringUseAuthorized, false);
assert.equal(legacyBoundary.productionUseAuthorized, false);
assert.throws(
  () => requireEmp1Wrc537QualifiedCylindricalApplicability(legacyBoundary),
  (error) => error?.code === 'EMP1_WRC537_CYLINDRICAL_APPLICABILITY_QUALIFIED_SOURCE_AUTHORITY_REQUIRED',
);

const boundaryAuthority = typedAuthority(100, 50);
const boundary = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: -1000, Mc: 500000, Ml: -600000 },
  sourceAuthority: boundaryAuthority,
});
assert.equal(boundary.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');
assert.equal(boundary.comparisonApplicabilitySatisfied, true);
assert.equal(boundary.rules.radialLoad.actualRatio, 1);
assert.equal(boundary.rules.externalMoment.actualRatio, 0.5);
assert.equal(boundary.engineeringUseAuthorized, true);
assert.equal(boundary.productionUseAuthorized, true);
assert.equal(boundary.sourceQualification, EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED);
assert.equal(boundary.evidence.nearestCylinderEndDistance, 50);
assert.equal(boundary.sourceAuthoritySemanticHash, boundaryAuthority.semanticHash);
assert.equal(requireEmp1Wrc537QualifiedCylindricalApplicability(boundary).status,
  'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');
assert.equal(boundary.stressScope.domain, EMP1_WRC537_STRESS_DOMAIN);
assert.equal(boundary.stressScope.shellStressesCalculated, true);
assert.equal(boundary.stressScope.attachmentStressesCalculated, false);
assert.equal(boundary.stressScope.nozzleStressesCalculated, false);

const shortCylinder = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 1, Mc: 0, Ml: 0 },
  sourceAuthority: typedAuthority(99.999, 49),
});
assert.equal(shortCylinder.status, 'OUTSIDE_WRC537_4_5_SOURCE_LIMITS');
assert.ok(shortCylinder.reasons.includes('WRC537_4_5_1_CYLINDER_LENGTH_LT_RM'));
assert.throws(
  () => requireEmp1Wrc537CylindricalApplicabilityForNumerics(shortCylinder),
  (error) => error.code === 'EMP1_WRC537_CYLINDRICAL_APPLICABILITY_OUTSIDE_SOURCE_LIMITS',
);

const endTooClose = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 0, Mc: 1, Ml: 0 },
  sourceAuthority: typedAuthority(800, 49.999),
});
assert.equal(endTooClose.status, 'OUTSIDE_WRC537_4_5_SOURCE_LIMITS');
assert.ok(endTooClose.reasons.includes('WRC537_4_5_2_END_DISTANCE_LT_0P5_RM'));

const shearTorsionOnly = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 0, Mc: 0, Ml: 0 },
  sourceAuthority: typedAuthority(10, 0),
});
assert.equal(shearTorsionOnly.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');
assert.equal(shearTorsionOnly.rules.radialLoad.status, 'NOT_TRIGGERED_BY_LOAD_COMPONENTS');
assert.equal(shearTorsionOnly.rules.externalMoment.status, 'NOT_TRIGGERED_BY_LOAD_COMPONENTS');

const missing = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 1, Mc: 1, Ml: 0 },
});
assert.equal(missing.status, 'INCOMPLETE_WRC537_4_5_SOURCE_EVIDENCE');
assert.equal(missing.comparisonApplicabilitySatisfied, false);
assert.ok(missing.reasons.includes('WRC537_4_5_APPLICABILITY_EVIDENCE_REQUIRED'));

assert.throws(
  () => evaluateEmp1Wrc537CylindricalApplicability({
    meanRadius: 100,
    loads: { P: 1, Mc: 1, Ml: 0 },
    sourceAuthority: boundaryAuthority,
    evidence: legacyEvidence(100, 999),
  }),
  (error) => error?.code === 'EMP1_WRC537_CYLINDRICAL_APPLICABILITY_AUTHORITY_AND_LEGACY_EVIDENCE_CONFLICT',
);

console.log(JSON.stringify({
  status: 'PASS_WRC537_4_5_APPLICABILITY_POLICY_AND_TYPED_SOURCE_AUTHORITY',
  qualifiedBoundaryPass: { lOverRm: 1, endDistanceOverRm: 0.5 },
  legacyEvidenceComparisonOnly: true,
  typedSourceAuthorityQualified: true,
  nearestEndDistanceDerivedFromStation: true,
  falsifiers: ['l<Rm radial load', 'endDistance<0.5Rm external moment', 'missing evidence', 'legacy evidence cannot become production authority'],
  loadConditionalPolicy: 'NO_NEW_4_5_LIMIT_INVENTED_FOR_SHEAR_OR_TORSION_ONLY',
  stressDomain: EMP1_WRC537_STRESS_DOMAIN,
}, null, 2));

function typedAuthority(cylinderLength, station) {
  return createEmp1Wrc537ApplicabilitySourceAuthority({
    geometryIdentity: `EMP1-15-WRC45-${cylinderLength}-${station}`,
    cylinderLengthBasis: EMP1_WRC537_CYLINDER_LENGTH_BASIS,
    cylinderLength,
    attachmentStationBasis: EMP1_WRC537_ATTACHMENT_STATION_BASIS,
    attachmentStationFromCylinderStart: station,
    unit: 'mm',
    cylinderLengthSourceReference: 'EMP1-15/CYLINDER-LENGTH',
    attachmentStationSourceReference: 'EMP1-15/WRC-ATTACHMENT-STATION',
    productionObservationUsedToSetAuthority: false,
  });
}
function legacyEvidence(cylinderLength, nearestCylinderEndDistance) {
  return {
    cylinderLength,
    nearestCylinderEndDistance,
    sourceReferences: {
      cylinderLength: 'EMP1-08/CYLINDER-LENGTH',
      nearestCylinderEndDistance: 'EMP1-08/NEAREST-END-DISTANCE',
    },
    basisAuthority: 'CALLER_DECLARED_SOURCE_LOCATOR_ONLY',
  };
}
