import {
  LinearPipingInputXmlSourceWorkflowController,
} from '../workspace/linear-piping-inputxml-source-workflow.js';

/**
 * Standalone-only adapter around the existing governed native InputXML source
 * controller. It adds a read-only state notification hook; all source custody,
 * diagnostics, preparation and authorization remain owned by the existing
 * controller/domain chain.
 */
export class LfeaStandaloneInputXmlSourceController
  extends LinearPipingInputXmlSourceWorkflowController {
  constructor(panelContainer, documentRef, onStateChanged) {
    super(panelContainer, documentRef);
    this.onStandaloneStateChanged = typeof onStateChanged === 'function'
      ? onStateChanged
      : null;
  }

  render() {
    super.render();
    this.onStandaloneStateChanged?.(this.getSnapshot(), this.getPreFlight());
  }

  destroy() {
    this.onStandaloneStateChanged = null;
    super.destroy();
  }
}
