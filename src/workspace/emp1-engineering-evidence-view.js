/** Read-only EMP.1 engineering custody presentation. No DOM value is calculation authority. */
import {
  EMP1_PROFESSIONAL_WRC_LOCATIONS,
  governingEightPointStressIntensity,
} from './emp1-professional-result-presentation.js';
import { card, element } from './lafea-workbench-dom.js';
import { renderEmp1GammaDomain } from './emp1-gamma-domain-view.js';
import {
  emp1PlainLanguageLabel,
  emp1PlainLanguageLabelRequired,
} from './emp1-plain-language-labels.js';

const FORCE_NAMES = Object.freeze(['Fx', 'Fy', 'Fz']);
const MOMENT_NAMES = Object.freeze(['Mx', 'My', 'Mz']);
const WRC_LOCATIONS = EMP1_PROFESSIONAL_WRC_LOCATIONS;

export function renderEmp1StageEngineeringEvidence(root, stageId, stage, projection) {
  if (stageId === 'LAFEA.1') return renderStageA(root, stage);
  if (stageId === 'LAFEA.2') return renderStageB(root, stage, projection);
  return null;
}

export function renderEmp1BoundedCorrelationEvidence(root, projection) {
  const result = card(root, 'EMP.1.C bounded local-correlation authority');
  result.section.dataset.role = 'emp1-c-bounded-evidence';
  result.section.dataset.guidedTarget = 'emp1-c-bounded-evidence';
  const c = projection?.steps?.find((step) => step.shortId === 'C');
  const routes = Array.isArray(c?.boundedProductionRoutes) ? c.boundedProductionRoutes : [];
  result.body.append(element(root, 'p', 'lafea-workbench__section-intro',
    'C is a governed local shell-correlation step. The bounded route below is real engineering authority only inside its exact runtime domain; global/full-domain EMP.1.C and code-compliance release remain separate and blocked.'));

  if (!routes.length) {
    result.body.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'No bounded local-correlation route is registered in this product projection.'));
    return result.section;
  }

  for (const route of routes) {
    const status = element(root, 'strong', 'lafea-result-highlights__status',
      route.engineeringUseAuthorized
        ? 'Bounded route · Engineering use authorized'
        : 'Bounded route · Engineering use not authorized');
    status.dataset.role = 'emp1-c-bounded-route-status';
    status.dataset.authorized = String(route.engineeringUseAuthorized === true);
    status.dataset.routeId = String(route.routeId ?? 'UNRESOLVED');
    result.body.append(status);
    result.body.append(keyValueTable(root, [
      ['Method', `WRC 537 (${route.method?.edition ?? 'edition unresolved'})`],
      ['Shell / attachment', `${engineeringTerm(route.scope?.shellFamily)} / ${engineeringTerm(route.scope?.attachmentShape)}`],
      ['Curve variant', engineeringTerm(route.scope?.variant)],
      ['γ', route.scope?.gamma],
      ['β domain', `${engineeringNumber(route.scope?.betaMinimum)} ≤ β ≤ ${engineeringNumber(route.scope?.betaMaximum)}`],
      ['Differential pressure', route.scope?.differentialPressure],
      ['WRC load-axis authority', human(route.scope?.cylindricalLoadAxisAuthority)],
      ['WRC +P rule', human(route.scope?.wrcPositivePRule)],
      ['Runtime source-polarity evidence', requiredHuman(
        route.scope?.runtimeSourcePolarityEvidenceRequired === true ? 'REQUIRED' : 'UNRESOLVED',
      )],
      ['Raw foundation eZ is WRC polarity authority', yesNo(
        route.scope?.rawFoundationRadialHintIsPolarityAuthority,
      )],
      ['Kn / Kb', `${engineeringNumber(route.scope?.Kn)} / ${engineeringNumber(route.scope?.Kb)}`],
      ['Interpolation', requiredHuman(
        route.scope?.interpolationAllowed === false ? 'PROHIBITED' : 'UNRESOLVED',
      )],
      ['Cross-variant fallback', requiredHuman(
        route.scope?.crossVariantFallbackAllowed === false ? 'PROHIBITED' : 'UNRESOLVED',
      )],
      ['Release qualified', yesNo(route.releaseQualified)],
    ]));
    result.body.append(technicalRouteDetails(root, route));

    const blocked = element(root, 'div', 'lafea-workbench__authority');
    blocked.append(element(root, 'strong', null, 'Still blocked outside this bounded route'));
    const list = element(root, 'ul');
    (route.remainingBlocked ?? []).forEach((code) => list.append(element(root, 'li', null, human(code))));
    blocked.append(list);
    result.body.append(blocked);
  }

  const authorized = routes.find((route) => route.engineeringUseAuthorized) ?? routes[0];
  result.body.append(renderEmp1GammaDomain(root, {
    routeGamma: authorized?.scope?.gamma ?? null,
    requestedGamma: authorized?.scope?.gamma ?? null,
  }));
  return result.section;
}

