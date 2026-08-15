import {
  computeInputXmlModelHealthSourceEvidenceHash,
  computeInputXmlModelHealthSourceSemanticHash,
  requireInputXmlModelHealthSource,
} from '../geometry/model-health/index.js';
import { validateLinearPipingInputXmlAnalysisRequest } from './inputxml-request-validation.js';
import { parseInputXmlModelHealthSource } from './inputxml-source-binding.js';
import {
  diagnoseInputXmlModelHealthProximity,
  diagnoseInputXmlModelHealthTopology,
} from './inputxml-model-health.js';
import { diagnoseInputXmlLinearModelHealth } from './inputxml-linear-model-health.js';
import { diagnoseInputXmlLinearPreFeaEngineeringSanity } from './inputxml-linear-prefea-engineering-checks.js';
import {
  INPUTXML_LINEAR_PREFEA_DIAGNOSTICS_SCHEMA,
  foldReadiness,
  requirePreFeaRecord,
  sealPreFeaRecord,
  uniqueAscii,
  validateInputXmlLinearPreFeaRequest,
} from './inputxml-linear-prefea-contract.js';
import { collectFindings } from './inputxml-linear-prefea-findings.js';

export function diagnoseInputXmlLinearPreFea(request, options) {
  const resolvedOptions = options === undefined ? {} : options;
  const accepted = validateInputXmlLinearPreFeaRequest(
    request,
    resolvedOptions.validateSourceRequest ?? validateLinearPipingInputXmlAnalysisRequest,
  );
  const parse = resolvedOptions.parseSource ?? parseInputXmlModelHealthSource;
  const sourceBundle = requireInputXmlModelHealthSource(parse(
    accepted.inputXmlSource.content,
    parseOptions(accepted),
  ));
  const sourceSemanticHash = computeInputXmlModelHealthSourceSemanticHash(sourceBundle);
  const sourceEvidenceHash = computeInputXmlModelHealthSourceEvidenceHash(sourceBundle);

  const topology = (resolvedOptions.diagnoseTopology ?? diagnoseInputXmlModelHealthTopology)(
    sourceBundle,
    resolvedOptions.topologyOptions ?? {},
  );
  const proximity = (resolvedOptions.diagnoseProximity ?? diagnoseInputXmlModelHealthProximity)(
    sourceBundle,
    resolvedOptions.proximityOptions ?? {},
  );
  // diagnoseInputXmlModelHealthTopology/Proximity above are bare pass-throughs
  // to the exact same diagnoseInputXmlTopologyGraph/Proximity functions that
  // diagnoseInputXmlLinearModelHealth calls internally when it isn't handed a
  // report. Passing the already-computed topology/proximity through here
  // reuses that work instead of silently recomputing it — before this, the
  // recompute produced a second, differently-identified copy of every
  // topology/proximity finding (collectFindings below appends `topology` and
  // `proximity` directly, then appends `representability.findings`, which
  // duplicated the same real-world defects under the model-health layer's own
  // finding-id scheme), so a genuine collinear-overlap or coincidence defect
  // was counted, and BLOCKed on, twice.
  const representability = (resolvedOptions.diagnoseRepresentability ?? diagnoseInputXmlLinearModelHealth)(
    sourceBundle,
    {
      graphReport: topology,
      proximityReport: proximity,
      ...(resolvedOptions.representabilityOptions ?? {}),
      analysisProfileId: accepted.requestedProfileId,
    },
  );
  const engineeringSanity = (resolvedOptions.diagnoseEngineeringSanity
    ?? diagnoseInputXmlLinearPreFeaEngineeringSanity)(sourceBundle);
  const findings = collectFindings({
    sourceBundle, topology, proximity, representability, engineeringSanity,
    requestedProfileId: accepted.requestedProfileId,
  });
  const folded = foldReadiness(findings, accepted.requestedCaseIds);
  const capabilities = normalizeCapabilities(representability.capabilities ?? []);
  const summary = summarize({
    folded,
    capabilities,
    sourceBundle,
    accepted,
    engineeringSanity,
  });

  return sealPreFeaRecord({
    schema: INPUTXML_LINEAR_PREFEA_DIAGNOSTICS_SCHEMA,
    diagnosticsId: `IXDIAG-${sourceSemanticHash.slice(0, 20)}-${accepted.requestedProfileId}`,
    status: folded.status,
    requestedProfileId: accepted.requestedProfileId,
    requestedCaseIds: accepted.requestedCaseIds,
    sourceAuthority: {
      sourceSemanticHash: accepted.inputXmlSource.semanticHash,
      contentHash: accepted.inputXmlSource.contentHash,
      sourceBundleSemanticHash: sourceSemanticHash,
      sourceBundleEvidenceHash: sourceEvidenceHash,
    },
    sourceBundle,
    geometryDiagnostics: normalizeDiagnosticRecord(sourceBundle.geometry),
    topologyDiagnostics: normalizeDiagnosticRecord(topology),
    proximityDiagnostics: normalizeDiagnosticRecord(proximity),
    representabilityDiagnostics: normalizeDiagnosticRecord(representability),
    capabilities,
    findings: folded.findings,
    summary,
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
    },
    semanticHash: '',
    evidenceHash: '',
  }, INPUTXML_LINEAR_PREFEA_DIAGNOSTICS_SCHEMA, diagnosticsIdentity, diagnosticsEvidence);
}

