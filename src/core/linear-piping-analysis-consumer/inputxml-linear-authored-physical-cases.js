import { modelReferenceFromCompilation } from '../linear-fea-load-case/index.js';
import { LOAD_PRIMITIVE_SCHEMA, REPRESENTABLE_LOAD_SIGN_CONVENTION } from '../linear-fea-load-case/load-case-contract.js';
import {
  INPUTXML_LINEAR_PHYSICAL_CASE_PREPARATION_SCHEMA,
  requireInputXmlLinearPhysicalCasePreparation,
  sealInputXmlLinearPhysicalCasePreparation,
} from './inputxml-linear-physical-cases-contract.js';
import { inputXmlLinearPhysicalLoadCaseProfile } from './inputxml-linear-physical-profile.js';
import {
  caseRecord,
  compareAscii,
  indexPrimitiveCases,
  loadLedgerRow,
  physicalCaseError,
  safePhysicalId,
  sourceEvidence,
  uniqueAscii,
} from './inputxml-linear-physical-case-builders.js';

const CODE = 'INPUTXML_AUTHORED_PHYSICAL_CASE_INVALID';

/**
 * Add one engineer-authored physical case (nodal force/moment loads bound to
 * real node IDs) alongside the auto-synthesized W/WP/WT/WPT cases, without
 * touching compileInputXmlLinearPhysicalCases or its buildCases internals.
 *
 * physicalPreparation is a sealed, hash-verified record
 * (INPUTXML_LINEAR_PHYSICAL_CASE_PREPARATION_SCHEMA) whose semanticHash/
 * evidenceHash cover its entire physicalCases + loadLedger arrays -- an
 * authored case cannot be appended to that array after the fact without
 * going stale. This function instead builds the new case through the same
 * shared caseRecord()/compilePhysicalLoadCase() path every other case
 * already goes through, then re-seals a brand-new preparation record that
 * carries the original W/WP/WT/WPT cases plus the authored one. This keeps
 * inputxml-run-request-cases.js completely unmodified: an authored caseId
 * becomes just another legitimate, properly-sealed entry it can look up.
 *
 * authoredCase: { label, description, loads: [{ nodeId, force: {fx,fy,fz},
 * moment: {mx,my,mz} }, ...] }. Only a GLOBAL basis is supported for now
 * (declared local bases are deferred, disclosed scope narrowing -- see the
 * plan); force/moment are always SI (N, N*m), matching this package's own
 * "works in SI, converts nothing" units contract.
 */
export function mergeAuthoredInputXmlLinearPhysicalCase(physicalPreparation, authoredCase) {
  const prepared = requireInputXmlLinearPhysicalCasePreparation(physicalPreparation);
  requireAuthoredCaseInput(authoredCase);

  const structural = prepared.structuralPreparation;
  const loadCaseProfile = inputXmlLinearPhysicalLoadCaseProfile();
  if (loadCaseProfile.semanticHash !== prepared.loadCaseProfileSemanticHash) {
    throw physicalCaseError(
      'INPUTXML_AUTHORED_CASE_PROFILE_DRIFT',
      'The reconstructed load-case profile does not match the sealed preparation it is being merged into.',
      { expected: prepared.loadCaseProfileSemanticHash, actual: loadCaseProfile.semanticHash },
    );
  }
  const modelReference = modelReferenceFromCompilation(structural.compilation);

  const caseToken = nextAuthoredCaseToken(prepared.physicalCases, structural.modelId);
  const primitives = authoredCase.loads.map((load, index) =>
    nodalForceMomentPrimitiveInput(load, caseToken, index, structural.modelId));

  const newCase = caseRecord({
    structural,
    loadCaseProfile,
    modelReference,
    caseToken,
    caseRole: 'AUTHORED_APPLIED_MECHANICAL',
    primitives,
    loadCaseClass: 'APPLIED_MECHANICAL',
    label: authoredCase.label ?? caseToken,
    description: authoredCase.description ?? 'Engineer-authored nodal force/moment physical case.',
  });

  const cases = [...prepared.physicalCases, newCase];
  const ledger = [...prepared.loadLedger, loadLedgerRow({
    ledgerId: `IXLOAD:AUTHORED:${safePhysicalId(newCase.caseId)}`,
    sourceKind: 'AUTHORED_NODAL_FORCE_MOMENT',
    sourceFeatureId: 'ENGINEER_AUTHORED',
    segmentId: null,
    elementId: null,
    disposition: 'COMPILED',
    primitiveIds: newCase.primitiveIds,
    limitationCode: null,
    evidence: { authoredNodeIds: authoredCase.loads.map((load) => String(load.nodeId)) },
  })];
  const casesByPrimitive = indexPrimitiveCases(cases);
  const finalizedLedger = ledger
    .map((row) => Object.freeze({
      ...row,
      caseIds: Object.freeze(uniqueAscii(
        row.primitiveIds.flatMap((primitiveId) => casesByPrimitive.get(primitiveId) ?? []),
      )),
    }))
    .sort((left, right) => compareAscii(left.ledgerId, right.ledgerId));

  const limitations = uniqueAscii([
    ...prepared.limitations,
    ...newCase.loadCase.limitations.map((item) => item.code),
  ]);

  return sealInputXmlLinearPhysicalCasePreparation({
    schema: INPUTXML_LINEAR_PHYSICAL_CASE_PREPARATION_SCHEMA,
    preparationId: `${prepared.preparationId}-${caseToken}`,
    analysisProfileId: prepared.analysisProfileId,
    sourcePreparationSemanticHash: prepared.sourcePreparationSemanticHash,
    sourcePreparationEvidenceHash: prepared.sourcePreparationEvidenceHash,
    structuralPreparationSemanticHash: prepared.structuralPreparationSemanticHash,
    structuralPreparationEvidenceHash: prepared.structuralPreparationEvidenceHash,
    loadCaseProfileSemanticHash: prepared.loadCaseProfileSemanticHash,
    sourcePreparation: prepared.sourcePreparation,
    structuralPreparation: prepared.structuralPreparation,
    physicalCases: Object.freeze(cases),
    loadLedger: Object.freeze(finalizedLedger),
    limitations,
    summary: Object.freeze({
      ...prepared.summary,
      physicalCaseCount: cases.length,
      loadLedgerCount: finalizedLedger.length,
      compiledPrimitiveCount: new Set(cases.flatMap((row) => row.primitiveIds)).size,
      physicalLoadCaseHashes: Object.freeze(cases.map((row) => row.loadCase.physicalLoadCaseHash)),
    }),
    executionBoundary: prepared.executionBoundary,
  });
}

