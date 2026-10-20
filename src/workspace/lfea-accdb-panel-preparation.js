

import { authorizeLinearPipingInputXmlPreFlight } from './linear-piping-inputxml-prefea.js';

import { lfeaProximityOptions } from './lfea-geometry-allowance.js';

import { createLinearPipingAccdbIntake, prepareLinearPipingAccdbPreFlight } from './linear-piping-accdb-intake.js';
import { parseAccdbModelHealthSource } from '../core/linear-piping-analysis-consumer/accdb-source-binding.js';
import { diagnoseInputXmlLinearModelHealth } from '../core/linear-piping-analysis-consumer/inputxml-linear-model-health.js';
import { diagnoseInputXmlLinearPreFeaEngineeringSanity } from '../core/linear-piping-analysis-consumer/inputxml-linear-prefea-engineering-checks.js';
import { buildAccdbElementPropertyRows, buildAccdbModelHealthViewModel } from './lfea-pipeline-accdb-view-model.js';
import {
  lfeaBendFactorAuthorityForIntake,
  lfeaBranchFactorAuthorityForIntake,
} from './lfea-bend-factor-authority-control.js';
import { requireProfileId, errorMessage } from './lfea-accdb-panel-utils.js';
export class AccdbPreparationMethods {
  extract(tables) {
    this.effectiveTables = tables;
    this.sourceBundle = parseAccdbModelHealthSource(tables, {
      source: `accdb-panel-${this.fileName}`,
      fileName: this.fileName,
    });
    this.modelHealth = diagnoseInputXmlLinearModelHealth(this.sourceBundle, {
      proximity: lfeaProximityOptions(),
    });
    this.healthView = buildAccdbModelHealthViewModel(this.modelHealth, this.requestedProfileId);
    this.propertyRows = buildAccdbElementPropertyRows(this.sourceBundle);
    this.engineeringSanity = diagnoseInputXmlLinearPreFeaEngineeringSanity(this.sourceBundle);
    this.prepare(tables);
  }

  /**
   * Take the imported model through the same governed pre-flight an InputXML
   * import goes through, so the Load-case, Run and Output steps have the
   * authority they consume. A model that fails closed here still shows its
   * verdict above -- the failure is reported, not swallowed, and it never
   * takes the panel's own extraction down with it.
   */
  prepare(tables) {
    this.preFlight = null;
    this.preFlightError = '';
    try {
      const intake = createLinearPipingAccdbIntake(tables, {
        fileName: this.fileName,
        requestedProfileId: this.requestedProfileId,
        requestedCaseIds: this.requestedCaseIds ?? undefined,
      });
      const options = {};
      if (this.componentBasis) {
        options.bendFactorAuthority = lfeaBendFactorAuthorityForIntake(intake, this.componentBasis);
        options.branchFactorAuthority = lfeaBranchFactorAuthorityForIntake(intake, this.componentBasis);
      }
      this.preFlight = prepareLinearPipingAccdbPreFlight(intake, this.sourceBundle, options);
    } catch (error) {
      this.preFlightError = errorMessage(error);
    }
  }

