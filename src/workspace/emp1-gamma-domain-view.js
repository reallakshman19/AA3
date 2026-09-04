/**
 * Read-only presentation of which shell parameters EMP.1.C can actually evaluate.
 *
 * The bounded-route card already states the route's declared domain. What it never
 * answered is the question an engineer actually arrives with: my vessel is not the
 * route's gamma, so what happens? Until interpolation existed the answer was simply
 * "blocked", and the only trace was a shouted GAMMA OTHER THAN 5 chip in a list of
 * blocked conditions.
 *
 * This panel states the tabulated rows the retained dataset provides, where a
 * requested gamma falls against them, and — when a bracket is needed — that the
 * interpolation is an owner-directed engineering policy rather than a WRC source
 * rule, together with its measured error behaviour. No DOM value here is
 * calculation authority.
 */
import {
  EMP1_WRC537_GAMMA_INTERPOLATION_POLICY,
  emp1Wrc537CommonTabulatedGammas,
  planEmp1Wrc537GammaInterpolation,
} from '../core/emp1/emp1-wrc537-cylindrical-gamma-interpolation.js';
import { card, element } from './lafea-workbench-dom.js';

const VARIANT = 'ORIGINAL';

/** The interpolation coordinates are internal enums; name them for the reader. */
const COORDINATE_LABELS = Object.freeze({
  LINEAR_GAMMA: 'Linear in γ',
  LOG_GAMMA: 'Linear in log γ',
  RECIPROCAL_GAMMA: 'Linear in 1/γ',
});
const coordinateLabel = (value) => COORDINATE_LABELS[value] ?? String(value ?? '—');

export function renderEmp1GammaDomain(root, { requestedGamma = null, routeGamma = null } = {}) {
  const panel = card(root, 'Shell parameter domain and curve selection');
  panel.section.dataset.role = 'emp1-gamma-domain';
  panel.section.dataset.guidedTarget = 'emp1-gamma-domain';

  let grid = [];
  try {
    grid = emp1Wrc537CommonTabulatedGammas(VARIANT);
  } catch {
    panel.body.append(element(root, 'p', 'lafea-workbench-svg__empty',
      'The retained WRC curve dataset did not resolve a common tabulated gamma set.'));
    return panel.section;
  }

  panel.body.append(element(root, 'p', 'lafea-workbench__section-intro',
    'WRC 537 tabulates its cylindrical curves at discrete shell parameters. A Table-5 '
    + 'evaluation consumes every required figure, so the usable rows are the ones every '
    + 'required figure provides.'));

  const rows = [
    ['Tabulated γ rows available to a full Table-5 route', grid.join(', ')],
    ['Curve variant', VARIANT],
  ];
  if (routeGamma != null) rows.push(['Bounded route γ', String(routeGamma)]);

  const plan = requestedGamma == null
    ? null
    : planEmp1Wrc537GammaInterpolation({ variant: VARIANT, gamma: requestedGamma });

  if (!plan) {
    rows.push(['Requested γ', 'Not yet bound — complete the C source binding']);
  } else if (plan.status === 'EXACT_SOURCE_TABULATED_ROW') {
    rows.push(
      ['Requested γ', `${requestedGamma} — exact source-tabulated row`],
      ['Curve selection', 'Source-qualified, no interpolation'],
    );
  } else if (plan.status === 'INTERPOLATION_PLANNED') {
    rows.push(
      ['Requested γ', `${requestedGamma} — not a tabulated row`],
      ['Bracketed by', `γ ${plan.bracket.lowerGamma} → ${plan.bracket.upperGamma}`],
      ['Interpolation coordinate', coordinateLabel(plan.coordinate)],
      ['Curve selection', 'Interpolated — NOT source-qualified'],
    );
  } else {
    rows.push(
      ['Requested γ', `${requestedGamma} — cannot be evaluated`],
      ['Reason', plan.reasons.join(', ')],
    );
  }
  panel.body.append(keyValues(root, rows));

  if (plan?.status === 'INTERPOLATION_PLANNED') {
    panel.body.append(interpolationNotice(root));
  }
  panel.body.append(policyNotice(root, plan));
  return panel.section;
}

/** Shown only when the presented result actually depended on a bracket. */
function interpolationNotice(root) {
  const notice = element(root, 'div', 'lafea-workbench__failure');
  notice.dataset.role = 'emp1-gamma-interpolation-notice';
  notice.setAttribute('role', 'status');
  const accuracy = EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.coordinateAccuracyBasis;
  const measured = accuracy?.[EMP1_WRC537_GAMMA_INTERPOLATION_POLICY.defaultCoordinate];
  notice.append(
    element(root, 'strong', null, 'This shell parameter is interpolated between source rows'),
    element(root, 'p', null,
      'WRC 537 does not state whether gamma may be interpolated, which quantity to '
      + 'interpolate, or in which coordinate. The values shown come from an owner-directed '
      + 'engineering policy, not from a WRC source rule, and carry no method-fidelity, '
      + 'production or code-compliance authority.'),
  );
  if (measured) {
    notice.append(element(root, 'p', null,
      `Measured by leave-one-out over the interior rows: median ${measured.medianAbsolutePercent}% `
      + `and 95th percentile ${measured.p95AbsolutePercent}% against the hidden row, with `
      + `${measured.unconservativeCases} of ${accuracy.cases} cases understating the envelope. `
      + 'Leave-one-out spans two row gaps and so bounds normal use from above.'));
  }
  return notice;
}

function policyNotice(root, plan) {
  const policy = EMP1_WRC537_GAMMA_INTERPOLATION_POLICY;
  const notice = element(root, 'div', 'lafea-workbench__authority');
  notice.dataset.role = 'emp1-gamma-domain-policy';
  notice.append(
    element(root, 'strong', null, 'Curve selection policy'),
    keyValues(root, [
      ['Exact tabulated γ', 'Source-qualified selection, no interpolation'],
      ['Non-tabulated γ', 'Interpolated on the nondimensional ordinate Y, not on the curve-fit coefficients'],
      ['Extrapolation beyond the tabulated range', policy.extrapolation],
      ['Mixing Original and Extrapolated curves', policy.variantMixing],
      ['Interpolation coordinate', coordinateLabel(policy.defaultCoordinate)],
      ['β outer limit above γ=5', 'Not printed in the source; an explicit owner declaration is required'],
    ]),
  );
  if (plan?.status === 'INTERPOLATION_PLANNED') {
    notice.append(element(root, 'p', null,
      'Section 4.4 prohibits using an Original curve beyond its plotted limit, and the '
      + 'higher-gamma curves terminate before the gamma=5 range. The curve fit returns a '
      + 'smooth value past that limit regardless, so the beta band must be declared rather '
      + 'than inferred.'));
  }
  return notice;
}

function keyValues(root, rows) {
  const table = element(root, 'table', 'lafea-doc-grid');
  const header = element(root, 'tr');
  ['Engineering datum', 'Value'].forEach((label) => {
    const cell = element(root, 'th', null, label);
    cell.scope = 'col';
    header.append(cell);
  });
  table.append(header);
  rows.forEach(([label, value]) => {
    const row = element(root, 'tr');
    const key = element(root, 'th', null, label);
    key.scope = 'row';
    row.append(key, element(root, 'td', null, value == null ? '—' : String(value)));
    table.append(row);
  });
  return table;
}
