#!/usr/bin/env node

import assert from 'node:assert/strict';
import { semanticHash } from '../src/core/shared-piping-model/canonical-json.js';
import {
  createEmptyProjectDataProfile,
  replaceProjectDataValue,
} from '../src/workspace/project-data/project-data-contract.js';
import {
  createNonFeaProductDefaultProvider,
} from '../src/workspace/project-data/non-fea-product-default-profile.js';
import {
  bindAuthorizedEmpiricalSupportCapabilities,
  bindAuthorizedEmpiricalSupportCapabilityResult,
  resolveSupportCapability,
} from '../src/workspace/engineering-loads/authorized-empirical-support-capability-binding.js';
import {
  calculateSupportLoadDistribution,
} from '../src/workspace/engineering-loads/support-load-distribution-v3.js';

const supportModel = {
  schema: 'support-site-model/v1',
  sites: [
    site('S-UNKNOWN', 'UNKNOWN_KIND'),
    site('S-REST', 'REST'),
  ],
};

const product = createNonFeaProductDefaultProvider({
  profile: createEmptyProjectDataProfile(),
}).effectiveProfile;
const productBinding = bindAuthorizedEmpiricalSupportCapabilities({
  profile: product,
  supportSiteModel: supportModel,
});
const unknownProduct = row(productBinding, 'S-UNKNOWN');
assert.equal(unknownProduct.selector, 'DEFAULT');
assert.equal(unknownProduct.fallbackUsed, true);
assert.equal(unknownProduct.vertical, false,
  'Product DEFAULT must never invent vertical capacity for an unknown support kind');
assert.deepEqual(
  productBinding.profile.topology.supportTypeCapabilities.value.UNKNOWN_KIND,
  { vertical: false },
  'execution profile must expand governed Product DEFAULT for the active unknown kind',
);
assert.equal(product.topology.supportTypeCapabilities.value.UNKNOWN_KIND, undefined,
  'source effective profile must remain immutable');

const projectDefaultTrue = withSupportPolicy({
  DEFAULT: { vertical: true },
  REST: { vertical: false },
});
const projectBinding = bindAuthorizedEmpiricalSupportCapabilities({
  profile: projectDefaultTrue,
  supportSiteModel: supportModel,
});
const unknownProject = row(projectBinding, 'S-UNKNOWN');
const restProject = row(projectBinding, 'S-REST');
assert.equal(unknownProject.selector, 'DEFAULT');
assert.equal(unknownProject.resolutionAuthority, 'GOVERNED_DEFAULT_SUPPORT_KIND');
assert.equal(unknownProject.vertical, true,
  'explicit Project DEFAULT may grant screening vertical capability');
assert.equal(restProject.selector, 'REST');
assert.equal(restProject.fallbackUsed, false);
assert.equal(restProject.vertical, false,
  'exact support-kind rule must shadow DEFAULT');
assert.deepEqual(projectBinding.profile.topology.supportTypeCapabilities.value.UNKNOWN_KIND, { vertical: true });
assert.deepEqual(projectBinding.profile.topology.supportTypeCapabilities.value.REST, { vertical: false });
assert.notEqual(projectBinding.bindingSemanticHash, productBinding.bindingSemanticHash,
  'support policy change must change binding identity');

const noDefault = withSupportPolicy({ REST: { vertical: true } });
const noDefaultBinding = bindAuthorizedEmpiricalSupportCapabilities({
  profile: noDefault,
  supportSiteModel: supportModel,
});
const unresolved = row(noDefaultBinding, 'S-UNKNOWN');
assert.equal(unresolved.selector, null);
assert.equal(unresolved.resolutionAuthority, 'UNRESOLVED_NON_BEARING');
assert.equal(unresolved.vertical, false);
assert.equal(
  Object.hasOwn(noDefaultBinding.profile.topology.supportTypeCapabilities.value, 'UNKNOWN_KIND'),
  false,
  'missing exact and DEFAULT capability must not synthesize a bearing rule',
);

assert.deepEqual(resolveSupportCapability({ DEFAULT: { vertical: false } }, 'X'), {
  selector: 'DEFAULT',
  resolutionAuthority: 'GOVERNED_DEFAULT_SUPPORT_KIND',
  fallbackUsed: true,
  vertical: false,
  rule: { vertical: false },
});
assert.deepEqual(resolveSupportCapability({ DEFAULT: { vertical: true } }, ''), {
  selector: null,
  resolutionAuthority: 'UNRESOLVED_NON_BEARING',
  fallbackUsed: false,
  vertical: false,
  rule: null,
}, 'missing support identity must not consume DEFAULT because the kernel has no exact selector to expand');