export function renderEmp1CorrelationResultEvidence(root, localCorrelation) {
  if (!localCorrelation || typeof localCorrelation !== 'object') return null;
  const result = card(root, 'EMP.1.C WRC calculation evidence');
  result.section.dataset.role = 'emp1-c-result-evidence';
  const custody = localCorrelation.sourceCustody;
  const numerics = localCorrelation.numerics;
  const geometry = custody?.geometry ?? numerics?.geometry;
  if (geometry) {
    result.body.append(sectionHeading(root, 'Source-bound WRC geometry'));
    result.body.append(keyValueTable(root, [
      ['Rm', geometry.meanRadius],
      ['T', geometry.shellThickness],
      ['r0', geometry.attachmentRadius],
      ['γ = Rm/T', geometry.gamma],
      ['β = 0.875 r0/Rm', geometry.beta],
      ['Geometry evidence hash', custody?.geometryEvidenceHash],
    ]));
  }
  if (custody?.loadReference || custody?.axes) {
    result.body.append(sectionHeading(root, 'Reference and foundation-frame custody'));
    result.body.append(keyValueTable(root, [
      ['Reference identity', custody?.loadReference?.identity],
      ['Reference point global', vectorText(custody?.loadReference?.pointGlobal)],
      ['Foundation vessel eX', vectorText(custody?.axes?.vesselCenterlineGlobal)],
      ['Foundation radial eZ — unoriented line', vectorText(custody?.axes?.nozzleCenterlineGlobal)],
      ['Foundation result hash', custody?.foundationResultHash],
      ['Screening result hash', custody?.screeningResultHash],
    ]));
  }
  const axis = custody?.wrcAxisAuthority ?? localCorrelation?.axisAuthority;
  if (axis) {
    result.body.append(sectionHeading(root, 'Source-qualified WRC load-axis polarity'));
    result.body.append(keyValueTable(root, [
      ['Axis authority state', human(axis.state)],
      ['Axis authority identity', axis.authorityId],
      ['Source point global', vectorText(axis.sourcePointGlobal)],
      ['Attachment target global', vectorText(axis.targetPointGlobal)],
      ['Raw radial-line alignment with +P', axis.sourceToTargetRadialAlignment],
      ['+P', vectorText(axis.basisGlobal?.P)],
      ['+Vc', vectorText(axis.basisGlobal?.Vc)],
      ['+Vl', vectorText(axis.basisGlobal?.Vl)],
      ['+Mc moment axis', vectorText(axis.basisGlobal?.Mc)],
      ['+Ml moment axis', vectorText(axis.basisGlobal?.Ml)],
      ['+Mt moment axis', vectorText(axis.basisGlobal?.Mt)],
      ['Axis source SHA-256', axis.sourceDocumentSha256],
    ]));
  }
  if (numerics?.wrcLoads) {
    result.body.append(sectionHeading(root, 'WRC attachment-reference loads'));
    result.body.append(keyValueTable(root,
      ['P', 'Vc', 'Vl', 'Mc', 'Ml', 'Mt'].map((key) => [key, numerics.wrcLoads[key]])));
  }
  const stresses = localCorrelation.stresses;
  if (stresses?.stressIntensity?.length === WRC_LOCATIONS.length) {
    result.body.append(sectionHeading(root, 'Eight-location shell stress trace'));
    result.body.append(wrcStressTable(root, stresses));
    result.body.append(renderWrcProfessionalScope(
      root,
      governingEightPointStressIntensity(stresses.stressIntensity),
    ));
  }
  return result.section;
}

