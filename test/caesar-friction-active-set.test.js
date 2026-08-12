import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAESAR_CONFIGURATION_AUTHORITY_V2_SCHEMA,
  CAESAR_CONFIGURATION_PRECEDENCE_LOW_TO_HIGH,
  CAESAR_CONFIGURATION_PRECEDENCE,
  migrateCaesarFrictionAuthorityV1ToV2,
  resolveCaesarConfigurationSetting,
} from '../src/core/fea-benchmarks/caesar-configuration-authority.js';
import {
  combineCaesarAlgebraicResultRows,
  compareDeterministicCaesarFrictionRuns,
  evaluateCaesarFrictionConvergence,
  evaluateCaesarFrictionRestraint,
  resolveCaesarFrictionCaseSettings,
  runDeterministicCaesarFrictionActiveSet,
} from '../src/core/fea-benchmarks/caesar-friction-active-set.js';

function authority() {
  return {
    schema: CAESAR_CONFIGURATION_AUTHORITY_V2_SCHEMA,
    caesarVersion: '14.000',
    precedence: [...CAESAR_CONFIGURATION_PRECEDENCE_LOW_TO_HIGH],
    layers: {
      overallGlobalDefault: {
        source: 'GLOBAL',
        settings: {
          COEFFICIENT_OF_FRICTION_MU: 0,
          FRICT_STIF: { value: 1e6, unit: 'DISPLAYED_CAESAR_UNITS' },
        },
      },
      individualFile: { source: 'FILE', settings: {} },
      loadCase: {
        source: 'LOADCASE',
        cases: {
          L5: { FRICTION_MULTIPLIER: 0 },
          L7: { FRICTION_MULTIPLIER: 1 },
          L13: { FRICTION_MULTIPLIER: 1 },
          L1: { FRICTION_MULTIPLIER: 1 },
          L15: {},
        },
      },
      modelInput: { source: 'MODEL', settings: { COEFFICIENT_OF_FRICTION_MU: 0.3 } },
    },
    unresolvedSettings: [],
  };
}


test('v1 friction overrides migrate to distinct v2 multipliers without mutating model mu', () => {
  const v1 = {
    schema: 'caesar-configuration-authority/v1',
    caesarVersion: '14.000',
    precedence: [...CAESAR_CONFIGURATION_PRECEDENCE],
    layers: {
      overallGlobalDefault: {
        source: 'GLOBAL',
        settings: {
          COEFFICIENT_OF_FRICTION_MU: 0,
          FRICT_STIF: { value: 1e6, unit: 'DISPLAYED_CAESAR_UNITS' },
        },
      },
      individualFile: { source: 'FILE', settings: {} },
      loadCase: {
        source: 'LOADCASE',
        cases: {
          L5: { COEFFICIENT_OF_FRICTION_MU: 0 },
          L6: { COEFFICIENT_OF_FRICTION_MU: 0 },
          L7: {},
          L13: {},
          L15: {},
        },
      },
      modelInput: { source: 'MODEL', settings: { COEFFICIENT_OF_FRICTION_MU: 0.3 } },
    },
    unresolvedSettings: [],
  };
  const migrated = migrateCaesarFrictionAuthorityV1ToV2(v1, {
    L5: 0,
    L6: 0,
    L7: 1,
    L13: 1,
  });
  assert.equal(migrated.schema, 'caesar-configuration-authority/v2');
  assert.equal(migrated.layers.modelInput.settings.COEFFICIENT_OF_FRICTION_MU, 0.3);
  assert.equal('COEFFICIENT_OF_FRICTION_MU' in migrated.layers.loadCase.cases.L5, false);
  assert.equal(migrated.layers.loadCase.cases.L5.FRICTION_MULTIPLIER, 0);
  assert.equal(migrated.layers.loadCase.cases.L7.FRICTION_MULTIPLIER, 1);
  const nonFriction = resolveCaesarFrictionCaseSettings(migrated, 'L5', { translationUnit: 'N./cm.' });
  assert.equal(nonFriction.modelCoefficient.value, 0.3);
  assert.equal(nonFriction.effectiveCoefficient, 0);
});

