/**
 * The single declaration of which analysis-mesh producers are actually bound.
 *
 * Deliberately dependency-free. The capability, intent, stage-adapter and
 * discretization layers all need to answer "is a qualified producer bound for
 * this stage?", and the producer binding itself needs the same facts to build
 * its capability record — so the facts live here, where nothing can import a
 * cycle through them.
 *
 * Adding or extending a bound strategy is a qualification claim. It is only
 * correct when the implementation is covered by the governance reference and
 * remains inside the declared stage/family envelope.
 */

export const LAFEA_MESH_PRODUCER_REGISTRY_SCHEMA = 'lafea-mesh-producer-registry/v1';

export const LAFEA_MESH_PRODUCER_ENGINE_ID = 'LAFEA_CORE_MESHER';
export const LAFEA_MESH_PRODUCER_ENGINE_REVISION = 'LAFEA.10.T6Q8.SHELL.POLAR.V10';
export const LAFEA_MESH_PRODUCER_QUALIFICATION_ID = 'LAFEA-MESH-Q1';
export const LAFEA_MESH_PRODUCER_QUALIFICATION_REVISION = 'R11';
export const LAFEA_MESH_PRODUCER_GOVERNANCE_REF = 'npm run check:lafea-meshing';
export const LAFEA_MESH_PRODUCER_QUALITY_POLICY_ID = 'LAFEA_MESH_PROFILE_QUALITY_GATES_V1';
export const LAFEA_MESH_PRODUCER_REF =
  `${LAFEA_MESH_PRODUCER_ENGINE_ID}/${LAFEA_MESH_PRODUCER_ENGINE_REVISION}/${LAFEA_MESH_PRODUCER_QUALIFICATION_ID}`;

/**
 * Automatic generation plus retained-mesh refinement regeneration. Local
 * refinement remains qualified only for LAFEA.3 T3/T6 parents. LAFEA.4 shell
 * UV refinement has a separate capability/qualification record so this core
 * producer contract is not silently broadened.
 */
export const LAFEA_MESH_PRODUCER_GENERATION_MODES = Object.freeze([
  'AUTOMATIC_MESH', 'REFINEMENT_REGENERATION',
]);
export const LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_AUTHORIZED = true;
export const LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_FAMILIES = Object.freeze(['T3', 'T6']);

export const LAFEA_MESH_PRODUCER_MAXIMUM_NODES = 200_000;
export const LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS = 100_000;
export const LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS = 400_000;

const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const BOUND_SCOPES = Object.freeze({
  'LAFEA.3': Object.freeze(['Q8', 'T3', 'T6']),
  'LAFEA.4': Object.freeze([SHELL_TRI3]),
  'LAFEA.5': Object.freeze([SHELL_TRI3]),
});

export function lafeaMeshProducerBound(stageId, elementFamily = null) {
  const families = BOUND_SCOPES[stageId];
  if (!families) return false;
  return elementFamily === null || families.includes(elementFamily);
}

export function lafeaMeshProducerElementFamilies(stageId) {
  return [...(BOUND_SCOPES[stageId] ?? [])];
}

export function lafeaMeshProducerLocalRefinementFamilies(stageId) {
  return stageId === 'LAFEA.3'
    ? [...LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_FAMILIES]
    : [];
}

export function lafeaMeshProducerScopes() {
  return Object.entries(BOUND_SCOPES).map(([stageId, elementFamilies]) => Object.freeze({
    stageId,
    elementFamilies: [...elementFamilies],
  }));
}

export function lafeaMeshProducerRefFor(stageId) {
  return lafeaMeshProducerBound(stageId) ? LAFEA_MESH_PRODUCER_REF : null;
}
