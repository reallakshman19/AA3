import { isEngineeringConfirmationCurrent } from '../core/empirical-v3-safety/confirmation-receipt.js';
import {
  actionButton,
  displayValue,
  findPresentationRecord,
  paragraph,
  shortHash,
} from './empirical-v3-view-primitives.js';

const FIELD_LABELS = Object.freeze({
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
  root.replaceChildren(...packageValue.branches.map((branch) => (
    branchCard(doc, packageValue, branch, actions)
  )));
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

  const common = doc.createElement('dl');
  common.className = 'empirical-v3-safety__basis-list';
  branch.commonAuthorityRefs.forEach((ref) => appendAuthorityBasis(
    doc,
    common,
    packageValue,
    ref,
    actions,
  ));

  const components = doc.createElement('details');
  const summary = doc.createElement('summary');
  summary.textContent = 'Component-local authority';
  components.append(summary);
  const componentList = doc.createElement('div');
  componentList.className = 'empirical-v3-safety__component-list';
  packageValue.components
    .filter((component) => component.branchRef.branchId === branch.branchId)
    .forEach((component) => componentList.append(componentCard(
      doc,
      packageValue,
      component,
      actions,
    )));
  components.append(componentList);

  const risks = risksForBranch(packageValue, branch);
  const riskSummary = paragraph(
    doc,
    risks.length
      ? `${risks.length} linked risk(s): ${risks.map((risk) => risk.riskClass).join(', ')}`
      : 'No linked risks',
    'empirical-v3-safety__branch-risks',
  );

  card.append(heading, controls, common, components, riskSummary);
  if (risks.length) card.append(branchRiskList(doc, packageValue, risks, actions));
  return card;
}

function appendAuthorityBasis(doc, list, packageValue, authorityRef, actions) {
  const term = doc.createElement('dt');
  term.textContent = authorityRef.kind;
  const detail = doc.createElement('dd');
  const entry = findPresentationRecord(packageValue, authorityRef.ref, authorityRef.semanticHash);

  if (entry?.record?.schema === 'empirical-v3-branch-common-basis/v1') {
    detail.append(basisFields(doc, entry.record.fieldStates));
  } else if (entry?.record?.schema === 'empirical-v3-piping-class-basis/v1') {
    detail.append(pipingClassBasis(doc, entry.record));
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

  detail.append(actionButton(doc, 'Show source/evidence', () => (
    actions.showRecord?.(authorityRef.ref, authorityRef.semanticHash)
  )));
  list.append(term, detail);
}

function pipingClassBasis(doc, record) {
  const table = doc.createElement('table');
  table.className = 'empirical-v3-safety__basis-fields';
  const body = doc.createElement('tbody');
  const rows = [
    ['Requested class', record.requestedPipingClass ?? 'UNRESOLVED'],
    ['Resolved class', record.resolvedPipingClass ?? 'UNRESOLVED'],
    ['Authority', record.authorityClass],
    ['Match', record.matchMethod],
    ['Row match', record.rowMethod],
    ['Review', record.needsReview ? 'REQUIRED' : 'CURRENT'],
  ];
  rows.forEach(([label, value]) => {
    const row = doc.createElement('tr');
    row.append(tableCell(doc, label), tableCell(doc, value));
    body.append(row);
  });
  table.append(body);
  return table;
}

function basisFields(doc, fieldStates = {}) {
  const table = doc.createElement('table');
  table.className = 'empirical-v3-safety__basis-fields';
  const body = doc.createElement('tbody');
  Object.entries(fieldStates)
    .filter(([fieldName]) => FIELD_LABELS[fieldName])
    .forEach(([fieldName, state]) => {
      const row = doc.createElement('tr');
      row.append(
        tableCell(doc, FIELD_LABELS[fieldName]),
        tableCell(doc, state.status === 'MISSING'
          ? 'UNRESOLVED'
          : displayValue(state.value, state.unit)),
        tableCell(doc, state.status),
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
    const entry = findPresentationRecord(packageValue, ref.ref, ref.semanticHash);
    const authorityClass = entry?.record?.authorityClass ? ` · ${entry.record.authorityClass}` : '';
    item.textContent = `${ref.kind}: ${ref.ref}${authorityClass}`;
    item.append(' ', actionButton(doc, 'Evidence', () => actions.showRecord?.(ref.ref, ref.semanticHash)));
    refs.append(item);
  });
  card.append(
    heading,
    refs,
    actionButton(doc, 'Locate', () => actions.locate?.([component.componentId])),
  );
  return card;
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
    const label = risk.riskClass === 'HIGH_CONFIRM' ? 'Review assumption' : 'Open in Safety Gate';
    item.append(' ', actionButton(doc, label, () => actions.openRisk?.(risk.riskId)));
    list.append(item);
  });
  details.append(summary, list);
  return details;
}

function risksForBranch(packageValue, branch) {
  const componentIds = new Set(branch.componentIds);
  return packageValue.riskSet.risks.filter((risk) => (
    risk.scope.branchId === branch.branchId
    || risk.scope.entityIds.some((entityId) => componentIds.has(entityId))
  ));
}

function confirmationStatus(packageValue, risk) {
  if (risk.riskClass === 'HIGH_BLOCK') return 'BLOCKED';
  if (risk.riskClass !== 'HIGH_CONFIRM') return 'AUDIT ONLY';
  const receipts = packageValue.confirmations.filter((receipt) => receipt.riskRef.riskId === risk.riskId);
  if (receipts.some((receipt) => isEngineeringConfirmationCurrent(receipt, risk))) return 'CONFIRMED CURRENT';
  if (receipts.length) return 'CONFIRMATION STALE';
  return 'REVIEW REQUIRED';
}

function tableCell(doc, text) {
  const td = doc.createElement('td');
  td.textContent = text;
  return td;
}
