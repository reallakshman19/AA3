import { semanticHash } from '../shared-piping-model/canonical-json.js';
import { prepareInputXmlLinearSolve } from './inputxml-linear-solve-preparation.js';
import { compileInputXmlLinearStructure } from './inputxml-linear-structural-preparation.js';
import { compileInputXmlLinearPhysicalCases } from './inputxml-linear-physical-cases.js';
import { preflightInputXmlLinearSolve } from './inputxml-linear-stiffness-preflight.js';
import { requireInputXmlLinearPreFeaDiagnostics } from './inputxml-linear-prefea-diagnostics.js';
import {
  INPUTXML_LINEAR_PREFEA_PREPARATION_SCHEMA,
  foldReadiness,
  makeFinding,
  requirePreFeaRecord,
  sealPreFeaRecord,
  uniqueAscii,
} from './inputxml-linear-prefea-contract.js';
import {
  errorFinding,
  preflightFindings,
  preparationEvidence,
  preparationIdentity,
  preparationSummary,
  sealBlockedPreparation,
  stalePreFeaPreparation,
} from './inputxml-linear-prefea-preparation-records.js';

export function prepareInputXmlLinearPreFea(diagnostics, options) {
  if (options === undefined) options = {};
  const accepted = requireInputXmlLinearPreFeaDiagnostics(diagnostics);
  if (accepted.status === 'BLOCK') {
    return sealBlockedPreparation(accepted, accepted.findings, 'DIAGNOSTICS_BLOCKED');
  }

  let sourcePreparation;
  let structuralPreparation;
  let physicalPreparation;
  let stiffnessPreflight;
  try {
    sourcePreparation = (options.prepareAuthorities ?? prepareInputXmlLinearSolve)(
      accepted.sourceBundle,
      accepted.requestedProfileId,
      { ...(options.authorityOptions ?? {}), modelHealthReport: accepted.representabilityDiagnostics },
    );
    structuralPreparation = (options.compileStructure ?? compileInputXmlLinearStructure)(
      accepted.sourceBundle,
      accepted.representabilityDiagnostics,
      sourcePreparation,
      options.structuralOptions ?? {},
    );
    physicalPreparation = (options.compilePhysicalCases ?? compileInputXmlLinearPhysicalCases)(
      sourcePreparation,
      structuralPreparation,
      options.physicalCaseOptions ?? {},
    );
    stiffnessPreflight = (options.preflightStiffness ?? preflightInputXmlLinearSolve)(
      physicalPreparation,
      options.stiffnessOptions ?? {},
    );
  } catch (error) {
    return sealBlockedPreparation(
      accepted,
      [...accepted.findings, errorFinding(error, accepted.requestedCaseIds)],
      'PREPARATION_FAILED',
    );
  }

  const caseRecords = physicalPreparation.physicalCases ?? [];
  const availableCaseIds = uniqueAscii(caseRecords.map((row) => row.caseId));
  const missingCaseIds = accepted.requestedCaseIds.filter((caseId) => !availableCaseIds.includes(caseId));
  const findings = [...accepted.findings];
  if (missingCaseIds.length > 0) {
    findings.push(makeFinding({
      code: 'PHYSICAL_CASE_AUTHORITY_INCOMPLETE',
      category: 'PHYSICAL_CASE',
      severity: 'ERROR',
      disposition: 'BLOCK',
      capabilityEffects: missingCaseIds.map((caseId) => `PHYSICAL_CASE:${caseId}`),
      sourceFeatureIds: [], sourcePaths: [], canonicalEntityIds: [], physicalCaseIds: missingCaseIds,
      message: `Requested physical cases are unavailable: ${missingCaseIds.join(', ')}.`,
      technicalBasis: 'A physical case can be authorized only when every required structural primitive and source authority was compiled.',
      evidence: { requestedCaseIds: accepted.requestedCaseIds, availableCaseIds, missingCaseIds },
      remediation: 'Supply the missing material, section, load, pressure, thermal, or prescribed-movement authority and rerun preparation.',
      approximationEligible: false, authorizationRequired: false,
    }));
  }
  findings.push(...preflightFindings(stiffnessPreflight, accepted.requestedCaseIds));
  const folded = foldReadiness(findings, accepted.requestedCaseIds);
  const requestedCases = caseRecords.filter((row) => accepted.requestedCaseIds.includes(row.caseId));
  const loadIdentity = semanticHash({
    loadLedger: physicalPreparation.loadLedger ?? [],
    requestedCases: requestedCases.map((row) => ({
      caseId: row.caseId,
      loadCaseSemanticHash: row.loadCase?.semanticHash ?? null,
      physicalLoadCaseHash: row.loadCase?.physicalLoadCaseHash ?? null,
    })),
  });
  const limitations = uniqueAscii([
    ...(sourcePreparation.limitations ?? []),
    ...(structuralPreparation.limitations ?? []),
    ...(physicalPreparation.limitations ?? []),
    ...folded.findings.filter((row) => row.disposition === 'CONDITIONAL').map((row) => row.code),
  ]);
  const summary = preparationSummary({
    status: folded.status,
    diagnostics: accepted,
    folded,
    sourcePreparation,
    structuralPreparation,
    physicalPreparation,
    stiffnessPreflight,
    missingCaseIds,
    limitations,
  });

  return sealPreFeaRecord({
    schema: INPUTXML_LINEAR_PREFEA_PREPARATION_SCHEMA,
    preparationId: `IXREADY-${semanticHash({
      diagnostics: accepted.semanticHash,
      structure: structuralPreparation.semanticHash,
      physical: physicalPreparation.semanticHash,
      stiffness: stiffnessPreflight.semanticHash,
      requestedCaseIds: accepted.requestedCaseIds,
    }).slice(0, 28)}`,
    status: folded.status,
    requestedProfileId: accepted.requestedProfileId,
    requestedCaseIds: accepted.requestedCaseIds,
    diagnosticsSemanticHash: accepted.semanticHash,
    diagnosticsEvidenceHash: accepted.evidenceHash,
    sourceBundleSemanticHash: accepted.sourceAuthority.sourceBundleSemanticHash,
    sourceBundleEvidenceHash: accepted.sourceAuthority.sourceBundleEvidenceHash,
    modelSemanticHash: structuralPreparation.compilation?.mechanicalModelSemanticHash
      ?? structuralPreparation.summary?.mechanicalModelSemanticHash,
    // This is the stiffness actually qualified for solve authorization. With
    // no B-3.2 component correction it is deliberately identical to the
    // historical mechanical-model stiffness hash; when exact bend k is active
    // it is the component-aware effective stiffness identity retained by the
    // preflight.
    stiffnessStateHash: stiffnessPreflight.effectiveStiffnessStateHash,
    loadStateHash: loadIdentity,
    sourcePreparation,
    structuralPreparation,
    physicalPreparation,
    stiffnessPreflight,
    authorizedCaseCandidates: Object.freeze(requestedCases.map((row) => Object.freeze({
      caseId: row.caseId,
      caseRole: row.caseRole,
      loadCaseSemanticHash: row.loadCase?.semanticHash ?? null,
      physicalLoadCaseHash: row.loadCase?.physicalLoadCaseHash ?? null,
      primitiveIds: Object.freeze(uniqueAscii(row.primitiveIds ?? [])),
    })).sort((a, b) => a.caseId < b.caseId ? -1 : a.caseId > b.caseId ? 1 : 0)),
    findings: folded.findings,
    limitations,
    summary,
    executionBoundary: {
      rawSourceParseCount: 1,
      materialAuthorityPrepared: true,
      sectionAuthorityPrepared: true,
      constraintsCompiled: true,
      mechanicalModelCompiled: true,
      loadCasesCompiled: true,
      stiffnessAssembled: true,
      factorizationHandle: 'NOT_RETAINED',
      solverRuntime: 'NOT_CREATED',
      solveAuthorized: false,
    },
    semanticHash: '', evidenceHash: '',
  }, INPUTXML_LINEAR_PREFEA_PREPARATION_SCHEMA, preparationIdentity, preparationEvidence);
}

