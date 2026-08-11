export class LinearSolvePrimitiveError extends Error {
  constructor(message, code, data = {}) {
    super(message);
    this.name = 'LinearSolvePrimitiveError';
    this.code = code;
    this.data = Object.freeze({ ...data });
  }
}
