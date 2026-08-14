import { createHash } from 'node:crypto';

const COMMON_COMMIT = '179c4831cf521cf797c13699cfbbd118315c9244';
const COMMON_REPOSITORY = 'reallaksh19/Common';
const REPORTS = Object.freeze({
  misc: Object.freeze({
    path: 'LFEA/BM4/Miscdata_BM4_L.txt',
    gitBlobSha1: 'ef23d224925e4568185a360ecbe1ee62503f15ff',
  }),
  loadCase: Object.freeze({
    path: 'LFEA/BM4/Loadcasereport_BM4_L.txt',
    gitBlobSha1: 'be62eeb08af26dddcd59146e21188c108c4600dd',
  }),
});
const EXPECTED_LOAD_CASES = Object.freeze({
  L2: Object.freeze({ expression: 'W', frictionMultiplier: 0, elasticModulus: 'EC' }),
  L3: Object.freeze({ expression: 'T1', frictionMultiplier: 0, elasticModulus: 'EC' }),
  L4: Object.freeze({ expression: 'P1', frictionMultiplier: 0, elasticModulus: 'EC' }),
  L5: Object.freeze({ expression: 'W+T1+P1', frictionMultiplier: 0, elasticModulus: 'EC' }),
  L6: Object.freeze({ expression: 'W+P1', frictionMultiplier: 0, elasticModulus: 'EC' }),
  L14: Object.freeze({ expression: 'L14=L5-L6', combinationMethod: 'ALG' }),
});
const OBJECTIVE_QUANTITIES = new Set([
  'FORCE',
  'MOMENT',
  'DISPLACEMENT',
  'ROTATION',
  'GLOBAL_END_FORCE_FROM',
  'GLOBAL_END_FORCE_TO',
  'GLOBAL_END_MOMENT_FROM',
  'GLOBAL_END_MOMENT_TO',
]);
const BM4L_T1_DELTA_K = 120 - 21;

function gitBlobSha1(bytes) {
  const header = Buffer.from(`blob ${bytes.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(bytes).digest('hex');
}

async function fetchPinnedReport(spec) {
  const url = `https://raw.githubusercontent.com/${COMMON_REPOSITORY}/${COMMON_COMMIT}/${spec.path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot fetch pinned Common report ${spec.path}: HTTP ${response.status}.`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const actualGitBlobSha1 = gitBlobSha1(bytes);
  if (actualGitBlobSha1 !== spec.gitBlobSha1) {
    throw new Error(
      `Pinned Common report ${spec.path} Git blob mismatch: ${actualGitBlobSha1} != ${spec.gitBlobSha1}.`,
    );
  }
  return Object.freeze({
    path: spec.path,
    commonCommit: COMMON_COMMIT,
    url,
    byteLength: bytes.length,
    gitBlobSha1: actualGitBlobSha1,
    text: bytes.toString('utf8'),
  });
}

function normalizedExpression(value) {
  return String(value ?? '').replace(/\s+/gu, '');
}

function parseLoadCaseReport(text) {
  const matches = [...text.matchAll(/^CASE\s+(\d+)\s+\(([^)]+)\)\s+(.+?)\s*$/gmu)];
  const cases = {};
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
    const block = text.slice(match.index, end);
    const friction = /Friction Mult\.:\s*([+-]?\d+(?:\.\d+)?)/u.exec(block);
    const elastic = /Elastic Modulus:\s*(\S+)/u.exec(block);
    const combination = /Combination Method:\s*(\S+)/u.exec(block);
    const caseId = `L${Number(match[1])}`;
    cases[caseId] = Object.freeze({
      caseNumber: Number(match[1]),
      category: match[2].trim(),
      expression: normalizedExpression(match[3]),
      frictionMultiplier: friction ? Number(friction[1]) : null,
      elasticModulus: elastic ? elastic[1].trim() : null,
      combinationMethod: combination ? combination[1].trim() : null,
    });
  }
  return Object.freeze(cases);
}

