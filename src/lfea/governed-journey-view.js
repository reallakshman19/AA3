import { DEFAULT_RESTRAINT_TYPE_MUTATION_ROWS } from '../core/geometry/adapters/inputxml-restraint-type-mutation.js';

export function mountLfeaGovernedJourneyView({
  reviewRoot,
  modelRoot,
  analysisRoot,
  onRunNativeAnalysis = null,
}) {
  for (const [name, root] of Object.entries({ reviewRoot, modelRoot, analysisRoot })) {
    if (!root?.ownerDocument) throw new TypeError(`${name} is required.`);
  }
  let current = null;
  function update(projection) {
    current = projection;
    renderReview(reviewRoot, projection.review);
    renderModel(modelRoot, projection.model);
    renderAnalysis(analysisRoot, projection.analysis, onRunNativeAnalysis);
    return projection;
  }
  function destroy() {
    current = null;
    reviewRoot.replaceChildren();
    modelRoot.replaceChildren();
    analysisRoot.replaceChildren();
  }
  return Object.freeze({ update, getProjection: () => current, destroy });
}

function renderReview(root, review) {
  const doc = root.ownerDocument;
  const section = panel(doc, 'Review', review.status,
    'Review state is projected from the sealed native InputXML diagnostics, preparation and solve-authorization records.');
  section.append(factTable(doc, [
    ['Ready to review', yesNo(review.readyToReview)], ['Pre-flight', review.preFlightStatus],
    ['Solve authorization', review.solveAuthorized ? 'SEALED' : 'NOT AUTHORIZED'], ['Findings', review.findingCount],
    ['Blocking findings', review.blockingFindingCount], ['Conditional findings', review.conditionalFindingCount],
    ['Approver', review.approverIdentity], ['Diagnostics identity', review.diagnosticsSemanticHash],
    ['Preparation identity', review.preparationSemanticHash], ['Authorization identity', review.authorizationSemanticHash],
  ]));
  appendCodeList(doc, section, 'Accepted limitations', review.limitationsAccepted);
  appendRestraintMutations(doc, section, review.mutatedRestraints);
  appendFindings(doc, section, review.findings);
  root.replaceChildren(section);
}

function appendRestraintMutations(doc, section, rows) {
  const heading = doc.createElement('h3');
  heading.textContent = 'Restraint TYPE corrections (CAESAR InputXML)';
  section.append(heading, message(doc,
    'Numeric InputXML restraint TYPE values are corrected exactly once, before classification, per the owner-confirmed seven-row export-correction table below. This does not change any restraint XCOSINE/YCOSINE/ZCOSINE direction, only its TYPE code.'));
  const ruleTable = doc.createElement('table');
  ruleTable.className = 'lfea-journey-table lfea-journey-restraint-mutation-rules';
  const ruleHead = doc.createElement('tr');
  for (const label of ['Label', 'From TYPE', 'To TYPE']) {
    const th = doc.createElement('th'); th.textContent = label; ruleHead.append(th);
  }
  ruleTable.append(ruleHead);
  for (const rule of DEFAULT_RESTRAINT_TYPE_MUTATION_ROWS) {
    ruleTable.append(tableRow(doc, [rule.label || '—', rule.from, rule.to]));
  }
  section.append(ruleTable);
  const appliedHeading = doc.createElement('h4');
  appliedHeading.textContent = 'Corrections applied on this source';
  section.append(appliedHeading);
  if (!Array.isArray(rows) || rows.length === 0) {
    section.append(message(doc, 'No restraint TYPE correction matched this source.'));
    return;
  }
  const table = doc.createElement('table');
  table.className = 'lfea-journey-table lfea-journey-restraint-mutations';
  const head = doc.createElement('tr');
  for (const label of ['Node', 'Source TYPE', 'Corrected TYPE', 'Label']) {
    const th = doc.createElement('th'); th.textContent = label; head.append(th);
  }
  table.append(head);
  for (const row of rows) {
    table.append(tableRow(doc, [row.nodeId, row.sourceTypeCode, row.correctedTypeCode, row.mutationLabel]));
  }
  section.append(table);
}

