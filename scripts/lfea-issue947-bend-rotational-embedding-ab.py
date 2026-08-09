#!/usr/bin/env python3
"""Diagnostic A/B isolating bend K-factor embedding with K itself held fixed."""
from __future__ import annotations
import argparse, json, subprocess, tempfile
from pathlib import Path

SOURCE = Path('src/core/fea-benchmarks/caesar-accdb-linear-solve.js')
TARGETS = (
    ('E19_E20', ('--source-elements', '19,20')),
    ('E25', ('--source-element', '25')),
    ('E36', ('--source-element', '36')),
    ('E48', ('--source-element', '48')),
    ('E85', ('--source-element', '85')),
)

ARC_BLOCK = """      stiffnessFrame: componentEntry.frameElement,
      effectiveLocalStiffness: componentEntry.effectiveLocalStiffness,
      effectiveGlobalStiffness: componentEntry.effectiveGlobalStiffness,
      teeModifier: null,"""
ARC_ROTATIONAL = """      stiffnessFrame: componentEntry.frameElement,
      effectiveLocalStiffness: componentEntry.frameElement.localStiffness,
      effectiveGlobalStiffness: componentEntry.frameElement.globalStiffness,
      rotationalBendFlexibility: index === 0 || index === bend.component.elements.length - 1
        ? {
            end: index === 0 ? 'I' : 'J',
            factor: bend.component.flexibility.factor,
            arcLength: bend.component.geometry.arcLength,
          }
        : null,
      teeModifier: null,"""
LOAD_BLOCK = """  const baseInitialLocal = bourdon === null
    ? axialInitialLocal
    : add(axialInitialLocal, bourdon.initialLocal);
  const condensed = condenseTeeEndConditions(
    baseEffectiveLocalStiffness,
    baseEquivalentLocal,
    baseInitialLocal,
    teeModifier,
  );"""
