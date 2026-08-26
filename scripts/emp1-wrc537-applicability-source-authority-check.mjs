#!/usr/bin/env node
import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-primitives/canonical-json.js';
import {
  EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED,
  EMP1_WRC537_ATTACHMENT_STATION_BASIS,
  EMP1_WRC537_CYLINDER_LENGTH_BASIS,
  createEmp1Wrc537ApplicabilitySourceAuthority,
  requireEmp1Wrc537QualifiedApplicabilitySourceAuthority,
} from '../src/core/emp1/emp1-wrc537-applicability-source-authority.js';
import {
  evaluateEmp1Wrc537CylindricalApplicability,
  requireEmp1Wrc537QualifiedCylindricalApplicability,
} from '../src/core/emp1/emp1-wrc537-cylindrical-applicability.js';

const authority = sourceAuthority({ cylinderLength: 300, station: 80 });
assert.equal(authority.distanceFromCylinderStart, 80);
assert.equal(authority.distanceFromCylinderEnd, 220);
assert.equal(authority.nearestCylinderEndDistance, 80);
assert.equal(authority.sourceQualification, EMP1_WRC537_APPLICABILITY_SOURCE_QUALIFIED);
assert.equal(requireEmp1Wrc537QualifiedApplicabilitySourceAuthority(authority).semanticHash,
  authority.semanticHash);

const qualified = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 1000, Mc: 500000, Ml: 0 },
  sourceAuthority: authority,
});
assert.equal(qualified.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');
assert.equal(qualified.productionUseAuthorized, true);
assert.equal(qualified.engineeringUseAuthorized, true);
assert.equal(qualified.rules.radialLoad.actualRatio, 3);
assert.equal(qualified.rules.externalMoment.actualRatio, 0.8);
assert.equal(qualified.evidence.nearestCylinderEndDistance, 80);
assert.equal(qualified.sourceAuthoritySemanticHash, authority.semanticHash);
assert.equal(requireEmp1Wrc537QualifiedCylindricalApplicability(qualified).status,
  'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');

const exactBoundary = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 1, Mc: 1, Ml: 0 },
  sourceAuthority: sourceAuthority({ cylinderLength: 100, station: 50 }),
});
assert.equal(exactBoundary.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');
assert.equal(exactBoundary.rules.radialLoad.actualRatio, 1);
assert.equal(exactBoundary.rules.externalMoment.actualRatio, 0.5);

const shortCylinder = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 1, Mc: 0, Ml: 0 },
  sourceAuthority: sourceAuthority({ cylinderLength: 90, station: 45 }),
});
assert.equal(shortCylinder.status, 'OUTSIDE_WRC537_4_5_SOURCE_LIMITS');
assert.ok(shortCylinder.reasons.includes('WRC537_4_5_1_CYLINDER_LENGTH_LT_RM'));

const nearEnd = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 0, Mc: 1, Ml: 0 },
  sourceAuthority: sourceAuthority({ cylinderLength: 300, station: 40 }),
});
assert.equal(nearEnd.status, 'OUTSIDE_WRC537_4_5_SOURCE_LIMITS');
assert.ok(nearEnd.reasons.includes('WRC537_4_5_2_END_DISTANCE_LT_0P5_RM'));

const radialOnlyNearEnd = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 1, Mc: 0, Ml: 0 },
  sourceAuthority: sourceAuthority({ cylinderLength: 300, station: 0 }),
});
assert.equal(radialOnlyNearEnd.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_QUALIFIED');
assert.equal(radialOnlyNearEnd.rules.externalMoment.status, 'NOT_TRIGGERED_BY_LOAD_COMPONENTS');

const legacy = evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 1, Mc: 1, Ml: 0 },
  evidence: {
    cylinderLength: 300,
    nearestCylinderEndDistance: 80,
    sourceReferences: { cylinderLength: 'LEGACY/L', nearestCylinderEndDistance: 'LEGACY/X' },
  },
});
assert.equal(legacy.status, 'PASS_WRC537_4_5_SOURCE_LIMITS_COMPARISON_ONLY');
assert.equal(legacy.productionUseAuthorized, false);
expectCode(() => requireEmp1Wrc537QualifiedCylindricalApplicability(legacy),
  'EMP1_WRC537_CYLINDRICAL_APPLICABILITY_QUALIFIED_SOURCE_AUTHORITY_REQUIRED');

