import { requireInputXmlLinearPreFeaDiagnostics } from './inputxml-linear-prefea-diagnostics.js';
import {
  INPUTXML_LINEAR_PREFEA_PREPARATION_SCHEMA,
  foldReadiness,
  makeFinding,
  sealPreFeaRecord,
  uniqueAscii,
} from './inputxml-linear-prefea-contract.js';

export function sealBlockedPreparation(diagnostics, findings, reasonCode) {
  const folded = foldReadiness(findings, diagnostics.requestedCaseIds);
  const blockedFindings = folded.findings.some((row) => row.disposition === 'BLOCK')
    ? folded.findings
    : [...folded.findings, makeFinding({
      code: reasonCode,
      category: 'AUTHORIZATION',
      severity: 'ERROR',
      disposition: 'BLOCK',
      capabilityEffects: diagnostics.requestedCaseIds.map((caseId) => `PHYSICAL_CASE:${caseId}`),
      sourceFeatureIds: [], sourcePaths: [], canonicalEntityIds: [],
      physicalCaseIds: diagnostics.requestedCaseIds,
      message: 'Pre-FEA preparation is blocked.',
      technicalBasis: 'A blocking parent diagnostic prevents mechanical preparation and numerical preflight.',
      evidence: { diagnosticsSemanticHash: diagnostics.semanticHash, reasonCode },
      remediation: 'Resolve all blocking diagnostics and create a new preparation record.',
      approximationEligible: false, authorizationRequired: false,
    })];
  const finalFold = foldReadiness(blockedFindings, diagnostics.requestedCaseIds);
  return sealPreFeaRecord({
    schema: INPUTXML_LINEAR_PREFEA_PREPARATION_SCHEMA,
    preparationId: `IXREADY-BLOCK-${diagnostics.semanticHash.slice(0, 24)}`,
    status: 'BLOCK',
    requestedProfileId: diagnostics.requestedProfileId,
    requestedCaseIds: diagnostics.requestedCaseIds,
    diagnosticsSemanticHash: diagnostics.semanticHash,
    diagnosticsEvidenceHash: diagnostics.evidenceHash,
    sourceBundleSemanticHash: diagnostics.sourceAuthority.sourceBundleSemanticHash,
    sourceBundleEvidenceHash: diagnostics.sourceAuthority.sourceBundleEvidenceHash,
    modelSemanticHash: null, stiffnessStateHash: null, loadStateHash: null,
    sourcePreparation: null, structuralPreparation: null, physicalPreparation: null, stiffnessPreflight: null,
    authorizedCaseCandidates: Object.freeze([]),
    findings: finalFold.findings,
    limitations: Object.freeze([]),
    summary: Object.freeze({
      ...diagnostics.summary,
      status: 'BLOCK',
      findingCounts: finalFold.findingCounts,
      remediationSummary: Object.freeze(uniqueAscii(finalFold.findings.map((row) => row.remediation))),
    }),
    executionBoundary: {
      rawSourceParseCount: 1,
      materialAuthorityPrepared: false,
      sectionAuthorityPrepared: false,
      constraintsCompiled: false,
      mechanicalModelCompiled: false,
      loadCasesCompiled: false,
      stiffnessAssembled: false,
      factorizationHandle: 'NOT_CREATED',
      solverRuntime: 'NOT_CREATED',
      solveAuthorized: false,
      blockReasonCode: reasonCode,
    },
    semanticHash: '', evidenceHash: '',
  }, INPUTXML_LINEAR_PREFEA_PREPARATION_SCHEMA, preparationIdentity, preparationEvidence);
}

