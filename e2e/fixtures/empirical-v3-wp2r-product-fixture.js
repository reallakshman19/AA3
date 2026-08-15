import { semanticHash } from '../../src/core/empirical-piping-mechanics/identity.js';
import {
  EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
  bindComponentToBranch,
  createEngineeringConfirmationReceipt,
  projectEmpiricalV3Workflow,
  sealEmpiricalV3BranchAuthority,
  sealEmpiricalV3CalculationAuthorization,
  sealEmpiricalV3CoupledCalculationEvidence,
  sealEmpiricalV3SafetyPresentationPackage,
  sealEngineeringRiskFinding,
  sealEngineeringRiskSet,
  ENGINEERING_RISK_FINDING_SCHEMA,
} from '../../src/core/empirical-v3-safety/index.js';

export const WP2R_FIXTURE_RUN_ID = 'RUN:WP2R:PRODUCT:001';
export const WP2R_FIXTURE_POLICY_ID = 'EMPIRICAL_V3_WP2R_PRODUCT_POLICY';
export const WP2R_FIXTURE_POLICY_VERSION = '1';

/**
 * Deterministic sealed product fixture for Branch Basis / Safety / Explain /
 * audit identity tests. This fixture is NOT evidence that browser execution of
 * the mixed route is qualified. Real Run qualification must use the source-bound
 * execution builders and AnalysisCoordinator separately.
 */