function buildLoadCaseParity(actual, parsedCases) {
  const rows = [];
  for (const [caseId, expected] of Object.entries(EXPECTED_LOAD_CASES)) {
    const printed = parsedCases[caseId];
    if (!printed) throw new Error(`Pinned Load Case Report is missing ${caseId}.`);
    const mechanics = actual.mechanics?.cases?.[caseId];
    if (!mechanics) throw new Error(`Actual mechanics evidence is missing ${caseId}.`);
    // The printed report supplies a friction multiplier, not a coefficient. It is
    // compared against the resolved load-case multiplier; the model coefficient is
    // a separate governed quantity and the two must never be equated.
    const frictionAuthority = mechanics.frictionAuthority ?? null;
    const actualFriction = frictionAuthority?.frictionMultiplier?.value ?? null;
    const actualModelCoefficient = frictionAuthority?.coefficient?.value ?? null;
    const actualEffective = frictionAuthority?.effectiveCoefficient ?? null;
    const actualElastic = mechanics.effectiveConfiguration?.flexibilityElasticModulus?.value ?? null;
    const expressionPass = normalizedExpression(mechanics.formula) === expected.expression
      && printed.expression === expected.expression;
    const productPass = frictionAuthority === null
      || actualEffective === (actualModelCoefficient ?? 0) * (actualFriction ?? 0)
      || frictionAuthority.kind === 'DERIVED_COMBINATION';
    const frictionPass = productPass && (expected.frictionMultiplier === undefined
      || (printed.frictionMultiplier === expected.frictionMultiplier && actualFriction === expected.frictionMultiplier));
    const elasticPass = expected.elasticModulus === undefined
      || (printed.elasticModulus === expected.elasticModulus && actualElastic === expected.elasticModulus);
    const combinationPass = expected.combinationMethod === undefined
      || printed.combinationMethod === expected.combinationMethod;
    rows.push(Object.freeze({
      caseId,
      expected,
      printed,
      actual: Object.freeze({
        formula: normalizedExpression(mechanics.formula),
        frictionMultiplier: actualFriction,
        modelCoefficientOfFriction: actualModelCoefficient,
        effectiveCoefficientOfFriction: actualEffective,
        elasticModulus: actualElastic,
      }),
      status: expressionPass && frictionPass && elasticPass && combinationPass ? 'PASS' : 'FAIL',
    }));
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    status: rows.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
  });
}

function parseTeeFlexibilities(text) {
  const rows = [];
  const lines = text.split(/\r?\n/u);
  let current = null;
  for (const line of lines) {
    const start = /Tee Node=\s*(\d+)\s*\|\s*Type\s*=\s*([0-9.]+)\s*\|\s*D\s*=\s*([0-9.]+)\s*mm\.\s*\|\s*T\s*=\s*([0-9.]+)\s*mm\./u.exec(line);
    if (start) {
      current = {
        nodeId: start[1],
        type: start[2],
        runMeanDiameterMm: Number(start[3]),
        runWallThicknessMm: Number(start[4]),
        branchMeanDiameterMm: null,
        branchWallThicknessMm: null,
      };
      continue;
    }
    if (!current) continue;
    const branch = /Srf\.Node=.*\|\s*tp\s*=.*\|\s*d\s*=\s*([0-9.]+)\s*mm\.\s*\|\s*t\s*=\s*([0-9.]+)\s*mm\./u.exec(line);
    if (branch) {
      current.branchMeanDiameterMm = Number(branch[1]);
      current.branchWallThicknessMm = Number(branch[2]);
      continue;
    }
    const flex = /^FLEXr\s+([0-9.E+-]+)\s+([0-9.E+-]+)\s+([0-9.E+-]+)\s+\|\s+FLEXb\s+([0-9.E+-]+)\s+([0-9.E+-]+)\s+([0-9.E+-]+)/u.exec(line);
    if (flex) {
      rows.push(Object.freeze({
        ...current,
        runOuterDiameterMm: current.runMeanDiameterMm + current.runWallThicknessMm,
        branchOuterDiameterMm: current.branchMeanDiameterMm + current.branchWallThicknessMm,
        run: Object.freeze({ inPlane: Number(flex[1]), outOfPlane: Number(flex[2]), torsional: Number(flex[3]) }),
        branch: Object.freeze({ inPlane: Number(flex[4]), outOfPlane: Number(flex[5]), torsional: Number(flex[6]) }),
        printedFlexibilityDecimals: 3,
      }));
      current = null;
    }
  }
  return Object.freeze(rows);
}

