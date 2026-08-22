import { semanticHash } from '../../core/shared-piping-model/canonical-json.js';
import { freezeDeep, stringValue } from '../dataset-utils.js';
import {
  EMPIRICAL_COMPONENT_COG_CLASSIFICATION,
  auditEmpiricalComponentLoadAuthority,
} from './empirical-component-load-authority.js';
import { projectDataEntry, projectDataValue, validateProjectDataProfile } from '../project-data/project-data-contract.js';
import {
  createConfiguredDefaultUsageLedger,
} from '../project-data/non-fea-field-registry.js';
import {
  allocateSupportPointLoad,
  allocateSupportUniformLoad,
  evaluateSupportLoadAccounting,
} from './support-load-static-accounting.js';

export const SUPPORT_LOAD_DISTRIBUTION_SCHEMA = 'support-load-distribution/v3';
export const SUPPORT_LOAD_DISTRIBUTION_COG_SCHEMA = 'support-load-distribution/v4';
export const EMPIRICAL_LOAD_METHOD = 'CHAINAGE_TRIBUTARY_SPAN_V2';
export const EMPIRICAL_LOAD_COG_METHOD = 'CHAINAGE_TRIBUTARY_SPAN_V3_COG';

const FATAL_EXCLUSION_CODES = new Set([
  'INVALID_PIPE_SECTION',
  'INVALID_PIPE_INSIDE_DIAMETER',
  'MISSING_ROUTE_CHAINAGE',
  'EMPIRICAL_COMPONENT_LOAD_AUTHORITY_RECORD_MISSING',
  'EMPIRICAL_COMPONENT_LOAD_AUTHORITY_BLOCKED',
  'EMPIRICAL_COMPONENT_COG_CHAINAGE_INVALID',
  'EMPIRICAL_COMPONENT_COG_OFF_ROUTE',
  'EMPIRICAL_COMPONENT_COG_ROUTE_AMBIGUOUS',
  'EMPIRICAL_COMPONENT_COG_INVALID',
  'EMPIRICAL_COMPONENT_COG_UNIT_UNSUPPORTED',
  'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_INVALID',
  'EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_UNSUPPORTED',
  'EMPIRICAL_COMPONENT_ROUTE_MISSING',
  'EMPIRICAL_COMPONENT_ROUTE_AMBIGUOUS',
  'EMPIRICAL_COMPONENT_LOAD_IDENTITY_MISSING',
]);

const supportLoadPerformanceMetrics = {
  executionIndexBuilds: 0,
  entityIndexEntries: 0,
  edgeIndexEntries: 0,
  routeChainageIndexBuilds: 0,
  routeChainageIndexEntries: 0,
  supportProjectionBuilds: 0,
  baseMassArtifactBuilds: 0,
  baseMassComputations: 0,
  caseMassCompositions: 0,
  fluidMassComputations: 0,
  caseEvaluations: 0,
  routeCaseEvaluations: 0,
  contributorIndexWrites: 0,
};

export function getSupportLoadPerformanceMetrics() {
  return { ...supportLoadPerformanceMetrics };
}

export function resetSupportLoadPerformanceMetrics() {
  Object.keys(supportLoadPerformanceMetrics).forEach((key) => {
    supportLoadPerformanceMetrics[key] = 0;
  });
}

/**
 * Calculates vertical gravity reactions by route. Known loads are never
 * discarded merely because the route has fewer than two qualified vertical
 * supports: overhangs retain their force plus signed cantilever/member-transfer
 * moment, and zero-support loads remain explicit unallocated force/first moment.
 * Missing defaultable inputs remain visible exceptions. Invalid geometry,
 * unresolved application-point authority, and failed accounting remain fail-closed.
 */
export function calculateSupportLoadDistribution(input) {
  return calculateDistribution(input, {
    schema: SUPPORT_LOAD_DISTRIBUTION_SCHEMA,
    method: EMPIRICAL_LOAD_METHOD,
    componentLoadAuthorityAudit: null,
  });
}

/**
 * Separately versioned CoG-aware calculation seam. Only exact, qualified,
 * on-route component CoG chainage is consumed. Off-route/ambiguous CoG and
 * positive explicit moments remain fail-closed and are never converted into
 * vertical reactions.
 */
export function calculateSupportLoadDistributionWithComponentCog(input) {
  assertInput(input);
  const componentLoadAuthorityAudit = auditEmpiricalComponentLoadAuthority({
    dataset: input.dataset,
    profile: input.profile,
    routePartitionModel: input.routePartitionModel,
  });
  return calculateDistribution(input, {
    schema: SUPPORT_LOAD_DISTRIBUTION_COG_SCHEMA,
    method: EMPIRICAL_LOAD_COG_METHOD,
    componentLoadAuthorityAudit,
  });
}