export function createEmpiricalV3Wp2rProductFixture() {
  const processA = branchCommonBasis('PROCESS:A', {
    referenceTemperature: declared(20, 'degC'),
    operatingTemperature: declared(180, 'degC'),
    operatingAnalysisPressure: declared(42, 'bar(g)'),
    operatingFluidDensity: declared(720, 'kg/m3'),
    fluidPhase: declared('LIQUID', 'phase'),
  });
  const processB = branchCommonBasis('PROCESS:B', {
    referenceTemperature: declared(20, 'degC'),
    operatingTemperature: declared(210, 'degC'),
    operatingAnalysisPressure: declared(42, 'bar(g)'),
    operatingFluidDensity: declared(720, 'kg/m3'),
    fluidPhase: declared('LIQUID', 'phase'),
  });
  const pipingClass = pipingClassBasis('31441C4');

  const branchA = sealEmpiricalV3BranchAuthority({
    schema: EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
    runId: WP2R_FIXTURE_RUN_ID,
    topologyRef: exactTopologyRef(),
    branchTopologyRef: ref('branch-topology:A', hash('branch-topology:A')),
    componentIds: ['P101', 'E102'],
    commonAuthorityRefs: [
      commonRef('PROCESS', processA),
      commonRef('PIPING_CLASS', pipingClass),
    ],
    sourceEvidenceRefs: [],
    riskRefs: [],
  });
  const branchB = sealEmpiricalV3BranchAuthority({
    schema: EMPIRICAL_V3_BRANCH_AUTHORITY_SCHEMA,
    runId: WP2R_FIXTURE_RUN_ID,
    topologyRef: exactTopologyRef(),
    branchTopologyRef: ref('branch-topology:B', hash('branch-topology:B')),
    componentIds: ['P203'],
    commonAuthorityRefs: [
      commonRef('PROCESS', processB),
      commonRef('PIPING_CLASS', pipingClass),
    ],
    sourceEvidenceRefs: [],
    riskRefs: [],
  });

  const wtP101 = quantityRecord('Q:P101:WT', 7.11, 'mm', 'APPROVED_MASTER_EXACT');
  const wtE102 = quantityRecord('Q:E102:WT', 7.11, 'mm', 'APPROVED_MASTER_EXACT');
  const wtP203 = quantityRecord('Q:P203:WT', 8.18, 'mm', 'INFERRED_REVIEW_REQUIRED');
  const sectionP101 = quantityRecord('Q:P101:SECTION', 168.3, 'mm OD', 'DERIVED_EXACT');
  const sectionE102 = quantityRecord('Q:E102:SECTION', 168.3, 'mm OD', 'DERIVED_EXACT');
  const sectionP203 = quantityRecord('Q:P203:SECTION', 219.1, 'mm OD', 'DERIVED_EXACT');

  const componentP101 = component(branchA, 'P101', 'PIPE', wtP101, sectionP101);
  const componentE102 = component(branchA, 'E102', 'ELBOW', wtE102, sectionE102);
  const componentP203 = component(branchB, 'P203', 'PIPE', wtP203, sectionP203);
  const components = [componentP101, componentE102, componentP203];

  const blocker = risk({
    riskCode: 'WP2R_TOPOLOGY_GAP_UNRESOLVED',
    riskClass: 'HIGH_BLOCK',
    entityId: 'E102',
    reasonCode: 'EXACT_TOPOLOGY_COMPONENT_MISSING',
    dependencyRef: 'topology:exact:fixture',
    dependencyHash: exactTopologyRef().semanticHash,
    valueSnapshot: null,
    messageParameters: { gapMm: 3.2, suspectedMissingComponent: 'GASKET' },
  });
  const highConfirm = risk({
    riskCode: 'WP2R_WALL_THICKNESS_INFERRED',
    riskClass: 'HIGH_CONFIRM',
    entityId: 'P203',
    quantityId: 'Q:P203:WT',
    reasonCode: 'COMPONENT_ROW_REVIEW_REQUIRED',
    dependencyRef: componentP203.componentId,
    dependencyHash: componentP203.semanticHash,
    valueSnapshot: { value: 8.18, unit: 'mm', authorityClass: 'INFERRED_REVIEW_REQUIRED' },
    messageParameters: { requestedClass: '31441C4', nps: '8 in', basis: 'review-required master row' },
  });
  const medium = risk({
    riskCode: 'WP2R_DENSITY_CONSERVATIVE_SELECTION',
    riskClass: 'MEDIUM',
    entityId: 'P101',
    reasonCode: 'SOURCE_BACKED_RANGE_MAX_SELECTED',
    dependencyRef: processA.ref,
    dependencyHash: processA.semanticHash,
    valueSnapshot: { value: 720, unit: 'kg/m3', authorityClass: 'SOURCE_EXACT' },
    messageParameters: { selection: 'range maximum' },
  });

  const blockedRiskSet = sealEngineeringRiskSet({
    runId: WP2R_FIXTURE_RUN_ID,
    risks: [blocker, highConfirm, medium],
  });
  const reviewRiskSet = sealEngineeringRiskSet({
    runId: WP2R_FIXTURE_RUN_ID,
    risks: [highConfirm, medium],
  });
  const confirmation = createEngineeringConfirmationReceipt({
    risk: highConfirm,
    basisCode: 'ENGINEER_CONFIRMED_CURRENT_COMPONENT_WALL_BASIS',
    basisParameters: {
      acceptedValue: 8.18,
      unit: 'mm',
      sourceBasis: 'approved project piping-class review',
    },
    authorityRefs: [{ ref: wtP203.ref, semanticHash: wtP203.semanticHash }],
    auditMetadata: {
      actor: 'WP2R fixture engineer',
      timestamp: '2026-08-15T12:00:00Z',
      comment: 'Deterministic product fixture confirmation.',
    },
  });

  const dependencies = authorizationDependencies(branchA, branchB, components, reviewRiskSet);
  const authorization = sealEmpiricalV3CalculationAuthorization({
    runId: WP2R_FIXTURE_RUN_ID,
    policyId: WP2R_FIXTURE_POLICY_ID,
    policyVersion: WP2R_FIXTURE_POLICY_VERSION,
    dependencies,
    riskSet: reviewRiskSet,
    confirmations: [confirmation],
  });

  const commonRecords = [
    presentationRecord(processA.ref, 'PROCESS', processA),
    presentationRecord(processB.ref, 'PROCESS', processB),
    presentationRecord(pipingClass.ref, 'PIPING_CLASS', pipingClass),
    ...[wtP101, wtE102, wtP203, sectionP101, sectionE102, sectionP203]
      .map((record) => presentationRecord(record.ref, 'COMPONENT_AUTHORITY', record)),
  ];
  const branches = [branchA, branchB];

  const blockedPackage = safetyPackage({
    branches, components, riskSet: blockedRiskSet, confirmations: [], authorization: null,
    workflow: workflow({ branches, riskSet: blockedRiskSet, highBlockCount: 1, highConfirmPendingCount: 1 }),
    records: commonRecords,
  });
  const reviewRequiredPackage = safetyPackage({
    branches, components, riskSet: reviewRiskSet, confirmations: [], authorization: null,
    workflow: workflow({ branches, riskSet: reviewRiskSet, highBlockCount: 0, highConfirmPendingCount: 1 }),
    records: commonRecords,
  });
  const authorizedPackage = safetyPackage({
    branches, components, riskSet: reviewRiskSet, confirmations: [confirmation], authorization,
    workflow: workflow({
      branches, riskSet: reviewRiskSet, highBlockCount: 0, highConfirmPendingCount: 0,
      authorization,
    }),
    records: commonRecords,
  });

  const evidence = sealEmpiricalV3CoupledCalculationEvidence({
    runId: WP2R_FIXTURE_RUN_ID,
    authorization,
    mechanics: coupledMechanics(),
    romOutputRef: ref('rom-output:wp2r-frozen-display-fixture', hash('rom-output:wp2r-frozen-display-fixture')),
    authorityRefs: components.map((row) => ref(`component:${row.componentId}`, row.semanticHash)),
    coordinateBindings: [
      { coordinateId: 'TIP-X', nodeId: 'N-TIP', supportId: 'S-TIP-X', branchId: branchB.branchId, componentIds: ['P101', 'E102', 'P203'] },
      { coordinateId: 'TIP-Y', nodeId: 'N-TIP', supportId: 'S-TIP-Y', branchId: branchB.branchId, componentIds: ['P101', 'E102', 'P203'] },
    ],
  });
  const resultRequiredWorkflow = workflow({
    branches, riskSet: reviewRiskSet, highBlockCount: 0, highConfirmPendingCount: 0,
    authorization, result: evidence,
  });
  const resultRequiredPackage = safetyPackage({
    branches,
    components,
    riskSet: reviewRiskSet,
    confirmations: [confirmation],
    authorization,
    workflow: resultRequiredWorkflow,
    records: [
      ...commonRecords,
      { ref: evidence.evidenceId, kind: 'CALCULATION_EVIDENCE', semanticHash: evidence.semanticHash, record: evidence },
    ],
  });

  return Object.freeze({
    runId: WP2R_FIXTURE_RUN_ID,
    branches,
    components,
    risks: Object.freeze({ blocker, highConfirm, medium }),
    riskSets: Object.freeze({ blocked: blockedRiskSet, review: reviewRiskSet }),
    confirmation,
    authorization,
    dependencies,
    packages: Object.freeze({ blocked: blockedPackage, reviewRequired: reviewRequiredPackage, authorized: authorizedPackage, resultRequired: resultRequiredPackage }),
    evidence,
    expected: Object.freeze({
      reactionN: Object.freeze({ 'TIP-X': -606.8995590818411, 'TIP-Y': -1523.9269614290317 }),
      flexibilityMatrixMPerN: Object.freeze([
        Object.freeze([3.0214810087147528e-5, -1.0064363521234052e-5]),
        Object.freeze([-1.0064363521234052e-5, 5.9767023052964523e-6]),
      ]),
      thermalReferenceM: Object.freeze({ 'TIP-X': 0.003, 'TIP-Y': 0.003 }),
    }),
    fixturePolicy: Object.freeze({
      purpose: 'UI_AND_EVIDENCE_PRODUCT_ACCEPTANCE',
      validatesMixedBrowserExecution: false,
      validatesSolverExecution: false,
      realRunQualificationRequiredSeparately: true,
    }),
  });
}

