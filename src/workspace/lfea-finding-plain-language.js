/**
 * What each finding means, in the words an engineer would use.
 *
 * The finding codes are the pipeline's own vocabulary and they are precise,
 * but they are not readable: MODEL_PRESSURE_STRUCTURAL_EFFECTS_UNREPRESENTED
 * tells you nothing about pressure unless you already know what it refers to.
 * A panel that showed only those made an engineer decode a hundred rows
 * before learning whether any of them mattered.
 *
 * Each entry says what the finding is and what it means for the analysis, in
 * one or two plain sentences. The code is never replaced -- it stays visible
 * beside the sentence, because it is what a colleague or a support request
 * needs to refer to. A code with no entry here falls back to a readable form
 * of the code itself rather than being dropped or guessed at.
 */
const PLAIN_LANGUAGE = Object.freeze({
  // --- Source and units ---
  ACCDB_UNIT_DECLARATION_REQUIRED: 'A value could not be converted because its unit was not understood. The number was read but left out of the model.',
  ACCDB_UNIT_TOKEN_UNSUPPORTED: 'The file states a unit this tool does not recognise, so nothing measured in it can be converted.',
  ACCDB_RESTRAINT_TYPE_UNMAPPED: 'A support uses a type code this tool has no confirmed meaning for. It is not assumed to be anything, so the model cannot be analysed until it is identified.',
  ACCDB_ELEMENT_OFFSET_NOT_SUPPORTED: 'An element uses an end offset, which shifts where it connects. This tool does not model that, so the geometry would be wrong.',
  ACCDB_RESTRAINT_CONNECTED_NODE_NOT_SUPPORTED: 'A support is tied to another node rather than to ground. This tool does not model that connection.',
  ACCDB_FIELD_OVERRIDDEN_BY_ENGINEER: 'You changed this value by hand. The model was re-read with your value in place of the file’s.',
  INPUTXML_SOURCE_GEOMETRY_INVALID: 'The model geometry could not be read cleanly from the file, so nothing downstream can rely on it.',

  // --- Topology ---
  TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP: 'Two pipe runs lie on top of each other for part of their length, so the same stretch of pipe is claimed twice.',
  TOPOLOGY_EXACT_DUPLICATE_SEGMENTS: 'The same pipe run is declared twice between the same two points.',
  TOPOLOGY_NUMERIC_DUPLICATE_SEGMENTS: 'Two pipe runs are the same to within rounding, so one of them is almost certainly a duplicate.',
  TOPOLOGY_UNNODED_INTERIOR_INTERSECTION: 'Two pipe runs cross without a node where they meet, so the model does not connect them.',
  TOPOLOGY_ENDPOINT_ON_SEGMENT_INTERIOR: 'One run ends part-way along another without a node there, so they are not connected in the model.',
  TOPOLOGY_UNSHARED_COINCIDENT_ENDPOINTS: 'Two runs end at the same place but use different node numbers, so the model treats them as unconnected.',
  TOPOLOGY_DISTINCT_NODES_EXACTLY_COINCIDENT: 'Two different node numbers sit at exactly the same point. Nothing is merged automatically.',
  TOPOLOGY_DISTINCT_NODES_NUMERIC_COINCIDENCE: 'Two different node numbers sit at the same point to within rounding. Nothing is merged automatically.',
  TOPOLOGY_DISTINCT_NODES_NEAR_COINCIDENT: 'Two node numbers sit very close together but not at the same point. Worth a look in case one is a typo.',
  TOPOLOGY_SEGMENT_NEAR_MISS: 'Two pipe runs pass very close without touching. No connection is assumed between them.',
  TOPOLOGY_ELEMENT_DELTA_CLOSURE_MISMATCH: 'An element’s stated length does not match the distance between the two nodes it runs between.',
  TOPOLOGY_PROXIMITY_PAIR_DEGENERATE: 'A run is too short to compare against its neighbours reliably.',
  TOPOLOGY_MODEL_EMPTY: 'No usable pipe runs were found in this model.',
  TOPOLOGY_NODE_ID_INVALID: 'A node number could not be read.',

  // --- What this solver can and cannot represent ---
  MODEL_BEND_EXACT_MECHANICS_UNAVAILABLE: 'Bends are modelled as straight pieces. Real bends are more flexible than that, so displacements near bends will read low.',
  MODEL_TEE_EXACT_MECHANICS_UNAVAILABLE: 'Tees are modelled as plain branching pipe, without the extra local flexibility a real tee has.',
  MODEL_REDUCER_EXACT_MECHANICS_UNAVAILABLE: 'A reducer is modelled as a uniform pipe rather than a tapering one.',
  MODEL_PRESSURE_STRUCTURAL_EFFECTS_UNREPRESENTED: 'Pressure is carried for code checking only. It does not stiffen the pipe, push the ends apart, or straighten bends in this analysis.',
  MODEL_RESTRAINT_FRICTION_UNSUPPORTED: 'This support has friction declared. Friction is not modelled, so the pipe slides freely at this point.',
  MODEL_RESTRAINT_GAP_UNSUPPORTED: 'This support has a gap declared. The gap is not modelled, so the support acts as if it were in contact from the start.',
  MODEL_RESTRAINT_UNILATERAL_UNSUPPORTED: 'This support only resists in one direction in reality. It is modelled as if it resisted both ways, so it may hold the pipe down where the real support would let it lift.',
  MODEL_RESTRAINT_TARGET_DUPLICATE: 'Two supports act on the same node in the same direction. Only one would survive into the analysis, so the intent needs resolving.',
  MODEL_SIF_TYPE_UNSUPPORTED: 'A stress intensification factor uses a fitting type this tool does not recognise, so it cannot be used in a code check.',
  MODEL_COMPONENT_TYPE_UNSUPPORTED: 'A component type in this model has no representation in this solver.',
  MODEL_COMPONENT_SOURCE_UNRECONCILED: 'A component in the file could not be matched to the geometry that was built from it.',
  MODEL_OPERATING_TEMPERATURE_NOT_DECLARED: 'No operating temperature is given, so no thermal expansion case can be run.',
  MODEL_FEATURE_LIMITATION: 'This feature is carried through with a stated simplification rather than modelled exactly.',

  // --- Stages this pass does not perform ---
  CODE_STRESS_PROFILE_PREPARATION_REQUIRED: 'Code stress checking is not done here. The inputs it would need are listed, but no code check is performed or claimed.',
  THERMAL_PROFILE_PREPARATION_REQUIRED: 'Thermal properties are recorded but the thermal case is prepared in a later step.',
  SUSTAINED_PROFILE_PREPARATION_REQUIRED: 'The sustained (weight and pressure) case is prepared in a later step.',
  OPERATING_PROFILE_PREPARATION_REQUIRED: 'The operating case is prepared in a later step.',

  // --- Notes the ACCDB reader raises about what it found ---
  ACCDB_BEND_ARC_GEOMETRY_RESOLVED: 'The curve of this bend was worked out from the file’s own coordinates and bend radius.',
  ACCDB_FORCES_MOMENTS_PRESENT_NOT_COMPILED: 'The file declares applied forces or moments on this element. They are recorded but not applied as a load here.',
  ACCDB_RESTRAINT_FRICTION_NOT_MODELED: 'This support declares friction. It is recorded but not modelled, so the pipe slides freely at this point.',
  ACCDB_RESTRAINT_GAP_NOT_MODELED: 'This support declares a gap. It is recorded but not modelled, so the support acts as if in contact from the start.',
  ACCDB_RESTRAINT_NODE_UNRESOLVED: 'A support refers to a node that no pipe element uses, so it holds nothing.',
  ACCDB_SIF_TYPE_UNCLASSIFIED: 'A fitting has a stress intensification type this tool does not recognise. It is recorded rather than assumed.',
  MODEL_RESTRAINT_CONNECTING_NODE_UNSUPPORTED: 'This support is tied to another node instead of to ground. That connection is not modelled here.',

  // --- Solver ---
  SOLVER_MECHANISM_FLOATING_COMPONENT: 'Part of the model is not held by any support, so it can move freely and the analysis cannot be solved.',
  ALGEBRAIC_RESIDUAL_NORMALIZED: 'The answer is good to about five significant figures rather than the full precision this tool can reach. That is the model\u2019s own geometry — very short elements beside very long ones — not a fault in the solve, and it is far finer than pipe stress work needs.',
});

