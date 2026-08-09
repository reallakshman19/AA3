#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json

path = Path('src/core/fea-benchmarks/caesar-accdb-linear-solve.js')
text = path.read_text()
before = hashlib.sha256(text.encode()).hexdigest()

# Select the already-qualified Version-14 B31J smooth-90 1.3/h factor for E48 only.
old = "        smooth90FlexibilityCorrection: input.solveProfile.b31jSmooth90FlexibilityCorrection.enabled,"
new = "        smooth90FlexibilityCorrection: input.solveProfile.b31jSmooth90FlexibilityCorrection.enabled || pointer === 10,"
count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected one smooth90 selection site; found {count}.')
text = text.replace(old, new)

# Retain physical arc stiffness and add only the exact end rotational compliance.
old = """      effectiveLocalStiffness: componentEntry.effectiveLocalStiffness,
      effectiveGlobalStiffness: componentEntry.effectiveGlobalStiffness,
      teeModifier: null,"""
new = """      effectiveLocalStiffness: sourceElementId === '48'
        ? componentEntry.frameElement.localStiffness
        : componentEntry.effectiveLocalStiffness,
      effectiveGlobalStiffness: sourceElementId === '48'
        ? componentEntry.frameElement.globalStiffness
        : componentEntry.effectiveGlobalStiffness,
      rotationalBendFlexibility: sourceElementId === '48' && (index === 0 || index === bend.component.elements.length - 1)
        ? {
            end: index === 0 ? 'I' : 'J',
            factor: bend.component.flexibility.factor,
            arcLength: bend.component.geometry.arcLength,
          }
        : null,
      teeModifier: null,"""
count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected one bend-arc stiffness site; found {count}.')
text = text.replace(old, new)

old = """  const baseInitialLocal = bourdon === null
    ? axialInitialLocal
    : add(axialInitialLocal, bourdon.initialLocal);
  const condensed = condenseTeeEndConditions(
    baseEffectiveLocalStiffness,
    baseEquivalentLocal,
    baseInitialLocal,
    teeModifier,
  );"""
new = """  const baseInitialLocal = bourdon === null
    ? axialInitialLocal
    : add(axialInitialLocal, bourdon.initialLocal);
  const bendCondensed = condenseRotationalBendFlexibility(
    baseEffectiveLocalStiffness,
    baseEquivalentLocal,
    baseInitialLocal,
    frame,
    input.rotationalBendFlexibility ?? null,
  );
  const condensed = condenseTeeEndConditions(
    bendCondensed.matrix,
    bendCondensed.equivalentLocal,
    bendCondensed.initialLocal,
    teeModifier,
  );"""
count = text.count(old)
if count != 1:
    raise SystemExit(f'Expected one load-condensation site; found {count}.')
text = text.replace(old, new)

anchor = "\nfunction condenseTeeEndConditions(localStiffness, equivalentLocal, initialLocal, teeModifier) {"
helper = r'''

function condenseRotationalBendFlexibility(localStiffness, equivalentLocal, initialLocal, frame, declaration) {
  if (declaration === null) return { matrix: localStiffness, equivalentLocal, initialLocal };
  const k = Number(declaration.factor);
  const arcLength = Number(declaration.arcLength);
  if (!(k > 1) || !(arcLength > 0)) throw new TypeError('Rotational bend flexibility requires k>1 and positive arc length.');
  const bendingRigidity = frame.material.elasticModulus * frame.section.secondMomentY;
  const stiffness = 2 * bendingRigidity / ((k - 1) * arcLength);
  const entries = ['RY', 'RZ'].map((dof) => ({
    index: elementDofIndex(declaration.end, dof),
    stiffness,
  }));
  const result = condenseEndConditions(
    localStiffness,
    [equivalentLocal, initialLocal],
    entries,
    frameProfile().releaseSingularityTolerance.value,
  );
  return {
    matrix: result.matrix,
    equivalentLocal: result.vectors[0],
    initialLocal: result.vectors[1],
  };
}
'''
count = text.count(anchor)
if count != 1:
    raise SystemExit(f'Expected one tee-condensation anchor; found {count}.')
text = text.replace(anchor, helper + anchor)
path.write_text(text)

after = hashlib.sha256(text.encode()).hexdigest()
Path('.work').mkdir(exist_ok=True)
Path('.work/issue947-e48-rotational-only-source-patch.json').write_text(json.dumps({
    'schema': 'lfea-issue947-diagnostic-patch/v1',
    'scope': 'DIAGNOSTIC_ONLY_E48_ROTATIONAL_BEND_FLEXIBILITY',
    'productionSourceChanged': False,
    'sourceElementId': '48',
    'bendPtr': 10,
    'authorityFactor': 'CAESAR_II_14_00_B31J_SMOOTH_90_1_3_OVER_H',
    'springComplianceEquation': '1/KI + 1/KJ = (k-1)*Larc/(EI); KI=KJ=2EI/((k-1)Larc)',
    'springDofs': ['RY', 'RZ'],
    'translationAndTorsion': 'PHYSICAL_ARC_STIFFNESS_UNMODIFIED',
    'beforeSha256': before,
    'afterSha256': after,
}, indent=2) + '\n')