function renderModel(root, model) {
  const doc = root.ownerDocument;
  const section = panel(doc, 'Model authority', model.status,
    'This view reports the compiled engineering identities retained by pre-FEA preparation; it does not reconstruct model authority from display values.');
  section.append(factTable(doc, [
    ['Nodes', model.nodeCount], ['Elements', model.elementCount], ['Material resolutions', model.materialResolutionCount],
    ['Section resolutions', model.sectionResolutionCount], ['Constraints', model.constraintCount], ['Physical cases', model.physicalCaseCount],
    ['Source bundle identity', model.sourceBundleSemanticHash], ['Mechanical model identity', model.modelSemanticHash],
    ['Stiffness identity', model.stiffnessStateHash], ['Load identity', model.loadStateHash],
  ]));
  const heading = doc.createElement('h3');
  heading.textContent = 'Compiled physical cases';
  section.append(heading);
  if (!model.physicalCases.length) section.append(message(doc, 'No compiled physical case is available.'));
  else {
    const table = doc.createElement('table');
    table.className = 'lfea-journey-table';
    const head = doc.createElement('tr');
    for (const label of ['Case', 'Role', 'Load-case identity', 'Physical-load identity']) {
      const th = doc.createElement('th'); th.textContent = label; head.append(th);
    }
    table.append(head);
    for (const row of model.physicalCases) {
      const tr = doc.createElement('tr');
      for (const value of [row.caseId, row.caseRole, row.loadCaseSemanticHash, row.physicalLoadCaseHash]) {
        const td = doc.createElement('td'); td.textContent = display(value); tr.append(td);
      }
      table.append(tr);
    }
    section.append(table);
  }
  root.replaceChildren(section);
}

function renderAnalysis(root, analysis, onRunNativeAnalysis) {
  const doc = root.ownerDocument;
  const section = panel(doc, 'Analysis authority', analysis.status,
    'Reviewed authorization gates the native raw solve. The Run control projects readiness only; the domain gate revalidates current authority on every execution.');
  section.append(factTable(doc, [
    ['Analysis profile', analysis.requestedProfileId],
    ['Requested cases', analysis.requestedCaseIds.join(', ') || null],
    ['Authorized physical cases', analysis.authorizedPhysicalCaseIds.join(', ') || null],
    ['Ready to review', yesNo(analysis.readyToReview)],
    ['Solve authorization', analysis.solveAuthorized ? 'SEALED' : 'NOT AUTHORIZED'],
    ['Native execution connected', yesNo(analysis.nativeExecutionConnected)],
    ['Ready to run', yesNo(analysis.readyToRun)],
    ['Execution currentness', analysis.executionCurrentness],
    ['Execution batch', analysis.executionBatchId],
    ['Execution qualification', analysis.executionStatus],
    ['Executed cases', analysis.executedCaseIds.join(', ') || null],
    ['Current qualified execution', yesNo(analysis.currentQualifiedExecutionAvailable)],
    ['Authorization identity', analysis.authorizationSemanticHash],
    ['Model identity', analysis.modelSemanticHash],
    ['Stiffness identity', analysis.stiffnessStateHash],
    ['Load identity', analysis.loadStateHash],
  ]));
  appendCodeList(doc, section, 'Retained limitations', analysis.limitationCodes);
  appendCodeList(doc, section, 'Execution stale reasons', analysis.staleReasonCodes);
  section.append(runControl(doc, analysis, onRunNativeAnalysis));
  section.append(executionBoundary(doc, analysis));
  root.replaceChildren(section);
}

function runControl(doc, analysis, onRunNativeAnalysis) {
  const wrapper = doc.createElement('div');
  wrapper.className = 'lfea-analysis-actions';
  const button = doc.createElement('button');
  button.type = 'button';
  button.dataset.role = 'lfea-native-run';
  button.textContent = analysis.currentQualifiedExecutionAvailable ? 'Run again' : 'Run native analysis';
  button.disabled = !analysis.readyToRun || typeof onRunNativeAnalysis !== 'function';
  button.addEventListener('click', () => onRunNativeAnalysis?.());
  wrapper.append(button);
  return wrapper;
}