function calculateDistribution(input, configuration) {
  assertInput(input);
  const activeHashes = masterHashes(input.masterData, input.dataset);
  const profileAudit = validateProjectDataProfile(input.profile, 'loads', activeHashes);
  const topologyAudit = validateProjectDataProfile(input.profile, 'topology', activeHashes);
  const globalBlockers = [...profileAudit.errors, ...topologyAudit.errors];
  const caseIds = projectDataValue(input.profile, 'loadCalculation.activeLoadCases') || [];
  const componentAuthorityById = new Map(
    (configuration.componentLoadAuthorityAudit?.records || [])
      .map((record) => [record.entityId, record]),
  );
  const execution = {
    ...configuration,
    componentAuthorityById,
    ...buildExecutionIndex(input, globalBlockers, caseIds.length > 0),
  };
  const cases = caseIds.map((caseId) => calculateCase(
    String(caseId),
    input,
    globalBlockers,
    execution,
  ));
  const sourceHash = input.dataset.sourceSha256 || null;
  const configuredDefaultUsageLedger = buildConfiguredDefaultUsageLedger(input.profile, cases);
  const base = {
    schema: configuration.schema,
    method: configuration.method,
    datasetId: input.dataset.datasetId,
    datasetVersion: input.dataset.version || null,
    hashes: {
      dataset: sourceHash,
      masters: activeHashes,
      projectDataProfile: semanticHash(input.profile),
      supportSiteModel: semanticHash(input.supportSiteModel),
      routePartitionModel: semanticHash(input.routePartitionModel),
    },
    sourceAxisBasis: 'Z_UP',
    verticalForceConvention: 'positive reaction opposes source-axis gravity',
    status: aggregateDistributionStatus(cases),
    loadCases: cases,
    configuredDefaultUsageLedger,
    freshness: {
      status: 'CURRENT',
      datasetId: input.dataset.datasetId,
      datasetVersion: input.dataset.version || null,
    },
  };
  if (!configuration.componentLoadAuthorityAudit) return freezeDeep(base);
  return freezeDeep({
    ...base,
    baseMethod: EMPIRICAL_LOAD_METHOD,
    componentLoadAuthority: {
      schema: configuration.componentLoadAuthorityAudit.schema,
      status: configuration.componentLoadAuthorityAudit.status,
      semanticHash: configuration.componentLoadAuthorityAudit.semanticHash,
      summary: configuration.componentLoadAuthorityAudit.summary,
    },
  });
}

/**
 * Builds only case-independent discovery structures. Route support projection is
 * intentionally skipped when global Project Data blocks execution and for routes
 * that are not READY, matching the old evaluation boundary exactly. Mass terms
 * that do not vary by EMPTY/OPE/HYD are resolved once on the same executable
 * entity/edge/chainage boundary and retained only in this execution context.
 */
function buildExecutionIndex(input, globalBlockers, hasActiveCases) {
  supportLoadPerformanceMetrics.executionIndexBuilds += 1;

  const entityById = new Map(input.dataset.entities.map((entity) => [entity.entityId, entity]));
  supportLoadPerformanceMetrics.entityIndexEntries += input.dataset.entities.length;

  const edgeById = new Map(input.routePartitionModel.edges.map((edge) => [edge.entityId, edge]));
  supportLoadPerformanceMetrics.edgeIndexEntries += input.routePartitionModel.edges.length;

  const routeById = new Map();
  const baseMassByEntityId = new Map();
  if (globalBlockers.length === 0 && hasActiveCases) {
    supportLoadPerformanceMetrics.baseMassArtifactBuilds += 1;
  }

  input.routePartitionModel.routes.forEach((route) => {
    const chainageByEntityId = new Map(
      route.entityChainages.map((row) => [row.entityId, row]),
    );
    supportLoadPerformanceMetrics.routeChainageIndexBuilds += 1;
    supportLoadPerformanceMetrics.routeChainageIndexEntries += route.entityChainages.length;

    let supports = null;
    if (globalBlockers.length === 0 && route.status === 'READY') {
      supports = routeSupports(
        route,
        input.supportSiteModel,
        edgeById,
        input.profile,
      );
      supportLoadPerformanceMetrics.supportProjectionBuilds += 1;

      if (hasActiveCases) {
        route.physicalEdgeIds.forEach((entityId) => {
          const entity = entityById.get(entityId);
          const edge = edgeById.get(entityId);
          const chainage = chainageByEntityId.get(entityId);
          if (!entity || !edge || !chainage || !Number.isFinite(chainage.pointMm)) return;
          if (baseMassByEntityId.has(entityId)) return;
          baseMassByEntityId.set(
            entityId,
            resolveBaseMass(entity, edge, input.profile),
          );
          supportLoadPerformanceMetrics.baseMassComputations += 1;
        });
      }
    }

    routeById.set(route.routeId, {
      chainageByEntityId,
      supports,
    });
  });

  return {
    entityById,
    edgeById,
    routeById,
    baseMassByEntityId,
  };
}

