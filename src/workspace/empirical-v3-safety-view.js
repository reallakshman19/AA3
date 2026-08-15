import { isEngineeringConfirmationCurrent } from '../core/empirical-v3-safety/confirmation-receipt.js';

const BASIS_FIELD_LABELS = Object.freeze({
  referenceTemperature: 'Reference temperature',
  operatingTemperature: 'Operating temperature',
  designTemperature: 'Design temperature',
  operatingAnalysisPressure: 'Operating pressure',
  designPressure: 'Design pressure',
  hydrotestPressure: 'Hydrotest pressure',
  operatingFluidDensity: 'Operating fluid density',
  hydrotestFluidDensity: 'Hydrotest fluid density',
  fluidPhase: 'Phase',
  fluidService: 'Service',
  insulationThickness: 'Insulation thickness',
  insulationDensity: 'Insulation density',
});

export function renderEmpiricalV3BranchBasis(root, packageValue, actions = {}) {
  const doc = root.ownerDocument;
  const cards = packageValue.branches.map((branch) => branchCard(doc, packageValue, branch, actions));
  root.replaceChildren(...cards);
}

export function renderEmpiricalV3SafetyGate(root, packageValue, actions = {}) {
  const doc = root.ownerDocument;
  const fragment = doc.createDocumentFragment();
  fragment.append(safetyHeader(doc, packageValue, actions));
  if (packageValue.riskSet.risks.length === 0) {
    fragment.append(paragraph(doc, 'No current engineering risks are recorded for this run.', 'empirical-v3-safety__empty'));
  } else {
    const table = doc.createElement('table');
    table.className = 'empirical-v3-safety__risk-table';
    table.append(riskHeader(doc));
    const body = doc.createElement('tbody');
    packageValue.riskSet.risks.forEach((risk) => body.append(riskRow(doc, packageValue, risk, actions)));
    table.append(body);
    fragment.append(table);
  }
  root.replaceChildren(fragment);
}

export function renderEmpiricalV3EvidenceInspector(root, entry) {
  const doc = root.ownerDocument;
  if (!entry) {
    root.hidden = true;
    root.replaceChildren();
    return;
  }
  const heading = doc.createElement('strong');
  heading.textContent = `${entry.kind}: ${entry.ref}`;
  const identity = paragraph(doc, `Semantic hash: ${entry.semanticHash}`);
  const evidence = entry.evidenceHash ? paragraph(doc, `Evidence hash: ${entry.evidenceHash}`) : null;
  const pre = doc.createElement('pre');
  pre.textContent = JSON.stringify(entry.record, null, 2);
  const children = [heading, identity];
  if (evidence) children.push(evidence);
  children.push(pre);
  root.hidden = false;
  root.replaceChildren(...children);
}

function branchCard(doc, packageValue, branch, actions) {
  const card = doc.createElement('article');
  card.className = 'empirical-v3-safety__branch-card';
  card.dataset.branchId = branch.branchId;
  const heading = doc.createElement('div');
  heading.className = 'empirical-v3-safety__branch-heading';
  const title = doc.createElement('strong');
  title.textContent = branch.branchId;
  const meta = doc.createElement('span');
  meta.textContent = `${branch.componentIds.length} component(s) · review ${shortHash(branch.reviewBasisHash)}`;
  heading.append(title, meta);
  const controls = doc.createElement('div');
  controls.className = 'empirical-v3-safety__actions';
  controls.append(actionButton(doc, 'Locate branch', () => actions.locate?.(branch.componentIds)));
  const riskRows = risksForBranch(packageValue, branch);
  const riskSummary = doc.createElement('span');
  riskSummary.className = 'empirical-v3-safety__branch-risks';
  riskSummary.textContent = riskRows.length
    ? `${riskRows.length} linked risk(s): ${riskRows.map((risk) => risk.riskClass).join(', ')}`
    : 'No linked risks';

  const common = doc.createElement('dl');
  common.className = 'empirical-v3-safety__basis-list';
  branch.commonAuthorityRefs.forEach((ref) => appendAuthorityBasis(doc, common, packageValue, ref, actions));

  const components = doc.createElement('details');
  const summary = doc.createElement('summary');
  summary.textContent = 'Component-local authority';
  components.append(summary);
  const componentList = doc.createElement('div');
  componentList.className = 'empirical-v3-safety__component-list';
  packageValue.components
    .filter((component) => component.branchRef.branchId === branch.branchId)
    .forEach((component) => componentList.append(componentCard(doc, packageValue, component, actions)));
  components.append(componentList);

  card.append(heading, controls, riskSummary, common, components);
  if (riskRows.length) card.append(branchRiskList(doc, packageValue, riskRows, actions));
  return card;
}