function printedInterval(value, decimals) {
  const halfUnit = 0.5 * 10 ** (-decimals);
  return Object.freeze({ lowerInclusive: value - halfUnit, upperExclusive: value + halfUnit });
}

function withinInterval(value, interval) {
  return value >= interval.lowerInclusive && value < interval.upperExclusive;
}

function buildTeeParity(actual, miscText) {
  const printed = parseTeeFlexibilities(miscText);
  const printedByNode = new Map(printed.map((row) => [row.nodeId, row]));
  const actualTees = actual.mechanics?.cases?.L2?.teeJunctions ?? [];
  const rows = actualTees.map((tee) => {
    const reference = printedByNode.get(String(tee.nodeId));
    if (!reference) throw new Error(`Pinned Misc Data report is missing solver tee node ${tee.nodeId}.`);
    const branch = tee.directionalFlexibilityFactors?.branch;
    const components = {};
    for (const component of ['inPlane', 'outOfPlane', 'torsional']) {
      const interval = printedInterval(reference.branch[component], reference.printedFlexibilityDecimals);
      components[component] = Object.freeze({
        actual: Number(branch[component]),
        printed: reference.branch[component],
        printedInterval: interval,
        withinPrintedPrecision: withinInterval(Number(branch[component]), interval),
      });
    }
    const reconciliation = tee.diameterReconciliation ?? null;
    const geometry = Object.freeze({
      reportRunOuterDiameterMm: reference.runOuterDiameterMm,
      reportBranchOuterDiameterMm: reference.branchOuterDiameterMm,
      actualDeclaredBranchOuterDiameterMm:
        reconciliation?.declaredBranchOuterDiameter === undefined ? null : reconciliation.declaredBranchOuterDiameter * 1000,
      actualFactorBranchOuterDiameterMm:
        reconciliation?.factorBranchOuterDiameter === undefined ? null : reconciliation.factorBranchOuterDiameter * 1000,
      actualRunOuterDiameterMm:
        reconciliation?.runOuterDiameter === undefined ? null : reconciliation.runOuterDiameter * 1000,
      reconciliation,
    });
    const factorPass = Object.values(components).every((component) => component.withinPrintedPrecision);
    const geometryPass = geometry.actualFactorBranchOuterDiameterMm === null
      || Math.abs(geometry.actualFactorBranchOuterDiameterMm - geometry.reportBranchOuterDiameterMm) < 5e-7;
    return Object.freeze({
      nodeId: String(tee.nodeId),
      reportType: reference.type,
      components: Object.freeze(components),
      geometry,
      factorStatus: factorPass ? 'PASS' : 'FAIL',
      geometryStatus: geometryPass ? 'PASS' : 'FAIL',
      status: factorPass && geometryPass ? 'PASS' : 'FAIL',
    });
  });
  return Object.freeze({
    reportTeeCount: printed.length,
    solverTeeCount: actualTees.length,
    rows: Object.freeze(rows),
    status: rows.every((row) => row.status === 'PASS') ? 'PASS' : 'FAIL',
  });
}

function pipeProperties2Section(text) {
  const start = text.indexOf('----- PIPE PROPERTIES #2');
  if (start < 0) throw new Error('Pinned Misc Data report lacks PIPE PROPERTIES #2.');
  const endCandidates = [
    text.indexOf('----- CENTER OF GRAVITY REPORT', start),
    text.indexOf('----- BILL OF MATERIALS REPORT', start),
  ].filter((value) => value > start);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : text.length;
  return text.slice(start, end);
}

function parseThermalExpansionRows(text) {
  const rows = [];
  for (const line of pipeProperties2Section(text).split(/\r?\n/u)) {
    const parts = line.trim().split(/\s+/u);
    if (parts.length < 11 || !/^\d+\.$/u.test(parts[0]) || !/^\d+\.$/u.test(parts[1])) continue;
    const token = parts[2];
    const value = Number(token);
    if (!Number.isFinite(value)) continue;
    const normalizedToken = token.replace(/^[+-]/u, '');
    const decimalIndex = normalizedToken.indexOf('.');
    const decimals = decimalIndex < 0 ? 0 : normalizedToken.length - decimalIndex - 1;
    rows.push(Object.freeze({
      fromNode: parts[0].replace(/\.$/u, ''),
      toNode: parts[1].replace(/\.$/u, ''),
      t1Token: token,
      t1TotalStrain: value,
      printedDecimals: decimals,
    }));
  }
  if (rows.length === 0) throw new Error('Pinned Misc Data report contains no PIPE PROPERTIES #2 thermal rows.');
  return Object.freeze(rows);
}

