/** Presentation-only compaction for retained-mesh refinement controls. */
export function compactLafeaRefinementWorkspace(host, model) {
  if (!host?.ownerDocument) throw new TypeError('LAFEA_REFINEMENT_DISCLOSURE_HOST_REQUIRED');
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
