export class LinearSolvePrimitiveError extends Error {
  constructor(message, code = 'REJECTED_SOLVE', evidence = null) {
    super(message);
    this.name = 'LinearSolvePrimitiveError';
    this.code = code;
    this.evidence = evidence;
  }
}