function calculateCase(caseId, input, globalBlockers, execution) {
  supportLoadPerformanceMetrics.caseEvaluations += 1;
  const state = createCaseState(caseId, globalBlockers);
  if (globalBlockers.length === 0) {
    input.routePartitionModel.routes.forEach((route) => calculateRoute(
      route,
      input,
      state,
      execution,
    ));
  }
  const equilibrium = globalBlockers.length
    ? blockedEquilibrium()
    : equilibriumCheck(state, input.profile);
  if (globalBlockers.length === 0 && !equilibrium.passed) {
    state.blockers.push(...equilibrium.blockers);
  }
  const status = caseStatus(state);
  return freezeDeep({
    loadCaseId: caseId,
    status,
    verticalForceUnit: 'N',
    supportResults: supportResults(input.supportSiteModel, state, status),
    contributionLedger: state.ledger,
    exceptionLedger: dedupeRows(state.exceptions),
    excludedInputs: state.excludedInputs,
    blockers: dedupeRows(state.blockers),
    equilibrium,
    completenessAudit: completenessAudit(state, status),
  });
}

function calculateRoute(route, input, state, execution) {
  supportLoadPerformanceMetrics.routeCaseEvaluations += 1;
  if (route.status !== 'READY') {
    state.blockers.push(...route.blockers.map((row) => ({
      ...row,
      routeId: route.routeId,
    })));
    return;
  }
  const routeExecution = execution.routeById.get(route.routeId);
  if (!routeExecution) {
    throw new Error(`Missing support-load execution index for route ${route.routeId}.`);
  }
  const supports = routeExecution.supports;
  if (!Array.isArray(supports)) {
    throw new Error(`Missing qualified support projection for READY route ${route.routeId}.`);
  }
  route.physicalEdgeIds.forEach((entityId) => {
    const entity = execution.entityById.get(entityId);
    const edge = execution.edgeById.get(entityId);
    const chainage = routeExecution.chainageByEntityId.get(entityId);
    if (!entity || !edge || !chainage || !Number.isFinite(chainage.pointMm)) {
      state.excludedInputs.push({
        code: 'MISSING_ROUTE_CHAINAGE',
        routeId: route.routeId,
        entityId,
      });
      return;
    }
    if (!execution.baseMassByEntityId.has(entityId)) {
      throw new Error(`Missing case-independent mass artifact for entity ${entityId}.`);
    }
    const baseMass = execution.baseMassByEntityId.get(entityId);
    const mass = resolveCaseMass(baseMass, entity, state.caseId, input.profile);
    const application = resolveApplicationPoint(
      entity,
      chainage,
      execution,
    );
    if (!mass.qualified) {
      state.excludedInputs.push({
        ...mass.exclusion,
        routeId: route.routeId,
        entityId,
      });
    }
    if (!application.qualified) {
      state.excludedInputs.push(...application.exclusions.map((exclusion) => ({
        ...exclusion,
        routeId: route.routeId,
        entityId,
      })));
    }
    if (!mass.qualified || !application.qualified) return;

    const forceN = mass.massKg
      * projectDataValue(input.profile, 'loadCalculation.gravityMPerS2')
      * projectDataValue(input.profile, 'loadCalculation.loadFactor');
    const accounting = edge.entityType === 'PIPE' && edge.lengthMm > 0
      ? allocateSupportUniformLoad({
        startMm: chainage.startMm,
        endMm: chainage.endMm,
        forceN,
        supports,
      })
      : allocateSupportPointLoad({
        chainageMm: application.chainageMm,
        forceN,
        supports,
      });
    recordContribution(
      state,
      route,
      entity,
      chainage,
      application,
      mass,
      forceN,
      accounting,
    );
  });
}

function resolveApplicationPoint(entity, chainage, execution) {
  if (!execution.componentLoadAuthorityAudit || entity.entityType === 'PIPE') {
    return {
      qualified: true,
      chainageMm: chainage.pointMm,
      authority: null,
    };
  }
  const record = execution.componentAuthorityById.get(entity.entityId);
  if (!record) {
    return {
      qualified: false,
      exclusions: [{ code: 'EMPIRICAL_COMPONENT_LOAD_AUTHORITY_RECORD_MISSING' }],
    };
  }
  if (!record.integrationEligible) {
    return {
      qualified: false,
      exclusions: record.blockers.length
        ? record.blockers
        : [{ code: 'EMPIRICAL_COMPONENT_LOAD_AUTHORITY_BLOCKED' }],
    };
  }
  if (!Number.isFinite(record.candidateChainageMm)) {
    return {
      qualified: false,
      exclusions: [{ code: 'EMPIRICAL_COMPONENT_COG_CHAINAGE_INVALID' }],
    };
  }
  return {
    qualified: true,
    chainageMm: record.candidateChainageMm,
    authority: {
      auditSemanticHash: execution.componentLoadAuthorityAudit.semanticHash,
      classification: record.cogClassification,
      currentMethodPointChainageMm: record.currentMethodPointChainageMm,
      candidateChainageMm: record.candidateChainageMm,
      disposition: record.integrationDisposition,
      sourcePath: record.cogEvidence?.sourcePath ?? null,
      sourceUnit: record.cogEvidence?.sourceUnit ?? null,
    },
  };
}

