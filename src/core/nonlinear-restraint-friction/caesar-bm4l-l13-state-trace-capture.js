const SUPPORTED_CAPTURE_MODES = new Set([
  'INCORE_SOLVER_AND_ACTIVE_BOUNDARY_CONDITIONS',
  'EQUIVALENT_EXACT_BUILD_PRODUCT_TRACE',
]);

/**
 * Build an intentionally incomplete BM4_L L13 state-trace worksheet from the
 * governed contract. The worksheet is not product evidence and is expected to
 * fail the evidence gate until every captured value is transcribed and sealed
 * to an authenticated raw product-capture file.
 */
export function buildBm4lL13StateTraceCaptureTemplate(contract, options = {}) {
  validateContract(contract);
  const iterationCount = Number(options.iterationCount ?? 2);
  if (!Number.isInteger(iterationCount) || iterationCount < 2) {
    throw new TypeError('iterationCount must be an integer >= 2.');
  }
  const captureMode = String(
    options.captureMode ?? 'INCORE_SOLVER_AND_ACTIVE_BOUNDARY_CONDITIONS',
  );
  if (!SUPPORTED_CAPTURE_MODES.has(captureMode)) {
    throw new TypeError(`unsupported captureMode ${captureMode}`);
  }

  return {
    schema: 'm047-bm4l-l13-state-trace/v1',
    source: {
      benchmarkId: contract.benchmarkId,
      caseId: contract.caseId,
      capturedFromProduct: false,
      captureMode,
      finalResponseUsedToSelectState: false,
    },
    product: {
      name: contract.product.name,
      version: contract.product.version,
      build: String(contract.product.build),
    },
    inputCustody: {
      accdbSha256: contract.inputCustody.accdbSha256,
      traceFileName: null,
      traceSha256: null,
    },
    iterations: Array.from({ length: iterationCount }, (_, index) =>
      makeIteration(index + 1, contract)),
  };
}

/**
 * Bind a filled worksheet to one immutable raw product-capture bundle. This
 * does not certify completeness; callers must run the F2.7b evidence gate on
 * the sealed result.
 */
export function sealBm4lL13StateTraceCapture(template, custody) {
  if (template?.schema !== 'm047-bm4l-l13-state-trace/v1') {
    throw new TypeError('state-trace schema v1 required.');
  }
  const traceFileName = String(custody?.traceFileName ?? '').trim();
  const traceSha256 = String(custody?.traceSha256 ?? '').trim().toLowerCase();
  if (!traceFileName) throw new TypeError('traceFileName is required.');
  if (!/^[a-f0-9]{64}$/.test(traceSha256)) throw new TypeError('traceSha256 must be a SHA-256 hex digest.');

  const sealed = structuredClone(template);
  sealed.source = {
    ...sealed.source,
    capturedFromProduct: true,
    finalResponseUsedToSelectState: false,
  };
  sealed.inputCustody = {
    ...sealed.inputCustody,
    traceFileName,
    traceSha256,
  };
  return sealed;
}

function makeIteration(iteration, contract) {
  const frictionRows = contract.friction.nodeIds.map((nodeId) => ({
    restraintKey: `FRICTION:${nodeId}`,
    contactState: null,
    frictionState: null,
    normalReactionN: null,
    frictionResistanceN: null,
    frictionDirectionGlobal: null,
    firstTransitionReferenceDirectionGlobal: null,
  }));
  const gapRows = contract.positiveGapRows.map((row) => ({
    restraintKey: row.restraintKey,
    contactState: null,
    frictionState: 'NOT_APPLICABLE',
  }));
  return {
    iteration,
    converged: null,
    unconvergedRestraintCount: null,
    restraints: [...frictionRows, ...gapRows],
    stateEvents: [],
  };
}

function validateContract(contract) {
  if (contract?.schema !== 'm047-bm4l-l13-state-trace-contract/v1') {
    throw new TypeError('BM4_L L13 state-trace contract v1 required.');
  }
  if (contract?.benchmarkId !== 'BM4_L' || contract?.caseId !== 'L13') {
    throw new TypeError('BM4_L L13 contract required.');
  }
  if (!Array.isArray(contract?.friction?.nodeIds) || contract.friction.nodeIds.length !== 26) {
    throw new TypeError('contract must contain exactly 26 friction sites.');
  }
  if (!Array.isArray(contract?.positiveGapRows) || contract.positiveGapRows.length !== 6) {
    throw new TypeError('contract must contain exactly six positive-gap rows.');
  }
}
