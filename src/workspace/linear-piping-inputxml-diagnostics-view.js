import { createLfeaTopologyReviewFromDiagnostics } from './lfea-topology-review-from-prefea.js';
import { renderLfeaTopologyReview } from './lfea-topology-review-view.js';

export const LINEAR_PIPING_INPUTXML_DIAGNOSTICS_VIEW_SCHEMA = 'linear-piping-inputxml-diagnostics-view/v1';

/**
 * Render diagnostics already retained by the native InputXML pre-flight receipt.
 * This view never reparses source bytes and never creates execution authority.
 */
export function renderLinearPipingInputXmlDiagnostics(documentRef, root, preFlight) {
  if (!root || typeof root.append !== 'function') {
    throw new TypeError('Native InputXML diagnostics view requires a render root.');
  }
  if (!preFlight) return null;
  const diagnostics = preFlight.diagnostics;
  const preparation = preFlight.preparation;
  const shell = documentRef.createElement('section');
  shell.dataset.role = 'linear-piping-inputxml-governed-diagnostics';
  shell.dataset.schema = LINEAR_PIPING_INPUTXML_DIAGNOSTICS_VIEW_SCHEMA;
  shell.dataset.diagnosticsSemanticHash = diagnostics.semanticHash;
  shell.dataset.diagnosticsEvidenceHash = diagnostics.evidenceHash;
  shell.dataset.preparationSemanticHash = preparation.semanticHash;
  shell.dataset.preparationEvidenceHash = preparation.evidenceHash;

  const heading = documentRef.createElement('h3');
  heading.textContent = 'Governed InputXML diagnostics';
  shell.append(heading);
  shell.append(
    readinessSection(documentRef, preFlight),
    restraintSection(documentRef, preparation, diagnostics),
    topologySection(documentRef, diagnostics),
    representabilitySection(documentRef, diagnostics),
  );
  if (diagnostics.sourceAuthority) {
    const topologyReview = createLfeaTopologyReviewFromDiagnostics(diagnostics);
    renderLfeaTopologyReview(documentRef, shell, topologyReview);
    shell.dataset.topologyReviewSemanticHash = topologyReview.semanticHash;
    shell.dataset.topologyReviewFindingCount = String(topologyReview.summary.findingCount);
    shell.dataset.topologyMutationApplied = 'false';
  }
  root.append(shell);
  return shell;
}

function readinessSection(doc, preFlight) {
  const preparation = preFlight.preparation;
  const counts = countDispositions(preparation.findings ?? []);
  const section = diagnosticSection(doc, 'Pre-FEA readiness', 'prefea-readiness');
  section.body.append(keyValueTable(doc, [
    ['Status', preparation.status],
    ['PASS findings', String(counts.PASS)],
    ['CONDITIONAL findings', String(counts.CONDITIONAL)],
    ['BLOCK findings', String(counts.BLOCK)],
    ['Requested physical cases', (preparation.requestedCaseIds ?? []).join(', ') || 'None'],
    ['Diagnostics semantic hash', preFlight.diagnostics.semanticHash],
    ['Preparation semantic hash', preparation.semanticHash],
    ['Pre-FEA authorization', preFlight.solveAuthorized
      ? preFlight.authorization?.semanticHash ?? 'AUTHORIZED'
      : 'NOT AUTHORIZED'],
  ]));
  return section.section;
}

function restraintSection(doc, preparation, diagnostics) {
  const section = diagnosticSection(doc, 'Restraint diagnostics', 'restraint-diagnostics');
  const findings = (preparation.findings ?? []).filter((finding) =>
    ['RESTRAINT', 'CONSTRAINT'].includes(String(finding.category ?? '').toUpperCase()));
  section.body.append(keyValueTable(doc, [
    ['Affected restraints', String(diagnostics.summary?.affectedRestraintCount ?? 0)],
    ['Retained restraint/constraint findings', String(findings.length)],
  ]));
  appendFindingList(doc, section.body, findings, 'No restraint or constraint findings are retained.');
  return section.section;
}

function topologySection(doc, diagnostics) {
  const section = diagnosticSection(doc, 'Topology diagnostics', 'topology-diagnostics');
  const topology = diagnostics.topologyDiagnostics ?? {};
  const proximity = diagnostics.proximityDiagnostics ?? {};
  section.body.append(keyValueTable(doc, [
    ['Topology status', topology.status ?? 'UNAVAILABLE'],
    ['Connected components', scalar(topology.summary?.connectedComponentCount)],
    ['Isolated nodes', scalar(topology.summary?.isolatedNodeCount)],
    ['Unbound segments', scalar(topology.summary?.unboundSegmentCount)],
    ['Self-loop segments', scalar(topology.summary?.selfLoopSegmentCount)],
    ['Coordinate closure mismatches', scalar(topology.summary?.coordinateClosureMismatchCount)],
    ['Coordinate closure unresolved', scalar(topology.summary?.coordinateClosureUnresolvedCount)],
    ['Proximity status', proximity.status ?? 'UNAVAILABLE'],
    ['Topology semantic hash', topology.semanticHash ?? 'UNAVAILABLE'],
    ['Topology evidence hash', topology.evidenceHash ?? 'UNAVAILABLE'],
    ['Proximity semantic hash', proximity.semanticHash ?? 'UNAVAILABLE'],
    ['Proximity evidence hash', proximity.evidenceHash ?? 'UNAVAILABLE'],
  ]));
  const findings = [
    ...(topology.findings ?? []).map((finding) => normalizeModelHealthFinding(finding, 'TOPOLOGY')),
    ...(proximity.findings ?? []).map((finding) => normalizeModelHealthFinding(finding, 'PROXIMITY')),
  ];
  appendFindingList(doc, section.body, findings, 'No topology or proximity findings are retained.');
  return section.section;
}

