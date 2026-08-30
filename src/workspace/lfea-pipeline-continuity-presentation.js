export const LFEA_PIPELINE_CONTINUITY_PRESENTATION_SCHEMA = 'lfea-pipeline-continuity-presentation/v1';

/**
 * Presentation-only hierarchy/copy adapter for the pipeline shell.
 * It changes no data-role/action callback and no source/pre-flight record.
 */
export function mountLfeaPipelineContinuityPresentation(shellElement) {
  if (!shellElement || typeof shellElement.querySelector !== 'function') {
    throw new TypeError('Pipeline continuity presentation requires the shell element.');
  }
  const doc = shellElement.ownerDocument;
  const sourceHost = shellElement.querySelector('[data-host-group="SOURCE"]');
  const onSourceRefresh = () => syncSourceContinuity(sourceHost, doc);

  syncToolbarHierarchy(shellElement, doc);
  syncSourceContinuity(sourceHost, doc);
  sourceHost?.addEventListener?.('lfea-source-presentation-refresh', onSourceRefresh);

  return Object.freeze({
    schema: LFEA_PIPELINE_CONTINUITY_PRESENTATION_SCHEMA,
    refresh() {
      syncToolbarHierarchy(shellElement, doc);
      syncSourceContinuity(sourceHost, doc);
    },
    destroy() { sourceHost?.removeEventListener?.('lfea-source-presentation-refresh', onSourceRefresh); },
  });
}

function syncToolbarHierarchy(shell, doc) {
  const toolbar = shell.querySelector('.lfea-pipeline-shell__toolbar');
  const authority = toolbar?.querySelector('.lfea-pipeline-shell__authority');
  const codeChecks = toolbar?.querySelector('[data-action="lfea-pipeline-assemble-and-run"]');
  if (!toolbar || !authority || !codeChecks) return;

  if (!toolbar.querySelector('[data-role="lfea-pipeline-optional-tools-label"]')) {
    const label = doc.createElement('span');
    label.className = 'lfea-pipeline-shell__toolbar-status';
    label.dataset.role = 'lfea-pipeline-optional-tools-label';
    label.textContent = 'Optional tools';
    label.title = 'These controls are not part of the normal Input → Error check → Load case → Run → Output → Export path.';
    toolbar.insertBefore(label, authority);
  }
  authority.title = 'Optional governed authority supplement for interface/B31 code checks. Normal LFEA analysis does not require it.';
  codeChecks.title = 'Optional interface/B31 code checks. Normal LFEA analysis uses the Run step.';
}

function syncSourceContinuity(sourceHost, doc) {
  if (!sourceHost) return;
  const sourceSection = sourceHost.querySelector('[data-role="lfea-source-acquisition"]');
  const stagedLabel = sourceSection?.querySelector('.lfea-source-acquisition__staged-option');
  if (stagedLabel && stagedLabel.tagName === 'LABEL' && !stagedLabel.closest('[data-role="lfea-source-acquisition-staged-options"]')) {
    const input = stagedLabel.querySelector('[data-role="lfea-source-acquisition-staged-infer-od"]');
    const details = doc.createElement('details');
    details.className = 'lfea-source-acquisition__staged-option';
    details.dataset.role = 'lfea-source-acquisition-staged-options';
    const summary = doc.createElement('summary');
    summary.textContent = 'StagedJSON options';
    const option = doc.createElement('label');
    option.className = 'lfea-source-acquisition__staged-option-choice';
    if (input) option.append(input, doc.createTextNode(' Infer missing OD from nominal bore'));
    details.append(summary, option);
    stagedLabel.replaceWith(details);
  }

  const errorCheck = sourceHost.querySelector('[data-role="lfea-common-error-check-panel"]');
  const heading = errorCheck?.querySelector('.lfea-common-error-check__header h3');
  if (heading) heading.textContent = 'Error check';
  const summary = errorCheck?.querySelector('[data-role="lfea-common-error-check-summary"]');
  if (summary?.textContent === 'Load and prepare a model to review governed engineering findings.') {
    summary.textContent = 'Return to Input and load a source model to start Error check.';
  }
  const empty = errorCheck?.querySelector('[data-role="lfea-common-error-check-empty"]');
  if (empty) {
    empty.textContent = 'No governed pre-flight is available yet. Return to Input to load or repair the source model; source intake errors remain visible there.';
  }
}
