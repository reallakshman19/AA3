import { displayValue, paragraph, shortHash } from './empirical-v3-view-primitives.js';

export const EMPIRICAL_V3_EXPLAIN_MODES = Object.freeze(['SUMMARY', 'TRACE', 'FULL_AUDIT']);

export function renderEmpiricalV3ExplainCalculation(root, evidence, options = {}) {
  const doc = root.ownerDocument;
  if (!evidence) {
    root.replaceChildren(paragraph(doc, 'No sealed calculation evidence is loaded.', 'empirical-v3-safety__empty'));
    return;
  }
  const mode = requireMode(options.mode ?? 'SUMMARY');
  const fragment = doc.createDocumentFragment();
  fragment.append(heading(doc, evidence), modeToolbar(doc, mode, options.onModeChange));
  if (mode === 'SUMMARY') {
    fragment.append(summarySection(doc, evidence, options.packageValue));
  } else if (mode === 'TRACE') {
    fragment.append(
      equationSection(doc, evidence),
      systemSection(doc, evidence),
      coordinateSection(doc, evidence),
    );
  } else {
    fragment.append(
      summarySection(doc, evidence, options.packageValue),
      equationSection(doc, evidence),
      systemSection(doc, evidence),
      coordinateSection(doc, evidence),
      assuranceSection(doc, evidence),
      packageAuditSection(doc, options.packageValue),
    );
  }
  root.replaceChildren(fragment);
}

function modeToolbar(doc, activeMode, onModeChange) {
  const nav = doc.createElement('div');
  nav.className = 'empirical-v3-explain__modes';
  nav.setAttribute('role', 'tablist');
  EMPIRICAL_V3_EXPLAIN_MODES.forEach((mode) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = mode.replace('_', ' ');
    button.dataset.explainMode = mode;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(mode === activeMode));
    button.disabled = typeof onModeChange !== 'function';
    button.addEventListener('click', () => onModeChange?.(mode));
    nav.append(button);
  });
  return nav;
}

function heading(doc, evidence) {
  const header = doc.createElement('header');
  header.className = 'empirical-v3-explain__heading';
  const title = doc.createElement('strong');
  title.textContent = 'Explain calculation — sealed coupled evidence';
  const meta = doc.createElement('span');
  meta.textContent = `${evidence.evidenceId} · ${shortHash(evidence.semanticHash)} · ${evidence.sourceMechanicsSchema}`;
  header.append(title, meta);
  return header;
}

function summarySection(doc, evidence, packageValue) {
  const section = sectionWithTitle(doc, 'Result summary');
  const facts = doc.createElement('dl');
  if (packageValue) {
    appendFact(doc, facts, 'Workflow', packageValue.workflow.state);
    appendFact(doc, facts, 'Run', packageValue.runId);
    appendFact(doc, facts, 'Risks', riskSummary(packageValue));
  }
  appendFact(doc, facts, 'Coordinates', evidence.coupledSystem.coordinateIds.join(', '));
  evidence.coordinates.forEach((coordinate) => {
    appendFact(
      doc,
      facts,
      coordinate.binding?.supportId || coordinate.coordinateId,
      `${coordinate.coordinateId} · R ${displayValue(coordinate.reactionN, 'N')} · δpipe ${displayValue(coordinate.pipeDisplacementM, 'm')} · branch ${coordinate.binding?.branchId ?? 'upstream'}`,
    );
  });
  appendFact(doc, facts, 'Evidence', `${evidence.evidenceId} · ${shortHash(evidence.semanticHash)}`);
  section.append(facts);
  return section;
}

function equationSection(doc, evidence) {
  const section = sectionWithTitle(doc, 'Coupled equations');
  const list = doc.createElement('dl');
  Object.entries(evidence.equations).forEach(([key, expression]) => {
    const term = doc.createElement('dt');
    term.textContent = key;
    const definition = doc.createElement('dd');
    const code = doc.createElement('code');
    code.textContent = expression;
    definition.append(code);
    list.append(term, definition);
  });
  section.append(list);
  return section;
}

