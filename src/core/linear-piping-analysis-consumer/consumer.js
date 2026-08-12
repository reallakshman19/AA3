/**
 * T0 linear piping analysis orchestration.
 *
 * Inputs are sealed B-2.5, B-3.0, B-3.1/B-3.2 and profile authorities.
 * Outputs are the public B-3.3 execution and B-3.4 recovery records bound in
 * one current-only result chain. Interface, nozzle and B31.3 results remain
 * explicitly unevaluated until their later work packages exist.
 */

import {
  compileSolverExecution,
  elementContributionFromFrameElement,
  elementContributionsFromPipingComponent,
} from '../linear-fea-solver/index.js';
import { compileResultRecovery } from '../linear-fea-result-recovery/index.js';
import {
  failLinearPipingAnalysis,
  validateLinearPipingAnalysisRequest,
} from './contracts.js';
import { composeLinearPipingAnalysisResult } from './retained-result-chain.js';

export function runLinearPipingAnalysis(request, runtime) {
  const accepted = validateLinearPipingAnalysisRequest(request);
  const cache = requireRuntime(runtime);
  requireComponentAcceptance(accepted.pipingComponents);
  requireElementCoverage(
    accepted.compilation.model.elements,
    accepted.frameElements,
    accepted.pipingComponents,
  );

  const elementContributions = buildElementContributions(
    accepted.frameElements,
    accepted.pipingComponents,
  );
  const execution = compileSolverExecution({
    compilation: accepted.compilation,
    elementContributions,
    loadCase: accepted.loadCase,
    solverProfile: accepted.solverProfile,
    cache,
  });
  if (execution.status === 'BLOCKED') {
    failLinearPipingAnalysis(
      'The B-3.3 execution is blocked and cannot enter recovery.',
      'PIPING_ANALYSIS_EXECUTION_BLOCKED',
      { executionHash: execution.executionHash },
    );
  }

  const recovery = compileResultRecovery({
    compilation: accepted.compilation,
    execution,
    loadCase: accepted.loadCase,
    frameElements: accepted.frameElements,
    pipingComponents: accepted.pipingComponents,
    recoveryProfile: accepted.recoveryProfile,
  });
  return composeLinearPipingAnalysisResult({ request: accepted, execution, recovery });
}

function requireRuntime(runtime) {
  const keys = runtime && typeof runtime === 'object' && !Array.isArray(runtime)
    ? Object.keys(runtime)
    : [];
  if (keys.length !== 1 || keys[0] !== 'factorizationCache') {
    failLinearPipingAnalysis(
      'runtime must contain exactly factorizationCache.',
      'PIPING_ANALYSIS_RUNTIME_INVALID',
    );
  }
  if (runtime.factorizationCache !== null && !(runtime.factorizationCache instanceof Map)) {
    failLinearPipingAnalysis(
      'runtime.factorizationCache must be a Map or null.',
      'PIPING_ANALYSIS_RUNTIME_INVALID',
    );
  }
  return runtime.factorizationCache;
}

function requireComponentAcceptance(components) {
  const blocked = components.find((entry) => entry.acceptanceState === 'BLOCKED');
  if (blocked) {
    failLinearPipingAnalysis(
      `Piping component ${blocked.componentId} is blocked.`,
      'PIPING_ANALYSIS_COMPONENT_BLOCKED',
      { componentId: blocked.componentId, semanticHash: blocked.semanticHash },
    );
  }
}

function requireElementCoverage(modelElements, frameElements, pipingComponents) {
  const expected = new Set(modelElements.map((entry) => entry.elementId));
  const supplied = [
    ...frameElements.map((entry) => entry.elementId),
    ...pipingComponents.flatMap((component) => component.elements.map((entry) => entry.elementId)),
  ];
  const seen = new Set();
  supplied.forEach((elementId) => {
    if (!expected.has(elementId)) {
      failLinearPipingAnalysis(
        `Element authority ${elementId} is not in the compiled model.`,
        'PIPING_ANALYSIS_ELEMENT_AUTHORITY_UNKNOWN',
        { elementId },
      );
    }
    if (seen.has(elementId)) {
      failLinearPipingAnalysis(
        `Element authority ${elementId} is duplicated.`,
        'PIPING_ANALYSIS_ELEMENT_AUTHORITY_DUPLICATE',
        { elementId },
      );
    }
    seen.add(elementId);
  });
  const missing = [...expected].filter((elementId) => !seen.has(elementId)).sort(compareAscii);
  if (missing.length) {
    failLinearPipingAnalysis(
      `Compiled model elements lack authorities: ${missing.join(', ')}.`,
      'PIPING_ANALYSIS_ELEMENT_AUTHORITY_MISSING',
      { missing },
    );
  }
}

function buildElementContributions(frameElements, pipingComponents) {
  return [
    ...frameElements.map(elementContributionFromFrameElement),
    ...pipingComponents.flatMap(elementContributionsFromPipingComponent),
  ].sort((left, right) => compareAscii(left.elementId, right.elementId));
}

function compareAscii(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
