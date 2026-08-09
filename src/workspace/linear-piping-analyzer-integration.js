export const LINEAR_PIPING_ANALYZER_INTEGRATION_POLICY = Object.freeze({
  normalWorkflow: 'LFEA_SOURCE_PREFLIGHT',
  standaloneAnalyzerRole: 'DEVELOPER_DIAGNOSTICS_ONLY',
  standaloneExecutionAuthority: false,
});

/**
 * Remove the standalone InputXML Analyzer detour from the normal LFEA surface.
 * The standalone analyze.html utility is intentionally not deleted: it remains
 * available for developer diagnostics and retains its fail-closed solve guard.
 */
export function retireStandaloneInputXmlAnalyzerEntry(applicationRoot) {
  if (!applicationRoot || typeof applicationRoot.querySelector !== 'function') {
    throw new TypeError('Analyzer integration policy requires the application root.');
  }
  const link = applicationRoot.querySelector('[data-role="linear-piping-analyzer-link"]');
  if (!link) {
    return Object.freeze({
      ...LINEAR_PIPING_ANALYZER_INTEGRATION_POLICY,
      normalWorkflowLinkRemoved: false,
      reason: 'LINK_NOT_PRESENT',
    });
  }
  const href = typeof link.getAttribute === 'function'
    ? link.getAttribute('href')
    : link.href ?? null;
  if (typeof link.remove !== 'function') {
    throw new TypeError('Standalone analyzer entry cannot be retired safely.');
  }
  link.remove();
  return Object.freeze({
    ...LINEAR_PIPING_ANALYZER_INTEGRATION_POLICY,
    normalWorkflowLinkRemoved: true,
    retiredHref: href,
    reason: 'NORMAL_WORKFLOW_OWNS_INPUTXML_DIAGNOSTICS',
  });
}