export function preflightFindings(preflight, requestedCaseIds) {
  const rows = [];
  for (const finding of preflight.genericPreflight?.findings ?? []) {
    const disposition = finding.disposition === 'BLOCK'
      ? 'BLOCK' : finding.disposition === 'WARN' ? 'CONDITIONAL' : 'PASS';
    rows.push(makeFinding({
      code: finding.code ?? 'LINEAR_STIFFNESS_PREFLIGHT_FINDING',
      category: classifyPreflightCategory(finding.code),
      severity: disposition === 'BLOCK' ? 'ERROR' : disposition === 'CONDITIONAL' ? 'WARNING' : 'INFO',
      disposition,
      capabilityEffects: requestedCaseIds.map((caseId) => `PHYSICAL_CASE:${caseId}`),
      sourceFeatureIds: finding.sourceFeatureIds ?? [], sourcePaths: [],
      canonicalEntityIds: uniqueAscii([
        ...(finding.componentIds ?? []), ...(finding.nodeIds ?? []), ...(finding.dofIds ?? []),
      ]),
      physicalCaseIds: requestedCaseIds,
      message: finding.message ?? finding.code ?? 'Stiffness preflight finding.',
      technicalBasis: finding.technicalBasis
        ?? 'The production stiffness preflight classified the constrained free partition.',
      evidence: finding.evidence ?? finding.data ?? {
        failureCode: finding.code ?? null,
        partitionIdentity: preflight.genericPreflight?.assembly?.partitionIdentity ?? null,
      },
      remediation: finding.remediation
        ?? 'Correct support, connectivity, formulation, or conditioning authority and rerun numerical preflight.',
      approximationEligible: false,
      authorizationRequired: disposition === 'CONDITIONAL',
    }));
  }
  if (preflight.status === 'BLOCK' && !rows.some((row) => row.disposition === 'BLOCK')) {
    rows.push(preflightStatusFinding(preflight, requestedCaseIds, {
      code: 'LINEAR_STIFFNESS_PREFLIGHT_BLOCKED', category: 'STIFFNESS', severity: 'ERROR', disposition: 'BLOCK',
      message: 'The production stiffness preflight blocked solve authorization.',
      technicalBasis: 'The assembled free stiffness partition did not satisfy the selected rank, definiteness, mechanism, or conditioning policy.',
      remediation: 'Resolve the retained mechanism, rank, definiteness, or conditioning finding.',
      canonicalEntityIds: preflight.genericPreflight?.components?.filter((row) => row.floating)
        .map((row) => row.componentId) ?? [],
      authorizationRequired: false,
    }));
  } else if (preflight.status === 'WARN' && !rows.some((row) => row.disposition === 'CONDITIONAL')) {
    rows.push(preflightStatusFinding(preflight, requestedCaseIds, {
      code: 'LINEAR_STIFFNESS_CONDITION_WARNING', category: 'CONDITIONING', severity: 'WARNING', disposition: 'CONDITIONAL',
      message: 'Stiffness conditioning requires conditional authorization.',
      technicalBasis: 'The factorization succeeded but the condition estimate exceeded the selected warning threshold.',
      remediation: 'Review the conditioning evidence and either correct the model or explicitly accept the limitation.',
      canonicalEntityIds: [], authorizationRequired: true,
    }));
  }
  return rows;
}

export function errorFinding(error, requestedCaseIds) {
  const code = String(error?.code ?? 'PREFEA_PREPARATION_EXCEPTION');
  return makeFinding({
    code, category: classifyPreparationError(code), severity: 'ERROR', disposition: 'BLOCK',
    capabilityEffects: requestedCaseIds.map((caseId) => `PHYSICAL_CASE:${caseId}`),
    sourceFeatureIds: error?.data?.sourceFeatureIds ?? [], sourcePaths: [],
    canonicalEntityIds: uniqueAscii([
      error?.data?.segmentId, error?.data?.nodeId, error?.data?.restraintId,
      ...(error?.data?.componentIds ?? []),
    ]),
    physicalCaseIds: requestedCaseIds,
    message: String(error?.message ?? 'Pre-FEA preparation failed.'),
    technicalBasis: 'An existing production authority rejected the source, mechanical compilation, load compilation, constraint set, or stiffness preflight.',
    evidence: { code, data: error?.data ?? null, name: error?.name ?? 'Error' },
    remediation: 'Correct the source authority identified by this finding and rerun preparation.',
    approximationEligible: false, authorizationRequired: false,
  });
}

export function preparationSummary(value) {
  const { status, diagnostics, folded, sourcePreparation, structuralPreparation,
    physicalPreparation, stiffnessPreflight, missingCaseIds, limitations } = value;
  return Object.freeze({
    ...diagnostics.summary,
    status,
    findingCounts: folded.findingCounts,
    blockedCapabilityIds: Object.freeze(uniqueAscii([
      ...diagnostics.summary.blockedCapabilityIds,
      ...missingCaseIds.map((caseId) => `PHYSICAL_CASE:${caseId}`),
    ])),
    conditionalCapabilityIds: Object.freeze(uniqueAscii([
      ...diagnostics.summary.conditionalCapabilityIds,
      ...folded.findings.filter((row) => row.disposition === 'CONDITIONAL').flatMap((row) => row.capabilityEffects),
    ])),
    authorizedCapabilityIds: diagnostics.summary.authorizedCapabilityIds,
    physicalCaseCount: physicalPreparation.summary?.physicalCaseCount ?? 0,
    requestedPhysicalCaseCount: diagnostics.requestedCaseIds.length,
    missingRequestedCaseCount: missingCaseIds.length,
    materialResolutionCount: sourcePreparation.summary?.materialResolutionCount ?? 0,
    sectionResolutionCount: sourcePreparation.summary?.sectionResolutionCount ?? 0,
    rigidAuthorityCount: sourcePreparation.summary?.rigidAuthorityCount ?? 0,
    constraintCount: structuralPreparation.summary?.constraintCount ?? 0,
    freeDofCount: stiffnessPreflight.summary?.freeDofCount ?? 0,
    constrainedDofCount: stiffnessPreflight.summary?.constrainedDofCount ?? 0,
    conditionEstimate: stiffnessPreflight.summary?.conditionEstimate ?? null,
    limitationCount: limitations.length,
    remediationSummary: Object.freeze(uniqueAscii(folded.findings
      .filter((row) => row.disposition !== 'PASS').map((row) => row.remediation))),
  });
}