expectCode(() => createEmp1Wrc537ApplicabilitySourceAuthority({
  ...sourceInput({ cylinderLength: 100, station: 101 }),
}), 'EMP1_WRC537_4_5_ATTACHMENT_STATION_OUTSIDE_CYLINDER');
expectCode(() => createEmp1Wrc537ApplicabilitySourceAuthority({
  ...sourceInput({ cylinderLength: 100, station: 50 }),
  cylinderLengthBasis: 'GENERIC_LENGTH',
}), 'EMP1_WRC537_4_5_CYLINDER_LENGTH_BASIS_REQUIRED');
expectCode(() => createEmp1Wrc537ApplicabilitySourceAuthority({
  ...sourceInput({ cylinderLength: 100, station: 50 }),
  attachmentStationBasis: 'CALLER_NEAREST_END_DISTANCE',
}), 'EMP1_WRC537_4_5_ATTACHMENT_STATION_BASIS_REQUIRED');

const derivedSpoof = structuredClone(authority);
derivedSpoof.nearestCylinderEndDistance = 1000;
const { semanticHash: ignoredDerivedHash, ...derivedSpoofBase } = derivedSpoof;
derivedSpoof.semanticHash = semanticHash(derivedSpoofBase);
expectCode(() => requireEmp1Wrc537QualifiedApplicabilitySourceAuthority(derivedSpoof),
  'EMP1_WRC537_4_5_DERIVED_END_DISTANCE_MISMATCH');

const bindingSpoof = structuredClone(authority);
bindingSpoof.attachmentStationSourceReference = 'OTHER/DRAWING/STATION';
expectCode(() => requireEmp1Wrc537QualifiedApplicabilitySourceAuthority(bindingSpoof),
  'EMP1_WRC537_4_5_SOURCE_BINDING_HASH_MISMATCH');

const hiddenFieldSpoof = { ...structuredClone(authority), callerNearestDistance: 999 };
expectCode(() => requireEmp1Wrc537QualifiedApplicabilitySourceAuthority(hiddenFieldSpoof),
  'EMP1_WRC537_4_5_SOURCE_AUTHORITY_SHAPE_MISMATCH');

const authorityHashSpoof = structuredClone(authority);
authorityHashSpoof.semanticHash = 'fnv1a64:0000000000000000';
expectCode(() => requireEmp1Wrc537QualifiedApplicabilitySourceAuthority(authorityHashSpoof),
  'EMP1_WRC537_4_5_SOURCE_AUTHORITY_HASH_MISMATCH');

expectCode(() => evaluateEmp1Wrc537CylindricalApplicability({
  meanRadius: 100,
  loads: { P: 1, Mc: 1, Ml: 0 },
  sourceAuthority: authority,
  evidence: {
    cylinderLength: 300,
    nearestCylinderEndDistance: 999,
    sourceReferences: { cylinderLength: 'SPOOF/L', nearestCylinderEndDistance: 'SPOOF/X' },
  },
}), 'EMP1_WRC537_CYLINDRICAL_APPLICABILITY_AUTHORITY_AND_LEGACY_EVIDENCE_CONFLICT');

console.log(JSON.stringify({
  status: 'PASS_WRC537_4_5_TYPED_SOURCE_AUTHORITY',
  sourceQualification: authority.sourceQualification,
  sourceBindingSemanticHash: authority.sourceBindingSemanticHash,
  authoritySemanticHash: authority.semanticHash,
  derivedDistances: {
    fromStart: authority.distanceFromCylinderStart,
    fromEnd: authority.distanceFromCylinderEnd,
    nearest: authority.nearestCylinderEndDistance,
  },
  qualifiedRatios: {
    cylinderLengthOverRm: qualified.rules.radialLoad.actualRatio,
    nearestEndDistanceOverRm: qualified.rules.externalMoment.actualRatio,
  },
  equalityBoundariesPass: true,
  shortCylinderRejected: true,
  nearEndMomentRejected: true,
  radialOnlyDoesNotInventEndDistanceRule: true,
  legacyCallerEvidenceComparisonOnly: true,
  nearestDistanceDerivedNotCallerAuthored: true,
  recomputedHashCannotHideDerivedDistanceSpoof: true,
}, null, 2));

function sourceAuthority({ cylinderLength, station }) {
  return createEmp1Wrc537ApplicabilitySourceAuthority(sourceInput({ cylinderLength, station }));
}
function sourceInput({ cylinderLength, station }) {
  return {
    geometryIdentity: 'EMP1-WRC45-CYL-001',
    cylinderLengthBasis: EMP1_WRC537_CYLINDER_LENGTH_BASIS,
    cylinderLength,
    attachmentStationBasis: EMP1_WRC537_ATTACHMENT_STATION_BASIS,
    attachmentStationFromCylinderStart: station,
    unit: 'mm',
    cylinderLengthSourceReference: 'QUALIFICATION/GAD/CYLINDER-TANGENT-LENGTH',
    attachmentStationSourceReference: 'QUALIFICATION/GAD/WRC-REFERENCE-STATION',
    productionObservationUsedToSetAuthority: false,
  };
}
function expectCode(fn, code) {
  let error = null;
  try { fn(); } catch (caught) { error = caught; }
  assert.equal(error?.code, code, `expected ${code}, got ${error?.code}`);
}