const distribution = {
  schema: 'support-load-distribution/v3',
  method: 'CHAINAGE_TRIBUTARY_SPAN_V2',
  loadCases: [],
};
const boundResult = bindAuthorizedEmpiricalSupportCapabilityResult({
  distribution,
  binding: projectBinding,
});
assert.equal(boundResult.supportCapabilityAuthority.bindingSemanticHash, projectBinding.bindingSemanticHash);
assert.equal(boundResult.supportCapabilityAuthority.rows.length, 2);
assert.equal(boundResult.supportCapabilityAuthority.rows.find((item) => item.supportSiteId === 'S-UNKNOWN').fallbackUsed, true);
assert.equal(semanticHash(distribution), semanticHash({
  schema: 'support-load-distribution/v3',
  method: 'CHAINAGE_TRIBUTARY_SPAN_V2',
  loadCases: [],
}), 'source result fixture must remain unchanged');

assert.throws(
  () => resolveSupportCapability({ DEFAULT: { vertical: 'yes' } }, 'UNKNOWN_KIND'),
  (error) => error?.code === 'EMPIRICAL_SUPPORT_CAPABILITY_VERTICAL_INVALID',
);

const kernelFixture = kernelInputs();
const productKernelBinding = bindAuthorizedEmpiricalSupportCapabilities({
  profile: kernelFixture.productProfile,
  supportSiteModel: kernelFixture.supportSiteModel,
});
const productDistribution = calculateSupportLoadDistribution({
  ...kernelFixture.input,
  profile: productKernelBinding.profile,
});
const productCase = productDistribution.loadCases[0];
assert.equal(productCase.status, 'CALCULATED_WITH_EXCEPTIONS');
assert.equal(productCase.completenessAudit.allocatedForceN, 0,
  'Product non-bearing DEFAULT must leave the known pipe load unallocated');
assert(productCase.completenessAudit.unallocatedForceN > 0);

const projectBearingProfile = replaceProjectDataValue(
  kernelFixture.rawProfile,
  'topology.supportTypeCapabilities',
  { DEFAULT: { vertical: true } },
  { source: 'PROJECT_SCREENING_SUPPORT_POLICY', authority: 'PROJECT_POLICY' },
  true,
);
const projectBearingEffective = createNonFeaProductDefaultProvider({
  profile: projectBearingProfile,
}).effectiveProfile;
const projectKernelBinding = bindAuthorizedEmpiricalSupportCapabilities({
  profile: projectBearingEffective,
  supportSiteModel: kernelFixture.supportSiteModel,
});
const projectDistribution = calculateSupportLoadDistribution({
  ...kernelFixture.input,
  profile: projectKernelBinding.profile,
});
const projectCase = projectDistribution.loadCases[0];
assert.equal(projectCase.status, 'CALCULATED_WITH_EXCEPTIONS');
assert(projectCase.completenessAudit.allocatedForceN > 0,
  'Project DEFAULT.vertical=true must be consumed by the legacy statics kernel after binding');
assert.equal(projectCase.completenessAudit.unallocatedForceN, 0);
assert.equal(projectKernelBinding.rows[0].selector, 'DEFAULT');
assert.equal(projectKernelBinding.rows[0].vertical, true);

console.log(JSON.stringify({
  status: 'PASS',
  benchmark: 'ISSUE1321_SUPPORT_DEFAULT_CAPABILITY_BINDING',
  productUnknownVertical: unknownProduct.vertical,
  projectDefaultUnknownVertical: unknownProject.vertical,
  exactRestShadowsDefault: restProject.vertical === false,
  unresolvedWithoutDefaultIsNonBearing: unresolved.vertical === false,
  missingSupportIdentityDoesNotConsumeDefault: true,
  productKernelAllocatedForceN: productCase.completenessAudit.allocatedForceN,
  projectKernelAllocatedForceN: projectCase.completenessAudit.allocatedForceN,
  defaultExpansionConsumedByKernel: true,
  resultReceiptBound: true,
}, null, 2));

