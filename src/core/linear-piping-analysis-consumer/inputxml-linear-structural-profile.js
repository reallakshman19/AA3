import { sealMechanicalModelCompilerProfile } from '../linear-fea-model-compiler/index.js';
import {
  DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
  STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
} from './inputxml-model-health-profile.js';

export const INPUTXML_LINEAR_STRUCTURAL_PROFILE_SCHEMA =
  'fea-inputxml-linear-structural-profile/v1';

export const INPUTXML_LINEAR_IDENTITY_CONDITIONING_PROFILE = Object.freeze({
  spanSeedingLimit: {
    value: 1e9,
    source: 'InputXML solve integration preserves one analytical span per retained source segment.',
  },
  bendSeedingSegments: {
    value: 2,
    source: 'Exact bend mechanics remain blocked; disclosed approximations retain the diagnosed source chord.',
  },
  bendLengthErrorLimit: {
    value: 1,
    source: 'InputXML solve integration does not derive curved geometry in this preparation boundary.',
  },
});

/**
 * S2 production conditioning profile.
 *
 * Bend retopology consumes bendSeedingSegments before generic conditioning and
 * creates the explicit chord chain itself. `seedIntermediateNodes` recognizes
 * those `bendChordOf` spans and therefore does not seed them again. Four is
 * deliberately even so every bend has one retained mid-arc station; the 2%
 * chord-length limit is the governing S2 acceptance bound from the promotion
 * plan, not a fitted benchmark tolerance.
 */
export const INPUTXML_LINEAR_COMPONENT_CONDITIONING_PROFILE = Object.freeze({
  spanSeedingLimit: {
    value: 1e9,
    source: 'S2 changes bend topology only; unrelated straight-span subdivision remains inactive.',
  },
  bendSeedingSegments: {
    value: 4,
    source: 'LFEA piping component promotion S2: even four-chord bend representation with retained mid-arc station.',
  },
  bendLengthErrorLimit: {
    value: 0.02,
    source: 'LFEA piping component promotion S2: maximum relative arc-to-chord length shortfall.',
  },
});

const PROFILE_BY_ID = Object.freeze({
  [STRICT_INPUTXML_LINEAR_STATIC_PROFILE]: Object.freeze({
    schema: INPUTXML_LINEAR_STRUCTURAL_PROFILE_SCHEMA,
    profileId: STRICT_INPUTXML_LINEAR_STATIC_PROFILE,
    modelCapabilityId: 'STRICT_LINEAR_STATIC',
  }),
  [DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE]: Object.freeze({
    schema: INPUTXML_LINEAR_STRUCTURAL_PROFILE_SCHEMA,
    profileId: DISCLOSED_GENERIC_ANALYZER_APPROXIMATION_PROFILE,
    modelCapabilityId: 'APPROXIMATE_LINEAR_STATIC',
  }),
});

export class InputXmlLinearStructuralPreparationError extends Error {
  constructor(message, code, data = null) {
    super(message);
    this.name = 'InputXmlLinearStructuralPreparationError';
    this.code = code;
    this.data = data;
  }
}

export function requireInputXmlLinearStructuralProfile(profileId) {
  const profile = PROFILE_BY_ID[profileId] ?? null;
  if (profile === null) {
    throw new InputXmlLinearStructuralPreparationError(
      `InputXML structural profile ${String(profileId)} is unsupported.`,
      'INPUTXML_STRUCTURAL_PROFILE_UNSUPPORTED',
      { profileId },
    );
  }
  return profile;
}

export function inputXmlMechanicalModelCompilerProfile() {
  return sealMechanicalModelCompilerProfile({
    schema: 'fea-linear-model-compiler-profile/v1',
    profileId: 'LINEAR-MODEL-COMPILER-R1',
    spanBindingRule: 'EXACTLY_ONE_BINDING_PER_SPAN_V1',
    zeroLengthLinkRule: 'ZERO_LENGTH_LINK_PROHIBITED_V1',
    constraintConflictRule: 'CONFLICTING_DEFINITION_BLOCKS_COMPILATION_V1',
    unrepresentableFeatureRule: 'UNREPRESENTABLE_FEATURE_BLOCKS_COMPILATION_V1',
    minimumElementLength: { value: 1e-8, source: 'INPUTXML_STRUCTURAL_PREPARATION_R1' },
    spanDirectionTolerance: { value: 1e-9, source: 'INPUTXML_STRUCTURAL_PREPARATION_R1' },
    semanticHash: '',
  });
}
