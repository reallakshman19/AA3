/**
 * Read-only DOM renderer for one governed pre-FEA readiness/authorization record.
 *
 * This module formats dispositions and sealed receipt identifiers that the
 * pre-FEA authorities already decided. It classifies nothing, folds nothing
 * and authorizes nothing.
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
  view.dataset.solveAuthorized = check.solveAuthorized ? 'true' : 'false';
  view.append(
    renderHeader(documentRef, check),
    ...check.cases.map((entry) => renderCase(documentRef, entry)),
  );
  root.dataset.status = check.status;
  root.dataset.solveAuthorized = check.solveAuthorized ? 'true' : 'false';
  root.replaceChildren(view);
  return view;
}

function renderHeader(doc, check) {
  const header = element(doc, 'header', 'linear-piping-prerun__header');
  const title = element(doc, 'h3');
  title.textContent = `Pre-run gate — ${check.applicationId}`;
  const state = element(doc, 'p', 'linear-piping-prerun__state');
  state.textContent = [
    `Readiness: ${check.status}`,
    `Profile: ${check.requestedProfileId}`,
    `Cases: ${check.cases.length}`,
    check.solveAuthorized ? 'Run authorization: SEALED' : 'Run authorization: NOT READY',
  ].join(' | ');
  const receipt = element(doc, 'p', 'linear-piping-prerun__receipt');
  receipt.textContent = [
    `Run request hash: ${check.runRequestSemanticHash}`,
    `Gate hash: ${check.gateSemanticHash}`,
    `Source hashes: ${check.sourceBundleSemanticHashes.join(', ') || 'unavailable'}`,
  ].join(' | ');
  const policy = element(doc, 'p', 'linear-piping-prerun__policy');
  if (check.status === 'BLOCK') {
    policy.textContent = 'BLOCK — solver runtime is prohibited and no bypass is available.';
  } else if (check.status === 'WARN' && !check.solveAuthorized) {
    policy.textContent = 'WARN — explicit engineer acceptance of the complete retained limitation set is required.';
  } else if (check.status === 'WARN') {
    policy.textContent = 'WARN — conditional authorization is sealed with reviewer identity and accepted limitations.';
  } else {
    policy.textContent = 'PASS — automatic PASS authorization is sealed under system policy.';
  }
  header.append(title, state, receipt, policy);
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

  const custody = element(doc, 'p', 'linear-piping-prerun__custody');
  custody.textContent = [
    `Diagnostics: ${entry.diagnosticsId ?? 'unavailable'} / ${entry.diagnosticsSemanticHash ?? 'unavailable'}`,
    `Preparation: ${entry.preparationId ?? 'unavailable'} / ${entry.preparationSemanticHash ?? 'unavailable'}`,
    `Authorization: ${entry.authorizationId ?? 'not sealed'} / ${entry.authorizationSemanticHash ?? 'not sealed'}`,
  ].join(' | ');
  section.append(custody);

  if (entry.summary) {
    const counts = element(doc, 'p', 'linear-piping-prerun__counts');
    counts.textContent = [
      `Nodes ${entry.summary.sourceNodeCount ?? 'n/a'}`,
      `Elements ${entry.summary.sourceElementCount ?? 'n/a'}`,
      `Blocked capabilities ${entry.summary.blockedCapabilityIds?.length ?? 0}`,
      `Conditional capabilities ${entry.summary.conditionalCapabilityIds?.length ?? 0}`,
      `Missing authority ${entry.summary.missingAuthorityCount ?? 0}`,
      `Unsupported features ${entry.summary.unsupportedFeatureCount ?? 0}`,
    ].join(' | ');
    section.append(counts);
  }

  if (entry.limitations.length > 0) {
    const limitations = element(doc, 'p', 'linear-piping-prerun__limitations');
    limitations.textContent = `Retained limitations: ${entry.limitations.join(', ')}`;
    section.append(limitations);
  }
  if (entry.limitationsAccepted.length > 0) {
    const accepted = element(doc, 'p', 'linear-piping-prerun__accepted-limitations');
    accepted.textContent = [
      `Accepted by ${entry.approverIdentity}`,
      entry.limitationsAccepted.join(', '),
    ].join(' | ');
    section.append(accepted);
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