export function preparationIdentity(record) {
  return {
    schema: record.schema, preparationId: record.preparationId, status: record.status,
    requestedProfileId: record.requestedProfileId, requestedCaseIds: record.requestedCaseIds,
    diagnosticsSemanticHash: record.diagnosticsSemanticHash,
    sourceBundleSemanticHash: record.sourceBundleSemanticHash,
    modelSemanticHash: record.modelSemanticHash, stiffnessStateHash: record.stiffnessStateHash, loadStateHash: record.loadStateHash,
    sourcePreparationSemanticHash: record.sourcePreparation?.semanticHash ?? null,
    structuralPreparationSemanticHash: record.structuralPreparation?.semanticHash ?? null,
    physicalPreparationSemanticHash: record.physicalPreparation?.semanticHash ?? null,
    stiffnessPreflightSemanticHash: record.stiffnessPreflight?.semanticHash ?? null,
    authorizedCaseCandidates: record.authorizedCaseCandidates, findings: record.findings,
    limitations: record.limitations, summary: record.summary, executionBoundary: record.executionBoundary,
  };
}

export function preparationEvidence(record) {
  return {
    diagnosticsEvidenceHash: record.diagnosticsEvidenceHash,
    sourceBundleEvidenceHash: record.sourceBundleEvidenceHash,
    sourcePreparationEvidenceHash: record.sourcePreparation?.evidenceHash ?? null,
    structuralPreparationEvidenceHash: record.structuralPreparation?.evidenceHash ?? null,
    physicalPreparationEvidenceHash: record.physicalPreparation?.evidenceHash ?? null,
    stiffnessPreflightEvidenceHash: record.stiffnessPreflight?.evidenceHash ?? null,
    findingEvidence: record.findings.map((row) => ({ findingId: row.findingId, evidence: row.evidence })),
  };
}

export function stalePreFeaPreparation(code, message) {
  const error = new Error(message);
  error.name = 'InputXmlLinearPreFeaStaleError';
  error.code = code;
  return error;
}

function preflightStatusFinding(preflight, requestedCaseIds, value) {
  return makeFinding({
    code: value.code, category: value.category, severity: value.severity, disposition: value.disposition,
    capabilityEffects: requestedCaseIds.map((caseId) => `PHYSICAL_CASE:${caseId}`),
    sourceFeatureIds: [], sourcePaths: [], canonicalEntityIds: value.canonicalEntityIds,
    physicalCaseIds: requestedCaseIds, message: value.message, technicalBasis: value.technicalBasis,
    evidence: { status: preflight.status, summary: preflight.summary, factorization: preflight.genericPreflight?.factorization ?? null },
    remediation: value.remediation, approximationEligible: false, authorizationRequired: value.authorizationRequired,
  });
}

function classifyPreparationError(code) {
  if (/MATERIAL/u.test(code)) return 'MATERIAL';
  if (/SECTION/u.test(code)) return 'SECTION';
  if (/RIGID/u.test(code)) return 'RIGID';
  if (/RESTRAINT|CONSTRAINT/u.test(code)) return 'CONSTRAINT';
  if (/THERMAL|TEMPERATURE/u.test(code)) return 'THERMAL';
  if (/PRESSURE/u.test(code)) return 'PRESSURE';
  if (/LOAD|CASE/u.test(code)) return 'LOAD';
  if (/STIFF|RANK|PIVOT|CONDITION/u.test(code)) return 'STIFFNESS';
  return 'UNSUPPORTED_FEATURE';
}

function classifyPreflightCategory(code) {
  if (code === undefined) code = '';
  if (/FLOAT|RIGID_BODY|MECHANISM/u.test(code)) return 'MECHANISM';
  if (/CONDITION/u.test(code)) return 'CONDITIONING';
  if (/CONSTRAINT|DOF_COLLISION/u.test(code)) return 'CONSTRAINT';
  return 'STIFFNESS';
}