/**
 * A readable sentence for a finding code. Falls back to the code turned into
 * words -- never to an empty string or a guess, so an unmapped code still
 * reads as something rather than disappearing.
 */
/**
 * Field names as an engineer says them, for the inherited-value family below.
 * A field with no entry keeps its own name, which is what the file calls it.
 */
const FIELD_WORDS = Object.freeze({
  MODULUS: 'elastic modulus',
  POISSONS: "Poisson's ratio",
  TEMP_EXP_C1: 'operating temperature',
  TEMP_EXP_C2: 'second operating temperature',
  PRESSURE1: 'pressure',
  HYDRO_PRESSURE: 'hydrotest pressure',
  PIPE_DENSITY: 'pipe density',
  FLUID_DENSITY: 'fluid density',
  INSUL_DENSITY: 'insulation density',
  INSUL_THICK: 'insulation thickness',
  CORR_ALLOW: 'corrosion allowance',
  DIAMETER: 'diameter',
  WALL_THICK: 'wall thickness',
  MATERIAL_NAME: 'material',
});

/**
 * CAESAR states a value once and leaves it blank on the elements that follow,
 * which is normal modelling practice rather than an omission. One rule covers
 * every field it can happen to, so a field added later reads correctly without
 * anyone remembering to write a new sentence for it.
 */