test('v2 precedence resolves low-to-high and keeps model mu separate from case multiplier', () => {
  const mu = resolveCaesarConfigurationSetting(authority(), 'COEFFICIENT_OF_FRICTION_MU', 'L7');
  assert.equal(mu.level, 'MODEL_INPUT');
  assert.equal(mu.value, 0.3);
  const settings = resolveCaesarFrictionCaseSettings(authority(), 'L7', { translationUnit: 'N./cm.' });
  assert.equal(settings.modelCoefficient.value, 0.3);
  assert.equal(settings.frictionMultiplier.value, 1);
  assert.equal(settings.effectiveCoefficient, 0.3);
  assert.equal(settings.frictionStiffness.siValueNPerM, 1e8);
});

test('derived L15 has no primitive friction multiplier or effective coefficient', () => {
  const settings = resolveCaesarFrictionCaseSettings(authority(), 'L15', {
    derived: true,
    translationUnit: 'N./cm.',
  });
  assert.equal(settings.kind, 'DERIVED_ALGEBRAIC');
  assert.equal(settings.frictionMultiplier, null);
  assert.equal(settings.effectiveCoefficient, null);
});

test('stick state inserts tangential stiffness and respects the Coulomb cap', () => {
  const state = evaluateCaesarFrictionRestraint({
    restraintId: 'R1',
    normalDirection: [0, 1, 0],
    relativeTangentialDisplacement: [1e-7, 0, 0],
    normalReaction: -1000,
    effectiveCoefficient: 0.3,
    frictionStiffnessNPerM: 1e8,
    previousState: 'STICK',
  });
  assert.equal(state.state, 'STICK');
  assert.equal(state.coulombCapN, 300);
  assert.equal(state.trialTangentialSpringForceMagnitudeN, 10);
  assert.equal(state.tangentStiffnessNPerM, 1e8);
  assert.deepEqual(state.appliedFrictionForce, [-10, 0, 0]);
  assert.equal(state.residuals.stickConstitutiveNormN, 0);
});

test('slide state removes tangential stiffness and applies capped force opposite slip', () => {
  const state = evaluateCaesarFrictionRestraint({
    restraintId: 'R1',
    normalDirection: [0, 1, 0],
    relativeTangentialDisplacement: [1e-4, 0, 0],
    normalReaction: 1000,
    effectiveCoefficient: 0.3,
    frictionStiffnessNPerM: 1e8,
    previousState: 'SLIDE',
  });
  assert.equal(state.state, 'SLIDE');
  assert.equal(state.tangentStiffnessNPerM, 0);
  assert.deepEqual(state.appliedFrictionForce, [-300, 0, 0]);
  assert.equal(state.residuals.slideMagnitudeResidualN, 0);
  assert.equal(state.residuals.directionCosine, -1);
});

test('convergence rejects a numerically stationary but physically invalid slide direction', () => {
  const state = evaluateCaesarFrictionRestraint({
    restraintId: 'R1',
    normalDirection: [0, 1, 0],
    relativeTangentialDisplacement: [1e-4, 0, 0],
    normalReaction: 1000,
    effectiveCoefficient: 0.3,
    frictionStiffnessNPerM: 1e8,
    previousState: 'SLIDE',
  });
  const invalid = {
    ...state,
    residuals: { ...state.residuals, directionCosine: 1, directionOpposesSlip: false },
  };
  const result = evaluateCaesarFrictionConvergence({
    profile: {
      schema: 'caesar-friction-solver-profile/v1',
      displacementUpdateNorm: 1e-9,
      reactionUpdateNorm: 1e-6,
      capResidualN: 1e-6,
      stickResidualN: 1e-6,
      slideResidualN: 1e-6,
      directionCosineTolerance: 1e-9,
      equilibriumForceN: 5,
      equilibriumMomentNm: 0.5,
    },
    states: [invalid],
    displacementUpdateNorm: 0,
    reactionUpdateNorm: 0,
    equilibriumForceResidualN: 0,
    equilibriumMomentResidualNm: 0,
    deterministicRepeat: true,
  });
  assert.equal(result.status, 'FAIL');
  assert.equal(result.gates.slideDirection, false);
});

