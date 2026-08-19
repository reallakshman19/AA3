const NUMERICAL_EPSILON = 1e-9;

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function near(actual, expected, epsilon = NUMERICAL_EPSILON) {
  return Math.abs(actual - expected) <= epsilon;
}

function check(condition, code, details = {}) {
  return condition ? null : { code, ...details };
}

export function qualifyHexagonIndependentPrecheck(precheck) {
  const failures = [];
  const add = (failure) => {
    if (failure) failures.push(failure);
  };

  add(check(precheck?.schema === 'emp1-independent-precheck/v1', 'FAIL_SCHEMA'));
  add(check(
    precheck?.classification === 'SUPPLEMENTAL_REFERENCE_NOT_CAUX_BENCHMARK',
    'FAIL_AUTHORITY_CLASSIFICATION'
  ));
  add(check(precheck?.qualificationUse === 'SANITY_CHECK_ONLY', 'FAIL_QUALIFICATION_USE'));
  add(check(precheck?.maySatisfyCauxA4 === false, 'FAIL_CAUX_AUTHORITY_GUARD'));
  add(check(precheck?.mayAuthorizeEmp1CProduction === false, 'FAIL_PRODUCTION_AUTHORITY_GUARD'));
  add(check(
    precheck?.expectedValuesLockedBeforeProductionWrcObservation === true,
    'FAIL_EXPECTED_VALUE_FREEZE_GUARD'
  ));

  const g = precheck?.sourceReported?.geometry ?? {};
  const source = precheck?.sourceReported ?? {};
  const derived = precheck?.independentDerived ?? {};
  const comparison = precheck?.comparison ?? {};

  for (const [name, value] of Object.entries({
    vesselOutsideDiameter_in: g.vesselOutsideDiameter_in,
    vesselThickness_in: g.vesselThickness_in,
    nozzleOutsideDiameter_in: g.nozzleOutsideDiameter_in,
    nozzleThickness_in: g.nozzleThickness_in,
    pressure_psi: source.pressure_psi,
    restraintAxialForce_lbf: source.restraintAxialForce_lbf,
    reportedTotalWrcRadialLoad_lbf: source.reportedTotalWrcRadialLoad_lbf
  })) {
    add(check(isFiniteNumber(value), 'FAIL_NON_NUMERIC_SOURCE_INPUT', { field: name, value }));
  }

  if (failures.length > 0) {
    return { status: 'FAIL', failures };
  }

  const D = g.vesselOutsideDiameter_in;
  const T = g.vesselThickness_in;
  const d = g.nozzleOutsideDiameter_in;
  const t = g.nozzleThickness_in;
  const pressure = source.pressure_psi;
  const restraint = source.restraintAxialForce_lbf;

  add(check(D > 0 && T > 0 && d > 0 && t > 0 && pressure >= 0, 'FAIL_PHYSICAL_INPUT_DOMAIN'));
  add(check(d > 2 * t, 'FAIL_NOZZLE_INSIDE_DIAMETER_NONPOSITIVE'));
  add(check(D > T, 'FAIL_VESSEL_MEAN_DIAMETER_NONPOSITIVE'));

  const dOverD = d / D;
  const DmOverT = (D - T) / T;
  const di = d - 2 * t;
  const area = Math.PI * di * di / 4;
  const thrust = pressure * area;
  const total = restraint - thrust;
  const roundedTotal = Math.round(total);
  const displayedDifference = Math.abs(total - source.reportedTotalWrcRadialLoad_lbf);

  add(check(
    near(dOverD, precheck.sourceReported.geometryChecks.d_over_D, 1e-14),
    'FAIL_SOURCE_GEOMETRY_RATIO_D_OVER_D',
    { actual: dOverD, expected: precheck.sourceReported.geometryChecks.d_over_D }
  ));
  add(check(
    near(DmOverT, precheck.sourceReported.geometryChecks.Dm_over_T, 1e-12),
    'FAIL_SOURCE_GEOMETRY_RATIO_DM_OVER_T',
    { actual: DmOverT, expected: precheck.sourceReported.geometryChecks.Dm_over_T }
  ));

  add(check(near(di, derived.nozzleInsideDiameter_in), 'FAIL_DERIVED_NOZZLE_ID', { actual: di, expected: derived.nozzleInsideDiameter_in }));
  add(check(near(area, derived.pressureThrustArea_in2), 'FAIL_DERIVED_PRESSURE_AREA', { actual: area, expected: derived.pressureThrustArea_in2 }));
  add(check(near(thrust, derived.pressureThrust_lbf), 'FAIL_DERIVED_PRESSURE_THRUST', { actual: thrust, expected: derived.pressureThrust_lbf }));
  add(check(near(total, derived.totalWrcRadialLoadUnrounded_lbf), 'FAIL_DERIVED_WRC_RADIAL_LOAD', { actual: total, expected: derived.totalWrcRadialLoadUnrounded_lbf }));
  add(check(roundedTotal === derived.totalWrcRadialLoadRounded_lbf, 'FAIL_DERIVED_WRC_RADIAL_LOAD_ROUNDING', { actual: roundedTotal, expected: derived.totalWrcRadialLoadRounded_lbf }));
  add(check(roundedTotal === source.reportedTotalWrcRadialLoad_lbf, 'FAIL_SOURCE_REPORTED_RADIAL_LOAD_MATCH', { actual: roundedTotal, expected: source.reportedTotalWrcRadialLoad_lbf }));
  add(check(comparison.reportedVsIndependentRoundedRadialLoad === 'PASS', 'FAIL_COMPARISON_STATE'));
  add(check(comparison.difference_lbf === 0, 'FAIL_COMPARISON_DIFFERENCE'));
  add(check(
    near(displayedDifference, comparison.unroundedToDisplayedDifference_lbf, 1e-9),
    'FAIL_DISPLAY_ROUNDING_DIFFERENCE',
    { actual: displayedDifference, expected: comparison.unroundedToDisplayedDifference_lbf }
  ));
  add(check(displayedDifference < 0.5, 'FAIL_SOURCE_DISPLAY_ROUNDING_BAND', { displayedDifference }));

  add(check(
    source.reportedLargestExpansionStressIntensity_psi === 117485 &&
      source.reportedLargestExpansionStressLocation === 'Bu' &&
      source.reportedLargestExpansionStressSurface === 'outer' &&
      source.reportedLargestExpansionStressPoint === 'B',
    'FAIL_SOURCE_REPORTED_STRESS_TRANSCRIPTION'
  ));
  add(check(
    !Object.prototype.hasOwnProperty.call(derived, 'largestExpansionStressIntensity_psi'),
    'FAIL_STRESS_IMPROPERLY_CLASSIFIED_AS_INDEPENDENT_DERIVATION'
  ));

  const result = {
    status: failures.length === 0 ? 'PASS_BOUNDED_PRECHECK_QUALIFICATION' : 'FAIL',
    failures,
    recomputed: {
      d_over_D: dOverD,
      Dm_over_T: DmOverT,
      nozzleInsideDiameter_in: di,
      pressureThrustArea_in2: area,
      pressureThrust_lbf: thrust,
      totalWrcRadialLoadUnrounded_lbf: total,
      totalWrcRadialLoadRounded_lbf: roundedTotal,
      unroundedToDisplayedDifference_lbf: displayedDifference
    },
    qualificationBoundary: {
      proves: [
        'source-reported geometry ratios are arithmetically consistent',
        '12-inch inside diameter follows from the reported nozzle OD and wall thickness',
        'pressure-thrust arithmetic reproduces the source-reported whole-pound radial load',
        'source-reported 117485 psi at Bu is transcribed but remains non-independent'
      ],
      doesNotProve: [
        'CAUx pages 24-31 benchmark values',
        'WRC 537 equations or coefficient tables',
        'independent reproduction of 117485 psi at Bu',
        'EMP.1.C engineering qualification or release authority'
      ]
    },
    numericalPolicy: {
      engineeringToleranceApplied: false,
      floatingPointComparisonEpsilon: NUMERICAL_EPSILON,
      sourceDisplayAcceptance: 'exact nearest-whole-pound equality; unrounded discrepancy must be < 0.5 lbf'
    }
  };

  return result;
}