export function requireInputXmlLinearPreFeaPreparation(record, diagnostics) {
  const accepted = requirePreFeaRecord(
    record,
    INPUTXML_LINEAR_PREFEA_PREPARATION_SCHEMA,
    preparationIdentity,
    preparationEvidence,
  );
  if (diagnostics !== undefined) {
    const parent = requireInputXmlLinearPreFeaDiagnostics(diagnostics);
    if (accepted.diagnosticsSemanticHash !== parent.semanticHash
      || accepted.diagnosticsEvidenceHash !== parent.evidenceHash
      || accepted.sourceBundleSemanticHash !== parent.sourceAuthority.sourceBundleSemanticHash
      || accepted.sourceBundleEvidenceHash !== parent.sourceAuthority.sourceBundleEvidenceHash) {
      throw stalePreFeaPreparation(
        'PREFEA_PREPARATION_PARENT_STALE',
        'Preparation does not match the supplied diagnostics record.',
      );
    }
  }
  // The invariant is that no factorization handle survives into a preparation
  // record. Two states satisfy it: a prepared model assembled stiffness and did
  // not retain the handle (NOT_RETAINED), and a blocked model never created one
  // (NOT_CREATED). Requiring NOT_RETAINED alone rejected every blocked record,
  // so a genuine engineering block surfaced to the caller as
  // PREFEA_PREPARATION_RUNTIME_STATE_INVALID — "this record is corrupt" — in
  // place of the real reason. Accepting NOT_CREATED does not weaken the guard:
  // it is the stronger of the two states. Any other value is still rejected.
  if (accepted.executionBoundary.solverRuntime !== 'NOT_CREATED'
    || !['NOT_RETAINED', 'NOT_CREATED'].includes(accepted.executionBoundary.factorizationHandle)) {
    throw stalePreFeaPreparation(
      'PREFEA_PREPARATION_RUNTIME_STATE_INVALID',
      'Preparation retains prohibited runtime state.',
    );
  }
  return accepted;
}