function appendAuthorityBasis(doc, list, packageValue, authorityRef, actions) {
  const term = doc.createElement('dt');
  term.textContent = authorityRef.kind;
  const detail = doc.createElement('dd');
  const entry = recordForRef(packageValue, authorityRef.ref, authorityRef.semanticHash);
  if (entry?.record?.schema === 'empirical-v3-branch-common-basis/v1') {
    detail.append(basisFields(doc, entry.record.fieldStates));
  } else if (entry?.record?.schema === 'empirical-v3-adapted-resolution-reference/v1') {
    detail.append(paragraph(doc, [
      entry.record.ref,
      entry.record.authorityClass,
      entry.record.source,
      entry.record.matchMethod,
    ].join(' · ')));
  } else {
    detail.append(paragraph(doc, `${authorityRef.ref} · ${shortHash(authorityRef.semanticHash)}`));
  }
  detail.append(actionButton(doc, 'Show source/evidence', () => actions.showRecord?.(authorityRef.ref, authorityRef.semanticHash)));
  list.append(term, detail);
}

function basisFields(doc, fieldStates = {}) {
  const table = doc.createElement('table');
  table.className = 'empirical-v3-safety__basis-fields';
  const body = doc.createElement('tbody');
  Object.entries(fieldStates)
    .filter(([fieldName]) => BASIS_FIELD_LABELS[fieldName])
    .forEach(([fieldName, state]) => {
      const row = doc.createElement('tr');
      row.append(
        cell(doc, BASIS_FIELD_LABELS[fieldName]),
        cell(doc, state.status === 'MISSING' ? 'UNRESOLVED' : displayValue(state.value, state.unit)),
        cell(doc, state.status),
      );
      body.append(row);
    });
  table.append(body);
  return table;
}

function componentCard(doc, packageValue, component, actions) {
  const card = doc.createElement('div');
  card.className = 'empirical-v3-safety__component';
  const heading = doc.createElement('strong');
  heading.textContent = `${component.componentId} · ${component.componentType}`;
  const refs = doc.createElement('ul');
  component.localAuthorityRefs.forEach((ref) => {
    const item = doc.createElement('li');
    const entry = recordForRef(packageValue, ref.ref, ref.semanticHash);
    const authorityClass = entry?.record?.authorityClass ? ` · ${entry.record.authorityClass}` : '';
    item.textContent = `${ref.kind}: ${ref.ref}${authorityClass}`;
    const show = actionButton(doc, 'Evidence', () => actions.showRecord?.(ref.ref, ref.semanticHash));
    item.append(' ', show);
    refs.append(item);
  });
  const locate = actionButton(doc, 'Locate', () => actions.locate?.([component.componentId]));
  card.append(heading, refs, locate);
  return card;
}

function safetyHeader(doc, packageValue, actions) {
  const header = doc.createElement('header');
  header.className = 'empirical-v3-safety__gate-header';
  const title = doc.createElement('div');
  const strong = doc.createElement('strong');
  strong.textContent = 'ENGINEERING CALCULATION SAFETY';
  const workflow = doc.createElement('span');
  workflow.textContent = `Workflow: ${packageValue.workflow.state}`;
  title.append(strong, workflow);
  const counts = doc.createElement('div');
  counts.className = 'empirical-v3-safety__counts';
  counts.append(
    countBadge(doc, 'BLOCKERS', packageValue.riskSet.counts.HIGH_BLOCK, 'block'),
    countBadge(doc, 'HIGH REVIEW', packageValue.riskSet.counts.HIGH_CONFIRM, 'review'),
    countBadge(doc, 'WARNINGS', packageValue.riskSet.counts.MEDIUM, 'warning'),
    countBadge(doc, 'INFO', packageValue.riskSet.counts.LOW, 'info'),
  );
  const run = actionButton(doc, 'Run calculation', () => actions.run?.(packageValue));
  run.dataset.action = 'empirical-v3-run';
  run.disabled = !packageValue.workflow.canRunCalculation || !packageValue.calculationAuthorization || !actions.run;
  run.title = packageValue.workflow.canRunCalculation
    ? (actions.run ? 'Current sealed calculation authorization is present.' : 'Authorization is current; execution bridge is not wired.')
    : 'Calculation is not currently authorized.';
  header.append(title, counts, run);
  return header;
}

function riskHeader(doc) {
  const head = doc.createElement('thead');
  const row = doc.createElement('tr');
  ['Risk', 'Scope', 'Value / authority', 'Reason', 'Status', 'Actions'].forEach((label) => {
    const th = doc.createElement('th');
    th.textContent = label;
    row.append(th);
  });
  head.append(row);
  return head;
}

