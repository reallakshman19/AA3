import { nativeB31ResultsPanel } from './native-b31-results-view.js';
import { mountLfeaNativeResultsView } from './native-results-view.js';

/** Compose read-only downstream B31 publication into the existing Results surface. */
export function mountLfeaNativeResultsCompositeView(root, options = {}) {
  const onExportResultsCsv = typeof options.onExportResultsCsv === 'function' ? options.onExportResultsCsv : null;
  const base = mountLfeaNativeResultsView(root);
  let current = null;
  function update(
    executionState,
    resultsState,
    publicationReadiness = null,
    supportPublicationState = null,
    b31PublicationState = null,
  ) {
    base.update(
      executionState,
      resultsState,
      publicationReadiness,
      supportPublicationState,
    );
    current = {
      executionState,
      resultsState,
      publicationReadiness,
      supportPublicationState,
      b31PublicationState,
    };
    const section = root.firstElementChild;
    if (section && resultsState?.currentness === 'CURRENT' && resultsState.results) {
      section.append(exportBar(root.ownerDocument, onExportResultsCsv));
    }
    if (section && b31PublicationState) {
      section.append(nativeB31ResultsPanel(root.ownerDocument, b31PublicationState));
    }
    return current;
  }
  return Object.freeze({
    update,
    getState: () => current,
    destroy() {
      current = null;
      base.destroy();
    },
  });
}

function exportBar(doc, onExportResultsCsv) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'lfea-analysis-actions';
  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.role = 'lfea-export-results-csv';
  button.textContent = 'Export results (CSV)';
  button.disabled = typeof onExportResultsCsv !== 'function';
  button.addEventListener('click', () => onExportResultsCsv?.());
  wrapper.append(button);
  return wrapper;
}