function renderWrcProfessionalScope(root, governing) {
  const scope = element(root, 'div', 'lafea-workbench__authority');
  scope.dataset.role = 'emp1-c-eight-point-governing';
  const governingValue = governing.state === 'AVAILABLE'
    ? `${governing.location} · stress intensity ${engineeringNumber(governing.stressIntensity)}`
    : `Unresolved · ${human(governing.reason)}`;
  scope.append(
    element(root, 'strong', null, 'Professional WRC result scope'),
    keyValueTable(root, [
      ['Governing among eight evaluated WRC points', governingValue],
      ['Evaluated locations', governing.evaluatedLocations.join(', ')],
      ['Envelope basis', human(governing.basis)],
      ['Continuous/global shell maximum', 'Not claimed'],
      ['Stress result domain', 'Host cylindrical shell at the attachment–shell juncture'],
      ['Nozzle / attachment-wall stress', 'Not calculated'],
      ['Continuous juncture search', 'Not performed'],
      ['Code compliance', 'Not established by this WRC result'],
    ]),
    element(root, 'p', null,
      'The governing value above is the maximum retained stress intensity among Au, Al, Bu, Bl, Cu, Cl, Du and Dl only. It is not a continuous or global shell maximum. Engineering judgment remains required outside these evaluated locations.'),
  );
  return scope;
}

function renderStageA(root, stage) {
  const result = card(root, 'EMP.1.A load, reference and axis custody');
  result.section.dataset.role = 'emp1-a-engineering-custody';
  const execution = retainedResult(stage);
  if (!execution) {
    result.body.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'Run EMP.1.A to retain transformed resultants, target-reference and coordinate-frame evidence.'));
    return result.section;
  }
  const frame = execution.coordinateSystemEvidence ?? {};
  result.body.append(element(root, 'p', 'lafea-workbench__section-intro',
    'These vectors are retained calculation evidence. EMP.1.C uses retained vessel-axis and load-reference geometry to derive WRC polarity; foundation eZ is only a radial line and cannot by itself define WRC +P. This view cannot override either authority.'));
  result.body.append(sectionHeading(root, 'Retained coordinate basis'));
  result.body.append(keyValueTable(root, [
    ['Coordinate system', frame.identity],
    ['Origin global', vectorText(frame.originGlobal)],
    ['eX — pipe/vessel axis', vectorText(frame.axesGlobal?.eX)],
    ['eY — circumferential axis', vectorText(frame.axesGlobal?.eY)],
    ['eZ — radial line, polarity not WRC authority', vectorText(frame.axesGlobal?.eZ)],
    ['Handedness', human(frame.handedness)],
    ['Orthogonality residual', frame.orthogonalityResidual],
  ]));
  result.body.append(sectionHeading(root, 'Transferred load cases'));
  result.body.append(loadCaseTable(root, execution.transformedLoadCases ?? []));
  result.body.append(sectionHeading(root, 'Pressure disposition'));
  result.body.append(pressureTable(root, execution.pressureStressResults ?? []));
  return result.section;
}

