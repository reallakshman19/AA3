/**
 * Compatibility surface for the stateless Discretization mesh-quality projection.
 *
 * Gate classification remains owned by the meshing quality-gate package. The
 * implementation lives with the already-qualified Discretization presentation
 * leaf so graph-owned controllers/stores stay out of manual chunk ownership.
 */
export {
  buildMeshQualityPanel,
  panelBlocksAdvance,
  renderMeshQualityPanel,
} from './lafea-discretization-dom.js';
