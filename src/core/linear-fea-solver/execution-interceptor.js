import { compileSolverExecution as compileBaseSolverExecution } from './solve.js';

const interceptorStack = [];

/**
 * Run synchronous work with a scoped solver-execution interceptor.
 *
 * The hook exists so benchmark adapters can reuse a fully compiled, qualified
 * element/load state while replacing only the final equation solve. No hook is
 * active in ordinary linear analysis, so legacy execution remains byte-for-byte
 * on the original compileSolverExecution implementation.
 */
export function withSolverExecutionInterceptor(interceptor, work) {
  if (typeof interceptor !== 'function') throw new TypeError('interceptor must be a function.');
  if (typeof work !== 'function') throw new TypeError('work must be a function.');
  interceptorStack.push(interceptor);
  try {
    return work();
  } finally {
    const popped = interceptorStack.pop();
    if (popped !== interceptor) {
      interceptorStack.length = 0;
      throw new Error('Solver execution interceptor stack was corrupted.');
    }
  }
}

/** Public compatibility entrypoint used by the solver barrel. */
export function compileSolverExecution(args) {
  const interceptor = interceptorStack[interceptorStack.length - 1];
  if (interceptor === undefined) return compileBaseSolverExecution(args);
  return interceptor(args, compileBaseSolverExecution);
}

export function solverExecutionInterceptorDepth() {
  return interceptorStack.length;
}