function systemSection(doc, evidence) {
  const section = sectionWithTitle(doc, 'Sealed coupled system');
  const facts = doc.createElement('dl');
  appendFact(doc, facts, 'Coordinates', evidence.coupledSystem.coordinateIds.join(', '));
  appendFact(doc, facts, 'RHS δtarget−δreference', vectorText(evidence.coupledSystem.rhsDisplacementM, 'm'));
  appendFact(doc, facts, 'Reaction vector R', vectorText(evidence.coupledSystem.reactionVectorN, 'N'));
  appendFact(doc, facts, 'Compatibility residual', displayValue(evidence.coupledSystem.compatibility.maximumResidualM, 'm'));
  appendFact(doc, facts, 'Energy relative residual', evidence.coupledSystem.energy.relativeResidual);
  appendFact(doc, facts, 'Reciprocity residual', evidence.coupledSystem.reciprocity.maximumResidual);
  section.append(facts, matrixTable(doc, evidence.coupledSystem.flexibilityMatrixMPerN, 'F [m/N]'));
  return section;
}

function coordinateSection(doc, evidence) {
  const section = sectionWithTitle(doc, 'Node / restraint recovery evidence');
  evidence.coordinates.forEach((coordinate) => {
    const details = doc.createElement('details');
    details.className = 'empirical-v3-explain__coordinate';
    details.dataset.coordinateId = coordinate.coordinateId;
    const summary = doc.createElement('summary');
    summary.textContent = [
      coordinate.coordinateId,
      coordinate.binding?.supportId ? `support ${coordinate.binding.supportId}` : null,
      `R ${displayValue(coordinate.reactionN, 'N')}`,
      `δpipe ${displayValue(coordinate.pipeDisplacementM, 'm')}`,
    ].filter(Boolean).join(' · ');
    details.append(summary, coordinateFacts(doc, coordinate), pairTable(doc, coordinate.pairEvidence));
    section.append(details);
  });
  return section;
}

function coordinateFacts(doc, coordinate) {
  const facts = doc.createElement('dl');
  appendFact(doc, facts, 'Node', coordinate.binding?.nodeId ?? 'not carried by source result');
  appendFact(doc, facts, 'Branch', coordinate.binding?.branchId ?? 'referenced upstream');
  appendFact(doc, facts, 'Reference displacement', displayValue(coordinate.referenceDisplacementM, 'm'));
  appendFact(doc, facts, 'Target displacement', displayValue(coordinate.targetDisplacementM, 'm'));
  appendFact(doc, facts, 'Support flexibility', displayValue(coordinate.supportFlexibilityMPerN, 'm/N'));
  appendFact(doc, facts, 'Support deformation', displayValue(coordinate.supportDeformationM, 'm'));
  appendFact(doc, facts, 'Compatibility residual', displayValue(coordinate.compatibilityResidualM, 'm'));
  appendFact(doc, facts, 'F row', vectorText(coordinate.flexibilityRowMPerN, 'm/N'));
  return facts;
}

function pairTable(doc, pairs) {
  const table = doc.createElement('table');
  const head = doc.createElement('thead');
  const headRow = doc.createElement('tr');
  ['Fij', 'Component', 'fij(m)', 'Terms'].forEach((label) => {
    const th = doc.createElement('th'); th.textContent = label; headRow.append(th);
  });
  head.append(headRow);
  const body = doc.createElement('tbody');
  pairs.forEach((pair) => pair.componentContributions.forEach((contribution, index) => {
    const row = doc.createElement('tr');
    row.append(
      cell(doc, index === 0 ? `${pair.rowCoordinateId} ← ${pair.columnCoordinateId}\n${displayValue(pair.valueMPerN, 'm/N')}` : ''),
      cell(doc, `${contribution.componentId} · ${contribution.kind}`),
      cell(doc, displayValue(contribution.valueMPerN, 'm/N')),
      cell(doc, termsText(contribution.terms)),
    );
    body.append(row);
  }));
  table.append(head, body);
  return table;
}

