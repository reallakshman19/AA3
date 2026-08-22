import { createLfeaTopologyReviewFromDiagnostics } from './lfea-topology-review-from-prefea.js';
import { renderLfeaTopologyReview } from './lfea-topology-review-view.js';
import { buildInputXmlDiagnosticPresentation } from './lfea-diagnostics/lfea-source-diagnostic-adapters.js';
import { renderLfeaDiagnosticPresentation } from './lfea-diagnostics/lfea-diagnostic-presentation-view.js';

export const LINEAR_PIPING_INPUTXML_DIAGNOSTICS_VIEW_SCHEMA = 'linear-piping-inputxml-diagnostics-view/v1';

/**
 * Render diagnostics already retained by the native InputXML pre-flight receipt.
 * The governed preparation finding set is the only authority for finding
 * disposition here; raw topology/proximity diagnostics remain metric/evidence
 * views and are never reinterpreted into BLOCK/CONDITIONAL UI state.
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
  shell.append(heading, readinessSection(documentRef, preFlight));

  const findingPresentation = buildInputXmlDiagnosticPresentation(preFlight);
  renderLfeaDiagnosticPresentation(documentRef, shell, findingPresentation, {
    heading: 'Governed pre-FEA findings',
  });

  shell.append(
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
    ['ADVISORY findings', String(counts.ADVISORY)],
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

function countDispositions(findings) {
  const counts = { PASS: 0, ADVISORY: 0, CONDITIONAL: 0, BLOCK: 0 };
  for (const finding of findings) {
    const disposition = String(finding.disposition ?? '').toUpperCase();
    if (disposition in counts) counts[disposition] += 1;
  }
  return counts;
}

function scalar(value) {
  return value === undefined || value === null ? 'UNAVAILABLE' : String(value);
}
