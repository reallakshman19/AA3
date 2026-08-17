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
export const LAFEA_MESH_PRODUCER_ENGINE_REVISION = 'LAFEA.10.T6Q8.SHELL.POLAR.UVREFINE.V11';
export const LAFEA_MESH_PRODUCER_QUALIFICATION_ID = 'LAFEA-MESH-Q1';
export const LAFEA_MESH_PRODUCER_QUALIFICATION_REVISION = 'R12';
export const LAFEA_MESH_PRODUCER_GOVERNANCE_REF = 'npm run check:lafea-meshing';
export const LAFEA_MESH_PRODUCER_QUALITY_POLICY_ID = 'LAFEA_MESH_PROFILE_QUALITY_GATES_V1';
export const LAFEA_MESH_PRODUCER_REF =
  `${LAFEA_MESH_PRODUCER_ENGINE_ID}/${LAFEA_MESH_PRODUCER_ENGINE_REVISION}/${LAFEA_MESH_PRODUCER_QUALIFICATION_ID}`;

/**
 * Automatic generation plus retained-mesh refinement regeneration.
 *
 * Local refinement scopes are stage/family specific:
 * - LAFEA.3: T3/T6 planar continuum regeneration;
 * - LAFEA.4: CST+DKT TRI3 non-periodic cylindrical UV-space regeneration,
 *   with exact midsurface remapping and parent boundary-edge preservation;
 * - LAFEA.5: no retained-mesh local refinement authority.
 *
 * LAFEA.4 shell refinement is intentionally narrower than automatic shell
 * generation: periodic cylinders and caller-authored LAFEA.5 source meshes
 * remain outside the local-refinement qualification.
 */
export const LAFEA_MESH_PRODUCER_GENERATION_MODES = Object.freeze([
  'AUTOMATIC_MESH', 'REFINEMENT_REGENERATION',
]);
export const LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_AUTHORIZED = true;
export const LAFEA_MESH_PRODUCER_LOCAL_REFINEMENT_FAMILIES = Object.freeze(['T3', 'T6']);

/**
 * Ceilings the producer services and the qualification authorizes. A request
 * above them is reported as a BLOCK resource disposition, never truncated.
 */
export const LAFEA_MESH_PRODUCER_MAXIMUM_NODES = 200_000;
export const LAFEA_MESH_PRODUCER_MAXIMUM_ELEMENTS = 100_000;
export const LAFEA_MESH_PRODUCER_MAXIMUM_ESTIMATED_DOFS = 400_000;

const SHELL_TRI3 = 'CST_DKT_TRI3_THIN_SHELL_V1';
const BOUND_SCOPES = Object.freeze({
  'LAFEA.3': Object.freeze(['Q8', 'T3', 'T6']),
  'LAFEA.4': Object.freeze([SHELL_TRI3]),
  'LAFEA.5': Object.freeze([SHELL_TRI3]),
});
const LOCAL_REFINEMENT_SCOPES = Object.freeze({
  'LAFEA.3': Object.freeze(['T3', 'T6']),
  'LAFEA.4': Object.freeze([SHELL_TRI3]),
  'LAFEA.5': Object.freeze([]),
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
  return [...(LOCAL_REFINEMENT_SCOPES[stageId] ?? [])];
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
