/**
 * Interpolated cylindrical adapter check.
 *
 * Covers the wiring added in stage 2: a non-tabulated gamma now reaches Table 5
 * through the adapter, the gate fails closed where the source is silent, and the
 * qualified gamma=5 bounded domain is left exactly as it was.
 */
import assert from 'node:assert/strict';
import {
  EMP1_WRC537_BOUNDED_BETA_MAX,
  EMP1_WRC537_BOUNDED_BETA_MIN,
  EMP1_WRC537_BOUNDED_GAMMA,
  EMP1_WRC537_BOUNDED_VARIANT,
  evaluateEmp1Wrc537BoundedDomain,
} from '../src/core/emp1/emp1-wrc537-cylindrical-bounded-domain.js';
import { evaluateEmp1Wrc537InterpolatedDomain }
  from '../src/core/emp1/emp1-wrc537-cylindrical-interpolated-domain.js';
import { evaluateEmp1Wrc537CylindricalInterpolatedAdapter }
  from '../src/core/emp1/emp1-wrc537-cylindrical-interpolated-adapter.js';
import { EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY }
  from '../src/core/emp1/emp1-wrc537-cylindrical-index.js';

const SOURCE_SHA = '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2';
const HASH = 'a'.repeat(64);
const OWNER_BETA = { basis: 'OWNER_DECLARED', minimum: 0.05, maximum: 0.5 };

// --- the qualified gamma=5 gate must be untouched by stage 2 --------------------
assert.equal(EMP1_WRC537_BOUNDED_GAMMA, 5);
assert.equal(EMP1_WRC537_BOUNDED_BETA_MIN, 0.05);
assert.equal(EMP1_WRC537_BOUNDED_BETA_MAX, 0.5);
assert.equal(EMP1_WRC537_BOUNDED_VARIANT, 'ORIGINAL');
const boundedAtNonTabulated = evaluateEmp1Wrc537BoundedDomain({
  shellFamily: 'CYLINDRICAL', attachmentShape: 'ROUND',
  sourceDocumentSha256: SOURCE_SHA, datasetHash: EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY.datasetHash,
  variant: 'ORIGINAL', gamma: 42.72, beta: 0.2,
});
assert.equal(boundedAtNonTabulated.status, 'BLOCKED_OUTSIDE_QUALIFIED_DOMAIN');
assert.ok(boundedAtNonTabulated.reasons.includes('EMP1_WRC537_BOUNDED_GAMMA'),
  'the qualified gamma=5 gate must still reject non-tabulated gamma');

// --- the interpolated gate accepts it, but only with a beta declaration ---------
const gateInput = {
  shellFamily: 'CYLINDRICAL', attachmentShape: 'ROUND',
  sourceDocumentSha256: SOURCE_SHA,
  datasetHash: EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY.datasetHash,
  expectedDatasetHash: EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY.datasetHash,
  variant: 'ORIGINAL', gamma: 42.72, beta: 0.2,
};
const noDeclaration = evaluateEmp1Wrc537InterpolatedDomain(gateInput);
assert.equal(noDeclaration.status, 'BLOCKED_OUTSIDE_INTERPOLATED_DOMAIN');
assert.ok(noDeclaration.reasons.includes('EMP1_WRC537_INTERPOLATED_BETA_OUTER_LIMIT_UNRESOLVED'));

const declared = evaluateEmp1Wrc537InterpolatedDomain({ ...gateInput, betaDomain: OWNER_BETA });
assert.equal(declared.status, 'PASS_INTERPOLATED_DOMAIN');
assert.equal(declared.interpolationUsed, true);
assert.equal(declared.sourceQualifiedGammaSelection, false);
assert.equal(declared.productionRouteAuthority, false);
assert.equal(declared.codeComplianceAuthority, false);
assert.equal(declared.betaDomain.outerLimitSourceResolved, false);
assert.deepEqual([...declared.commonTabulatedGammas], [5, 15, 50, 100, 300]);

// an exact gamma=5 row needs no declaration and keeps source-qualified standing
const exactFive = evaluateEmp1Wrc537InterpolatedDomain({ ...gateInput, gamma: 5, beta: 0.155 });
assert.equal(exactFive.status, 'PASS_INTERPOLATED_DOMAIN');
assert.equal(exactFive.interpolationUsed, false);
assert.equal(exactFive.sourceQualifiedGammaSelection, true);
assert.equal(exactFive.betaDomain.basis, 'GAMMA5_SOURCE_QUALIFIED_BAND');
assert.equal(exactFive.betaDomain.outerLimitSourceResolved, true);

// extrapolation and a wrong source hash stay closed
assert.ok(evaluateEmp1Wrc537InterpolatedDomain({ ...gateInput, gamma: 400, betaDomain: OWNER_BETA })
  .reasons.includes('EMP1_WRC537_GAMMA_INTERP_EXTRAPOLATION_BLOCKED'));
assert.ok(evaluateEmp1Wrc537InterpolatedDomain({ ...gateInput, sourceDocumentSha256: HASH, betaDomain: OWNER_BETA })
  .reasons.includes('EMP1_WRC537_INTERPOLATED_SOURCE_SHA'));