/**
 * Resolve mass terms that cannot vary by EMPTY/OPE/HYD. This artifact is
 * execution-local and is not part of engineering output or semantic hash input.
 */
function resolveBaseMass(entity, edge, profile) {
  if (entity.entityType !== 'PIPE') return componentMass(entity, profile);
  const sections = projectDataValue(profile, 'loadCalculation.pipeSectionProperties') || {};
  const section = sections[entity.lineKey];
  if (!section) return excluded('MISSING_PIPE_SECTION', 'loadCalculation.pipeSectionProperties');
  const materialDensities = projectDataValue(
    profile,
    'loadCalculation.materialDensitiesKgPerM3',
  ) || {};
  const materialDensity = materialDensities[section.materialCode];
  if (!positive(materialDensity)) {
    return excluded('MISSING_MATERIAL_DENSITY', 'loadCalculation.materialDensitiesKgPerM3');
  }
  if (!positive(section.outsideDiameterMm) || !positive(section.wallThicknessMm)) {
    return excluded('INVALID_PIPE_SECTION', 'loadCalculation.pipeSectionProperties');
  }
  const insideDiameterMm = section.outsideDiameterMm - (2 * section.wallThicknessMm);
  if (!positive(insideDiameterMm)) {
    return excluded('INVALID_PIPE_INSIDE_DIAMETER', 'loadCalculation.pipeSectionProperties');
  }
  const lengthM = edge.lengthMm / 1000;
  const metalKg = annulusAreaM2(
    section.outsideDiameterMm,
    insideDiameterMm,
  ) * lengthM * materialDensity;
  const insulation = insulationMass(section, lengthM, profile);
  if (!insulation.qualified) return insulation;
  return {
    qualified: true,
    baseMassKg: metalKg + insulation.massKg,
    section,
    insideDiameterMm,
    lengthM,
    formula: {
      metalKg,
      insulationKg: insulation.massKg,
      lengthM,
      outsideDiameterMm: section.outsideDiameterMm,
      insideDiameterMm,
      projectDataSources: [
        sourceRef(profile, 'loadCalculation.pipeSectionProperties'),
        sourceRef(profile, 'loadCalculation.materialDensitiesKgPerM3'),
        insulation.source,
      ].filter(Boolean),
    },
  };
}

/** Compose only the case-dependent fluid term with the invariant mass artifact. */
function resolveCaseMass(baseMass, entity, caseId, profile) {
  supportLoadPerformanceMetrics.caseMassCompositions += 1;
  if (!baseMass.qualified || entity.entityType !== 'PIPE') return baseMass;
  supportLoadPerformanceMetrics.fluidMassComputations += 1;
  const fluid = fluidMass(
    caseId,
    baseMass.section,
    entity,
    baseMass.insideDiameterMm,
    baseMass.lengthM,
    profile,
  );
  if (!fluid.qualified) return fluid;
  return {
    qualified: true,
    massKg: baseMass.baseMassKg + fluid.massKg,
    formula: {
      metalKg: baseMass.formula.metalKg,
      insulationKg: baseMass.formula.insulationKg,
      fluidKg: fluid.massKg,
      lengthM: baseMass.formula.lengthM,
      outsideDiameterMm: baseMass.formula.outsideDiameterMm,
      insideDiameterMm: baseMass.formula.insideDiameterMm,
      projectDataSources: [
        ...baseMass.formula.projectDataSources,
        fluid.source,
      ].filter(Boolean),
    },
  };
}

function insulationMass(section, lengthM, profile) {
  const thickness = section.insulationThicknessMm;
  if (thickness === 0) {
    return {
      qualified: true,
      massKg: 0,
      source: sourceRef(profile, 'loadCalculation.pipeSectionProperties'),
    };
  }
  if (!positive(thickness)) {
    return excluded('MISSING_INSULATION_THICKNESS', 'loadCalculation.pipeSectionProperties');
  }
  const densities = projectDataValue(
    profile,
    'loadCalculation.insulationDensitiesKgPerM3',
  ) || {};
  const densityResolution = resolveProjectDataDensity(densities, section.insulationCode);
  if (!densityResolution) {
    return excluded('MISSING_INSULATION_DENSITY', 'loadCalculation.insulationDensitiesKgPerM3');
  }
  return {
    qualified: true,
    massKg: annulusAreaM2(
      section.outsideDiameterMm + (2 * thickness),
      section.outsideDiameterMm,
    ) * lengthM * densityResolution.densityKgPerM3,
    source: resolvedDensitySourceRef(
      profile,
      'loadCalculation.insulationDensitiesKgPerM3',
      densityResolution,
    ),
  };
}