function workflow({ branches, riskSet, highBlockCount, highConfirmPendingCount, authorization = null, result = null }) {
  return projectEmpiricalV3Workflow({
    source: { bound: true, current: true, semanticHash: hash('source:wp2r') },
    authorities: { built: true, current: true, semanticHash: hash('authorities:wp2r') },
    branches: {
      built: true,
      current: true,
      reviewCurrent: true,
      semanticHash: semanticHash(branches.map((row) => row.semanticHash)),
      reviewSemanticHash: semanticHash(branches.map((row) => row.reviewBasisHash)),
    },
    riskSet: {
      evaluated: true,
      current: true,
      semanticHash: riskSet.semanticHash,
      highBlockCount,
      highConfirmPendingCount,
    },
    calculationAuthorization: {
      present: Boolean(authorization),
      current: Boolean(authorization),
      semanticHash: authorization?.semanticHash ?? null,
    },
    calculationResult: {
      present: Boolean(result),
      current: Boolean(result),
      reviewRequired: true,
      semanticHash: result?.semanticHash ?? null,
    },
    resultReview: { present: false, current: false, semanticHash: null },
    audit: { ready: false, current: false, semanticHash: null },
  });
}

function safetyPackage({ branches, components, riskSet, confirmations, authorization, workflow: workflowValue, records }) {
  return sealEmpiricalV3SafetyPresentationPackage({
    runId: WP2R_FIXTURE_RUN_ID,
    workflow: workflowValue,
    branches,
    components,
    riskSet,
    confirmations,
    calculationAuthorization: authorization,
    records,
  });
}

