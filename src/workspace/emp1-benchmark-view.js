import { card, element } from './lafea-workbench-dom.js';

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
    'CAUx 2017 · COMPARISON QUALIFIED · ENGINEERING USE NOT AUTHORIZED');
  status.dataset.role = 'emp1-benchmark-comparison-status';
  status.dataset.comparisonState = evidence.comparison.state;
  status.dataset.engineeringUseAuthorized = String(
    evidence.routeRelationship.engineeringUseAuthorized === true,
  );
  section.append(status);

  section.append(keyValueTable(root, [
    ['Comparator', `${evidence.comparator.name} · ${evidence.comparator.version ?? 'version unresolved'}`],
    ['Case', evidence.caseId],
    ['Authority role', evidence.authorityRole],
    ['Current source re-verification', entry.currentSourceQualification.directPdfPageReobservation],
    ['Current source qualification', entry.currentSourceQualification.qualificationState],
    ['Source PDF SHA-256', entry.currentSourceQualification.rawPdfSha256],
    ['Benchmark-specific γ/radius basis', entry.currentSourceQualification.gammaRadiusBasisForThisBenchmark],
    ['Reference freeze', evidence.freezeEvidence.state],
    ['Retained comparison execution', entry.executionCustody.state],
    ['Comparison-time source-observation state (historical)',
      entry.currentSourceQualification.historicalComparisonObservationState],
  ]));

  const route = evidence.routeRelationship;
  const routeBox = element(root, 'div', 'lafea-workbench__authority');
  routeBox.dataset.role = 'emp1-benchmark-route-state';
  routeBox.append(
    element(root, 'strong', null, 'Comparison route'),
    keyValueTable(root, [
      ['Route', route.routeId],
      ['Registered', yesNo(route.registered)],
      ['Comparison qualification available', yesNo(route.comparisonQualificationAvailable)],
      ['Engineering use authorized', yesNo(route.engineeringUseAuthorized)],
      ['Route state', route.state],
    ]),
  );
  section.append(routeBox);

  const authority = element(root, 'p', 'lafea-workbench__authority', REQUIRED_AUTHORITY_STATEMENT);
  authority.dataset.role = 'emp1-benchmark-table-authority-statement';
  section.append(authority, comparisonTable(root, evidence.comparison.quantities));
  section.append(comparisonSummary(root, evidence.comparison.summary));
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
        ? 'WITHIN FROZEN TOLERANCE'
        : 'OUTSIDE FROZEN TOLERANCE'),
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
    'PV Elite · REFERENCE NOT AVAILABLE');
  status.dataset.role = 'emp1-benchmark-reference-unavailable';
  status.dataset.referenceState = evidence.comparison.state;
  section.append(
    status,
    element(root, 'p', 'lafea-workbench__section-intro',
      'Exact PV Elite WRC 107/537 report, input and version have not been retained and frozen. No reference values or tolerance are inferred.'),
    keyValueTable(root, [
      ['Comparator', evidence.comparator.name],
      ['Reference state', entry.referenceProgramme.state],
      ['Source custody', entry.referenceProgramme.sourceCustodyState],
      ['Expected values', entry.referenceProgramme.expectedValuesState],
      ['Version', entry.referenceProgramme.versionState],
      ['Tolerance', entry.referenceProgramme.toleranceState],
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
  return value === true ? 'YES' : value === false ? 'NO' : 'UNRESOLVED';
}

function engineeringNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toPrecision(8)).toString();
}
