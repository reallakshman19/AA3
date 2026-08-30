import { lfeaPipelineIcon } from './lfea-pipeline-icon-manifest.js';

export const LFEA_PIPELINE_RESULTS_SORT_PRESENTATION_SCHEMA = 'lfea-pipeline-results-sort-presentation/v1';

/** Read-only presentation adapter for result sort state and legacy export chrome. */
export function mountLfeaPipelineResultsSortPresentation(resultsHost) {
  if (!resultsHost || typeof resultsHost.querySelector !== 'function') throw new TypeError('Results sort presentation requires a results host.');
  const doc = resultsHost.ownerDocument;
  const Observer = doc.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  let syncing = false;

  const sync = () => {
    if (syncing) return;
    syncing = true;
    try {
      const legacyExport = resultsHost.querySelector('.lfea-pipeline-results__export');
      if (legacyExport) legacyExport.hidden = true;
      for (const table of resultsHost.querySelectorAll('[data-role="lfea-pipeline-results-table"]')) {
        const sortColumn = table.dataset.sortColumn ?? '';
        const sortDirection = table.dataset.sortDirection ?? 'ASC';
        for (const button of table.querySelectorAll('[data-role="lfea-pipeline-results-sort"]')) {
          const columnKey = button.dataset.columnKey ?? '';
          const active = columnKey === sortColumn;
          const rawLabel = button.textContent.replace(/\s*[▲▼]\s*$/u, '').trim();
          if (button.dataset.presentationLabel !== rawLabel || button.dataset.presentationActive !== String(active)
            || button.dataset.presentationDirection !== sortDirection) {
            button.dataset.presentationLabel = rawLabel;
            button.dataset.presentationActive = String(active);
            button.dataset.presentationDirection = sortDirection;
            const label = doc.createElement('span');
            label.textContent = rawLabel;
            button.replaceChildren(label);
            const header = button.closest('th');
            if (active) {
              const icon = lfeaPipelineIcon(doc, sortDirection === 'ASC' ? 'icon-sort-asc' : 'icon-sort-desc');
              icon.setAttribute('width', '11');
              icon.setAttribute('height', '11');
              icon.setAttribute('aria-hidden', 'true');
              icon.style.marginInlineStart = '4px';
              button.append(icon);
              button.setAttribute('aria-label', `${rawLabel}, sorted ${sortDirection === 'ASC' ? 'ascending' : 'descending'}`);
              header?.setAttribute('aria-sort', sortDirection === 'ASC' ? 'ascending' : 'descending');
            } else {
              button.setAttribute('aria-label', `${rawLabel}, activate to sort`);
              header?.setAttribute('aria-sort', 'none');
            }
          }
        }
      }
    } finally {
      syncing = false;
    }
  };

  const observer = typeof Observer === 'function' ? new Observer(() => sync()) : null;
  observer?.observe(resultsHost, { childList: true, subtree: true });
  sync();
  return Object.freeze({ schema: LFEA_PIPELINE_RESULTS_SORT_PRESENTATION_SCHEMA, refresh: sync, destroy() { observer?.disconnect(); } });
}
