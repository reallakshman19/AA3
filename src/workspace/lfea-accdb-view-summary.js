

import { renderCapabilities, renderPreFlight } from './lfea-accdb-view-verdict.js';
import { renderFindingGroups } from './lfea-accdb-view-findings.js';
import { renderOverrideSection } from './lfea-accdb-view-properties.js';
export function renderAccdbSourceSummary(doc, root, controller) {
  root.replaceChildren();
  const sourceView = doc.createElement('div');
  sourceView.dataset.role = 'lfea-pipeline-accdb-source-view';
  const reviewView = doc.createElement('div');
  reviewView.dataset.role = 'lfea-pipeline-accdb-review-view';
  root.append(sourceView, reviewView);

  const disclosure = doc.createElement('p');
  disclosure.dataset.role = 'accdb-identity-disclosure';
  disclosure.textContent = [
    'ACCDB elements never carried a native CAESAR II PIPINGELEMENT XML tag.',
    'This panel assigns each ACCDB element a synthetic PIPINGELEMENT[i] identity',
    'only to satisfy the shared model-health contract InputXML and StagedJSON already use.',
    'Node/element geometry itself is read directly from the ACCDB tables, not fabricated.',
  ].join(' ');
  sourceView.append(disclosure);

  if (!controller.sourceBundle) {
    const empty = doc.createElement('p');
    empty.textContent = 'No ACCDB source is loaded.';
    sourceView.append(empty);
    // Error check has nothing to review until a file is read, and says so
    // there rather than looking empty for no stated reason.
    const noReview = doc.createElement('p');
    noReview.dataset.role = 'lfea-pipeline-accdb-review-empty';
    noReview.textContent = 'No ACCDB source is loaded, so there is nothing to check yet. Import one on the Input step.';
    reviewView.append(noReview);
    return;
  }

  const rows = [];
  rows.push(['File', controller.fileName]);
  rows.push(['Format', 'CAESAR II ACCDB (linear geometry extraction only)']);
  rows.push(['Elements', String(controller.sourceBundle.elementRecords.length)]);
  rows.push(['Nodes', String(controller.sourceBundle.geometry.nodes.length)]);
  rows.push(['Segments', String(controller.sourceBundle.geometry.segments.length)]);
  rows.push(['Length unit', controller.sourceBundle.unitSystem.lengthUnit]);

  const table = doc.createElement('table');
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = doc.createElement('td');
    td.textContent = value;
    tr.append(th, td);
    table.append(tr);
  }
  sourceView.append(table);

  if (controller.healthView) {
    renderCapabilities(doc, reviewView, controller);
    renderPreFlight(doc, reviewView, controller);
    renderFindingGroups(doc, reviewView, controller);
  }

  if (controller.engineeringSanity) {
    const sanityHeading = doc.createElement('strong');
    sanityHeading.textContent = `Engineering sanity findings — ${controller.engineeringSanity.summary.findingCount}`;
    reviewView.append(sanityHeading);
  }

  // The property table is about the file's own values, so it belongs with the
  // file on the Input step.
  renderOverrideSection(doc, sourceView, controller);
}