function buildThermalParity(actual, benchmarkReport, miscText) {
  const rows = parseThermalExpansionRows(miscText);
  const unique = [...new Map(rows.map((row) => [`${row.t1Token}|${row.printedDecimals}`, row])).values()];
  if (unique.length !== 1) {
    throw new Error(`BM4_L T1 printed thermal strain is not uniform: ${unique.map((row) => row.t1Token).join(', ')}.`);
  }
  const printed = unique[0];
  const interval = printedInterval(printed.t1TotalStrain, printed.printedDecimals);
  const coefficientPerKelvin = Number(actual.mechanics?.profile?.thermalExpansion?.coefficientPerKelvin);
  if (!Number.isFinite(coefficientPerKelvin)) throw new Error('Actual mechanics evidence lacks thermal expansion coefficient.');
  const currentTotalStrain = coefficientPerKelvin * BM4L_T1_DELTA_K;
  const coefficientInterval = Object.freeze({
    lowerInclusive: interval.lowerInclusive / BM4L_T1_DELTA_K,
    upperExclusive: interval.upperExclusive / BM4L_T1_DELTA_K,
  });

  const l3 = benchmarkReport.qualification?.cases?.find((entry) => entry.caseId === 'L3');
  if (!l3) throw new Error('Qualification report lacks L3.');
  const objectiveFailures = l3.comparison.rows.filter((row) =>
    row.status === 'FAIL' && OBJECTIVE_QUANTITIES.has(row.quantity));
  const scalableFailures = objectiveFailures.filter((row) => {
    const reference = Number(row.referenceValue);
    const actualValue = Number(row.actualValue);
    const floor = Number(row.tolerance?.zeroReferenceAbsolute ?? 0);
    return Math.abs(reference) >= floor
      && Math.abs(actualValue) >= floor
      && reference !== 0
      && actualValue !== 0
      && reference * actualValue > 0;
  }).map((row) => {
    const requiredTotalStrain = currentTotalStrain * Number(row.referenceValue) / Number(row.actualValue);
    return Object.freeze({
      identity: row.identity,
      quantity: row.quantity,
      component: row.component,
      referenceValue: row.referenceValue,
      actualValue: row.actualValue,
      requiredTotalStrain,
      withinPrintedInterval: withinInterval(requiredTotalStrain, interval),
    });
  });
  const withinCount = scalableFailures.filter((row) => row.withinPrintedInterval).length;
  const ranked = [...scalableFailures].sort((left, right) =>
    Math.abs(right.requiredTotalStrain - currentTotalStrain) - Math.abs(left.requiredTotalStrain - currentTotalStrain));

  return Object.freeze({
    printedRowCount: rows.length,
    printedT1TotalStrain: printed.t1TotalStrain,
    printedDecimals: printed.printedDecimals,
    printedTotalStrainInterval: interval,
    impliedCoefficientPerKelvinInterval: coefficientInterval,
    deltaTemperatureK: BM4L_T1_DELTA_K,
    currentCoefficientPerKelvin: coefficientPerKelvin,
    currentTotalStrain,
    currentWithinPrintedInterval: withinInterval(currentTotalStrain, interval),
    objectiveFailureCount: objectiveFailures.length,
    scalableEngineeringFailureCount: scalableFailures.length,
    scalableFailuresWithinPrintedInterval: withinCount,
    scalarThermalCoefficientCanExplainAllFailures:
      scalableFailures.length > 0 && withinCount === scalableFailures.length,
    conclusion: withinCount === 0 && scalableFailures.length > 0
      ? 'PRINTED_T1_INTERVAL_CANNOT_EXPLAIN_ANY_SCALABLE_OBJECTIVE_FAILURE'
      : withinCount === scalableFailures.length
        ? 'PRINTED_T1_INTERVAL_CAN_EXPLAIN_ALL_SCALABLE_OBJECTIVE_FAILURES'
        : 'PRINTED_T1_INTERVAL_EXPLAINS_ONLY_A_SUBSET_OF_SCALABLE_OBJECTIVE_FAILURES',
    worstRequiredStrains: Object.freeze(ranked.slice(0, 20)),
    authorityStatus: 'BOUNDED_BY_CAESAR_PRINTED_PIPE_PROPERTIES_NOT_FULL_PRECISION',
  });
}

