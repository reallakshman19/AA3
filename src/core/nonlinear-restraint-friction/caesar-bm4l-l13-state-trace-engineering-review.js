import {
  BM4L_L13_STATE_TRACE_EVIDENCE_STATUS,
  assessBm4lL13StateTraceEvidence,
} from './caesar-bm4l-l13-state-trace-evidence-gate.js';

const STATUS = Object.freeze({
  READY_FOR_ENGINEERING_JUDGMENT: 'STATE_TRACE_REDUCED_FOR_ENGINEERING_JUDGMENT',
  BLOCKED_EVIDENCE: 'BLOCKED_EVIDENCE',
});

export const BM4L_L13_STATE_TRACE_REVIEW_STATUS = STATUS;

/**
 * Reduce a gate-passing exact-build BM4_L L13 trace into direct engineering
 * observations around the documented friction controls. This function is
 * intentionally non-promotional: it cannot authorize a state algorithm,
 * production mechanics, or a new L13 score.
 */
export function reviewBm4lL13StateTraceEvidence(evidence, contract) {
  validateContract(contract);
  const gate = assessBm4lL13StateTraceEvidence(evidence);
  if (gate.status !== BM4L_L13_STATE_TRACE_EVIDENCE_STATUS.READY_FOR_ENGINEERING_REVIEW) {
    return freezeResult({
      status: STATUS.BLOCKED_EVIDENCE,
      blockerCodes: gate.blockerCodes,
      observations: emptyObservations(),
      closure: blockedClosure(),
      authority: authorityFirewall(),
    });
  }

  const mu = contract.knownControls.coefficientOfFriction;
  const normalThreshold = contract.knownControls.frictionNormalForceVariation;
  const angleControlDeg = contract.knownControls.frictionAngleVariationDeg;
  const iterations = evidence.iterations;
  const firstSlideTransitions = [];
  const slidingNormalForcePairs = [];
  const slidingDirectionPairs = [];

  for (let i = 1; i < iterations.length; i += 1) {
    const previousIteration = iterations[i - 1];
    const currentIteration = iterations[i];
    const previous = new Map(previousIteration.restraints.map((row) => [row.restraintKey, row]));

    for (const current of currentIteration.restraints) {
      if (!String(current.restraintKey).startsWith('FRICTION:')) continue;
      const prior = previous.get(current.restraintKey);
      if (!prior) continue;

      if (prior.frictionState !== 'SLIDING' && current.frictionState === 'SLIDING') {
        const referenceDirection = firstTransitionReferenceDirection(current);
        firstSlideTransitions.push(Object.freeze({
          restraintKey: current.restraintKey,
          transitionIteration: currentIteration.iteration,
          priorIteration: previousIteration.iteration,
          priorFrictionState: prior.frictionState,
          currentFrictionState: current.frictionState,
          priorNormalReactionN: prior.normalReactionN,
          currentNormalReactionN: current.normalReactionN,
          priorFrictionResistanceN: prior.frictionResistanceN,
          currentFrictionResistanceN: current.frictionResistanceN,
          priorLimitRatio: frictionLimitRatio(prior.frictionResistanceN, prior.normalReactionN, mu),
          currentLimitRatio: frictionLimitRatio(current.frictionResistanceN, current.normalReactionN, mu),
          currentSlidingForceResidualUsingPriorNormalN: slidingResidual(
            current.frictionResistanceN,
            prior.normalReactionN,
            mu,
          ),
          currentSlidingForceResidualUsingCurrentNormalN: slidingResidual(
            current.frictionResistanceN,
            current.normalReactionN,
            mu,
          ),
          configuredFirstTransitionAngleDeg: angleControlDeg,
          productObservedReferenceDirectionPresent: referenceDirection !== null,
          firstTransitionDirectionChangeDeg: referenceDirection === null
            ? null
            : directionChangeDeg(referenceDirection, current.frictionDirectionGlobal),
        }));
      }

      if (prior.frictionState === 'SLIDING' && current.frictionState === 'SLIDING') {
        const normalForceRelativeChange = relativeChange(prior.normalReactionN, current.normalReactionN);
        const frictionResistanceRelativeChange = relativeChange(
          prior.frictionResistanceN,
          current.frictionResistanceN,
        );
        slidingNormalForcePairs.push(Object.freeze({
          restraintKey: current.restraintKey,
          iteration: currentIteration.iteration,
          priorIteration: previousIteration.iteration,
          priorNormalReactionN: prior.normalReactionN,
          currentNormalReactionN: current.normalReactionN,
          normalForceRelativeChange,
          configuredNormalForceVariationThreshold: normalThreshold,
          thresholdExceeded: normalForceRelativeChange !== null
            ? normalForceRelativeChange > normalThreshold
            : null,
          priorFrictionResistanceN: prior.frictionResistanceN,
          currentFrictionResistanceN: current.frictionResistanceN,
          frictionResistanceRelativeChange,
          currentSlidingForceResidualUsingPriorNormalN: slidingResidual(
            current.frictionResistanceN,
            prior.normalReactionN,
            mu,
          ),
          currentSlidingForceResidualUsingCurrentNormalN: slidingResidual(
            current.frictionResistanceN,
            current.normalReactionN,
            mu,
          ),
        }));

        const angle = directionChangeDeg(
          prior.frictionDirectionGlobal,
          current.frictionDirectionGlobal,
        );
        if (angle !== null) {
          slidingDirectionPairs.push(Object.freeze({
            restraintKey: current.restraintKey,
            iteration: currentIteration.iteration,
            priorIteration: previousIteration.iteration,
            directionChangeDeg: angle,
            configuredFirstTransitionAngleDeg: angleControlDeg,
            configuredAngleControlAppliesToThisPair: false,
            reason: 'SUBSEQUENT_SLIDING_ITERATIONS_COMPENSATE_AUTOMATICALLY',
          }));
        }
      }
    }
  }

  const gapContactChanges = gate.transitions.contactStateChanges;
  const frictionStateChanges = gate.transitions.frictionStateChanges;
  const subIterationStateEvents = gate.transitions.subIterationStateEvents;
  const contactFrictionOrdering = buildContactFrictionOrdering(
    gapContactChanges,
    frictionStateChanges,
    subIterationStateEvents,
  );

  const unresolvedEvidence = [];
  if (firstSlideTransitions.length === 0) {
    unresolvedEvidence.push('NO_STICK_TO_SLIDING_TRANSITION_OBSERVED');
  } else if (firstSlideTransitions.some((row) => !row.productObservedReferenceDirectionPresent)) {
    unresolvedEvidence.push('FIRST_SLIDE_15_DEGREE_REFERENCE_DIRECTION_NOT_CAPTURED');
  }
  if (slidingNormalForcePairs.length === 0) {
    unresolvedEvidence.push('NO_SLIDING_TO_SLIDING_NORMAL_FORCE_UPDATE_PAIR_OBSERVED');
  }
  if (contactFrictionOrdering.some((row) => row.relation === 'SAME_RECORDED_ITERATION_SUBITERATION_ORDER_UNRESOLVED')) {
    unresolvedEvidence.push('SAME_ITERATION_CONTACT_FRICTION_EVENTS_REQUIRE_SUBITERATION_ORDER_EVIDENCE');
  }

  const observations = Object.freeze({
    firstSlideTransitions: Object.freeze(firstSlideTransitions),
    slidingNormalForcePairs: Object.freeze(slidingNormalForcePairs),
    slidingDirectionPairs: Object.freeze(slidingDirectionPairs),
    gapContactChanges,
    frictionStateChanges,
    subIterationStateEvents,
    contactFrictionOrdering: Object.freeze(contactFrictionOrdering),
  });

  return freezeResult({
    status: STATUS.READY_FOR_ENGINEERING_JUDGMENT,
    blockerCodes: Object.freeze([]),
    observations,
    closure: Object.freeze({
      stickToSlidingTransitionIterationsObserved: firstSlideTransitions.length > 0,
      nextIterationSlidingForceBasisReviewable: firstSlideTransitions.length > 0,
      normalForceUpdateBasisReviewable: slidingNormalForcePairs.length > 0,
      subsequentSlidingDirectionHistoryReviewable: slidingDirectionPairs.length > 0,
      firstSlide15DegreeHandlingReviewable: firstSlideTransitions.length > 0
        && firstSlideTransitions.every((row) => row.productObservedReferenceDirectionPresent),
      gapContactIterationHistoryReviewable: gapContactChanges.length > 0,
      withinIterationCommitOrderingResolved: !contactFrictionOrdering.some((row) =>
        row.relation === 'SAME_RECORDED_ITERATION_SUBITERATION_ORDER_UNRESOLVED'),
      unresolvedEvidence: Object.freeze(unresolvedEvidence),
      uniqueCaesarStateAlgorithmEstablished: false,
    }),
    authority: authorityFirewall(),
  });
}