function renderStageB(root, stage, projection) {
  const result = card(root, 'EMP.1.B geometry, thickness and A→B custody');
  result.section.dataset.role = 'emp1-b-engineering-custody';
  const execution = retainedResult(stage);
  const source = stage?.document?.sourceEvidence;
  const model = source?.foundationModel;
  const section = execution?.sectionProperties;
  const currentness = projection?.custody?.bSourceEvidenceState ?? 'UNRESOLVED';
  const current = human(currentness);
  const status = element(root, 'strong', 'lafea-result-highlights__status', `A → B ${current}`);
  status.dataset.role = 'emp1-b-engineering-currentness';
  status.dataset.state = currentness;
  result.body.append(status);
  result.body.append(element(root, 'p', 'lafea-workbench__section-intro',
    'B retains its own screening cases and evaluation locations, but OD/thickness and A resultants remain traceable to the exact retained A model/result.'));

  if (!model) {
    result.body.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'Load a valid EMP.1.B request to inspect retained A geometry lineage.'));
    return result.section;
  }
  const ro = section?.outerRadius ?? model.pipeGeometry?.outsideDiameter?.value / 2;
  const t = section?.assessmentPipeThickness ?? model.thicknessBasis?.assessmentPipeThickness?.value;
  const rm = Number.isFinite(ro) && Number.isFinite(t) ? ro - t / 2 : null;
  result.body.append(sectionHeading(root, 'Section geometry lineage'));
  result.body.append(keyValueTable(root, [
    ['Pipe OD', model.pipeGeometry?.outsideDiameter?.value],
    ['Assessment thickness T', t],
    ['Outer radius', ro],
    ['Inner radius', section?.innerRadius],
    ['Mean radius Rm = Ro − T/2', rm],
    ['OD source', section?.sourceReferences?.outsideDiameter ?? model.pipeGeometry?.outsideDiameter?.sourceRef],
    ['Thickness source', section?.sourceReferences?.assessmentPipeThickness ?? model.thicknessBasis?.assessmentPipeThickness?.sourceRef],
  ]));
  result.body.append(sectionHeading(root, 'Retained ancestry'));
  result.body.append(keyValueTable(root, [
    ['Foundation model hash', model.semanticHash],
    ['Foundation result hash', source?.foundationResult?.semanticHashes?.resultPayloadSemanticHash],
    ['Screening request hash', stage?.document?.semanticHash],
    ['Screening result hash', execution?.semanticHashes?.screeningResultPayloadSemanticHash],
  ]));
  if (execution?.limitations?.length) {
    const limits = element(root, 'div', 'lafea-workbench__authority');
    limits.append(element(root, 'strong', null, 'Screening limitations retained'));
    const list = element(root, 'ul');
    execution.limitations.forEach((value) => list.append(element(root, 'li', null, human(value))));
    limits.append(list);
    result.body.append(limits);
  }
  return result.section;
}

function loadCaseTable(root, rows) {
  const table = element(root, 'table', 'lafea-result-table');
  appendHeader(root, table, ['Load case', 'Action', 'Source ref', 'Target ref', ...FORCE_NAMES, ...MOMENT_NAMES]);
  if (!rows.length) appendEmptyRow(root, table, 10, 'No retained transformed load cases.');
  rows.forEach((row) => {
    const tr = element(root, 'tr');
    const identity = element(root, 'th', null, String(row.identity ?? 'UNRESOLVED'));
    identity.scope = 'row';
    tr.append(identity,
      element(root, 'td', null, human(row.canonicalActionSense ?? row.inputActionSense)),
      element(root, 'td', null, String(row.sourceReferencePointIdentity ?? '—')),
      element(root, 'td', null, `${row.targetReferencePointIdentity ?? '—'} @ ${vectorText(row.targetPointGlobal)}`));
    [...(row.transformedForceLocal ?? []).slice(0, 3), ...(row.transformedMomentLocal ?? []).slice(0, 3)]
      .forEach((value) => tr.append(element(root, 'td', null, engineeringNumber(value))));
    table.append(tr);
  });
  return table;
}