  /**
   * Re-prepare for a different set of load cases.
   *
   * The requested case set is sealed into the pre-flight's identity, so it
   * cannot be changed after the fact -- the pre-flight is rebuilt for the new
   * selection. Any acceptance sealed for the previous selection does not carry
   * over, which is the point: it was given for a different request.
   */
  setRequestedCaseIds(caseIds) {
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      throw new TypeError('Select at least one load case.');
    }
    const normalized = [...new Set(caseIds.map((id) => String(id).trim()).filter(Boolean))].sort();
    if (normalized.length === 0) throw new TypeError('Select at least one load case.');
    const applied = this.preFlight?.preparation?.requestedCaseIds ?? null;
    if (Array.isArray(applied) && applied.length === normalized.length
      && [...applied].sort().every((id, index) => id === normalized[index])) {
      // Repeated Apply cannot revoke the same pre-flight's authorization.
      return this.getSnapshot();
    }
    this.requestedCaseIds = normalized;
    if (this.effectiveTables) this.prepare(this.effectiveTables);
    this.message = `Prepared for ${normalized.length} case(s). Any previous acceptance no longer applies to this selection.`;
    this.render();
    this.notifyStateChanged();
    return this.getSnapshot();
  }

  /**
   * Accept the disclosed limitations so the analysis can proceed.
   *
   * A conditional pre-flight is not a failure -- it is the tool stating what
   * it simplified and asking an engineer to take responsibility for it. That
   * acceptance is theirs to give, with their name and their reason on it, so
   * this never happens automatically. Without this control an ACCDB model
   * could reach a clean pre-flight and still be stuck, because the Load-case
   * step runs from an authorized one.
   */
  acceptLimitations() {
    try {
      return this.authorizePreFlight({
        approverIdentity: this.reviewerIdentity,
        reason: this.reviewReason,
      });
    } catch (_error) {
      return null;
    }
  }

  /**
   * Seal an explicit review through the existing governed pre-flight gateway.
   * The common Error Check panel calls this method with reviewer custody; this
   * controller still owns the complete retained limitation/finding payload.
   */
  authorizePreFlight(approval) {
    if (!this.preFlight) {
      throw new TypeError('A current ACCDB pre-flight is required before limitation acceptance.');
    }
    let authorizationError = null;
    this.error = '';
    try {
      this.preFlight = authorizeLinearPipingInputXmlPreFlight(this.preFlight, approval);
      this.message = `Limitations accepted by ${this.preFlight.approverIdentity}; the analysis can proceed.`;
    } catch (error) {
      authorizationError = error;
      this.error = errorMessage(error);
      this.message = 'The limitations were not accepted; nothing changed.';
    }
    this.render();
    this.notifyStateChanged();
    if (authorizationError) throw authorizationError;
    return this.preFlight;
  }

  /**
   * The sealed pre-flight this source produced, or null. The Load-case step
   * reads this exactly as it reads the InputXML workflow's.
   */
  getPreFlight() {
    return this.preFlight;
  }

  getNodeIds() {
    return this.preFlight?.preparation?.structuralPreparation?.conditionedTopology?.geometry?.nodes
      ?.map((node) => node.id) ?? [];
  }

  /**
   * Re-read the existing verdict through another profile. The model-health
   * record is unchanged -- only which of its two profiles is being read is --
   * so nothing is re-parsed and no evidence hash moves.
   */
  setRequestedProfile(requestedProfileId) {
    this.requestedProfileId = requireProfileId(requestedProfileId);
    if (this.modelHealth) {
      this.healthView = buildAccdbModelHealthViewModel(this.modelHealth, this.requestedProfileId);
    }
    // The requested profile is sealed into the pre-flight's identity, so it
    // cannot be swapped after the fact -- the pre-flight is rebuilt for the
    // newly selected profile rather than left describing the previous one.
    if (this.effectiveTables) this.prepare(this.effectiveTables);
    this.render();
    this.notifyStateChanged();
  }

  prepareCandidate(tables, settings = {}) {
    // Recompute all importer, model-health and preflight evidence on detached
    // state. Never retire the live authorized preparation for a failed edit.
    const candidate = Object.create(Object.getPrototypeOf(this));
    candidate.fileName = this.fileName;
    candidate.requestedCaseIds = settings.requestedCaseIds === undefined ? this.requestedCaseIds : settings.requestedCaseIds;
    candidate.requestedProfileId = settings.requestedProfileId ?? this.requestedProfileId;
    candidate.componentBasis = settings.componentBasis ?? this.componentBasis ?? null;
    candidate.extract(tables);
    if (!candidate.preFlight) {
      throw new TypeError(candidate.preFlightError || 'The edited source cannot be prepared.');
    }
    return candidate;
  }

  adoptCandidate(candidate) {
    for (const key of ['effectiveTables', 'sourceBundle', 'modelHealth', 'healthView',
      'propertyRows', 'engineeringSanity', 'preFlight', 'preFlightError']) {
      this[key] = candidate[key];
    }
  }

}
