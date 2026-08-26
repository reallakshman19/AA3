export const POST_NULLSPACE_COMMAND_STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  NOT_RUN: 'NOT_RUN',
});

export function classifyPostNullspaceBoundary({
  focusedNullspace,
  kernel,
  governingLame,
}) {
  const focused = requireStatus(focusedNullspace, 'focusedNullspace');
  const kernelStatus = requireStatus(kernel, 'kernel');
  const governing = requireStatus(governingLame, 'governingLame');

  if (focused !== POST_NULLSPACE_COMMAND_STATUS.PASS) {
    if (kernelStatus !== POST_NULLSPACE_COMMAND_STATUS.NOT_RUN
      || governing !== POST_NULLSPACE_COMMAND_STATUS.NOT_RUN) {
      throw new TypeError('Post-nullspace boundary results violate sequential execution after focused-nullspace failure.');
    }
    return disposition('ELEMENT_NULLSPACE_REPAIR_NOT_QUALIFIED');
  }

  if (kernelStatus !== POST_NULLSPACE_COMMAND_STATUS.PASS) {
    if (governing !== POST_NULLSPACE_COMMAND_STATUS.NOT_RUN) {
      throw new TypeError('Post-nullspace boundary results violate sequential execution after kernel failure.');
    }
    return disposition('BBAR_KERNEL_REGRESSION_REQUIRES_RCA');
  }

  if (governing !== POST_NULLSPACE_COMMAND_STATUS.PASS) {
    return disposition('GOVERNING_LAME_CASE_FAILED_RCA_REQUIRED');
  }

  return disposition('POST_NULLSPACE_GOVERNING_CASE_CLEARED');
}

function disposition(code) {
  return Object.freeze({
    disposition: code,
    solverRepairAuthorized: false,
    integratedB01Qualified: false,
    releaseAuthorityGranted: false,
    trustAuthorityGranted: false,
  });
}

function requireStatus(value, path) {
  if (!Object.values(POST_NULLSPACE_COMMAND_STATUS).includes(value)) {
    throw new TypeError(`${path} must be PASS, FAIL, or NOT_RUN.`);
  }
  return value;
}