function fluidMass(caseId, section, entity, insideDiameterMm, lengthM, profile) {
  if (caseId === 'EMPTY') return { qualified: true, massKg: 0, source: null };
  const path = caseId === 'OPE'
    ? 'loadCalculation.operatingFluidDensitiesKgPerM3'
    : 'loadCalculation.hydroFluidDensitiesKgPerM3';
  const densities = projectDataValue(profile, path) || {};
  const densityResolution = resolveProjectDataDensity(densities, entity.lineKey);
  if (!densityResolution) return excluded('MISSING_FLUID_DENSITY', path);
  return {
    qualified: true,
    massKg: Math.PI * insideDiameterMm ** 2 / 4e6
      * lengthM * densityResolution.densityKgPerM3,
    source: resolvedDensitySourceRef(profile, path, densityResolution),
  };
}

function componentMass(entity, profile) {
  const weights = projectDataValue(profile, 'loadCalculation.componentWeightsKg') || {};
  const attributes = entity.properties?.attributes || {};
  const key = stringValue(attributes.CATALOG_KEY) || stringValue(entity.sourceEntityId);
  const qualifiedWeight = typeof weights[key] === 'object'
    ? weights[key]?.massKg
    : weights[key];
  if (!key || !positive(qualifiedWeight)) {
    return excluded('MISSING_COMPONENT_MASS', 'loadCalculation.componentWeightsKg');
  }
  const value = typeof weights[key] === 'object'
    ? weights[key].massKg
    : weights[key];
  return {
    qualified: true,
    massKg: Number(value),
    formula: {
      catalogKey: key,
      massKg: Number(value),
      projectDataSources: [
        sourceRef(profile, 'loadCalculation.componentWeightsKg'),
      ],
    },
  };
}

function routeSupports(route, supportModel, edgeById, profile) {
  const tolerance = projectDataValue(profile, 'topology.portMatchToleranceMm');
  const capabilities = projectDataValue(profile, 'topology.supportTypeCapabilities') || {};
  return supportModel.sites.flatMap((site) => {
    const vertical = site.assemblies.some((assembly) => (
      assembly.members.some((member) => capabilities[member.sourceType]?.vertical === true)
    ));
    if (!vertical) return [];
    const chainageMm = projectPointToRoute(
      site.positionMm,
      route,
      edgeById,
      tolerance,
    );
    if (!Number.isFinite(chainageMm)) return [];
    return [{ siteId: site.siteId, chainageMm }];
  }).sort((left, right) => left.chainageMm - right.chainageMm);
}

function projectPointToRoute(point, route, edgeById, tolerance) {
  for (const row of route.entityChainages) {
    const edge = edgeById.get(row.entityId);
    if (!edge || edge.pointComponent || edge.topologyCarrier || edge.lengthMm <= 0) continue;
    const projection = projectToSegment(point, edge.startMm, edge.endMm);
    if (projection.distanceMm > tolerance) continue;
    return row.sourceStartChainageMm
      + projection.ratio * (row.sourceEndChainageMm - row.sourceStartChainageMm);
  }
  return null;
}

