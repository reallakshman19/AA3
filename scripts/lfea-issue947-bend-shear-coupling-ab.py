#!/usr/bin/env python3
"""Diagnostic A/B for how bend k interacts with straight-frame shear deformation."""
from __future__ import annotations
import argparse, json, subprocess, tempfile
from pathlib import Path

SOURCE = Path('src/core/linear-fea-piping-components/component-elements.js')
BASE_BLOCK = """  const matrices = correctedStiffness(frameElement, {
    secondMomentY: frameElement.section.secondMomentY / value,
    secondMomentZ: frameElement.section.secondMomentZ / value,
  });"""
EB_BLOCK = """  const matrices = correctedStiffness(frameElement, {
    secondMomentY: frameElement.section.secondMomentY / value,
    secondMomentZ: frameElement.section.secondMomentZ / value,
    shearDeformation: false,
  });"""
FULL_BLOCK = """  const matrices = correctedStiffness(frameElement, {
    secondMomentY: frameElement.section.secondMomentY / value,
    secondMomentZ: frameElement.section.secondMomentZ / value,
    shearCorrectionFactorY: frameElement.shearCorrection === null
      ? undefined
      : frameElement.shearCorrection.y.value / value,
    shearCorrectionFactorZ: frameElement.shearCorrection === null
      ? undefined
      : frameElement.shearCorrection.z.value / value,
  });"""
TARGETS = (
    ('E19_E20', ('--source-elements', '19,20')),
    ('E25', ('--source-element', '25')),
    ('E36', ('--source-element', '36')),
    ('E48', ('--source-element', '48')),
    ('E85', ('--source-element', '85')),
)


def main():
    p=argparse.ArgumentParser(); p.add_argument('--package',required=True); p.add_argument('--out',required=True); a=p.parse_args()
    original=SOURCE.read_text()
    if original.count(BASE_BLOCK)!=1: raise SystemExit(f'Expected one baseline flexibility block, found {original.count(BASE_BLOCK)}')
    variants={
        'CURRENT_EI_OVER_K_SHEAR_UNCHANGED': BASE_BLOCK,
        'BEND_ARC_EULER_BERNOULLI': EB_BLOCK,
        'BEND_TOTAL_FLEXURAL_COMPLIANCE_TIMES_K': FULL_BLOCK,
    }
    results={}
    try:
        for name, block in variants.items():
            SOURCE.write_text(original.replace(BASE_BLOCK,block))
            subprocess.run(['node','--check',str(SOURCE)],check=True,capture_output=True,text=True)
            records=[]
            for label,selector in TARGETS:
                records.append(run_target(a.package,label,selector))
            results[name]=records
    finally:
        SOURCE.write_text(original)
    by_target={}
    for label,_ in TARGETS:
        rows={name:next(r for r in records if r['target']==label) for name,records in results.items()}
        best=min(rows.items(),key=lambda kv:kv[1]['normalizedResidualL2'])
        by_target[label]={
            'variants':rows,
            'bestVariantByL2':best[0],
            'bestL2':best[1]['normalizedResidualL2'],
            'bestMaxAbsNormalizedResidual':best[1]['maxAbsNormalizedResidual'],
        }
    aggregate={name:{
        'sumL2Squared':sum(r['normalizedResidualL2']**2 for r in records),
        'worstMaxAbsNormalizedResidual':max(r['maxAbsNormalizedResidual'] for r in records),
        'passCount':sum(r['maxAbsNormalizedResidual']<=0.1 for r in records),
    } for name,records in results.items()}
    best_aggregate=min(aggregate,key=lambda name:aggregate[name]['sumL2Squared'])
    out={
        'schema':'lfea-issue947-bend-shear-coupling-ab/v1',
        'issue':947,'caseId':'L19',
        'sourceAccdbSha256':'85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21',
        'scope':'DIAGNOSTIC_ONLY_NO_PRODUCTION_UPDATE_NO_REFERENCE_MUTATION',
        'governingAlternatives':{
            'CURRENT_EI_OVER_K_SHEAR_UNCHANGED':'I_eff=I/k; kappaGA unchanged',
            'BEND_ARC_EULER_BERNOULLI':'I_eff=I/k; transverse shear compliance set to zero on bend arcs',
            'BEND_TOTAL_FLEXURAL_COMPLIANCE_TIMES_K':'I_eff=I/k; (kappaGA)_eff=kappaGA/k so bending and shear compliance are both multiplied by k',
        },
        'targets':by_target,'aggregate':aggregate,'bestAggregateVariant':best_aggregate,
        'classification':classify(by_target,aggregate,best_aggregate),
        'falsificationRule':'A shear/k interaction hypothesis is only worth an authority search if it improves the full 12-component CAESAR-injection vector across independent bend targets while every target retains production-parity and custody gates. Local improvement alone cannot promote a mechanic.',
    }
    Path(a.out).parent.mkdir(parents=True,exist_ok=True); Path(a.out).write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps({'classification':out['classification'],'aggregate':aggregate,'bestByTarget':{k:v['bestVariantByL2'] for k,v in by_target.items()}},indent=2))


def run_target(package,label,selector):
    with tempfile.NamedTemporaryFile(suffix='.json',delete=False) as h: path=Path(h.name)
    try:
        cp=subprocess.run(['node','scripts/lfea-issue947-bend-descendant-condensation-audit.mjs','--package',package,selector[0],selector[1],'--out',str(path)],capture_output=True,text=True)
        if cp.returncode: raise RuntimeError(f'{label} failed\n{cp.stdout}\n{cp.stderr}')
        d=json.loads(path.read_text()); c=d['caesarInjection']
        if d['productionParity']['maxAbsResidual']>1e-3: raise RuntimeError(f'{label} parity failed')
        return {'target':label,'classification':d['classification'],'normalizedResidualL2':c['normalizedResidualL2'],'maxAbsNormalizedResidual':c['maxAbsNormalizedResidual'],'governingComponent':c['governingComponent'],'normalizedResidual':c['normalizedResidual'],'productionParityMaxAbs':d['productionParity']['maxAbsResidual']}
    finally: path.unlink(missing_ok=True)


def classify(by_target,aggregate,best):
    current='CURRENT_EI_OVER_K_SHEAR_UNCHANGED'
    if best==current: return 'BEND_SHEAR_ALTERNATIVES_FALSIFIED_AGAINST_CURRENT_FORMULATION'
    wins=sum(v['bestVariantByL2']==best for v in by_target.values())
    if wins>=4 and aggregate[best]['sumL2Squared']<0.8*aggregate[current]['sumL2Squared']:
        return f'{best}_HIGH_SIGNAL_DIAGNOSTIC_REQUIRES_INDEPENDENT_AUTHORITY'
    return 'BEND_SHEAR_INTERACTION_MIXED_NO_COMMON_MECHANIC_ACCEPTED'

if __name__=='__main__': main()
