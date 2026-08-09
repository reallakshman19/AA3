import {
  LFEA_TOPOLOGY_REVIEW_KIND,
  getLfeaTopologyReviewQueue,
} from './lfea-topology-review-model.js';

export const LFEA_TOPOLOGY_REVIEW_VIEW_SCHEMA = 'lfea-topology-review-view/v1';

/**
 * Read-only topology review surface. It renders the already-projected P-02
 * review model and owns no detector or geometry mutation authority.
 */
export function renderLfeaTopologyReview(documentRef, root, model) {
  if (!root || typeof root.append !== 'function') {
    throw new TypeError('Topology review view requires a render root.');
  }
  if (!model) return null;

  const section = documentRef.createElement('section');
  section.dataset.role = 'lfea-topology-review';
  section.dataset.schema = LFEA_TOPOLOGY_REVIEW_VIEW_SCHEMA;
  section.dataset.semanticHash = model.semanticHash;
  section.dataset.mutationApplied = 'false';
  section.dataset.detectorRerun = 'false';

  const heading = documentRef.createElement('h3');
  heading.textContent = 'Topology Review — governed diagnostics';
  const policy = documentRef.createElement('p');
  policy.dataset.role = 'lfea-topology-review-policy';
  policy.textContent = 'Diagnostics and evidence only. No merge, delete, reconnect, snap, autofix, or geometry mutation is performed here.';
  section.append(heading, policy);

  section.append(summaryTable(documentRef, model));
  section.append(queueTable(documentRef, model));
  section.append(findingsTable(documentRef, model));
  root.append(section);
  return section;
}

function summaryTable(doc, model) {
  const table = doc.createElement('table');
  table.dataset.role = 'lfea-topology-review-summary';
  appendKeyValue(doc, table, 'Review semantic hash', model.semanticHash);
  appendKeyValue(doc, table, 'Source semantic hash', model.sourceAuthority.sourceSemanticHash);
  appendKeyValue(doc, table, 'Source evidence hash', model.sourceAuthority.sourceEvidenceHash);
  appendKeyValue(doc, table, 'Pre-FEA diagnostics semantic hash', model.sourceAuthority.diagnosticsSemanticHash);
  appendKeyValue(doc, table, 'Pre-FEA diagnostics evidence hash', model.sourceAuthority.diagnosticsEvidenceHash);
  appendKeyValue(doc, table, 'Findings', String(model.summary.findingCount));
  appendKeyValue(doc, table, 'Unresolved', String(model.summary.unresolvedCount));
  appendKeyValue(doc, table, 'Topology mutation applied', 'NO');
  return table;
}

function queueTable(doc, model) {
  const table = doc.createElement('table');
  table.dataset.role = 'lfea-topology-review-queues';
  const head = doc.createElement('tr');
  for (const label of ['Review queue', 'Count']) {
    const th = doc.createElement('th');
    th.textContent = label;
    head.append(th);
  }
  table.append(head);
  for (const kind of Object.values(LFEA_TOPOLOGY_REVIEW_KIND)) {
    const queue = getLfeaTopologyReviewQueue(model, kind);
    const row = doc.createElement('tr');
    row.dataset.queueKind = kind;
    const kindCell = doc.createElement('td');
    kindCell.textContent = kind;
    const countCell = doc.createElement('td');
    countCell.textContent = String(queue.count);
    row.append(kindCell, countCell);
    table.append(row);
  }
  return table;
}

function findingsTable(doc, model) {
  if (model.findings.length === 0) {
    const empty = doc.createElement('p');
    empty.dataset.role = 'lfea-topology-review-empty';
    empty.textContent = 'No topology/proximity findings are retained for review.';
    return empty;
  }
  const table = doc.createElement('table');
  table.dataset.role = 'lfea-topology-review-findings';
  const head = doc.createElement('tr');
  for (const label of ['Kind', 'Disposition', 'Source IDs', 'Distance / tolerance', 'Finding', 'Trace']) {
    const th = doc.createElement('th');
    th.textContent = label;
    head.append(th);
  }
  table.append(head);
  for (const finding of model.findings) {
    const row = doc.createElement('tr');
    row.dataset.findingId = finding.findingId;
    row.dataset.reviewKind = finding.kind;
    row.dataset.disposition = finding.disposition;
    row.append(
      textCell(doc, finding.kind),
      textCell(doc, `${finding.disposition} · ${finding.severity}`),
      textCell(doc, finding.sourceEntityIds.join(', ')),
      textCell(doc, measurementText(finding)),
      textCell(doc, `${finding.message} ${finding.technicalBasis}`),
      textCell(doc, traceText(finding)),
    );
    table.append(row);
  }
  return table;
}

function traceText(finding) {
  const evidence = finding.evidence ?? {};
  return [
    evidence.origin ? `origin=${evidence.origin}` : null,
    evidence.upstreamFindingId ? `finding=${evidence.upstreamFindingId}` : null,
    evidence.upstreamCode ? `code=${evidence.upstreamCode}` : null,
    evidence.diagnosticSemanticHash ? `diagnostic=${evidence.diagnosticSemanticHash}` : null,
    evidence.diagnosticEvidenceHash ? `evidence=${evidence.diagnosticEvidenceHash}` : null,
    finding.sourcePaths?.length ? `path=${finding.sourcePaths.join(',')}` : null,
  ].filter(Boolean).join(' · ');
}

function measurementText(finding) {
  if (finding.distanceM === null || finding.toleranceM === null) return 'Not applicable';
  return `${formatMetres(finding.distanceM)} m / ${formatMetres(finding.toleranceM)} m`;
}

function formatMetres(value) {
  return Number(value).toPrecision(8).replace(/(?:\.0+|(?:(\.\d*?)0+))$/u, '$1');
}

function appendKeyValue(doc, table, label, value) {
  const row = doc.createElement('tr');
  const th = doc.createElement('th');
  th.scope = 'row';
  th.textContent = label;
  const td = doc.createElement('td');
  td.textContent = String(value);
  row.append(th, td);
  table.append(row);
}

function textCell(doc, value) {
  const cell = doc.createElement('td');
  cell.textContent = String(value);
  return cell;
}