test('L15 algebraic combination subtracts two converged result sets without solving', () => {
  const row = { entityKind: 'NODE', entityId: '10', quantity: 'FORCE', component: 'UX', unit: 'N' };
  const combined = combineCaesarAlgebraicResultRows({
    caseId: 'L15',
    minuendCaseId: 'L7',
    subtrahendCaseId: 'L13',
    minuendRows: [{ ...row, value: 125 }],
    subtrahendRows: [{ ...row, value: 25 }],
  });
  assert.equal(combined.solvePerformed, false);
  assert.equal(combined.combinationMethod, 'ALG');
  assert.equal(combined.rows[0].value, 100);
});

test('active-set controller carries a slide cap as a load into the next iteration', () => {
  const calls = [];
  const run = runDeterministicCaesarFrictionActiveSet({
    profile: {
      schema: 'caesar-friction-solver-profile/v1',
      displacementUpdateNorm: 1e-9,
      reactionUpdateNorm: 1e-6,
      capResidualN: 1e-6,
      stickResidualN: 1e-6,
      slideResidualN: 1e-6,
      directionCosineTolerance: 1e-9,
      equilibriumForceN: 5,
      equilibriumMomentNm: 0.5,
    },
    maximumIterations: 3,
    restraints: [{
      restraintId: 'R1',
      normalDirection: [0, 1, 0],
      effectiveCoefficient: 0.3,
      frictionStiffnessNPerM: 1e8,
    }],
    solveIteration: ({ iteration, assemblyTerms }) => {
      calls.push(assemblyTerms[0]);
      return {
        relativeTangentialDisplacements: { R1: [1e-4, 0, 0] },
        normalReactions: { R1: 1000 },
        displacementUpdateNorm: iteration === 1 ? 1 : 0,
        reactionUpdateNorm: iteration === 1 ? 1 : 0,
        equilibriumForceResidualN: 0,
        equilibriumMomentResidualNm: 0,
      };
    },
  });
  assert.equal(run.status, 'CONVERGED');
  assert.equal(run.iterations, 2);
  assert.equal(calls[0].mode, 'INSERT_TANGENTIAL_STIFFNESS');
  assert.equal(calls[1].mode, 'CAPPED_OPPOSING_LOAD');
  assert.deepEqual(calls[1].cappedLoadVectorN, [-300, 0, 0]);
  assert.equal(run.finalStates[0].state, 'SLIDE');
});

test('repeat comparison requires identical active-set history and final friction vectors', () => {
  const makeRun = () => runDeterministicCaesarFrictionActiveSet({
    profile: {
      schema: 'caesar-friction-solver-profile/v1',
      displacementUpdateNorm: 1e-9,
      reactionUpdateNorm: 1e-6,
      capResidualN: 1e-6,
      stickResidualN: 1e-6,
      slideResidualN: 1e-6,
      directionCosineTolerance: 1e-9,
      equilibriumForceN: 5,
      equilibriumMomentNm: 0.5,
    },
    maximumIterations: 1,
    restraints: [{
      restraintId: 'R1',
      normalDirection: [0, 1, 0],
      effectiveCoefficient: 0.3,
      frictionStiffnessNPerM: 1e8,
    }],
    solveIteration: () => ({
      relativeTangentialDisplacements: { R1: [1e-7, 0, 0] },
      normalReactions: { R1: 1000 },
      displacementUpdateNorm: 0,
      reactionUpdateNorm: 0,
      equilibriumForceResidualN: 0,
      equilibriumMomentResidualNm: 0,
    }),
  });
  assert.equal(compareDeterministicCaesarFrictionRuns(makeRun(), makeRun()).status, 'PASS');
});
