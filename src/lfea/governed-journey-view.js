export function mountLfeaGovernedJourneyView({ reviewRoot, modelRoot, analysisRoot }) {
  for (const [name, root] of Object.entries({ reviewRoot, modelRoot, analysisRoot })) {
    if (!root?.ownerDocument) throw new TypeError(`${name} is required.`);
  }

  let current = null;

  function update(projection) {
    current = projection;
    renderReview(reviewRoot, projection.review);
    renderModel(modelRoot, projection.model);
    renderAnalysis(analysisRoot, projection.analysis);
    return projection;
  }

  function destroy() {
    current = null;
    reviewRoot.replaceChildren();
    modelRoot.replaceChildren();
    analysisRoot.replaceChildren();
  }

  return Object.freeze({
    update,
    getProjection: () => current,
    destroy,
  });
}

function renderReview(root, review) {
  const doc = root.ownerDocument;
  const section = panel(doc, 'Review', review.status,
    'Review state is projected from the sealed native InputXML diagnostics, preparation and solve-authorization records.');
  section.append(factTable(doc, [
    ['Ready to review', yesNo(review.readyToReview)],
    ['Pre-flight', review.preFlightStatus],
    ['Solve authorization', review.solveAuthorized ? 'SEALED' : 'NOT AUTHORIZED'],
    ['Findings', review.findingCount],
    ['Blocking findings', review.blockingFindingCount],
    ['Conditional findings', review.conditionalFindingCount],
    ['Approver', review.approverIdentity],
    ['Diagnostics identity', review.diagnosticsSemanticHash],
    ['Preparation identity', review.preparationSemanticHash],
    ['Authorization identity', review.authorizationSemanticHash],
  ]));
  appendCodeList(doc, section, 'Accepted limitations', review.limitationsAccepted);
  appendFindings(doc, section, review.findings);
  root.replaceChildren(section);
}

function renderModel(root, model) {
  const doc = root.ownerDocument;
  const section = panel(doc, 'Model authority', model.status,
    'This view reports the compiled engineering identities retained by pre-FEA preparation; it does not reconstruct model authority from display values.');
  section.append(factTable(doc, [
    ['Nodes', model.nodeCount],
    ['Elements', model.elementCount],
    ['Material resolutions', model.materialResolutionCount],
    ['Section resolutions', model.sectionResolutionCount],
    ['Constraints', model.constraintCount],
    ['Physical cases', model.physicalCaseCount],
    ['Source bundle identity', model.sourceBundleSemanticHash],
    ['Mechanical model identity', model.modelSemanticHash],
    ['Stiffness identity', model.stiffnessStateHash],
    ['Load identity', model.loadStateHash],
  ]));

  const heading = doc.createElement('h3');
  heading.textContent = 'Compiled physical cases';
  section.append(heading);
  if (!model.physicalCases.length) {
    section.append(message(doc, 'No compiled physical case is available.'));
  } else {
    const table = doc.createElement('table');
    table.className = 'lfea-journey-table';
    const head = doc.createElement('tr');
    for (const label of ['Case', 'Role', 'Load-case identity', 'Physical-load identity']) {
      const th = doc.createElement('th');
      th.textContent = label;
      head.append(th);
    }
    table.append(head);
    for (const row of model.physicalCases) {
      const tr = doc.createElement('tr');
      for (const value of [row.caseId, row.caseRole, row.loadCaseSemanticHash, row.physicalLoadCaseHash]) {
        const td = doc.createElement('td');
        td.textContent = display(value);
        tr.append(td);
      }
      table.append(tr);
    }
    section.append(table);
  }
  root.replaceChildren(section);
}

