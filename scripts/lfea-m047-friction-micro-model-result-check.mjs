import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync(new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-friction-micro-model-result-contract.json', import.meta.url), 'utf8'));
validateContract(contract);

const resultIndex = process.argv.indexOf('--result');
if (resultIndex < 0) {
  console.log(JSON.stringify({
    check: 'm047-friction-micro-model-result-gate',
    status: 'PASS_CONTRACT_ONLY',
    product: contract.product,
    experiments: Object.keys(contract.experiments),
    checkerMayResolveAuthority: contract.promotionPolicy.checkerMayResolveAuthority,
    remainingBlockers: contract.remainingBlockersUntilReviewedProductEvidenceExists,
    externalProductExecutionRequired: true,
  }, null, 2));
  process.exit(0);
}

const resultPath = process.argv[resultIndex + 1];
if (!resultPath) throw new Error('--result requires a JSON path');
const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
const summary = validateResult(result, contract);
console.log(JSON.stringify(summary, null, 2));

function validateContract(value) {
  check(value.schema === 'm047-friction-micro-model-result-contract/v1', 'contract schema');
  check(value.product.caesarVersion === '14.00.00.0910' && value.product.build === 231113, 'pinned CAESAR product');
  check(value.sourcePolicy.requiredProvenanceClass === 'INDEPENDENT_PRODUCT_OBSERVATION', 'provenance class');
  check(value.sourcePolicy.bm4OrBm4LInputPermitted === false && value.sourcePolicy.bm4OrBm4LResponsePermitted === false, 'BM4 response exclusion');
  check(value.promotionPolicy.checkerMayResolveAuthority === false, 'checker may not resolve authority');
  check(value.promotionPolicy.parameterFittingPermitted === false && value.promotionPolicy.toleranceFittingPermitted === false, 'fitting prohibited');
  for (const id of ['FM1_SLIDE_PLATEAU','FM2_ANGLE_UPDATE','FM3_NORMAL_FORCE_UPDATE','FM4_GAP_CONTACT']) check(value.experiments[id], `missing ${id}`);
}

function validateResult(result, contract) {
  check(result.schema === 'm047-friction-micro-model-result/v1', 'result schema');
  for (const field of contract.commonFields) check(result[field] !== undefined && result[field] !== null, `missing result field ${field}`);
  check(result.provenanceClass === contract.sourcePolicy.requiredProvenanceClass, 'result provenance class');
  check(result.caesarVersion === contract.product.caesarVersion && result.build === contract.product.build, 'result CAESAR product mismatch');
  check(relative(result.coefficientOfFriction, contract.knownMechanics.coefficientOfFriction) < 1e-15, 'coefficient of friction custody');
  check(relative(result.staticFrictionStiffnessNPerM, contract.knownMechanics.staticFrictionStiffnessNPerM) < 1e-12, 'friction stiffness custody');
  check(sha(result.inputSha256), 'input SHA-256');
  check(sha(result.outputSha256), 'output SHA-256');
  check(typeof result.caseDefinition === 'string' && result.caseDefinition.trim(), 'case definition');
  check(!bm4Path(result.inputPath) && !bm4Path(result.outputPath), 'BM4/BM4_L source prohibited');
  check(Array.isArray(result.observations), 'observations array');

  const experiment = contract.experiments[result.experimentId];
  check(experiment, `unknown experiment ${result.experimentId}`);
  check(result.observations.length >= experiment.minimumObservations, `insufficient observations for ${result.experimentId}`);
  for (const [index, row] of result.observations.entries()) {
    for (const field of experiment.requiredObservationFields) check(row[field] !== undefined && row[field] !== null, `${result.experimentId} observation ${index} missing ${field}`);
  }

  const derived = result.experimentId === 'FM1_SLIDE_PLATEAU'
    ? fm1(result, contract)
    : result.experimentId === 'FM2_ANGLE_UPDATE'
      ? fm2(result, contract)
      : result.experimentId === 'FM3_NORMAL_FORCE_UPDATE'
        ? fm3(result, contract)
        : fm4(result, contract);

  return {
    check: 'm047-friction-micro-model-result-gate',
    status: contract.promotionPolicy.structurallyCompleteResultStatus,
    experimentId: result.experimentId,
    targetBlocker: experiment.targetBlocker,
    product: { caesarVersion: result.caesarVersion, build: result.build },
    custody: {
      inputPath: result.inputPath,
      inputSha256: result.inputSha256,
      outputPath: result.outputPath,
      outputSha256: result.outputSha256,
    },
    derived,
    authorityResolvedByChecker: false,
    engineeringReviewRequired: true,
    remainingBlockers: contract.remainingBlockersUntilReviewedProductEvidenceExists,
    productionFrictionAuthorized: false,
  };
}

function fm1(result, contract) {
  const mu = contract.knownMechanics.coefficientOfFriction;
  const ratios = result.observations.map((row, index) => {
    finite(row.normalReactionN, `FM1 normal reaction ${index}`);
    finite(row.tangentialReactionN, `FM1 tangential reaction ${index}`);
    finite(row.tangentialDisplacementMm, `FM1 displacement ${index}`);
    check(Math.abs(row.normalReactionN) > 0, `FM1 normal reaction ${index} nonzero`);
    return Math.abs(row.tangentialReactionN) / (mu * Math.abs(row.normalReactionN));
  });
  const min = Math.min(...ratios);
  const max = Math.max(...ratios);
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return {
    metric: 'ABS_FT_OVER_MU_ABS_N',
    ratios,
    min,
    max,
    mean,
    relativeSpread: mean ? (max - min) / Math.abs(mean) : null,
    disposition: 'CANDIDATE_SLIDE_MULTIPLIER_ONLY_NOT_PROMOTED',
  };
}

function fm2(result, contract) {
  const threshold = contract.knownMechanics.frictionAngleVariationDeg;
  const changes = result.observations.map((row, index) => {
    finite(row.commandedDirectionChangeDeg, `FM2 commanded change ${index}`);
    finite(row.tangentialReactionDirectionDeg, `FM2 reaction direction ${index}`);
    finite(row.normalReactionN, `FM2 normal reaction ${index}`);
    finite(row.tangentialReactionN, `FM2 tangential reaction ${index}`);
    return Math.abs(row.commandedDirectionChangeDeg);
  });
  check(changes.some((x) => x < threshold), 'FM2 requires direction change below 15 deg');
  check(changes.some((x) => x > threshold), 'FM2 requires direction change above 15 deg');
  return {
    thresholdDeg: threshold,
    commandedDirectionChangesDeg: changes,
    disposition: 'ANGLE_UPDATE_PATTERN_CANDIDATE_ONLY_NOT_PROMOTED',
  };
}

function fm3(result, contract) {
  const threshold = contract.knownMechanics.frictionNormalForceVariation;
  const changes = result.observations.map((row, index) => {
    finite(row.normalForceChangeFraction, `FM3 normal change ${index}`);
    finite(row.normalReactionN, `FM3 normal reaction ${index}`);
    finite(row.tangentialReactionN, `FM3 tangential reaction ${index}`);
    return Math.abs(row.normalForceChangeFraction);
  });
  check(changes.some((x) => x < threshold), 'FM3 requires normal change below 0.15');
  check(changes.some((x) => x > threshold), 'FM3 requires normal change above 0.15');
  return {
    threshold,
    normalForceChangeFractions: changes,
    disposition: 'NORMAL_FORCE_UPDATE_PATTERN_CANDIDATE_ONLY_NOT_PROMOTED',
  };
}

function fm4(result) {
  const phases = result.observations.map((row, index) => {
    for (const field of ['gapDirectionDisplacementMm','gapDirectionReactionN','normalReactionN','tangentialReactionN']) finite(row[field], `FM4 ${field} ${index}`);
    return String(row.phase).toUpperCase();
  });
  for (const phase of ['OPEN','CLOSED','REOPENED']) check(phases.includes(phase), `FM4 missing ${phase} phase`);
  return {
    phases,
    disposition: 'GAP_CONTACT_SEQUENCE_CANDIDATE_ONLY_NOT_PROMOTED',
  };
}

function bm4Path(value) {
  const text = String(value ?? '').toUpperCase();
  return text.includes('BM4_L') || /(^|[\\/_-])BM4([\\/_.-]|$)/.test(text);
}
function sha(value) { return /^[0-9a-f]{64}$/i.test(String(value ?? '')); }
function finite(value, label) { check(Number.isFinite(value), `${label} must be finite`); }
function relative(a, b) { return Math.abs(Number(a) - Number(b)) / Math.max(1, Math.abs(Number(b))); }
function check(value, message) { if (!value) throw new Error(message); }