function buildContactFrictionOrdering(contactChanges, frictionChanges, subIterationEvents) {
  const rows = [];
  for (const contact of contactChanges) {
    const nodeId = nodeIdFromKey(contact.restraintKey);
    for (const friction of frictionChanges) {
      if (nodeIdFromKey(friction.restraintKey) !== nodeId) continue;
      const relation = contact.iteration === friction.iteration
        ? sameIterationRelation(contact, friction, subIterationEvents)
        : iterationRelation(contact.iteration, friction.iteration);
      rows.push(Object.freeze({
        nodeId,
        gapRestraintKey: contact.restraintKey,
        frictionRestraintKey: friction.restraintKey,
        contactChangeIteration: contact.iteration,
        frictionChangeIteration: friction.iteration,
        ...relation,
      }));
    }
  }
  return rows;
}

function sameIterationRelation(contact, friction, subIterationEvents) {
  const contactEvent = subIterationEvents.find((event) =>
    event.iteration === contact.iteration
    && event.restraintKey === contact.restraintKey
    && event.eventType === 'CONTACT_STATE_CHANGE'
    && event.from === contact.from
    && event.to === contact.to);
  const frictionEvent = subIterationEvents.find((event) =>
    event.iteration === friction.iteration
    && event.restraintKey === friction.restraintKey
    && event.eventType === 'FRICTION_STATE_CHANGE'
    && event.from === friction.from
    && event.to === friction.to);
  if (!contactEvent || !frictionEvent) {
    return {
      relation: 'SAME_RECORDED_ITERATION_SUBITERATION_ORDER_UNRESOLVED',
      contactEventOrdinal: contactEvent?.ordinal ?? null,
      frictionEventOrdinal: frictionEvent?.ordinal ?? null,
      subIterationEvidencePresent: false,
    };
  }
  if (contactEvent.ordinal < frictionEvent.ordinal) {
    return {
      relation: 'CONTACT_SUBITERATION_EVENT_BEFORE_FRICTION_EVENT',
      contactEventOrdinal: contactEvent.ordinal,
      frictionEventOrdinal: frictionEvent.ordinal,
      subIterationEvidencePresent: true,
    };
  }
  if (contactEvent.ordinal > frictionEvent.ordinal) {
    return {
      relation: 'FRICTION_SUBITERATION_EVENT_BEFORE_CONTACT_EVENT',
      contactEventOrdinal: contactEvent.ordinal,
      frictionEventOrdinal: frictionEvent.ordinal,
      subIterationEvidencePresent: true,
    };
  }
  return {
    relation: 'SAME_RECORDED_ITERATION_SUBITERATION_ORDER_UNRESOLVED',
    contactEventOrdinal: contactEvent.ordinal,
    frictionEventOrdinal: frictionEvent.ordinal,
    subIterationEvidencePresent: true,
  };
}