function authorizationDependencies(branchA, branchB, components, riskSet) {
  return [
    { kind: 'METHOD', ref: 'EMPIRICAL_V3', semanticHash: hash('method:empirical-v3') },
    { kind: 'TOPOLOGY', ref: 'topology:exact:fixture', semanticHash: exactTopologyRef().semanticHash },
    { kind: 'BRANCH', ref: branchA.branchId, semanticHash: branchA.semanticHash },
    { kind: 'BRANCH', ref: branchB.branchId, semanticHash: branchB.semanticHash },
    ...components.map((row) => ({ kind: 'COMPONENT', ref: row.componentId, semanticHash: row.semanticHash })),
    { kind: 'RISK_SET', ref: riskSet.riskSetId, semanticHash: riskSet.semanticHash },
    { kind: 'ROM_EXECUTION_REQUEST', ref: 'fixture:display-only:not-browser-run', semanticHash: hash('fixture:display-only:not-browser-run') },
  ];
}

function component(branch, componentId, componentType, wall, section) {
  return bindComponentToBranch({
    componentId,
    componentType,
    topologyComponentRef: ref(`route-component:${componentId}`, hash(`route-component:${componentId}`)),
    localAuthorityRefs: [
      { kind: 'WT', ref: wall.ref, semanticHash: wall.semanticHash },
      { kind: 'SECTION', ref: section.ref, semanticHash: section.semanticHash },
    ],
    sourceEvidenceRefs: [],
    riskRefs: [],
  }, branch);
}

function risk({ riskCode, riskClass, entityId, quantityId = null, reasonCode, dependencyRef, dependencyHash, valueSnapshot, messageParameters }) {
  return sealEngineeringRiskFinding({
    schema: ENGINEERING_RISK_FINDING_SCHEMA,
    riskCode,
    riskClass,
    runId: WP2R_FIXTURE_RUN_ID,
    scope: { branchId: null, entityIds: [entityId], quantityIds: quantityId ? [quantityId] : [] },
    reasonCode,
    messageParameters,
    valueSnapshot,
    authorityRefs: [],
    sourceRefs: [],
    governingDependencyRefs: [{ ref: dependencyRef, semanticHash: dependencyHash }],
  });
}

function coupledMechanics() {
  const Fxx = 3.0214810087147528e-5;
  const Fxy = -1.0064363521234052e-5;
  const Fyy = 5.9767023052964523e-6;
  const rx = -606.8995590818411;
  const ry = -1523.9269614290317;
  const matrix = [[Fxx, Fxy], [Fxy, Fyy]];
  return {
    schema: 'empirical-rooted-component-thermal-compatibility/v1',
    rootNodeId: 'N-ROOT',
    coordinateIds: ['TIP-X', 'TIP-Y'],
    flexibility: {
      schema: 'empirical-rooted-component-flexibility/v1',
      rootNodeId: 'N-ROOT',
      caseIds: ['TIP-X', 'TIP-Y'],
      matrixMPerN: matrix,
      coefficientUnit: 'm/N',
      components: [],
      pairEvidence: [
        pair('TIP-X', 'TIP-X', Fxx, [1e-5, 1.5e-5, Fxx - 2.5e-5]),
        pair('TIP-X', 'TIP-Y', Fxy, [-3e-6, -5e-6, Fxy + 8e-6]),
        pair('TIP-Y', 'TIP-X', Fxy, [-3e-6, -5e-6, Fxy + 8e-6]),
        pair('TIP-Y', 'TIP-Y', Fyy, [1e-6, 3e-6, Fyy - 4e-6]),
      ],
      reciprocity: { maximumResidual: 0, satisfied: true },
      formulaTrace: ['EMP-FLX-001', 'EMP-FLX-016', 'EMP-FLX-018'],
      evidence: { formulaTrace: ['EMP-FLX-001', 'EMP-FLX-016', 'EMP-FLX-018'] },
    },
    thermalReference: {
      rootNodeId: 'N-ROOT',
      rows: [
        { coordinateId: 'TIP-X', nodeId: 'N-TIP', direction: [1, 0, 0], referenceDisplacementM: 0.003 },
        { coordinateId: 'TIP-Y', nodeId: 'N-TIP', direction: [0, 1, 0], referenceDisplacementM: 0.003 },
      ],
      componentEvidence: [
        { componentId: 'P101', deltaUM: [0.002, 0, 0] },
        { componentId: 'E102', deltaUM: [0.001, 0.001, 0] },
        { componentId: 'P203', deltaUM: [0, 0.002, 0] },
      ],
      evidence: { formulaTrace: ['EMP-THM-001', 'EMP-THM-007'] },
    },
    compatibility: {
      schema: 'empirical-linear-restraint-compatibility/v1',
      coordinateIds: ['TIP-X', 'TIP-Y'],
      flexibilityMatrixMPerN: matrix,
      supportFlexibilityMPerN: [0, 0],
      systemMatrixMPerN: matrix,
      rhsDisplacementM: [-0.003, -0.003],
      rows: [
        compatibilityRow('TIP-X', rx, 0.003),
        compatibilityRow('TIP-Y', ry, 0.003),
      ],
      numerical: { scaledResidual: 0, reciprocalConditionEstimate: 0.08 },
      reciprocity: { maximumResidual: 0, satisfied: true },
      positiveDefinite: {
        structuralFlexibility: { satisfied: true },
        compatibilitySystem: { satisfied: true },
      },
      compatibility: { maximumResidualM: 0, toleranceM: 1e-10, satisfied: true },
      energy: {
        totalStrainEnergyJ: 3.196239780766309,
        generalizedWorkJ: 3.196239780766309,
        residualJ: 0,
        relativeResidual: 0,
        tolerance: 1e-10,
        satisfied: true,
      },
      formulaTrace: ['EMP-CMP-001'],
    },
    evidence: {
      solutionClass: 'ANALYTICAL_FLEXIBILITY_FORCE_METHOD_ROM',
      formulaTrace: ['EMP-THM-001', 'EMP-THM-007', 'EMP-FLX-001', 'EMP-FLX-016', 'EMP-FLX-018', 'EMP-CMP-001'],
      fixtureNotice: 'Frozen benchmark values used for UI/evidence acceptance only; not mixed browser execution qualification.',
    },
  };
}