function recordContribution(
  state,
  route,
  entity,
  routeChainage,
  application,
  mass,
  forceN,
  accounting,
) {
  const contributionId = `${state.caseId}:${entity.entityId}`;
  const allocations = accounting.allocations || [];
  const boundaryTransfers = accounting.boundaryTransfers || [];
  const unallocated = accounting.unallocated || [];
  const contributorSites = new Set();
  allocations.forEach((allocation) => {
    state.reactions.set(
      allocation.siteId,
      (state.reactions.get(allocation.siteId) ?? 0) + allocation.verticalForceN,
    );
    if (!contributorSites.has(allocation.siteId)) {
      contributorSites.add(allocation.siteId);
      const contributors = state.contributorsBySite.get(allocation.siteId) || [];
      contributors.push(contributionId);
      state.contributorsBySite.set(allocation.siteId, contributors);
      supportLoadPerformanceMetrics.contributorIndexWrites += 1;
    }
  });

  boundaryTransfers.forEach((transfer) => {
    state.boundaryMomentBySite.set(
      transfer.supportSiteId,
      (state.boundaryMomentBySite.get(transfer.supportSiteId) ?? 0) + transfer.momentDemandNmm,
    );
    state.exceptions.push({
      code: 'OVERHANG_CANTILEVER_TRANSFER',
      routeId: route.routeId,
      entityId: entity.entityId,
      supportSiteId: transfer.supportSiteId,
      verticalForceN: transfer.verticalForceN,
      eccentricityMm: transfer.eccentricityMm,
      momentDemandNmm: transfer.momentDemandNmm,
    });
  });
  unallocated.forEach((row) => state.exceptions.push({
    code: 'UNALLOCATED_FORCE_NO_QUALIFIED_VERTICAL_SUPPORT',
    routeId: route.routeId,
    entityId: entity.entityId,
    verticalForceN: row.verticalForceN,
    applicationChainageMm: row.applicationChainageMm,
    firstMomentNmm: row.firstMomentNmm,
  }));

  const allocatedForceN = sum(allocations.map((row) => row.verticalForceN));
  const unallocatedForceN = sum(unallocated.map((row) => row.verticalForceN));
  state.evaluatedMassKg += mass.massKg;
  state.evaluatedForceN += forceN;
  state.evaluatedMomentNmm += forceN * application.chainageMm;
  state.reactionMomentNmm += sum(allocations.map((allocation) => (
    allocation.verticalForceN * allocation.chainageMm
  )));
  state.boundaryTransferMomentNmm += sum(boundaryTransfers.map((row) => row.momentDemandNmm));
  state.unallocatedForceN += unallocatedForceN;
  state.unallocatedMomentNmm += sum(unallocated.map((row) => row.firstMomentNmm));
  if (forceN !== 0) {
    state.allocatedMassKg += mass.massKg * allocatedForceN / forceN;
    state.unallocatedMassKg += mass.massKg * unallocatedForceN / forceN;
  }

  const formula = application.authority
    ? { ...mass.formula, applicationPointAuthority: application.authority }
    : mass.formula;
  const contribution = {
    contributionId,
    routeId: route.routeId,
    entityId: entity.entityId,
    source: {
      sourceEntityId: entity.sourceEntityId,
      jsonPointer: entity.jsonPointer,
      componentReference: entity.componentReference,
      masterRow: entity.properties?.editProvenance?.catalogRow || null,
    },
    massKg: mass.massKg,
    verticalForceN: forceN,
    chainageMm: application.chainageMm,
    formula,
    accountingDisposition: accounting.disposition,
    allocations,
    boundaryTransfers,
    unallocated,
  };
  if (application.authority) {
    contribution.currentMethodPointChainageMm = routeChainage.pointMm;
  }
  state.ledger.push(contribution);
}

function supportResults(model, state, caseStatusValue) {
  const publishable = caseStatusValue !== 'FAILED';
  return model.sites.map((site) => {
    const contributorIds = [...(state.contributorsBySite.get(site.siteId) || [])];
    const reaction = state.reactions.get(site.siteId) ?? 0;
    const cantileverMomentDemandNmm = state.boundaryMomentBySite.get(site.siteId) ?? 0;
    return {
      supportSiteId: site.siteId,
      tags: site.tags,
      sourceAxisBasis: 'Z_UP',
      status: publishable ? caseStatusValue : 'FAILED',
      verticalForceN: publishable ? reaction : null,
      qualifiedReactionCandidateN: publishable || contributorIds.length > 0 ? reaction : null,
      cantileverMomentDemandNmm: publishable ? cantileverMomentDemandNmm : null,
      contributorIds,
    };
  });
}

function equilibriumCheck(state, profile) {
  const tolerance = projectDataValue(
    profile,
    'loadCalculation.equilibriumTolerances',
  ) || {};
  const forceLimit = tolerance.forceN;
  const momentLimit = tolerance.momentNmm;
  if (!positiveOrZero(forceLimit) || !positiveOrZero(momentLimit)) {
    return {
      status: 'FAILED',
      passed: false,
      appliedForceN: state.evaluatedForceN,
      evaluatedForceN: state.evaluatedForceN,
      reactionN: sum([...state.reactions.values()]),
      unallocatedForceN: state.unallocatedForceN,
      forceResidualN: null,
      appliedMomentNmm: state.evaluatedMomentNmm,
      evaluatedMomentNmm: state.evaluatedMomentNmm,
      reactionMomentNmm: state.reactionMomentNmm,
      boundaryTransferMomentNmm: state.boundaryTransferMomentNmm,
      unallocatedMomentNmm: state.unallocatedMomentNmm,
      accountedMomentNmm: null,
      momentResidualNmm: null,
      blockers: [{
        code: 'MISSING_EQUILIBRIUM_TOLERANCE',
        projectDataPath: 'loadCalculation.equilibriumTolerances',
      }],
    };
  }
  const closure = evaluateSupportLoadAccounting({
    evaluatedForceN: state.evaluatedForceN,
    evaluatedMomentNmm: state.evaluatedMomentNmm,
    reactionForceN: sum([...state.reactions.values()]),
    reactionMomentNmm: state.reactionMomentNmm,
    boundaryTransferMomentNmm: state.boundaryTransferMomentNmm,
    unallocatedForceN: state.unallocatedForceN,
    unallocatedMomentNmm: state.unallocatedMomentNmm,
    forceToleranceN: forceLimit,
    momentToleranceNmm: momentLimit,
  });
  const blockers = closure.passed ? [] : [{
    code: 'EQUILIBRIUM_CHECK_FAILED',
    forceResidualN: closure.forceResidualN,
    momentResidualNmm: closure.momentResidualNmm,
  }];
  return {
    status: closure.status,
    passed: closure.passed,
    appliedForceN: closure.evaluatedForceN,
    evaluatedForceN: closure.evaluatedForceN,
    reactionN: closure.reactionForceN,
    unallocatedForceN: closure.unallocatedForceN,
    forceResidualN: closure.forceResidualN,
    appliedMomentNmm: closure.evaluatedMomentNmm,
    evaluatedMomentNmm: closure.evaluatedMomentNmm,
    reactionMomentNmm: closure.reactionMomentNmm,
    boundaryTransferMomentNmm: closure.boundaryTransferMomentNmm,
    unallocatedMomentNmm: closure.unallocatedMomentNmm,
    accountedMomentNmm: closure.accountedMomentNmm,
    momentResidualNmm: closure.momentResidualNmm,
    blockers,
  };
}