function withSupportPolicy(value) {
  let profile = createEmptyProjectDataProfile();
  profile = replaceProjectDataValue(
    profile,
    'topology.supportTypeCapabilities',
    value,
    { source: 'SUPPORT_POLICY_FIXTURE', authority: 'PROJECT_POLICY' },
    true,
  );
  return createNonFeaProductDefaultProvider({ profile }).effectiveProfile;
}

function kernelInputs() {
  let rawProfile = createEmptyProjectDataProfile();
  const sourceEvidence = { source: 'KERNEL_FIXTURE_SOURCE', authority: 'SOURCE_EXPLICIT' };
  const loadEvidence = { source: 'KERNEL_FIXTURE_LOAD_POLICY', authority: 'PROJECT_POLICY' };
  for (const [path, value] of [
    ['sourcesAndUnits.lineListSource', { sha256: '1'.repeat(64) }],
    ['sourcesAndUnits.pipingClassSource', { sha256: '2'.repeat(64) }],
    ['sourcesAndUnits.componentWeightSource', { sha256: '3'.repeat(64) }],
    ['loadCalculation.materialDensitiesKgPerM3', { MAT: 7850 }],
    ['loadCalculation.pipeSectionProperties', {
      L1: {
        outsideDiameterMm: 100,
        wallThicknessMm: 5,
        materialCode: 'MAT',
        insulationCode: 'NONE',
        insulationThicknessMm: 0,
      },
    }],
    ['loadCalculation.operatingFluidDensitiesKgPerM3', { L1: 800 }],
    ['loadCalculation.hydroFluidDensitiesKgPerM3', { L1: 1000 }],
    ['loadCalculation.insulationDensitiesKgPerM3', { NONE: 0 }],
    ['loadCalculation.componentWeightsKg', { DUMMY: 1 }],
    ['loadCalculation.activeLoadCases', ['EMPTY']],
  ]) {
    rawProfile = replaceProjectDataValue(
      rawProfile,
      path,
      value,
      path.startsWith('sourcesAndUnits.') ? sourceEvidence : loadEvidence,
      true,
    );
  }
  const productProfile = createNonFeaProductDefaultProvider({ profile: rawProfile }).effectiveProfile;
  const dataset = {
    datasetId: 'SUPPORT-DEFAULT-KERNEL-FIXTURE',
    version: 1,
    sourceSha256: '4'.repeat(64),
    entities: [{
      entityId: 'PIPE-1',
      entityType: 'PIPE',
      lineKey: 'L1',
      sourceEntityId: 'PIPE-SRC-1',
      jsonPointer: '/entities/0',
      componentReference: 'PIPE-1',
      properties: {},
    }],
  };
  const supportSiteModel = {
    schema: 'support-site-model/v1',
    sites: [siteAt('S-UNKNOWN-ONLY', 'UNKNOWN_KIND', 0)],
  };
  const routePartitionModel = {
    schema: 'route-partition-model/v1',
    routes: [{
      routeId: 'R1',
      status: 'READY',
      blockers: [],
      physicalEdgeIds: ['PIPE-1'],
      entityChainages: [{
        entityId: 'PIPE-1',
        startMm: 0,
        endMm: 1000,
        pointMm: 500,
        sourceStartChainageMm: 0,
        sourceEndChainageMm: 1000,
      }],
    }],
    edges: [{
      entityId: 'PIPE-1',
      entityType: 'PIPE',
      lengthMm: 1000,
      pointComponent: false,
      topologyCarrier: false,
      startMm: { x: 0, y: 0, z: 0 },
      endMm: { x: 1000, y: 0, z: 0 },
    }],
  };
  return {
    rawProfile,
    productProfile,
    supportSiteModel,
    input: {
      dataset,
      supportSiteModel,
      routePartitionModel,
      masterData: {},
    },
  };
}

function site(siteId, sourceType) {
  return siteAt(siteId, sourceType, 0);
}

function siteAt(siteId, sourceType, x) {
  return {
    siteId,
    tags: [siteId],
    positionMm: { x, y: 0, z: 0 },
    assemblies: [{ members: [{ sourceType }] }],
  };
}

function row(binding, supportSiteId) {
  const selected = binding.rows.find((item) => item.supportSiteId === supportSiteId);
  assert.ok(selected, `missing support capability binding row: ${supportSiteId}`);
  return selected;
}