function renderAnalysis(root, analysis) {
  const doc = root.ownerDocument;
  const section = panel(doc, 'Analysis authority', analysis.status,
    'Authorization and execution are deliberately separate. This slice can prove reviewed execution eligibility, but native solver handoff remains disconnected until the next governed execution slice.');
  section.append(factTable(doc, [
    ['Analysis profile', analysis.requestedProfileId],
    ['Requested cases', analysis.requestedCaseIds.join(', ') || null],
    ['Authorized physical cases', analysis.authorizedPhysicalCaseIds.join(', ') || null],
    ['Ready to review', yesNo(analysis.readyToReview)],
    ['Solve authorization', analysis.solveAuthorized ? 'SEALED' : 'NOT AUTHORIZED'],
    ['Ready for execution handoff', yesNo(analysis.readyForExecutionHandoff)],
    ['Native execution connected', yesNo(analysis.nativeExecutionConnected)],
    ['Ready to run', yesNo(analysis.readyToRun)],
    ['Authorization identity', analysis.authorizationSemanticHash],
    ['Model identity', analysis.modelSemanticHash],
    ['Stiffness identity', analysis.stiffnessStateHash],
    ['Load identity', analysis.loadStateHash],
  ]));
  appendCodeList(doc, section, 'Retained limitations', analysis.limitationCodes);

  const boundary = doc.createElement('p');
  boundary.className = 'lfea-journey-boundary';
  boundary.dataset.role = 'lfea-native-execution-boundary';
  boundary.textContent = analysis.readyForExecutionHandoff
    ? 'Reviewed pre-FEA authority is sealed. Native solve execution is intentionally NOT CONNECTED in this slice.'
    : 'Native solve execution is blocked until the governed source/review/model authorization chain is complete.';
  section.append(boundary);
  root.replaceChildren(section);
}

function appendFindings(doc, section, findings) {
  const heading = doc.createElement('h3');
  heading.textContent = 'Retained engineering findings';
  section.append(heading);
  if (!Array.isArray(findings) || findings.length === 0) {
    section.append(message(doc, 'No retained findings.'));
    return;
  }

  const table = doc.createElement('table');
  table.className = 'lfea-journey-table lfea-journey-findings';
  const head = doc.createElement('tr');
  for (const label of ['Disposition', 'Code', 'Category', 'Finding', 'Remediation', 'Cases / entities']) {
    const th = doc.createElement('th');
    th.textContent = label;
    head.append(th);
  }
  table.append(head);

  for (const finding of findings) {
    const tr = doc.createElement('tr');
    tr.dataset.disposition = finding.disposition ?? 'UNKNOWN';
    const affected = [
      ...(finding.physicalCaseIds ?? []).map((value) => `case:${value}`),
      ...(finding.canonicalEntityIds ?? []).map((value) => `entity:${value}`),
      ...(finding.sourceFeatureIds ?? []).map((value) => `source:${value}`),
    ].join(', ');
    for (const value of [
      finding.disposition,
      finding.code,
      finding.category,
      finding.message,
      finding.remediation,
      affected || null,
    ]) {
      const td = doc.createElement('td');
      td.textContent = display(value);
      tr.append(td);
    }
    table.append(tr);
  }
  section.append(table);
}

function panel(doc, titleText, status, explanation) {
  const section = doc.createElement('section');
  section.className = 'lfea-journey-panel';
  section.dataset.status = status;

  const header = doc.createElement('header');
  header.className = 'lfea-journey-panel__header';
  const title = doc.createElement('h2');
  title.textContent = titleText;
  const badge = doc.createElement('span');
  badge.className = 'lfea-journey-status';
  badge.textContent = status;
  header.append(title, badge);
  const intro = message(doc, explanation);
  section.append(header, intro);
  return section;
}

function factTable(doc, rows) {
  const table = doc.createElement('table');
  table.className = 'lfea-journey-table';
  for (const [label, value] of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = doc.createElement('td');
    td.textContent = display(value);
    tr.append(th, td);
    table.append(tr);
  }
  return table;
}

function appendCodeList(doc, section, label, values) {
  const heading = doc.createElement('h3');
  heading.textContent = label;
  section.append(heading);
  if (!Array.isArray(values) || values.length === 0) {
    section.append(message(doc, 'None retained.'));
    return;
  }
  const list = doc.createElement('ul');
  list.className = 'lfea-journey-list';
  for (const value of values) {
    const item = doc.createElement('li');
    const code = doc.createElement('code');
    code.textContent = String(value);
    item.append(code);
    list.append(item);
  }
  section.append(list);
}

function message(doc, text) {
  const p = doc.createElement('p');
  p.className = 'lfea-journey-copy';
  p.textContent = text;
  return p;
}

function yesNo(value) {
  return value ? 'YES' : 'NO';
}

function display(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}