function blockedEquilibrium() {
  return {
    status: 'NOT_RUN_PROJECT_DATA_BLOCKED',
    passed: false,
    appliedForceN: null,
    evaluatedForceN: null,
    reactionN: null,
    unallocatedForceN: null,
    forceResidualN: null,
    appliedMomentNmm: null,
    evaluatedMomentNmm: null,
    reactionMomentNmm: null,
    boundaryTransferMomentNmm: null,
    unallocatedMomentNmm: null,
    accountedMomentNmm: null,
    momentResidualNmm: null,
    blockers: [],
  };
}

function completenessAudit(state, status) {
  const allocatedForceN = sum([...state.reactions.values()]);
  const coverageRatio = state.evaluatedForceN > 0
    ? allocatedForceN / state.evaluatedForceN
    : (state.excludedInputs.length > 0 ? 0 : 1);
  return {
    status: status === 'FAILED'
      ? 'FAILED'
      : status === 'CALCULATED_WITH_EXCEPTIONS'
        ? 'COMPLETE_WITH_EXCEPTIONS'
        : 'COMPLETE',
    coverageBasis: 'EVALUATED_KNOWN_FORCE_ONLY',
    evaluatedMassKg: state.evaluatedMassKg,
    allocatedMassKg: state.allocatedMassKg,
    unallocatedMassKg: state.unallocatedMassKg,
    blockedInvalidMassKg: state.excludedInputs.length > 0 ? null : 0,
    evaluatedForceN: state.evaluatedForceN,
    allocatedForceN,
    unallocatedForceN: state.unallocatedForceN,
    invalidForceN: state.excludedInputs.length > 0 ? null : 0,
    coverageRatio,
    boundaryTransferMomentNmm: state.boundaryTransferMomentNmm,
    unallocatedFirstMomentNmm: state.unallocatedMomentNmm,
    evaluatedContributionCount: state.ledger.length,
    allocatedContributionCount: state.ledger.filter((row) => row.allocations.length > 0).length,
    unallocatedContributionCount: state.ledger.filter((row) => row.unallocated.length > 0).length,
    excludedContributionCount: state.excludedInputs.length,
    exceptionCount: state.exceptions.length,
    qualifiedAppliedForceN: state.ledger.length ? state.evaluatedForceN : null,
    qualifiedReactionCandidateN: state.ledger.length ? allocatedForceN : null,
    qualifiedContributionCount: state.ledger.length,
  };
}

function caseStatus(state) {
  if (state.blockers.length > 0 || state.excludedInputs.some(isFatalExclusion)) return 'FAILED';
  if (state.excludedInputs.length > 0 || state.exceptions.length > 0) {
    return 'CALCULATED_WITH_EXCEPTIONS';
  }
  return 'CALCULATED';
}

function isFatalExclusion(row) {
  const code = stringValue(row?.code);
  return FATAL_EXCLUSION_CODES.has(code)
    || code.startsWith('EMPIRICAL_COMPONENT_COG_')
    || code.startsWith('EMPIRICAL_COMPONENT_EXPLICIT_MOMENT_');
}

function aggregateDistributionStatus(cases) {
  if (cases.length === 0 || cases.some((row) => row.status === 'FAILED')) return 'FAILED';
  if (cases.some((row) => row.status === 'CALCULATED_WITH_EXCEPTIONS')) {
    return 'CALCULATED_WITH_EXCEPTIONS';
  }
  return 'CALCULATED';
}

function sourceRef(profile, path) {
  const entry = projectDataEntry(profile, path);
  return entry ? { projectDataPath: path, evidence: entry.evidence } : null;
}