function assuranceSection(doc, evidence) {
  const section = sectionWithTitle(doc, 'Evidence custody');
  const list = doc.createElement('dl');
  appendFact(doc, list, 'Authorization', `${evidence.authorizationRef.authorizationId} · ${shortHash(evidence.authorizationRef.semanticHash)}`);
  appendFact(doc, list, 'ROM output', `${evidence.romOutputRef.ref} · ${shortHash(evidence.romOutputRef.semanticHash)}`);
  appendFact(doc, list, 'Mechanics recomputed here', String(evidence.evidencePolicy.mechanicsRecomputed));
  appendFact(doc, list, 'Flexibility recomputed here', String(evidence.evidencePolicy.flexibilityRecomputed));
  appendFact(doc, list, 'Reaction recomputed here', String(evidence.evidencePolicy.reactionRecomputed));
  appendFact(doc, list, 'UI/report may solve mechanics', String(evidence.evidencePolicy.uiOrReportMayResolveMechanics));
  appendFact(doc, list, 'Formula trace', evidence.formulaTrace.join(', ') || 'source contract did not expose formula IDs');
  section.append(list);
  return section;
}

function packageAuditSection(doc, packageValue) {
  const section = sectionWithTitle(doc, 'Full audit references');
  if (!packageValue) {
    section.append(paragraph(doc, 'No sealed safety package is available for inherited audit references.'));
    return section;
  }
  const facts = doc.createElement('dl');
  appendFact(doc, facts, 'Safety package', shortHash(packageValue.semanticHash));
  appendFact(doc, facts, 'Calculation authorization', packageValue.calculationAuthorization?.authorizationId ?? 'not present');
  appendFact(doc, facts, 'Branches', packageValue.branches.map((row) => `${row.branchId}@${shortHash(row.semanticHash)}`).join(', '));
  appendFact(doc, facts, 'Risks', packageValue.riskSet.risks.map((row) => `${row.riskId}:${row.riskClass}`).join(', ') || 'none');
  appendFact(doc, facts, 'Confirmations', packageValue.confirmations.map((row) => row.receiptId).join(', ') || 'none');
  appendFact(doc, facts, 'Authority refs', packageValue.records.map((row) => `${row.kind}:${row.ref}@${shortHash(row.semanticHash)}`).join(', '));
  section.append(facts);
  return section;
}

function riskSummary(packageValue) {
  const counts = packageValue.riskSet.counts;
  return `BLOCK ${counts.HIGH_BLOCK} · HIGH ${counts.HIGH_CONFIRM} · MEDIUM ${counts.MEDIUM} · LOW ${counts.LOW}`;
}

function matrixTable(doc, matrix, captionText) {
  const table = doc.createElement('table');
  const caption = doc.createElement('caption'); caption.textContent = captionText; table.append(caption);
  const body = doc.createElement('tbody');
  matrix.forEach((values) => {
    const row = doc.createElement('tr');
    values.forEach((value) => row.append(cell(doc, value)));
    body.append(row);
  });
  table.append(body);
  return table;
}
function sectionWithTitle(doc, titleText) { const section = doc.createElement('section'); section.className = 'empirical-v3-explain__section'; const title = doc.createElement('h4'); title.textContent = titleText; section.append(title); return section; }
function appendFact(doc, list, label, value) { const dt = doc.createElement('dt'); dt.textContent = label; const dd = doc.createElement('dd'); dd.textContent = String(value ?? ''); list.append(dt, dd); }
function termsText(value) { return Object.entries(value ?? {}).map(([key, amount]) => `${key}=${amount}`).join(', '); }
function vectorText(values, unit) { return `[${(values ?? []).join(', ')}] ${unit}`; }
function cell(doc, value) { const td = doc.createElement('td'); td.textContent = String(value ?? ''); return td; }
function requireMode(value) { if (!EMPIRICAL_V3_EXPLAIN_MODES.includes(value)) throw new RangeError(`Unsupported Explain mode: ${value}`); return value; }
