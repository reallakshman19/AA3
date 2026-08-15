import { isEngineeringConfirmationCurrent } from '../core/empirical-v3-safety/confirmation-receipt.js';
import {
  actionButton,
  cell,
  displayValue,
  paragraph,
  textInput,
} from './empirical-v3-view-primitives.js';

export function renderEmpiricalV3SafetyGate(root, packageValue, actions = {}) {
  const doc = root.ownerDocument;
  const fragment = doc.createDocumentFragment();
  fragment.append(gateHeader(doc, packageValue, actions));
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

export function focusEmpiricalV3Risk(root, riskId) {
  const row = [...root.querySelectorAll('[data-risk-id]')].find((node) => node.dataset.riskId === riskId);
  if (!row) return false;
  row.scrollIntoView?.({ block: 'nearest' });
  row.focus?.();
  row.dataset.focused = 'true';
  return true;
}

function gateHeader(doc, packageValue, actions) {
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
  run.disabled = !packageValue.workflow.canRunCalculation
    || !packageValue.calculationAuthorization
    || !actions.run;
  run.title = packageValue.workflow.canRunCalculation
    ? (actions.run
      ? 'Current sealed calculation authorization is present.'
      : 'Authorization is current; execution bridge is not wired.')
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
  row.tabIndex = -1;
  row.dataset.riskId = risk.riskId;
  row.dataset.riskClass = risk.riskClass;
  row.append(
    cell(doc, `${risk.riskCode}\n${risk.riskClass}`),
    cell(doc, scopeText(risk)),
    cell(doc, riskValueText(risk)),
    cell(doc, risk.reasonCode),
    cell(doc, confirmationStatus(packageValue, risk)),
    riskActions(doc, packageValue, risk, actions),
  );
  return row;
}

function riskActions(doc, packageValue, risk, actions) {
  const td = doc.createElement('td');
  td.className = 'empirical-v3-safety__actions';
  if (risk.scope.entityIds.length) {
    td.append(actionButton(doc, 'Locate/Highlight', () => actions.locate?.(risk.scope.entityIds)));
  }
  const evidenceRef = risk.authorityRefs[0] ?? risk.sourceRefs[0] ?? risk.governingDependencyRefs[0] ?? null;
  if (evidenceRef) {
    td.append(actionButton(doc, 'Show evidence', () => actions.showRecord?.(evidenceRef.ref, evidenceRef.semanticHash)));
  }
  if (risk.riskClass === 'HIGH_CONFIRM') {
    td.append(reviewAssumptionControl(doc, packageValue, risk, actions));
  }
  return td;
}

function reviewAssumptionControl(doc, packageValue, risk, actions) {
  const details = doc.createElement('details');
  details.className = 'empirical-v3-safety__review';
  const summary = doc.createElement('summary');
  summary.textContent = 'Review assumption';
  const currentStatus = confirmationStatus(packageValue, risk);
  const value = paragraph(doc, `Value: ${riskValueText(risk)}`);
  const basis = paragraph(doc, `Basis: ${risk.reasonCode}`);
  const evidence = paragraph(doc, `Evidence: ${risk.authorityRefs.map((ref) => ref.ref).join(', ') || risk.sourceRefs.map((ref) => ref.ref).join(', ') || 'governing dependency'}`);
  const actor = textInput(doc, 'Reviewer');
  const comment = textInput(doc, 'Review basis / comment');
  const confirm = actionButton(doc, 'Create confirmation receipt', () => {
    actions.review?.(risk, { actor: actor.input.value, comment: comment.input.value });
  });
  confirm.disabled = !actions.review || currentStatus === 'CONFIRMED CURRENT';
  details.append(summary, value, basis, evidence, actor.label, comment.label, confirm);
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

function riskValueText(risk) {
  if (!risk.valueSnapshot) return risk.authorityRefs.map((ref) => ref.ref).join(', ') || 'No scalar';
  return `${displayValue(risk.valueSnapshot.value, risk.valueSnapshot.unit)} · ${risk.valueSnapshot.authorityClass}`;
}

function scopeText(risk) {
  if (risk.scope.entityIds.length) return risk.scope.entityIds.join(', ');
  if (risk.scope.branchId) return risk.scope.branchId;
  return 'Run';
}

function countBadge(doc, label, count, tone) {
  const badge = doc.createElement('span');
  badge.className = `empirical-v3-safety__count empirical-v3-safety__count--${tone}`;
  badge.textContent = `${label} ${count}`;
  return badge;
}
