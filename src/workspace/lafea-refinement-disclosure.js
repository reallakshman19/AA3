/** Presentation-only compaction for secondary Discretization controls. */
const CURRENT_MESH_GENERATION_PHASES = new Set([
  'MESH_CURRENT_PASS',
  'MESH_CURRENT_WARNING',
]);

/**
 * Compatibility entry point retained for the workbench integration added by PR1334.
 * It now performs all presentation-only Discretization compaction in one pass.
 */
export function compactLafeaRefinementWorkspace(host, model) {
  if (!host?.ownerDocument) throw new TypeError('LAFEA_REFINEMENT_DISCLOSURE_HOST_REQUIRED');
  humanizeDiscretizationAdvance(host, model);
  compactLafeaCurrentGenerationWorkspace(host, model);
  return compactRefinementWorkspace(host, model);
}

/**
 * Keep the canonical advance handler/gate unchanged while presenting the action
 * in engineer-facing language. The underlying operation may prepare governed
 * solve evidence or navigate to the existing Solve readiness surface.
 */
export function humanizeDiscretizationAdvance(host, model) {
  if (!host?.ownerDocument) throw new TypeError('LAFEA_DISCRETIZATION_ADVANCE_HOST_REQUIRED');
  const advance = host.querySelector('[data-role="lafea-discretization-advance"]');
  if (!advance) return null;
  advance.textContent = 'Check solve readiness';
  advance.title = model?.actions?.warningReviewRequired
    ? 'Review the current mesh warnings before checking solve readiness.'
    : model?.actions?.canAdvance === true
      ? 'Check the current analysis inputs and mesh before solving.'
      : 'Resolve the current mesh findings before checking solve readiness.';
  return advance;
}

/**
 * Once a retained mesh is current, mesh generation is no longer the engineer's
 * primary task. Preserve the canonical generation renderer unchanged, but move
 * it behind an explicit Change mesh disclosure. Blocked/stale/not-ready states
 * remain expanded so recovery controls are not hidden.
 */
export function compactLafeaCurrentGenerationWorkspace(host, model) {
  if (!host?.ownerDocument) throw new TypeError('LAFEA_GENERATION_DISCLOSURE_HOST_REQUIRED');
  if (!currentGenerationCompactionRequired(model)) return null;

  const generation = host.querySelector('[data-discretization-section="generation"]');
  if (!generation) return null;
  if (generation.parentElement?.dataset?.role === 'lafea-generation-disclosure') {
    return generation.parentElement;
  }

  const doc = host.ownerDocument;
  const details = doc.createElement('details');
  details.className = 'lafea-discretization__generation-disclosure';
  details.dataset.role = 'lafea-generation-disclosure';
  details.dataset.meshState = String(model?.state ?? 'UNKNOWN');
  details.dataset.uiPhase = String(model?.uiPhase ?? 'UNKNOWN');

  const summary = doc.createElement('summary');
  summary.dataset.role = 'lafea-generation-disclosure-summary';
  summary.textContent = generationDisclosureSummary(model);
  summary.title = 'Open the governed mesh configuration, preview and regeneration controls.';
  details.append(summary);

  generation.replaceWith(details);
  details.append(generation);
  return details;
}

export function currentGenerationCompactionRequired(model) {
  return model?.evidence?.present === true
    && CURRENT_MESH_GENERATION_PHASES.has(model?.uiPhase);
}

export function generationDisclosureSummary(model) {
  return model?.generation?.generationMode === 'SOURCE_MESH_ADOPTION'
    ? 'Change source-mesh adoption'
    : 'Change mesh';
}

function compactRefinementWorkspace(host, model) {
  const refinement = host.querySelector('[data-role="lafea-retained-mesh-refinement"]');
  if (!refinement) return null;
  if (refinement.parentElement?.dataset?.role === 'lafea-refinement-disclosure') {
    return refinement.parentElement;
  }

  const doc = host.ownerDocument;
  const details = doc.createElement('details');
  details.className = 'lafea-discretization__refinement-disclosure';
  details.dataset.role = 'lafea-refinement-disclosure';
  details.dataset.enabled = String(model?.actions?.canRefineMesh === true);
  details.dataset.productScopeEligible = String(model?.refinement?.scopeEligible === true);
  details.dataset.productQualified = String(model?.refinement?.productQualified === true);

  const summary = doc.createElement('summary');
  summary.dataset.role = 'lafea-refinement-disclosure-summary';
  summary.textContent = refinementSummary(model);
  summary.title = 'Open governed retained-mesh refinement controls and supporting qualification evidence.';
  details.append(summary);

  refinement.replaceWith(details);
  details.append(refinement);

  const productEvidence = refinement.querySelector(
    '[data-role="lafea-product-refinement-qualification-evidence"]',
  );
  if (productEvidence) productEvidence.open = false;

  return details;
}

export function refinementSummary(model) {
  if (model?.evidence?.present !== true) return 'Refine retained mesh — mesh required';
  if (model?.actions?.canRefineMesh === true) return 'Refine retained mesh';
  if (model?.refinement?.scopeEligible === true && model?.refinement?.productQualified !== true) {
    return 'Refine retained mesh — qualification pending';
  }
  return 'Refine retained mesh — unavailable';
}