LOAD_ROTATIONAL = """  const baseInitialLocal = bourdon === null
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
ANCHOR = "\nfunction condenseTeeEndConditions(localStiffness, equivalentLocal, initialLocal, teeModifier) {"
HELPER = r'''

function condenseRotationalBendFlexibility(localStiffness, equivalentLocal, initialLocal, frame, declaration) {
  if (declaration === null) return { matrix: localStiffness, equivalentLocal, initialLocal };
  const k = Number(declaration.factor);
  const arcLength = Number(declaration.arcLength);
  if (!(k > 1) || !(arcLength > 0)) throw new TypeError('Rotational bend flexibility requires k>1 and positive arc length.');
  const bendingRigidityY = frame.material.elasticModulus * frame.section.secondMomentY;
  const bendingRigidityZ = frame.material.elasticModulus * frame.section.secondMomentZ;
  const stiffnessY = 2 * bendingRigidityY / ((k - 1) * arcLength);
  const stiffnessZ = 2 * bendingRigidityZ / ((k - 1) * arcLength);
  const entries = [
    { index: elementDofIndex(declaration.end, 'RY'), stiffness: stiffnessY },
    { index: elementDofIndex(declaration.end, 'RZ'), stiffness: stiffnessZ },
  ];
  const result = condenseEndConditions(
    localStiffness,
    [equivalentLocal, initialLocal],
    entries,
    frameProfile().releaseSingularityTolerance.value,
  );
  return { matrix: result.matrix, equivalentLocal: result.vectors[0], initialLocal: result.vectors[1] };
}
'''


def main():
    p=argparse.ArgumentParser(); p.add_argument('--package',required=True); p.add_argument('--out',required=True); a=p.parse_args()
    original=SOURCE.read_text()
    if original.count(ARC_BLOCK)!=1 or original.count(LOAD_BLOCK)!=1 or original.count(ANCHOR)!=1:
        raise SystemExit('Production source anchors changed; fail closed.')
    variants={'CURRENT_DISTRIBUTED_EI_OVER_K': original}
    rotational=original.replace(ARC_BLOCK,ARC_ROTATIONAL).replace(LOAD_BLOCK,LOAD_ROTATIONAL).replace(ANCHOR,HELPER+ANCHOR)
    variants['PHYSICAL_ARC_PLUS_END_ROTATIONAL_COMPLIANCE']=rotational
    results={}
    try:
        for name,text in variants.items():
            SOURCE.write_text(text)
            subprocess.run(['node','--check',str(SOURCE)],check=True,capture_output=True,text=True)
            results[name]=[run_target(a.package,label,selector) for label,selector in TARGETS]
    finally:
        SOURCE.write_text(original)
    aggregate={name:{
        'sumL2Squared':sum(r['normalizedResidualL2']**2 for r in rows),
        'worstMaxAbsNormalizedResidual':max(r['maxAbsNormalizedResidual'] for r in rows),
        'passCount':sum(r['maxAbsNormalizedResidual']<=0.1 for r in rows),
    } for name,rows in results.items()}
    per_target={}
    for label,_ in TARGETS:
        values={name:next(r for r in rows if r['target']==label) for name,rows in results.items()}
        best=min(values,key=lambda name:values[name]['normalizedResidualL2'])
        per_target[label]={'variants':values,'bestVariantByL2':best}
    current='CURRENT_DISTRIBUTED_EI_OVER_K'; candidate='PHYSICAL_ARC_PLUS_END_ROTATIONAL_COMPLIANCE'
    wins=sum(v['bestVariantByL2']==candidate for v in per_target.values())
    classification=(
        'ROTATIONAL_END_COMPLIANCE_EMBEDDING_HIGH_SIGNAL_REQUIRES_INDEPENDENT_MATRIX_AUTHORITY'
        if wins>=4 and aggregate[candidate]['sumL2Squared']<0.8*aggregate[current]['sumL2Squared']
        else 'ROTATIONAL_END_COMPLIANCE_EMBEDDING_FALSIFIED_OR_MIXED'
    )
    out={
        'schema':'lfea-issue947-bend-rotational-embedding-ab/v1','issue':947,'caseId':'L19',
        'sourceAccdbSha256':'85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21',
        'scope':'DIAGNOSTIC_ONLY_K_FACTOR_HELD_FIXED_NO_SMOOTH90_MUTATION_NO_REFERENCE_MUTATION',
        'governingPureMomentConstraint':'C_total=L/(EI)+2/Kspring=kL/(EI), so Kspring=2EI/((k-1)L)',
        'targets':per_target,'aggregate':aggregate,'candidateWins':wins,'classification':classification,
        'falsificationRule':'Reject as common bend mechanic unless fixed-k rotational embedding improves full 12-component CAESAR-injection residual on at least four independent targets and improves aggregate L2 by at least 20%, with production parity retained.',
    }
    Path(a.out).parent.mkdir(parents=True,exist_ok=True); Path(a.out).write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps({'classification':classification,'candidateWins':wins,'aggregate':aggregate,'bestByTarget':{k:v['bestVariantByL2'] for k,v in per_target.items()}},indent=2))


def run_target(package,label,selector):
    with tempfile.NamedTemporaryFile(suffix='.json',delete=False) as h: path=Path(h.name)
    try:
        cp=subprocess.run(['node','scripts/lfea-issue947-bend-descendant-condensation-audit.mjs','--package',package,selector[0],selector[1],'--out',str(path)],capture_output=True,text=True)
        if cp.returncode: raise RuntimeError(f'{label} failed\n{cp.stdout}\n{cp.stderr}')
        d=json.loads(path.read_text()); c=d['caesarInjection']
        if d['productionParity']['maxAbsResidual']>1e-3: raise RuntimeError(f'{label} production parity failed')
        return {'target':label,'classification':d['classification'],'normalizedResidualL2':c['normalizedResidualL2'],'maxAbsNormalizedResidual':c['maxAbsNormalizedResidual'],'governingComponent':c['governingComponent'],'normalizedResidual':c['normalizedResidual'],'productionParityMaxAbs':d['productionParity']['maxAbsResidual']}
    finally: path.unlink(missing_ok=True)

if __name__=='__main__': main()
