/**
 * Code-owned production trust root for the LAFEA.4 parent-normal hard gate.
 *
 * TECH-12E deliberately ships this as null. A structurally valid TECH-12D
 * record is not enough to activate product authority because qualification
 * regressions can construct synthetic records. Production activation therefore
 * requires a later, separately reviewed trust-root-only promotion that pins the
 * exact real TECH-12D record produced from an exact-head TECH-8 PASS bundle.
 */
export const LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_RECORD = null;

export const LAFEA4_PARENT_NORMAL_PRODUCTION_ACTIVATION_POLICY =
  'CODE_OWNED_TRUST_ROOT_ONLY_AFTER_EXACT_HEAD_TECH8_PASS_V1';