function riskRow(doc, packageValue, risk, actions) {
  const row = doc.createElement('tr');
  row.dataset.riskId = risk.riskId;
  row.dataset.riskClass = risk.riskClass;
  const identity = cell(doc, `${risk.riskCode}\n${risk.riskClass}`);
  const scope = cell(doc, risk.scope.entityIds.join(', ') || risk.scope.branchId || 'Run');
  const value = cell(doc, riskValueText(risk));
  const reason = cell(doc, risk.reasonCode);
  const status = cell(doc, confirmationStatus(packageValue, risk));
  const actionCell = doc.createElement('td');
  if (risk.scope.entityIds.length) {
    actionCell.append(actionButton(doc, 'Locate/Highlight', () => actions.locate?.(risk.scope.entityIds)));
  }
  const evidenceRef = risk.authorityRefs[0] ?? risk.sourceRefs[0] ?? risk.governingDependencyRefs[0] ?? null;
  if (evidenceRef) {
    actionCell.append(actionButton(doc, 'Show evidence', () => actions.showRecord?.(evidenceRef.ref, evidenceRef.semanticHash)));
  }
  if (risk.riskClass === 'HIGH_CONFIRM') actionCell.append(reviewAssumptionControl(doc, risk, actions));
  row.append(identity, scope, value, reason, status, actionCell);
  return row;
}

function reviewAssumptionControl(doc, risk, actions) {
  const details = doc.createElement('details');
  details.className = 'empirical-v3-safety__review';
  const summary = doc.createElement('summary');
  summary.textContent = 'Review assumption';
  const actor = input(doc, 'Reviewer');
  const comment = input(doc, 'Review basis / comment');
  const confirm = actionButton(doc, 'Create confirmation receipt', () => {
    actions.review?.(risk, { actor: actor.input.value, comment: comment.input.value });
  });
  confirm.disabled = !actions.review;
  details.append(summary, actor.label, comment.label, confirm);
  return details;
}

function branchRiskList(doc, packageValue, risks, actions) {
  const details = doc.createElement('details');
  const summary = doc.createElement('summary');
  summary.textContent = 'View exceptions';
  const list = doc.createElement('ul');
  risks.forEach((risk) => {
    const item = doc.createElement('li');
    item.dataset.riskId = risk.riskId;
    item.textContent = `${risk.riskClass} · ${risk.riskCode} · ${confirmationStatus(packageValue, risk)}`;
    if (risk.riskClass === 'HIGH_CONFIRM') item.append(' ', reviewAssumptionControl(doc, risk, actions));
    list.append(item);
  });
  details.append(summary, list);
  return details;
}

function confirmationStatus(packageValue, risk) {
  if (risk.riskClass === 'HIGH_BLOCK') return 'BLOCKED — no confirmation path';
  if (risk.riskClass !== 'HIGH_CONFIRM') return 'AUDIT ONLY';
  const receipts = packageValue.confirmations.filter((receipt) => receipt.riskRef.riskId === risk.riskId);
  if (receipts.some((receipt) => isEngineeringConfirmationCurrent(receipt, risk))) return 'CONFIRMED CURRENT';
  if (receipts.length) return 'CONFIRMATION STALE';
  return 'REVIEW REQUIRED';
}

function risksForBranch(packageValue, branch) {
  const componentIds = new Set(branch.componentIds);
  return packageValue.riskSet.risks.filter((risk) => (
    risk.scope.branchId === branch.branchId
    || risk.scope.entityIds.some((entityId) => componentIds.has(entityId))
  ));
}

function recordForRef(packageValue, ref, semanticHash) {
  return packageValue.records.find((entry) => (
    entry.ref === ref && (!semanticHash || entry.semanticHash === semanticHash)
  )) ?? null;
}
function riskValueText(risk) {
  if (!risk.valueSnapshot) return risk.authorityRefs.map((ref) => ref.ref).join(', ') || 'No scalar';
  return `${displayValue(risk.valueSnapshot.value, risk.valueSnapshot.unit)} · ${risk.valueSnapshot.authorityClass}`;
}
function displayValue(value, unit) { return `${value === null ? 'UNRESOLVED' : value}${unit && unit !== 'NONE' ? ` ${unit}` : ''}`; }
function countBadge(doc, label, count, tone) {
  const badge = doc.createElement('span');
  badge.className = `empirical-v3-safety__count empirical-v3-safety__count--${tone}`;
  badge.textContent = `${label} ${count}`;
  return badge;
}
function actionButton(doc, label, handler) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (handler) button.addEventListener('click', handler);
  return button;
}
function input(doc, labelText) {
  const label = doc.createElement('label');
  label.textContent = `${labelText} `;
  const value = doc.createElement('input');
  value.type = 'text';
  label.append(value);
  return { label, input: value };
}
function cell(doc, value) { const td = doc.createElement('td'); td.textContent = String(value ?? ''); return td; }
function paragraph(doc, text, className = '') { const p = doc.createElement('p'); p.textContent = text; if (className) p.className = className; return p; }
function shortHash(value) { const text = String(value ?? ''); return text.length > 18 ? `${text.slice(0, 18)}…` : text; }
