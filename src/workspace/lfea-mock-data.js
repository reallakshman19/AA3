/**
 * Deterministic [SIMULATED] input for the LFEA workbench only.
 *
 * Keep this leaf free of LAFEA fixtures and runtime imports so a standalone
 * LFEA dependency closure does not pull the local-attachment application into
 * its bundle merely to support the developer/demo mock action.
 */
import { rectangularQ4Package } from '../../scripts/lfea-005-fixtures.mjs';

/**
 * Create a fresh, hash-valid Q4 package for every LFEA editor collection.
 *
 * @returns {Record<string, unknown>} Fresh lfea-mesh-package/v1 input.
 */
export function createLfeaMockPackage() {
  return structuredClone(rectangularQ4Package({}));
}