function pair(rowCaseId, columnCaseId, value, totals) {
  return {
    rowCaseId,
    columnCaseId,
    value,
    componentContributions: [
      contribution('P101', 'STRAIGHT', totals[0]),
      contribution('E102', 'CIRCULAR_ELBOW', totals[1]),
      contribution('P203', 'STRAIGHT', totals[2]),
    ],
  };
}

function contribution(componentId, kind, total) {
  return { componentId, kind, total, terms: { virtualWorkMPerN: total }, evidence: { fixture: true } };
}

function compatibilityRow(coordinateId, reactionN, referenceDisplacementM) {
  return {
    coordinateId,
    referenceDisplacementM,
    targetDisplacementM: 0,
    supportStiffnessNPerM: null,
    supportFlexibilityMPerN: 0,
    reactionN,
    pipeDisplacementM: 0,
    supportDeformationM: 0,
    compatibilityResidualM: 0,
  };
}

function exactTopologyRef() {
  return { ref: 'topology:exact:fixture', semanticHash: hash('topology:exact:fixture'), authority: 'EXACT', toleranceInferred: false };
}

function branchCommonBasis(refValue, fieldStates) {
  const material = { schema: 'empirical-v3-branch-common-basis/v1', kind: 'PROCESS', fieldStates, ref: refValue };
  return Object.freeze({ ...material, semanticHash: semanticHash(material) });
}

function pipingClassBasis(className) {
  const material = {
    schema: 'empirical-v3-piping-class-basis/v1',
    requestedPipingClass: className,
    resolvedPipingClass: className,
    authorityClass: 'APPROVED_MASTER_EXACT',
    source: 'wp2r-fixture-approved-master',
    matchMethod: 'EXACT',
    rowMethod: 'EXACT',
    needsReview: false,
    resolutionRef: ref(`piping-class:${className}`, hash(`piping-class:${className}`)),
  };
  const semanticHashValue = semanticHash(material);
  return Object.freeze({ ...material, ref: `piping-class-basis:${className}`, semanticHash: semanticHashValue });
}

function quantityRecord(refValue, value, unit, authorityClass) {
  const material = { schema: 'wp2r-fixture-quantity/v1', ref: refValue, value, unit, authorityClass };
  return Object.freeze({ ...material, semanticHash: semanticHash(material) });
}

function declared(value, unit) { return Object.freeze({ status: 'DECLARED', value, unit, required: true }); }
function commonRef(kind, record) { return { kind, ref: record.ref, semanticHash: record.semanticHash }; }
function presentationRecord(refValue, kind, record) { return { ref: refValue, kind, semanticHash: record.semanticHash, record }; }
function ref(refValue, semanticHashValue) { return { ref: refValue, semanticHash: semanticHashValue }; }
function hash(value) { return semanticHash({ value }); }