function representabilitySection(doc, diagnostics) {
  const section = diagnosticSection(doc, 'Representability', 'representability');
  const blocked = diagnostics.summary?.blockedCapabilityIds ?? [];
  const conditional = diagnostics.summary?.conditionalCapabilityIds ?? [];
  const authorized = diagnostics.summary?.authorizedCapabilityIds ?? [];
  section.body.append(keyValueTable(doc, [
    ['Blocked capabilities', blocked.join(', ') || 'None'],
    ['Conditional capabilities', conditional.join(', ') || 'None'],
    ['Authorized capabilities', authorized.join(', ') || 'None'],
    ['Representability semantic hash', diagnostics.representabilityDiagnostics?.semanticHash ?? 'UNAVAILABLE'],
    ['Representability evidence hash', diagnostics.representabilityDiagnostics?.evidenceHash ?? 'UNAVAILABLE'],
  ]));

  const table = doc.createElement('table');
  table.dataset.role = 'linear-piping-inputxml-capabilities';
  const head = doc.createElement('tr');
  for (const label of ['Capability', 'Status', 'Limitations']) {
    const th = doc.createElement('th');
    th.textContent = label;
    head.append(th);
  }
  table.append(head);
  for (const capability of diagnostics.capabilities ?? []) {
    const row = doc.createElement('tr');
    row.dataset.capabilityId = capability.capabilityId;
    for (const value of [
      capability.capabilityId,
      capability.status,
      (capability.limitationCodes ?? []).join(', ') || 'None',
    ]) {
      const cell = doc.createElement('td');
      cell.textContent = String(value);
      row.append(cell);
    }
    table.append(row);
  }
  section.body.append(table);
  return section.section;
}

function diagnosticSection(doc, titleText, role) {
  const section = doc.createElement('section');
  section.dataset.role = `linear-piping-inputxml-${role}`;
  const title = doc.createElement('h4');
  title.textContent = titleText;
  const body = doc.createElement('div');
  section.append(title, body);
  return { section, body };
}

function keyValueTable(doc, rows) {
  const table = doc.createElement('table');
  for (const [label, value] of rows) {
    const row = doc.createElement('tr');
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    const td = doc.createElement('td');
    td.textContent = String(value);
    row.append(th, td);
    table.append(row);
  }
  return table;
}

function appendFindingList(doc, root, findings, emptyText) {
  if (findings.length === 0) {
    const empty = doc.createElement('p');
    empty.textContent = emptyText;
    root.append(empty);
    return;
  }
  const list = doc.createElement('ul');
  for (const finding of findings) {
    const item = doc.createElement('li');
    if (finding.findingId) item.dataset.findingId = finding.findingId;
    item.textContent = [
      finding.disposition ?? finding.effect ?? 'INFO',
      finding.code ?? 'UNSPECIFIED',
      finding.message ?? 'No message.',
    ].join(' · ');
    list.append(item);
  }
  root.append(list);
}

function normalizeModelHealthFinding(finding, category) {
  return {
    ...finding,
    category,
    disposition: findingDisposition(finding),
  };
}

/**
 * Raw topology/proximity findings, as retained in diagnostics.topologyDiagnostics
 * and diagnostics.proximityDiagnostics, never carry a top-level `.disposition`
 * or `.effect` field — their capability effect lives in `capabilityEffects`,
 * an array of `{capabilityId, effect}`. The old `finding.disposition ??
 * finding.effect ?? 'INFO'` fallback always missed both, so every topology
 * finding rendered here defaulted to the literal string 'INFO' regardless of
 * whether it actually blocked — a genuine BLOCK-worthy collinear-overlap
 * defect showed as merely informational in this section while the same
 * finding correctly showed BLOCK in the main findings list above it.
 */
function findingDisposition(finding) {
  const explicit = String(finding.disposition ?? finding.effect ?? '').trim().toUpperCase();
  if (explicit) return explicit;
  const effects = Array.isArray(finding.capabilityEffects) ? finding.capabilityEffects : [];
  if (effects.some((row) => String(row?.effect ?? '').toUpperCase() === 'BLOCK')) return 'BLOCK';
  if (effects.some((row) => String(row?.effect ?? '').toUpperCase() === 'ADVISORY')) return 'ADVISORY';
  const severity = String(finding.severity ?? '').toUpperCase();
  if (severity === 'ERROR' || severity === 'FATAL') return 'BLOCK';
  if (severity === 'WARNING') return 'ADVISORY';
  return 'INFO';
}

function countDispositions(findings) {
  const counts = { PASS: 0, CONDITIONAL: 0, BLOCK: 0 };
  for (const finding of findings) {
    const disposition = String(finding.disposition ?? '').toUpperCase();
    if (disposition in counts) counts[disposition] += 1;
  }
  return counts;
}

function scalar(value) {
  return value === undefined || value === null ? 'UNAVAILABLE' : String(value);
}
