import { displayValue, paragraph, shortHash } from './empirical-v3-view-primitives.js';

export function renderEmpiricalV3ExplainCalculation(root, evidence) {
  const doc = root.ownerDocument;
  if (!evidence) {
    root.replaceChildren(paragraph(doc, 'No sealed calculation evidence is loaded.', 'empirical-v3-safety__empty'));
    return;
  }
  const fragment = doc.createDocumentFragment();
  fragment.append(
    heading(doc, evidence),
    equationSection(doc, evidence),
    systemSection(doc, evidence),
    coordinateSection(doc, evidence),
    assuranceSection(doc, evidence),
  );
  root.replaceChildren(fragment);
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
  appendFact(doc, facts, 'Compatibility residual', displayValue(
    evidence.coupledSystem.compatibility.maximumResidualM,
    'm',
  ));
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
      cell(doc, index === 0
        ? `${pair.rowCoordinateId} ← ${pair.columnCoordinateId}\n${displayValue(pair.valueMPerN, 'm/N')}`
        : ''),
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
function sectionWithTitle(doc, titleText) {
  const section = doc.createElement('section');
  section.className = 'empirical-v3-explain__section';
  const title = doc.createElement('h4'); title.textContent = titleText; section.append(title);
  return section;
}
function appendFact(doc, list, label, value) {
  const dt = doc.createElement('dt'); dt.textContent = label;
  const dd = doc.createElement('dd'); dd.textContent = String(value ?? '');
  list.append(dt, dd);
}
function termsText(value) {
  return Object.entries(value ?? {}).map(([key, amount]) => `${key}=${amount}`).join(', ');
}
function vectorText(values, unit) { return `[${(values ?? []).join(', ')}] ${unit}`; }
function cell(doc, value) { const td = doc.createElement('td'); td.textContent = String(value ?? ''); return td; }