function executionBoundary(doc, analysis) {
  const boundary = doc.createElement('p');
  boundary.className = 'lfea-journey-boundary';
  boundary.dataset.role = 'lfea-native-execution-boundary';
  if (analysis.executionCurrentness === 'STALE') {
    boundary.textContent = 'The retained execution is HISTORIC/STALE relative to current authority. It is not a current result and cannot authorize current recovery or evidence.';
  } else if (analysis.currentQualifiedExecutionAvailable) {
    boundary.textContent = 'A current qualified raw solver execution exists. Governed B-3.4 recovery is a separate Results authority; support-action/code/issue authority remains downstream.';
  } else if (analysis.readyToRun) {
    boundary.textContent = 'Reviewed pre-FEA authority is sealed and native raw solve execution is available.';
  } else {
    boundary.textContent = 'Native solve execution is blocked until the governed source/review/model authorization chain is complete.';
  }
  return boundary;
}

function appendFindings(doc, section, findings) {
  const heading = doc.createElement('h3'); heading.textContent = 'Retained engineering findings'; section.append(heading);
  if (!Array.isArray(findings) || findings.length === 0) { section.append(message(doc, 'No retained findings.')); return; }
  const table = doc.createElement('table'); table.className = 'lfea-journey-table lfea-journey-findings';
  const head = doc.createElement('tr');
  for (const label of ['Disposition', 'Code', 'Category', 'Finding', 'Remediation', 'Cases / entities']) {
    const th = doc.createElement('th'); th.textContent = label; head.append(th);
  }
  table.append(head);
  for (const finding of findings) {
    const tr = doc.createElement('tr'); tr.dataset.disposition = finding.disposition ?? 'UNKNOWN';
    const affected = [...(finding.physicalCaseIds ?? []).map((v) => `case:${v}`),
      ...(finding.canonicalEntityIds ?? []).map((v) => `entity:${v}`),
      ...(finding.sourceFeatureIds ?? []).map((v) => `source:${v}`)].join(', ');
    for (const value of [finding.disposition, finding.code, finding.category, finding.message, finding.remediation, affected || null]) {
      const td = doc.createElement('td'); td.textContent = display(value); tr.append(td);
    }
    table.append(tr);
  }
  section.append(table);
}

function panel(doc, titleText, status, explanation) {
  const section = doc.createElement('section'); section.className = 'lfea-journey-panel'; section.dataset.status = status;
  const header = doc.createElement('header'); header.className = 'lfea-journey-panel__header';
  const title = doc.createElement('h2'); title.textContent = titleText;
  const badge = doc.createElement('span'); badge.className = 'lfea-journey-status'; badge.textContent = status;
  header.append(title, badge); section.append(header, message(doc, explanation)); return section;
}
function factTable(doc, rows) {
  const table = doc.createElement('table'); table.className = 'lfea-journey-table';
  for (const [label, value] of rows) { const tr = doc.createElement('tr'); const th = doc.createElement('th'); th.scope = 'row'; th.textContent = label; const td = doc.createElement('td'); td.textContent = display(value); tr.append(th, td); table.append(tr); }
  return table;
}
function appendCodeList(doc, section, label, values) {
  const heading = doc.createElement('h3'); heading.textContent = label; section.append(heading);
  if (!Array.isArray(values) || values.length === 0) { section.append(message(doc, 'None retained.')); return; }
  const list = doc.createElement('ul'); list.className = 'lfea-journey-list';
  for (const value of values) { const item = doc.createElement('li'); const code = doc.createElement('code'); code.textContent = String(value); item.append(code); list.append(item); }
  section.append(list);
}
function tableRow(doc, values) {
  const tr = doc.createElement('tr');
  for (const value of values) { const td = doc.createElement('td'); td.textContent = display(value); tr.append(td); }
  return tr;
}
function message(doc, text) { const p = doc.createElement('p'); p.className = 'lfea-journey-copy'; p.textContent = text; return p; }
function yesNo(value) { return value ? 'YES' : 'NO'; }
function display(value) { if (value === null || value === undefined || value === '') return '—'; return String(value); }
