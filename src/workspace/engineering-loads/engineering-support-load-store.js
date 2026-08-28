import { freezeDeep } from '../dataset-utils.js';
import { calculateAuthorizedEmpiricalLoadExecution } from './authorized-empirical-load-execution.js';
import { calculateAuthorizedEmpiricalLoadExecutionV2 } from './authorized-empirical-load-execution-v2.js';
import {
  requireCurrentCommonInputEmpiricalSupportLoadExecution,
} from './current-common-input-empirical-support-load-execution.js';
import {
  evaluateEmpiricalGravityMethodSelection,
} from './empirical-gravity-method-selection.js';
import {
  EMPIRICAL_LOAD_METHOD,
  calculateSupportLoadDistribution,
  calculateSupportLoadDistributionWithComponentCog,
} from './support-load-distribution-v3.js';

/** Owns the last explicit engineering calculation and its edit freshness. */
export class EngineeringSupportLoadStore {
  #distribution = null;
  #authorizedExecution = null;
  #currentCommonInputExecution = null;
  #methodSelection = null;

  /** @deprecated Ordinary production callers shall use calculateAuthorized(). */
  calculate(input) {
    this.#authorizedExecution = null;
    this.#currentCommonInputExecution = null;
    this.#methodSelection = null;
    this.#distribution = calculateSupportLoadDistribution(input);
    return this.#distribution;
  }

  /**
   * Selects V3_COG or V2 before execution. AUTO never catches a failed method
   * and tries a simpler one. A known eccentricity/moment exception stops here
   * until the partial-accounting mechanics can retain that evidence safely.
   */
  calculateAuto(input) {
    this.#authorizedExecution = null;
    this.#currentCommonInputExecution = null;
    const selection = evaluateEmpiricalGravityMethodSelection({
      requestedMethod: 'AUTO',
      dataset: input?.dataset,
      profile: input?.profile,
      routePartitionModel: input?.routePartitionModel,
    });
    this.#methodSelection = selection;
    if (!selection.selectedMethod) {
      this.#distribution = null;
      const error = new Error(
        'AUTO gravity selection requires an explicit component-exception policy before calculation.',
      );
      error.code = 'EMPIRICAL_AUTO_EXCEPTION_POLICY_REQUIRED';
      error.details = selection;
      throw error;
    }
    this.#distribution = selection.selectedMethod === EMPIRICAL_LOAD_METHOD
      ? calculateSupportLoadDistribution(input)
      : calculateSupportLoadDistributionWithComponentCog(input);
    return this.#distribution;
  }

  calculateAuthorized(input) {
    this.#methodSelection = null;
    const execution = calculateAuthorizedEmpiricalLoadExecution(input);
    return this.#recordAuthorizedExecution(execution);
  }

  calculateAuthorizedV2(input) {
    this.#methodSelection = null;
    const execution = calculateAuthorizedEmpiricalLoadExecutionV2(input);
    return this.#recordAuthorizedExecution(execution);
  }

  #recordAuthorizedExecution(execution) {
    this.#authorizedExecution = execution;
    this.#currentCommonInputExecution = null;
    this.#distribution = execution.distribution;
    return execution;
  }

  /** Records current Common Input execution separately from legacy handoff custody. */
  recordCurrentCommonInputExecution(execution) {
    const current = requireCurrentCommonInputEmpiricalSupportLoadExecution(execution);
    this.#authorizedExecution = null;
    this.#currentCommonInputExecution = current;
    this.#methodSelection = null;
    this.#distribution = current.distribution;
    return current;
  }

  markStale(reason, datasetVersion) {
    if (!this.#distribution) {
      this.#currentCommonInputExecution = null;
      return null;
    }
    // The active store clears its current receipt; separate runtime stores retain
    // immutable historical receipt evidence and stale authorization state.
    this.#authorizedExecution = null;
    this.#currentCommonInputExecution = null;
    this.#distribution = freezeDeep({
      ...this.#distribution,
      freshness: { status: 'STALE', reason, datasetVersion },
    });
    return this.#distribution;
  }

  getDistribution() { return this.#distribution; }
  getAuthorizedExecution() { return this.#authorizedExecution; }
  getCurrentCommonInputExecution() { return this.#currentCommonInputExecution; }
  getMethodSelection() { return this.#methodSelection; }
  clear() {
    this.#distribution = null;
    this.#authorizedExecution = null;
    this.#currentCommonInputExecution = null;
    this.#methodSelection = null;
  }
}

export const engineeringSupportLoadStore = new EngineeringSupportLoadStore();