function parseCenterOfGravity(text) {
  const match = /Pipe\+Insl\+Refrty\+Fluid:\s+([0-9.]+)\s+([+-]?[0-9.]+)\s+([+-]?[0-9.]+)\s+([+-]?[0-9.]+)/u.exec(text);
  if (!match) throw new Error('Pinned Misc Data report lacks total Pipe+Insl+Refrty+Fluid COG row.');
  return Object.freeze({
    totalWeightN: Number(match[1]),
    xCgMm: Number(match[2]),
    yCgMm: Number(match[3]),
    zCgMm: Number(match[4]),
  });
}

function buildGravityContext(actual, benchmarkReport, miscText) {
  const cog = parseCenterOfGravity(miscText);
  const l2Weight = Number(actual.mechanics?.cases?.L2?.gravityWeightN);
  if (!Number.isFinite(l2Weight)) throw new Error('Actual L2 mechanics evidence lacks gravityWeightN.');
  const referenceL2 = benchmarkReport.cases?.find((entry) => entry.caseId === 'L2');
  if (!referenceL2) throw new Error('Benchmark report lacks L2 reference rows.');
  const referenceVerticalReactionN = referenceL2.referenceRows
    .filter((row) => row.quantity === 'FORCE' && row.component === 'UY')
    .reduce((sum, row) => sum + Number(row.value), 0);
  return Object.freeze({
    caesarMiscCenterOfGravity: cog,
    lfeaL2GravityWeightN: l2Weight,
    caesarL2ReferenceVerticalReactionN: referenceVerticalReactionN,
    lfeaMinusReferenceReactionN: l2Weight - referenceVerticalReactionN,
    lfeaRelativeToReferenceReaction: (l2Weight - referenceVerticalReactionN) / referenceVerticalReactionN,
    miscCogMinusReferenceReactionN: cog.totalWeightN - referenceVerticalReactionN,
    miscCogRelativeToReferenceReaction: (cog.totalWeightN - referenceVerticalReactionN) / referenceVerticalReactionN,
    interpretation:
      'CAESAR_MISC_COG_TOTAL_IS_RECORDED_AS_FILE_WEIGHT_CONTEXT_NOT_ENFORCED_AS_L2_EQUILIBRIUM_ORACLE_BECAUSE_IT_DIFFERS_FROM_CAESAR_L2_REFERENCE_REACTION_SUM',
  });
}

export async function buildBm4lCommonReportParity(actual, benchmarkReport) {
  const [misc, loadCase] = await Promise.all([
    fetchPinnedReport(REPORTS.misc),
    fetchPinnedReport(REPORTS.loadCase),
  ]);
  const loadCaseParity = buildLoadCaseParity(actual, parseLoadCaseReport(loadCase.text));
  const teeParity = buildTeeParity(actual, misc.text);
  const thermalParity = buildThermalParity(actual, benchmarkReport, misc.text);
  const gravityContext = buildGravityContext(actual, benchmarkReport, misc.text);
  return Object.freeze({
    schema: 'lfea-m047-bm4l-common-report-parity/v1',
    authority: Object.freeze({
      repository: COMMON_REPOSITORY,
      commonCommit: COMMON_COMMIT,
      reports: Object.freeze({
        misc: Object.freeze({
          path: misc.path,
          byteLength: misc.byteLength,
          gitBlobSha1: misc.gitBlobSha1,
        }),
        loadCase: Object.freeze({
          path: loadCase.path,
          byteLength: loadCase.byteLength,
          gitBlobSha1: loadCase.gitBlobSha1,
        }),
      }),
    }),
    loadCaseParity,
    teeParity,
    thermalParity,
    gravityContext,
    status: loadCaseParity.status === 'PASS'
      && thermalParity.currentWithinPrintedInterval
      ? 'PASS_AUTHORITY_PARITY_WITH_MECHANICS_GAPS_RETAINED'
      : 'FAIL_AUTHORITY_PARITY',
  });
}