function iterationRelation(contactIteration, frictionIteration) {
  if (contactIteration < frictionIteration) {
    return {
      relation: 'CONTACT_CHANGE_RECORDED_BEFORE_FRICTION_CHANGE',
      contactEventOrdinal: null,
      frictionEventOrdinal: null,
      subIterationEvidencePresent: false,
    };
  }
  return {
    relation: 'FRICTION_CHANGE_RECORDED_BEFORE_CONTACT_CHANGE',
    contactEventOrdinal: null,
    frictionEventOrdinal: null,
    subIterationEvidencePresent: false,
  };
}

function firstTransitionReferenceDirection(row) {
  if (unitVector3(row?.firstTransitionReferenceDirectionGlobal)) {
    return row.firstTransitionReferenceDirectionGlobal;
  }
  if (unitVector3(row?.trialSlidingDirectionGlobal)) return row.trialSlidingDirectionGlobal;
  return null;
}

function frictionLimitRatio(frictionResistanceN, normalReactionN, mu) {
  if (!Number.isFinite(frictionResistanceN) || !Number.isFinite(normalReactionN)) return null;
  const limit = Math.abs(mu * normalReactionN);
  return limit > 0 ? Math.abs(frictionResistanceN) / limit : null;
}

function slidingResidual(frictionResistanceN, normalReactionN, mu) {
  if (!Number.isFinite(frictionResistanceN) || !Number.isFinite(normalReactionN)) return null;
  return Math.abs(Math.abs(frictionResistanceN) - Math.abs(mu * normalReactionN));
}

