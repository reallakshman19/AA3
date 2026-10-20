/**
 * DOM construction for the LFEA common Error Check panel root section.
 */

export function createErrorCheckElements(doc) {
  const section = doc.createElement('section');
  section.className = 'lfea-common-error-check';
  section.dataset.role = 'lfea-common-error-check-panel';
  section.dataset.solveAuthorized = 'false';

  const header = doc.createElement('header');
  header.className = 'lfea-common-error-check__header';
  const heading = doc.createElement('h3');
  heading.textContent = 'Error Check';
  const summary = doc.createElement('p');
  summary.className = 'lfea-common-error-check__summary';
  summary.dataset.role = 'lfea-common-error-check-summary';
  const status = doc.createElement('span');
  status.className = 'lfea-common-error-check__status';
  status.dataset.role = 'lfea-common-error-check-status';
  header.append(heading, summary, status);

  const filters = doc.createElement('nav');
  filters.className = 'lfea-common-error-check__filters';
  filters.dataset.role = 'lfea-common-error-check-filters';

  const workspaceHost = doc.createElement('div');
  workspaceHost.className = 'lfea-common-error-check__workspace';
  workspaceHost.dataset.role = 'lfea-common-error-check-workspace';

  const body = doc.createElement('div');
  body.className = 'lfea-common-error-check__body';
  body.dataset.role = 'lfea-common-error-check-body';

  const authorization = doc.createElement('aside');
  authorization.className = 'lfea-common-error-check__authorization';
  authorization.dataset.role = 'lfea-common-error-check-authorization';

  const evidence = doc.createElement('aside');
  evidence.className = 'lfea-common-error-check__evidence';
  evidence.dataset.role = 'lfea-common-error-check-evidence';

  section.append(header, filters, workspaceHost, body, authorization, evidence);
  return { section, summary, status, filters, workspaceHost, body, authorization, evidence };
}
