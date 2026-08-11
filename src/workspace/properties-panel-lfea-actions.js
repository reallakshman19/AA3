/**
 * LFEA support-action state held by the properties panel.
 *
 * Extracted so properties-panel.js stays inside the 300 physical line budget.
 * This owns only retained state and its staleness flag; it renders nothing,
 * subscribes to nothing, and mutates no shared model. The panel remains the
 * single subscriber and passes payloads in.
 */
export function createLfeaSupportActionsState() {
  let actions = null;
  let sourceContext = null;
  let invalidated = false;

  return {
    /** A new sealed LFEA source replaces the context and clears staleness. */
    applySourceChanged(payload) {
      sourceContext = Object.freeze({
        sourceSemanticHash: payload.sourceSemanticHash,
        modelVersion: payload.modelVersion,
      });
      invalidated = false;
    },

    /**
     * Retain published actions. The context is adopted from the payload only
     * when none has been seen yet, so a source event already received stays
     * authoritative over the payload's own identity fields.
     */
    applySupportActions(payload) {
      actions = Object.freeze(structuredClone(payload));
      invalidated = false;
      if (sourceContext === null) {
        sourceContext = Object.freeze({
          sourceSemanticHash: payload.sourceSemanticHash,
          modelVersion: payload.modelVersion,
        });
      }
    },

    /**
     * Geometry moved under a published result. Retain the numbers but mark them
     * stale so the panel can say so rather than showing them as current.
     * Invalidating before anything was published is a no-op.
     */
    invalidate() {
      if (actions === null) return false;
      invalidated = true;
      return true;
    },

    clear() {
      actions = null;
      sourceContext = null;
      invalidated = false;
    },

    get actions() { return actions; },
    get sourceContext() { return sourceContext; },
    get invalidated() { return invalidated; },
  };
}