function relativeChange(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(b - a) / Math.max(Math.abs(a), 1e-12);
}

function directionChangeDeg(a, b) {
  if (!unitVector3(a) || !unitVector3(b)) return null;
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(dot) * 180 / Math.PI;
}

function unitVector3(value) {
  if (!Array.isArray(value) || value.length !== 3 || !value.every(Number.isFinite)) return false;
  return Math.abs(Math.hypot(...value) - 1) <= 1e-9;
}

function nodeIdFromKey(key) {
  return String(key ?? '').split(':')[1] ?? '';
}

function validateContract(contract) {
  if (contract?.schema !== 'm047-bm4l-l13-state-trace-review-contract/v1') {
    throw new TypeError('BM4_L L13 state-trace review contract v1 required.');
  }
  if (contract?.benchmarkId !== 'BM4_L' || contract?.caseId !== 'L13') {
    throw new TypeError('BM4_L L13 review contract required.');
  }
}

function emptyObservations() {
  return Object.freeze({
    firstSlideTransitions: Object.freeze([]),
    slidingNormalForcePairs: Object.freeze([]),
    slidingDirectionPairs: Object.freeze([]),
    gapContactChanges: Object.freeze([]),
    frictionStateChanges: Object.freeze([]),
    subIterationStateEvents: Object.freeze([]),
    contactFrictionOrdering: Object.freeze([]),
  });
}

function blockedClosure() {
  return Object.freeze({
    stickToSlidingTransitionIterationsObserved: false,
    nextIterationSlidingForceBasisReviewable: false,
    normalForceUpdateBasisReviewable: false,
    subsequentSlidingDirectionHistoryReviewable: false,
    firstSlide15DegreeHandlingReviewable: false,
    gapContactIterationHistoryReviewable: false,
    withinIterationCommitOrderingResolved: false,
    unresolvedEvidence: Object.freeze(['F2_7B_GATE_PASS_REQUIRED']),
    uniqueCaesarStateAlgorithmEstablished: false,
  });
}

function authorityFirewall() {
  return Object.freeze({
    engineeringObservationReductionAuthorized: true,
    frictionStateHistorySemanticsAuthorized: false,
    gapContactSemanticsAuthorized: false,
    productionMechanicsAuthorized: false,
    l13RescoreAuthorized: false,
    responseFittingPermitted: false,
  });
}

function freezeResult(value) {
  Object.freeze(value.blockerCodes);
  Object.freeze(value.authority);
  return Object.freeze(value);
}
