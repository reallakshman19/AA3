import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compileSolverExecution,
  solverExecutionInterceptorDepth,
  withSolverExecutionInterceptor,
} from '../src/core/linear-fea-solver/index.js';

test('solver execution interceptor replaces only calls inside its synchronous scope', () => {
  assert.equal(solverExecutionInterceptorDepth(), 0);
  const sentinel = { value: 42 };
  const result = withSolverExecutionInterceptor((args, baseCompile) => {
    assert.equal(typeof baseCompile, 'function');
    assert.equal(args, sentinel);
    assert.equal(solverExecutionInterceptorDepth(), 1);
    return { intercepted: true };
  }, () => compileSolverExecution(sentinel));
  assert.deepEqual(result, { intercepted: true });
  assert.equal(solverExecutionInterceptorDepth(), 0);
});

test('solver execution interceptor unwinds after an exception', () => {
  assert.throws(() => withSolverExecutionInterceptor(
    () => { throw new Error('boom'); },
    () => compileSolverExecution({}),
  ), /boom/u);
  assert.equal(solverExecutionInterceptorDepth(), 0);
});

test('nested interceptors use the innermost scope and restore the outer scope', () => {
  const observed = [];
  withSolverExecutionInterceptor(() => {
    observed.push('outer');
    return { owner: 'outer' };
  }, () => {
    const inner = withSolverExecutionInterceptor(() => {
      observed.push('inner');
      return { owner: 'inner' };
    }, () => compileSolverExecution({}));
    assert.equal(inner.owner, 'inner');
    const outer = compileSolverExecution({});
    assert.equal(outer.owner, 'outer');
  });
  assert.deepEqual(observed, ['inner', 'outer']);
  assert.equal(solverExecutionInterceptorDepth(), 0);
});