export function requireInputXmlLinearPreFeaDiagnostics(record) {
  const accepted = requirePreFeaRecord(
    record,
    INPUTXML_LINEAR_PREFEA_DIAGNOSTICS_SCHEMA,
    diagnosticsIdentity,
    diagnosticsEvidence,
  );
  if (accepted.executionBoundary.rawSourceParseCount !== 1) {
    throw new TypeError('A pre-FEA diagnostics record must prove exactly one raw-source parse.');
  }
  requireInputXmlModelHealthSource(accepted.sourceBundle);
  return accepted;
}

function normalizeCapabilities(rows) {
  return Object.freeze([...rows].map((row) => Object.freeze({
    capabilityId: String(row.capabilityId),
    status: String(row.status),
    findingIds: Object.freeze(uniqueAscii(row.findingIds ?? [])),
    limitationCodes: Object.freeze(uniqueAscii(row.limitationCodes ?? [])),
  })).sort((a, b) => a.capabilityId < b.capabilityId ? -1 : a.capabilityId > b.capabilityId ? 1 : 0));
}

function summarize({ folded, capabilities, sourceBundle, accepted, engineeringSanity }) {
  const blocked = capabilities.filter((row) => row.status === 'BLOCK').map((row) => row.capabilityId);
  const conditional = capabilities.filter((row) => ['WARN', 'CONDITIONAL'].includes(row.status))
    .map((row) => row.capabilityId);
  const authorized = capabilities.filter((row) => ['PASS', 'EXACT', 'QUALIFIED'].includes(row.status))
    .map((row) => row.capabilityId);
  const findings = folded.findings;
  return Object.freeze({
    status: folded.status,
    requestedProfileId: accepted.requestedProfileId,
    requestedCaseIds: accepted.requestedCaseIds,
    findingCounts: folded.findingCounts,
    findingCountsByDisposition: countBy(findings, 'disposition'),
    findingCountsByCategory: countBy(findings, 'category'),
    blockedCapabilityIds: Object.freeze(uniqueAscii(blocked)),
    conditionalCapabilityIds: Object.freeze(uniqueAscii(conditional)),
    authorizedCapabilityIds: Object.freeze(uniqueAscii(authorized)),
    missingAuthorityCount: findings.filter((row) => /MISSING|UNRESOLVED|INCOMPLETE/u.test(row.code)).length,
    unsupportedFeatureCount: findings.filter((row) => row.category === 'UNSUPPORTED_FEATURE').length,
    engineeringSanityFindingCount: engineeringSanity?.summary?.findingCount ?? 0,
    engineeringSanityBlockingFindingCount: engineeringSanity?.summary?.blockingFindingCount ?? 0,
    affectedSourceFeatureCount: new Set(findings.flatMap((row) => row.sourceFeatureIds)).size,
    affectedComponentCount: new Set(findings.filter((row) => row.category === 'COMPONENT')
      .flatMap((row) => row.canonicalEntityIds)).size,
    affectedRestraintCount: new Set(findings.filter((row) => ['RESTRAINT', 'CONSTRAINT'].includes(row.category))
      .flatMap((row) => row.canonicalEntityIds)).size,
    affectedLoadCount: new Set(findings.filter((row) => ['LOAD', 'PRESSURE', 'THERMAL'].includes(row.category))
      .flatMap((row) => row.canonicalEntityIds)).size,
    sourceNodeCount: sourceBundle.geometry?.nodes?.length ?? 0,
    sourceElementCount: sourceBundle.geometry?.segments?.length ?? 0,
    remediationSummary: Object.freeze(uniqueAscii(findings.filter((row) => row.disposition !== 'PASS')
      .map((row) => row.remediation))),
  });
}

function diagnosticsIdentity(record) {
  return {
    schema: record.schema,
    diagnosticsId: record.diagnosticsId,
    status: record.status,
    requestedProfileId: record.requestedProfileId,
    requestedCaseIds: record.requestedCaseIds,
    sourceAuthority: record.sourceAuthority,
    geometryDiagnostics: record.geometryDiagnostics,
    topologyDiagnostics: record.topologyDiagnostics,
    proximityDiagnostics: record.proximityDiagnostics,
    representabilityDiagnostics: record.representabilityDiagnostics,
    capabilities: record.capabilities,
    findings: record.findings,
    summary: record.summary,
    executionBoundary: record.executionBoundary,
  };
}

function diagnosticsEvidence(record) {
  return {
    sourceBundle: record.sourceBundle,
    sourceBundleEvidenceHash: record.sourceAuthority.sourceBundleEvidenceHash,
    findingEvidence: record.findings.map((row) => ({ findingId: row.findingId, evidence: row.evidence })),
  };
}

function normalizeDiagnosticRecord(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') return value;
  const clone = structuredClone(value);
  delete clone.sourceBundle;
  delete clone.matrix;
  delete clone.factorization;
  delete clone.runtime;
  return clone;
}

function parseOptions(accepted) {
  const ingestion = accepted.ingestionOptions;
  return {
    unit: ingestion.unit,
    source: ingestion.source,
    componentOrigins: ingestion.componentOrigins,
    restraintTypeCodeMap: ingestion.restraintTypeCodeMap,
    restraintTypeMutation: ingestion.restraintTypeMutation,
    bendRadiusTolerance: ingestion.bendRadiusTolerance?.value ?? ingestion.bendRadiusTolerance,
    fileName: accepted.inputXmlSource.fileName,
  };
}

function countBy(rows, field) {
  const counts = new Map();
  for (const row of rows) counts.set(row[field], (counts.get(row[field]) ?? 0) + 1);
  return Object.freeze(Object.fromEntries([...counts.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  ))));
}