// --- the adapter drives a full non-tabulated evaluation -------------------------
const loadCustody = {
  schema: 'emp1-wrc537-upstream-load-custody/v1',
  status: 'PASS_COMPARISON_FIXTURE_ONLY',
  engineeringUseAuthorized: false,
  sourceId: 'INTERPOLATED-ADAPTER-CHECK',
  loadCaseId: 'LC-A',
  loadReference: 'WRC_ATTACHMENT_REFERENCE_POINT',
  pressureThrustDisposition: 'PRESSURE_THRUST_RESOLVED_UPSTREAM',
  sourceLoadCustodyHash: HASH,
  loadPackageSemanticHash: HASH,
  productionObservationUsedToSetAuthority: false,
  producerQualification: {
    producerId: 'CHECK-FIXTURE',
    authorityClass: 'WRC_REFERENCE_POINT_LOAD_PRODUCER',
    status: 'COMPARISON_FIXTURE_ONLY',
    qualificationRecordHash: HASH,
    productionObservationUsedToSetAuthority: false,
  },
  pressureThrust: {
    status: 'PASS_RESOLVED_UPSTREAM',
    mode: 'SOURCE_LOAD_EXCLUDES_THRUST_NOT_REQUIRED',
    doubleCountGuardQualified: true,
    sourceLoadContainsPressureThrust: false,
    policyRecordHash: HASH,
    productionObservationUsedToSetAuthority: false,
  },
};

const adapterInput = {
  loadCustody,
  units: 'SI_MM',
  shellFamily: 'CYLINDRICAL',
  attachmentShape: 'ROUND',
  variant: 'ORIGINAL',
  sourceDocumentSha256: SOURCE_SHA,
  datasetHash: EMP1_WRC537_CYLINDRICAL_DATASET_IDENTITY.datasetHash,
  betaDomain: OWNER_BETA,
  longitudinalMomentBendingSelection: { mode: 'AXIS_OF_SYMMETRY' },
  geometry: {
    // r0 from the WRC round-attachment relation beta = 0.875 * r0 / Rm
    meanRadius: 1068, shellThickness: 25, attachmentOutsideRadius: (0.2 * 1068) / 0.875,
    gamma: 42.72, beta: 0.2,
  },
  stressConcentration: { Kn: 1, Kb: 1 },
  axes: { vesselCenterlineGlobal: [0, 1, 0], nozzleCenterlineGlobal: [1, 0, 0] },
  loadsAtWrcReference: { forceGlobal: [-25000, 22000, 69000], momentGlobal: [-45e6, 78e6, 101e6] },
  applicabilityEvidence: {
    cylinderLength: 6000,
    nearestCylinderEndDistance: 3000,
    sourceReferences: {
      cylinderLength: 'CHECK-FIXTURE#cylinderLength',
      nearestCylinderEndDistance: 'CHECK-FIXTURE#nearestEndDistance',
    },
  },
};

const result = evaluateEmp1Wrc537CylindricalInterpolatedAdapter(adapterInput);
assert.equal(result.state, 'EVALUATED_INTERPOLATED_TABLE5_COMPARISON');
assert.equal(result.interpolationUsed, true);
assert.equal(result.sourceQualifiedGammaSelection, false);
assert.equal(result.wrcMethodFidelityClaim, false);
assert.equal(result.productionRouteAuthority, false);
assert.equal(result.globalEmp1CRouteAuthority, false);
assert.equal(result.codeComplianceAuthority, false);
assert.equal(result.releaseQualified, false);
assert.equal(result.stresses.stressIntensity.length, 8);
assert.ok(result.stresses.stressIntensity.every(Number.isFinite));
assert.equal(result.extremaScope.evaluatedEightPointEnvelope.globalAbsoluteMaximumClaim, false);
assert.equal(result.interpolationPlan.bracket.lowerGamma, 15);
assert.equal(result.interpolationPlan.bracket.upperGamma, 50);

// the adapter must refuse the same case without a beta declaration
assert.throws(
  () => evaluateEmp1Wrc537CylindricalInterpolatedAdapter({ ...adapterInput, betaDomain: undefined }),
  /OUTSIDE_INTERPOLATED_DOMAIN/,
);

// an exact tabulated row through the same adapter stays source-qualified
const exact = evaluateEmp1Wrc537CylindricalInterpolatedAdapter({
  ...adapterInput,
  geometry: { meanRadius: 100, shellThickness: 20, attachmentOutsideRadius: 17.714285714285715, gamma: 5, beta: 0.155 },
  betaDomain: undefined,
});
assert.equal(exact.state, 'EVALUATED_EXACT_ROW_TABLE5_COMPARISON');
assert.equal(exact.interpolationUsed, false);
assert.equal(exact.sourceQualifiedGammaSelection, true);
assert.equal(exact.negativeSourceOrdinates.length, 0, 'gamma=5 carries no negative source ordinate');

console.log(`  interpolated envelope ${result.extremaScope.evaluatedEightPointEnvelope.stressIntensity.toFixed(2)}`
  + ` at ${result.extremaScope.evaluatedEightPointEnvelope.location}`
  + `  (bracket ${result.interpolationPlan.bracket.lowerGamma}->${result.interpolationPlan.bracket.upperGamma},`
  + ` ${result.signChanges.length} sign change(s), ${result.negativeSourceOrdinates.length} negative ordinate(s))`);
console.log('EMP1_WRC537_INTERPOLATED_ADAPTER_CHECK_PASS');