function nextAuthoredCaseToken(physicalCases, modelId) {
  const existingCaseIds = new Set(physicalCases.map((row) => row.caseId));
  let index = 1;
  let caseToken = `AUTHORED-${index}`;
  while (existingCaseIds.has(`${modelId}-${caseToken}`)) {
    index += 1;
    caseToken = `AUTHORED-${index}`;
  }
  return caseToken;
}

function nodalForceMomentPrimitiveInput(load, caseToken, index, modelId) {
  if (!load || typeof load !== 'object' || Array.isArray(load)) {
    throw physicalCaseError(CODE, `authoredCase.loads[${index}] must be a record.`, { index });
  }
  // The author names a plain topology node ID (e.g. "20", the same ID the
  // node picker shows from conditionedTopology.geometry.nodes) -- the
  // compiled mechanical model binds nodes under a model-qualified scheme
  // instead (`${modelId}.N${nodeId}`, matching
  // inputxml-run-request-cases.js's own buildMechanicalModelInput/safeId
  // exactly), so requireBoundNode needs that qualified form, not the bare
  // one an author would actually type.
  const nodeId = String(load.nodeId ?? '').trim();
  if (!nodeId) {
    throw physicalCaseError(CODE, `authoredCase.loads[${index}].nodeId is required.`, { index });
  }
  const boundNodeId = `${modelId}.N${safePhysicalId(nodeId)}`;
  const force = numericComponents(load.force, ['fx', 'fy', 'fz'], `loads[${index}].force`);
  const moment = numericComponents(load.moment, ['mx', 'my', 'mz'], `loads[${index}].moment`);
  const primitiveId = `AUTHORED-${safePhysicalId(caseToken)}-${index}`;
  return {
    schema: LOAD_PRIMITIVE_SCHEMA,
    primitiveId,
    kind: 'NODAL_FORCE_MOMENT',
    sourceEvidence: sourceEvidence({
      sourceId: 'ENGINEER_AUTHORED_LOAD_CASE',
      sourceRevision: `${caseToken}/${safePhysicalId(nodeId)}/${index}`,
      nodeId: boundNodeId,
      force,
      moment,
    }),
    nodeId: boundNodeId,
    basis: { kind: 'GLOBAL' },
    force,
    moment,
    // This package works in SI and converts nothing (matches every other
    // primitive builder in this directory) -- force/moment must already be
    // Newtons/Newton-metres by the time they reach this function.
    units: { force: 'N', moment: 'N*m', length: 'm' },
    signConvention: REPRESENTABLE_LOAD_SIGN_CONVENTION,
  };
}

function numericComponents(value, fields, field) {
  const record = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const result = {};
  for (const key of fields) {
    // A component the author left blank means zero on that axis, not "no
    // opinion" -- the same disclosed-literal-value posture the rest of
    // this codebase's authoring surfaces use rather than guessing.
    const raw = record[key] ?? 0;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      throw physicalCaseError(CODE, `${field}.${key} must be a finite number.`, { field, key, raw });
    }
    result[key] = numeric;
  }
  return result;
}

function requireAuthoredCaseInput(authoredCase) {
  if (!authoredCase || typeof authoredCase !== 'object' || Array.isArray(authoredCase)) {
    throw physicalCaseError(CODE, 'authoredCase must be a record.', {});
  }
  if (!Array.isArray(authoredCase.loads) || authoredCase.loads.length === 0) {
    throw physicalCaseError(CODE, 'authoredCase.loads must be a non-empty array.', {});
  }
}
