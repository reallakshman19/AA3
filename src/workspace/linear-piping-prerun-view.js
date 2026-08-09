/**
 * Read-only DOM renderer for one governed pre-FEA readiness record.
 *
 * This module formats dispositions the pre-FEA diagnostics authority already
 * decided. It classifies nothing, folds nothing and authorizes nothing.
 */
export function renderLinearPipingPreRunView(root, check) {
  if (!root || typeof root.replaceChildren !== 'function') {
    throw new TypeError('Linear piping pre-run view requires a DOM root.');
  }
  const documentRef = root.ownerDocument ?? document;
  if (!check) {
    root.dataset.status = 'NOT_RUN';
    root.replaceChildren();
    return null;
  }
  const view = element(documentRef, 'section', 'linear-piping-prerun');
  view.dataset.status = check.status;
  view.append(
    renderHeader(documentRef, check),
    ...check.cases.map((entry) => renderCase(documentRef, entry)),
  );
  root.dataset.status = check.status;
  root.replaceChildren(view);
  return view;
}

function renderHeader(doc, check) {
  const header = element(doc, 'header', 'linear-piping-prerun__header');
  const title = element(doc, 'h3');
  title.textContent = `Pre-run check — ${check.applicationId}`;
  const state = element(doc, 'p', 'linear-piping-prerun__state');
  state.textContent = [
    `Readiness: ${check.status}`,
    `Profile: ${check.requestedProfileId}`,
    `Cases: ${check.cases.length}`,
    check.solveAuthorized
      ? 'No blocking or conditional finding — a solve is worth paying for.'
      : 'Resolve the findings below before running the solve.',
  ].join(' | ');
  header.append(title, state);
  return header;
}

function renderCase(doc, entry) {
  const section = element(doc, 'section', 'linear-piping-prerun__case');
  section.dataset.caseId = entry.caseId;
  section.dataset.status = entry.status;
  const heading = element(doc, 'h4');
  heading.textContent = `${entry.caseId} — ${entry.status}`;
  section.append(heading);

  if (entry.error) {
    const failure = element(doc, 'p', 'linear-piping-prerun__error');
    failure.textContent = `${entry.error.code}: ${entry.error.message}`;
    section.append(failure);
    return section;
  }

  if (entry.summary) {
    const counts = element(doc, 'p', 'linear-piping-prerun__counts');
    counts.textContent = [
      `Nodes ${entry.summary.sourceNodeCount}`,
      `Elements ${entry.summary.sourceElementCount}`,
      `Blocked capabilities ${entry.summary.blockedCapabilityIds.length}`,
      `Conditional capabilities ${entry.summary.conditionalCapabilityIds.length}`,
      `Missing authority ${entry.summary.missingAuthorityCount}`,
      `Unsupported features ${entry.summary.unsupportedFeatureCount}`,
    ].join(' | ');
    section.append(counts);
  }

  if (entry.findings.length === 0) {
    const clean = element(doc, 'p', 'linear-piping-prerun__clean');
    clean.textContent = 'No blocking, conditional or advisory finding.';
    section.append(clean);
    return section;
  }
  section.append(renderFindingTable(doc, entry.findings));
  return section;
}

function renderFindingTable(doc, findings) {
  const table = element(doc, 'table', 'linear-piping-prerun__findings');
  const head = element(doc, 'thead');
  const headRow = element(doc, 'tr');
  for (const label of ['Disposition', 'Severity', 'Category', 'Code', 'Message', 'Remediation']) {
    const cell = element(doc, 'th');
    cell.scope = 'col';
    cell.textContent = label;
    headRow.append(cell);
  }
  head.append(headRow);
  const body = element(doc, 'tbody');
  for (const finding of findings) {
    const row = element(doc, 'tr');
    row.dataset.disposition = finding.disposition;
    for (const text of [
      finding.disposition,
      finding.severity,
      finding.category,
      finding.code,
      finding.message,
      finding.remediation,
    ]) {
      const cell = element(doc, 'td');
      cell.textContent = text;
      row.append(cell);
    }
    body.append(row);
  }
  table.append(head, body);
  return table;
}

function element(doc, tagName, className) {
  const value = doc.createElement(tagName);
  if (className) value.className = className;
  return value;
}
