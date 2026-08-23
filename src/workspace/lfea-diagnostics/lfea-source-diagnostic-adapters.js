import { buildLfeaDiagnosticPresentation } from './lfea-diagnostic-presentation.js';

/**
 * Source labels are provenance only. Both adapters delegate to the same
 * governed-preparation projection and therefore cannot change disposition.
 */
export function buildInputXmlDiagnosticPresentation(preFlight, metadata = {}) {
  return buildLfeaDiagnosticPresentation(preFlight, {
    ...metadata,
    sourceKind: 'INPUTXML',
  });
}

export function buildAccdbDiagnosticPresentation(preFlight, metadata = {}) {
  return buildLfeaDiagnosticPresentation(preFlight, {
    ...metadata,
    sourceKind: 'ACCDB',
  });
}