/** Resolve an exact scoped density first, then an explicit Project Data DEFAULT fallback. */
export function resolveProjectDataDensity(densities, exactSelector) {
  const exactDensity = densityValue(densities[exactSelector]);
  if (positive(exactDensity)) {
    return {
      densityKgPerM3: Number(exactDensity),
      selector: exactSelector,
      authority: 'EXACT_SCOPED_VALUE',
      fallbackUsed: false,
    };
  }
  const fallbackDensity = densityValue(densities.DEFAULT);
  if (!positive(fallbackDensity)) return null;
  return {
    densityKgPerM3: Number(fallbackDensity),
    selector: 'DEFAULT',
    authority: 'PROJECT_CONFIGURED_DEFAULT',
    fallbackUsed: true,
  };
}

function densityValue(value) {
  return typeof value === 'number' ? value : value?.selected;
}

/** Attach selector and fallback authority to each calculated contribution for later audit. */
function resolvedDensitySourceRef(profile, path, resolution) {
  const source = sourceRef(profile, path);
  return source ? {
    ...source,
    selector: resolution.selector,
    resolutionAuthority: resolution.authority,
    fallbackUsed: resolution.fallbackUsed,
    densityKgPerM3: resolution.densityKgPerM3,
  } : null;
}

/** Convert per-contribution fallback provenance into the governed reporting ledger. */
function buildConfiguredDefaultUsageLedger(profile, cases) {
  const policy = projectDataValue(profile, 'qualificationPolicy.configuredDefaults');
  const defaultByFieldId = new Map((policy?.defaults || []).map((row) => [row.fieldId, row]));
  const usageRows = cases.flatMap((loadCase) => (
    (loadCase.contributionLedger || []).flatMap((contribution) => (
      (contribution.formula?.projectDataSources || [])
        .filter((source) => source.fallbackUsed === true)
        .map((source) => {
          const fieldId = configuredDefaultFieldId(source.projectDataPath);
          const configured = defaultByFieldId.get(fieldId);
          return {
            defaultId: configured?.defaultId || '',
            fieldId,
            methodId: 'WEIGHT_AND_GRAVITY',
            targetId: `${loadCase.loadCaseId}:${contribution.entityId}:${fieldId}`,
            reason: `No positive exact scoped value for ${source.projectDataPath}; approved DEFAULT selector used by ${EMPIRICAL_LOAD_METHOD}.`,
          };
        })
    ))
  ));
  return createConfiguredDefaultUsageLedger(profile, usageRows);
}

function configuredDefaultFieldId(projectDataPath) {
  const fieldIds = {
    'loadCalculation.hydroFluidDensitiesKgPerM3': 'HYDRO_FLUID_DENSITY',
    'loadCalculation.insulationDensitiesKgPerM3': 'INSULATION_DENSITY',
  };
  const fieldId = fieldIds[projectDataPath];
  if (!fieldId) throw new RangeError(`Unsupported configured-default path: ${projectDataPath}.`);
  return fieldId;
}

function createCaseState(caseId, blockers) {
  return {
    caseId,
    blockers: [...blockers],
    excludedInputs: [],
    exceptions: [],
    ledger: [],
    reactions: new Map(),
    contributorsBySite: new Map(),
    boundaryMomentBySite: new Map(),
    evaluatedMassKg: 0,
    allocatedMassKg: 0,
    unallocatedMassKg: 0,
    evaluatedForceN: 0,
    evaluatedMomentNmm: 0,
    reactionMomentNmm: 0,
    boundaryTransferMomentNmm: 0,
    unallocatedForceN: 0,
    unallocatedMomentNmm: 0,
  };
}

function excluded(code, projectDataPath) {
  return {
    qualified: false,
    exclusion: { code, projectDataPath },
  };
}

function annulusAreaM2(outerMm, innerMm) {
  return Math.PI * (outerMm ** 2 - innerMm ** 2) / 4e6;
}

function projectToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const length2 = dx ** 2 + dy ** 2 + dz ** 2;
  const ratio = length2 === 0
    ? 0
    : Math.max(0, Math.min(1, (
      (point.x - start.x) * dx
        + (point.y - start.y) * dy
        + (point.z - start.z) * dz
    ) / length2));
  const projected = {
    x: start.x + ratio * dx,
    y: start.y + ratio * dy,
    z: start.z + ratio * dz,
  };
  return {
    ratio,
    distanceMm: Math.hypot(
      point.x - projected.x,
      point.y - projected.y,
      point.z - projected.z,
    ),
  };
}

function masterHashes(masterData, dataset) {
  return {
    dataset: dataset.sourceSha256 || '',
    lineList: masterData?.lineList?.sourceHash || '',
    pipingClass: masterData?.pipingClass?.sourceHash || '',
    componentWeight: masterData?.weight?.sourceHash || '',
  };
}

function dedupeRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function positive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function positiveOrZero(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function assertInput(input) {
  if (!input?.dataset || !input.profile || !input.supportSiteModel
    || !input.routePartitionModel) {
    throw new TypeError(
      'Support load distribution requires dataset, profile, support-site model, and route-partition model.',
    );
  }
}
