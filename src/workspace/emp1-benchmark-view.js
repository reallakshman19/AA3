import { card, element } from './lafea-workbench-dom.js';
import { emp1PlainLanguageLabelRequired } from './emp1-plain-language-labels.js';

const REQUIRED_AUTHORITY_STATEMENT =
  'Independent reference evidence — not WRC method authority. Does not establish code compliance, production authorization, or release qualification.';

export function renderEmp1BenchmarkEvidencePanel(root, workspace) {
  if (workspace?.schema !== 'emp1-benchmark-evidence-workspace/v1') {
    throw new TypeError('EMP1_BENCHMARK_EVIDENCE_WORKSPACE_INVALID');
  }

  const panel = card(root, 'Benchmark Evidence');
  panel.section.dataset.role = 'emp1-benchmark-evidence-panel';
  panel.section.dataset.guidedTarget = 'emp1-benchmark-evidence';
  panel.body.append(element(
    root,
    'p',
    'lafea-workbench__section-intro',
    'External benchmark evidence is retained verification context for the EMP.1 calculation. It is read-only here and is not the current assessment result.',
  ));

  const caux = comparator(workspace, 'CAUX');
  const pvElite = comparator(workspace, 'PV_ELITE');
  panel.body.append(renderCauxEvidence(root, caux));
  panel.body.append(renderPvEliteEvidence(root, pvElite));

  const boundary = element(root, 'p', 'lafea-workbench__authority',
    'Benchmark presentation cannot execute WRC, select or widen a tolerance, change frozen expected values, authorize a route, or create code/release authority.');
  boundary.dataset.role = 'emp1-benchmark-evidence-authority-boundary';
  panel.body.append(boundary);
  return panel.section;
}

function renderCauxEvidence(root, entry) {
  const evidence = entry.evidence;
  const section = element(root, 'section', 'lafea-workbench__custody');
  section.dataset.role = 'emp1-benchmark-comparator';
  section.dataset.comparatorId = 'CAUX';

  const status = element(root, 'strong', 'lafea-workbench__authority',
    'CAUx 2017 · Comparison qualified · Engineering use not authorized');
  status.dataset.role = 'emp1-benchmark-comparison-status';
  status.dataset.comparisonState = evidence.comparison.state;
  status.dataset.engineeringUseAuthorized = String(
    evidence.routeRelationship.engineeringUseAuthorized === true,
  );
  section.append(status);

  const summary = evidence.comparison.summary;
  const overview = element(root, 'div', 'lafea-workbench__custody');
  overview.dataset.role = 'emp1-benchmark-caux-overview';
  overview.append(
    element(root, 'strong', null, 'CAUx comparison at a glance'),
    keyValueTable(root, [
      ['Source re-verification', humanState(entry.currentSourceQualification.directPdfPageReobservation)],
      ['Comparison coverage', `${summary.withinToleranceCount} / ${summary.comparedQuantities} within frozen tolerance`],
      ['Worst relative difference',
        `${engineeringNumber(summary.worstRelativeDifferencePercent)} % · ${locationFromQuantityId(summary.worstRelativeDifferenceQuantityId)}`],
      ['Governing point',
        `${summary.governingReferenceLocation} reference / ${summary.governingEmp1Location} EMP.1 · Agreement: ${yesNo(summary.governingLocationAgreement)}`],
      ['Engineering use authorized', yesNo(evidence.routeRelationship.engineeringUseAuthorized)],
    ]),
  );
  section.append(overview);

  const authority = element(root, 'p', 'lafea-workbench__authority', REQUIRED_AUTHORITY_STATEMENT);
  authority.dataset.role = 'emp1-benchmark-table-authority-statement';
  section.append(authority);

  const audit = element(root, 'details', 'lafea-workbench__custody-details');
  audit.dataset.role = 'emp1-benchmark-caux-audit-details';
  audit.append(element(
    root,
    'summary',
    null,
    `Retained CAUx comparison and custody details (${evidence.comparison.quantities.length} points)`,
  ));

  audit.append(keyValueTable(root, [
    ['Comparator', `${evidence.comparator.name} · ${evidence.comparator.version ?? 'version unresolved'}`],
    ['Case', evidence.caseId],
    ['Authority role', humanState(evidence.authorityRole)],
    ['Current source re-verification', humanState(entry.currentSourceQualification.directPdfPageReobservation)],
    ['Current source qualification', humanState(entry.currentSourceQualification.qualificationState)],
    ['Benchmark-specific γ/radius basis', humanState(entry.currentSourceQualification.gammaRadiusBasisForThisBenchmark)],
    ['Reference freeze', humanState(evidence.freezeEvidence.state)],
    ['Retained comparison execution', humanState(entry.executionCustody.state)],
    ['Comparison-time source observation (historical)',
      humanState(entry.currentSourceQualification.historicalComparisonObservationState)],
  ]));
  audit.append(technicalDetails(root, 'CAUx technical identifiers', [
    ['Source PDF SHA-256', entry.currentSourceQualification.rawPdfSha256],
    ['Qualification ID', entry.currentSourceQualification.qualificationId],
    ['Retained execution repository commit', entry.executionCustody.repositoryCommit],
  ]));

  const route = evidence.routeRelationship;
  const routeBox = element(root, 'div', 'lafea-workbench__authority');
  routeBox.dataset.role = 'emp1-benchmark-route-state';
  routeBox.append(
    element(root, 'strong', null, 'Comparison route relationship'),
    keyValueTable(root, [
      ['Registered', yesNo(route.registered)],
      ['Comparison qualification available', yesNo(route.comparisonQualificationAvailable)],
      ['Engineering use authorized', yesNo(route.engineeringUseAuthorized)],
      ['Route state', humanState(route.state)],
    ]),
    technicalDetails(root, 'Comparison route technical identifier', [
      ['Route ID', route.routeId],
    ]),
  );
  audit.append(routeBox, comparisonTable(root, evidence.comparison.quantities));
  audit.append(comparisonSummary(root, evidence.comparison.summary));
  section.append(audit);
  return section;
}