const INHERITED_SUFFIX = '_INHERITED_FROM_PRIOR_ELEMENT';

function inheritedFieldSentence(code) {
  if (!code.endsWith(INHERITED_SUFFIX)) return null;
  const field = code.slice(0, -INHERITED_SUFFIX.length);
  if (field === '') return null;
  const words = FIELD_WORDS[field] ?? field;
  return `This element does not state its own ${words}, so it uses the value from the element before it — normal in CAESAR models, and worth checking only if it looks wrong.`;
}

/**
 * A readable sentence for a finding code. Falls back to the code turned into
 * words -- never to an empty string or a guess, so an unmapped code still
 * reads as something rather than disappearing.
 */
export function plainLanguageForFindingCode(code) {
  if (!code) return '';
  const known = PLAIN_LANGUAGE[code];
  if (known) return known;
  const inherited = inheritedFieldSentence(code);
  if (inherited) return inherited;
  return `${humanizeCode(code)}.`;
}

/** Whether this code has a written explanation rather than a derived one. */
export function hasPlainLanguage(code) {
  if (!code) return false;
  return Boolean(PLAIN_LANGUAGE[code]) || inheritedFieldSentence(code) !== null;
}

function humanizeCode(code) {
  const words = String(code).split('_').filter(Boolean);
  if (words.length === 0) return String(code);
  const text = words.join(' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const LFEA_PLAIN_LANGUAGE_CODES = Object.freeze(Object.keys(PLAIN_LANGUAGE));

/**
 * What each capability actually means for the engineer, in their terms. The
 * capability ids are precise and unreadable in equal measure -- an engineer
 * reading "OPERATING_CASE_APPROXIMATE = BLOCK" learns nothing about what they
 * cannot do.
 */
const CAPABILITY_WORDS = Object.freeze({
  SOURCE_ACCEPTANCE: 'Read the file',
  TOPOLOGY_ACCEPTANCE: 'Model geometry holds together',
  STRICT_LINEAR_STATIC: 'Solve with exact mechanics only',
  APPROXIMATE_LINEAR_STATIC: 'Solve with the stated simplifications',
  THERMAL_AUTHORITY: 'Use the declared temperatures',
  SUSTAINED_CASE_STRICT: 'Weight and pressure case, exact mechanics',
  OPERATING_CASE_STRICT: 'Operating case, exact mechanics',
  SUSTAINED_CASE_APPROXIMATE: 'Weight and pressure case',
  OPERATING_CASE_APPROXIMATE: 'Operating case',
  CODE_STRESS_INPUT_READINESS: 'Inputs a later code check would need',
});

export function plainLanguageForCapability(capabilityId) {
  return CAPABILITY_WORDS[capabilityId] ?? humanizeCode(capabilityId);
}

/** Capability status in words that say what it means for the engineer. */
export function plainLanguageForCapabilityStatus(status) {
  if (status === 'PASS') return 'Ready';
  if (status === 'CONDITIONAL') return 'Ready once you accept the notes below';
  if (status === 'BLOCK') return 'Not available yet';
  if (status === 'NOT_APPLICABLE') return 'Not used by the selected profile';
  return status;
}