function pressureTable(root, rows) {
  const table = element(root, 'table', 'lafea-result-table');
  appendHeader(root, table, ['Pressure result', 'Definition', 'Pi', 'Po', 'Δp', 'End condition', 'Axial pressure stress', 'Limitations']);
  if (!rows.length) appendEmptyRow(root, table, 8, 'No retained pressure result.');
  rows.forEach((row) => {
    const tr = element(root, 'tr');
    const identity = element(root, 'th', null, String(row.identity ?? 'UNRESOLVED'));
    identity.scope = 'row';
    const dp = Number.isFinite(row.internalPressure) && Number.isFinite(row.externalPressure)
      ? row.internalPressure - row.externalPressure : null;
    tr.append(identity,
      element(root, 'td', null, String(row.pressureDefinitionIdentity ?? '—')),
      element(root, 'td', null, engineeringNumber(row.internalPressure)),
      element(root, 'td', null, engineeringNumber(row.externalPressure)),
      element(root, 'td', null, engineeringNumber(dp)),
      element(root, 'td', null, human(row.endCondition)),
      element(root, 'td', null, engineeringNumber(row.axialPressureStress)),
      element(root, 'td', null, (row.limitations ?? []).map(human).join('; ') || '—'));
    table.append(tr);
  });
  return table;
}

function wrcStressTable(root, stresses) {
  const table = element(root, 'table', 'lafea-result-table');
  appendHeader(root, table, ['Location', 'σφ', 'σx', 'τ', 'Stress intensity']);
  WRC_LOCATIONS.forEach((location, index) => {
    const tr = element(root, 'tr');
    const identity = element(root, 'th', null, location);
    identity.scope = 'row';
    tr.append(identity,
      element(root, 'td', null, engineeringNumber(stresses.circumferential?.[index])),
      element(root, 'td', null, engineeringNumber(stresses.longitudinal?.[index])),
      element(root, 'td', null, engineeringNumber(stresses.shear?.[index])),
      element(root, 'td', null, engineeringNumber(stresses.stressIntensity?.[index])));
    table.append(tr);
  });
  return table;
}

function keyValueTable(root, rows) {
  const table = element(root, 'table', 'lafea-result-table');
  appendHeader(root, table, ['Engineering datum', 'Retained value']);
  rows.forEach(([label, value]) => {
    const tr = element(root, 'tr');
    const th = element(root, 'th', null, label);
    th.scope = 'row';
    tr.append(th, element(root, 'td', null, displayValue(value)));
    table.append(tr);
  });
  return table;
}

function technicalRouteDetails(root, route) {
  const details = element(root, 'details', 'lafea-workbench__custody-details');
  details.dataset.emp1RawTechnical = 'true';
  details.append(
    element(root, 'summary', null, 'Technical route identifiers'),
    keyValueTable(root, [
      ['Route ID', route.routeId],
      ['Method ID', route.method?.identity],
      ['Axis source SHA-256', route.scope?.cylindricalLoadAxisSourceSha256],
    ]),
  );
  return details;
}

function appendHeader(root, table, labels) {
  const tr = element(root, 'tr');
  labels.forEach((label) => {
    const th = element(root, 'th', null, label);
    th.scope = 'col';
    tr.append(th);
  });
  table.append(tr);
}
function appendEmptyRow(root, table, span, text) {
  const tr = element(root, 'tr');
  const td = element(root, 'td', null, text);
  td.colSpan = span;
  tr.append(td);
  table.append(tr);
}
function sectionHeading(root, text) { return element(root, 'h4', null, text); }
function retainedResult(stage) { return stage?.execution?.result ?? stage?.execution ?? null; }
function vectorText(value) {
  return Array.isArray(value) && value.length === 3
    ? `[${value.map(engineeringNumber).join(', ')}]`
    : '—';
}
function displayValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'number') return engineeringNumber(value);
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return value == null || value === '' ? '—' : String(value);
}
function engineeringNumber(value) {
  if (!Number.isFinite(value)) return '—';
  return Number(value.toPrecision(10)).toString();
}
function engineeringTerm(value) {
  const terms = {
    CYLINDRICAL: 'Cylindrical shell',
    ROUND: 'Round attachment',
    ORIGINAL: 'Original',
  };
  return terms[value] ?? human(value);
}
function yesNo(value) {
  return value === true ? 'Yes' : value === false ? 'No' : 'Unresolved';
}
function human(value) {
  return emp1PlainLanguageLabel(value);
}
function requiredHuman(value) {
  return emp1PlainLanguageLabelRequired(value);
}