function comparisonTable(root, quantities) {
  const wrapper = element(root, 'div');
  wrapper.dataset.role = 'emp1-benchmark-comparison-table-wrap';
  const table = element(root, 'table', 'lafea-result-table');
  table.dataset.role = 'emp1-benchmark-comparison-table';
  const caption = element(root, 'caption', null,
    'CAUx 2017 retained sustained host-shell stress-intensity comparison');
  table.append(caption);
  const head = element(root, 'tr');
  ['Point', 'Reference', 'EMP.1', 'Absolute difference', 'Relative difference', 'Tolerance', 'Status']
    .forEach((label) => {
      const cell = element(root, 'th', null, label);
      cell.scope = 'col';
      head.append(cell);
    });
  table.append(head);

  quantities.forEach((quantity) => {
    const row = element(root, 'tr');
    row.dataset.role = 'emp1-benchmark-comparison-row';
    row.dataset.location = quantity.location ?? quantity.quantityId;
    row.dataset.status = quantity.status;
    const point = element(root, 'th', null, quantity.location ?? quantity.quantityId);
    point.scope = 'row';
    row.append(
      point,
      element(root, 'td', null, `${engineeringNumber(quantity.referenceValue)} ${quantity.referenceUnit}`),
      element(root, 'td', null, `${engineeringNumber(quantity.emp1Value)} ${quantity.emp1Unit}`),
      element(root, 'td', null, `${engineeringNumber(quantity.absoluteDifference)} ${quantity.referenceUnit}`),
      element(root, 'td', null, quantity.relativeDifferencePercent == null
        ? '—'
        : `${engineeringNumber(quantity.relativeDifferencePercent)} %`),
      element(root, 'td', null, toleranceText(quantity.tolerance)),
      element(root, 'td', null, quantity.status === 'WITHIN_TOLERANCE'
        ? 'Within frozen tolerance'
        : 'Outside frozen tolerance'),
    );
    table.append(row);
  });
  wrapper.append(table);
  return wrapper;
}

