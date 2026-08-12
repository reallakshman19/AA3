import { nativeB31ResultsPanel } from './native-b31-results-view.js';
import { mountLfeaNativeResultsView } from './native-results-view.js';

/** Compose read-only downstream B31 publication into the existing Results surface. */
export function mountLfeaNativeResultsCompositeView(root) {
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
