/** Presentation-only labels for canonical LAFEA workbench reason codes. */
const REASON_LABELS = Object.freeze({
  ANALYSIS_DOMAIN_NOT_CURRENT: 'The analysis domain is not current.',
  ANALYSIS_MESH_ABSENT: 'Required analysis mesh evidence is absent.',
  ANALYSIS_MESH_CUSTODY_ABSENT: 'Analysis mesh custody has not been established.',
  ANALYSIS_MESH_EVIDENCE_ABSENT: 'Required analysis mesh evidence is absent.',
  ANALYSIS_MESH_QUALITY_BLOCK: 'The retained analysis mesh is blocked by quality checks.',
  ANALYSIS_MESH_WARNING_REVIEW_REQUIRED: 'Review the retained mesh warning before authorization.',
  ANALYSIS_PROFILE_BINDING_REQUIRED: 'Bind a valid analysis profile before continuing.',
  BOUNDARY_CONDITIONS_REQUIRED: 'Define the required restraints or boundary conditions.',
  CANONICAL_AUTHORIZATION_NOT_READY: 'Canonical analysis authorization is not ready.',
  CANONICAL_MODEL_NOT_CURRENT: 'The canonical analysis model is not current.',
  CANONICAL_SOLVER_MODEL_NOT_COMPILED: 'The canonical solver model has not been compiled.',
  CANONICAL_SOLVER_MODEL_NOT_CURRENT: 'The canonical solver model is not current.',
  EXECUTION_NOT_RUN: 'The analysis has not been run.',
  EXECUTION_REQUIRED: 'Run a qualified analysis before viewing governed results.',
  LAFEA_PREPARATION_NOT_AUTHORIZED: 'Preparation evidence is not authorized for solve.',
  LAFEA_PREPARATION_PROJECTION_ABSENT: 'Preparation evidence has not been established.',
  LIFECYCLE_NOT_INITIALIZED: 'Initialize lifecycle authority for the source document.',
  LIFECYCLE_SOURCE_BINDING_STALE: 'The lifecycle source binding is stale; re-establish current source authority.',
  LOAD_CASES_REQUIRED: 'Define at least one governed load or physical case.',
  MATERIALS_REQUIRED: 'Define at least one governed material or section basis.',
  RELEASE_NOT_QUALIFIED: 'Release qualification has not been established.',
  RESULT_EVIDENCE_NOT_CURRENT: 'Result evidence is not current for the active analysis.',
  SOURCE_AUTHORITY_REQUIRED: 'Current source authority is required.',
  SOURCE_DOCUMENT_ABSENT: 'Import or create a valid source document.',
  SOURCE_DOCUMENT_REQUIRED: 'Import or create a valid source document.',
  STAGE_ENGINE_NOT_IMPLEMENTED: 'The analysis engine for this stage is not implemented.',
  UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED: 'Calculation is not implemented for this analysis stage.',
  WORKFLOW_INPUT_CONTRACT_NOT_DECLARED: 'This workflow input contract has not been declared for the active stage.',
  WORKFLOW_STEP_NOT_APPLICABLE: 'This workflow step is not applicable to the active analysis stage.',
});

export function lafeaWorkbenchReasonLabel(value) {
  if (typeof value !== 'string' || !value.trim()) return 'Additional engineering evidence is required.';
  return REASON_LABELS[value] ?? fallbackLabel(value);
}

export function lafeaWorkbenchReasonLabels(values) {
  if (!Array.isArray(values)) return [];
  return values.filter(Boolean).map(lafeaWorkbenchReasonLabel);
}

function fallbackLabel(value) {
  const text = value
    .replace(/^LAFEA_/u, '')
    .replaceAll('_', ' ')
    .toLowerCase();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