function comparisonSummary(root, summary) {
  const section = element(root, 'div', 'lafea-workbench__custody');
  section.dataset.role = 'emp1-benchmark-comparison-summary';
  section.append(
    element(root, 'strong', null, 'Retained comparison summary'),
    keyValueTable(root, [
      ['Compared quantities', summary.comparedQuantities],
      ['Within frozen tolerance', `${summary.withinToleranceCount} / ${summary.comparedQuantities}`],
      ['Worst relative difference',
        `${engineeringNumber(summary.worstRelativeDifferencePercent)} % · ${locationFromQuantityId(summary.worstRelativeDifferenceQuantityId)}`],
      ['Worst absolute difference',
        `${engineeringNumber(summary.worstAbsoluteDifference)} kPa · ${locationFromQuantityId(summary.worstAbsoluteDifferenceQuantityId)}`],
      ['Governing reference point', summary.governingReferenceLocation],
      ['Governing EMP.1 point', summary.governingEmp1Location],
      ['Governing-point agreement', yesNo(summary.governingLocationAgreement)],
    ]),
  );
  return section;
}

function renderPvEliteEvidence(root, entry) {
  const evidence = entry.evidence;
  const section = element(root, 'section', 'lafea-workbench__custody');
  section.dataset.role = 'emp1-benchmark-comparator';
  section.dataset.comparatorId = 'PV_ELITE';

  const status = element(root, 'strong', 'lafea-workbench__authority',
    'PV Elite · Reference not available');
  status.dataset.role = 'emp1-benchmark-reference-unavailable';
  status.dataset.referenceState = evidence.comparison.state;
  section.append(
    status,
    element(root, 'p', 'lafea-workbench__section-intro',
      'Exact PV Elite WRC 107/537 report, input and version have not been retained and frozen. No reference values or tolerance are inferred.'),
    keyValueTable(root, [
      ['Comparator', evidence.comparator.name],
      ['Reference state', humanState(entry.referenceProgramme.state)],
      ['Source custody', humanState(entry.referenceProgramme.sourceCustodyState)],
      ['Expected values', humanState(entry.referenceProgramme.expectedValuesState)],
      ['Version', humanState(entry.referenceProgramme.versionState)],
      ['Tolerance', humanState(entry.referenceProgramme.toleranceState)],
      ['Comparison rows', evidence.comparison.quantities.length],
    ]),
  );
  return section;
}

function comparator(workspace, comparatorId) {
  const entry = workspace.comparators.find((item) => item.comparatorId === comparatorId);
  if (!entry) throw new TypeError(`EMP1_BENCHMARK_COMPARATOR_REQUIRED:${comparatorId}`);
  return entry;
}

function keyValueTable(root, rows) {
  const table = element(root, 'table', 'lafea-doc-grid');
  const head = element(root, 'tr');
  ['Engineering datum', 'Value'].forEach((label) => {
    const cell = element(root, 'th', null, label);
    cell.scope = 'col';
    head.append(cell);
  });
  table.append(head);
  rows.forEach(([label, value]) => {
    const row = element(root, 'tr');
    const key = element(root, 'th', null, label);
    key.scope = 'row';
    row.append(key, element(root, 'td', null, value == null ? '—' : String(value)));
    table.append(row);
  });
  return table;
}

function technicalDetails(root, summary, rows) {
  const details = element(root, 'details', 'lafea-workbench__custody-details');
  details.dataset.emp1RawTechnical = 'true';
  details.append(element(root, 'summary', null, summary), keyValueTable(root, rows));
  return details;
}

function humanState(value) {
  return emp1PlainLanguageLabelRequired(value);
}

function toleranceText(tolerance) {
  if (tolerance.kind === 'RELATIVE_PERCENT') return `${engineeringNumber(tolerance.value)} %`;
  return `${engineeringNumber(tolerance.value)} ${tolerance.unit ?? ''}`.trim();
}

function locationFromQuantityId(quantityId) {
  const value = String(quantityId ?? '—');
  const split = value.lastIndexOf(':');
  return split >= 0 ? value.slice(split + 1) : value;
}

function yesNo(value) {
  return value === true ? 'Yes' : value === false ? 'No' : 'Unresolved';
}

function engineeringNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toPrecision(8)).toString();
}
