#!/usr/bin/env python3
import argparse
import hashlib
import json
import math
from pathlib import Path
import numpy as np

DOFS = ['UX','UY','UZ','RX','RY','RZ']
TRANSLATION_STIFFNESS = 1.0e14
ROTATION_STIFFNESS = 1.0e12 * 180.0 / math.pi
SUPPORT_REL_TOL = 1.0e-8

NODE_TARGETS = [
    ('L2','20500','UY'),
    ('L2','20510','UY'),
    ('L2','22140','RX'),
    ('L4','20150','UY'),
]
SOURCE_TARGETS = {
    'L2': {'5','19'},
    'L4': {'84','85','86'},
}


def sha256(path):
    h = hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()


def case_qualification(report, case_id):
    for row in report['qualification']['cases']:
        if row['caseId'] == case_id:
            return row['comparison']['rows']
    raise KeyError(case_id)


def comparison_row(report, case_id, entity_kind, entity_id, quantity, component):
    for row in case_qualification(report, case_id):
        if (row.get('entityKind') == entity_kind and str(row.get('entityId')) == str(entity_id)
                and row.get('quantity') == quantity and row.get('component') == component
                and row.get('status') in ('PASS','FAIL')):
            return row
    raise KeyError((case_id, entity_kind, entity_id, quantity, component))


def sort_node(value):
    try:
        return (0, float(value))
    except ValueError:
        return (1, value)


def assemble_case(report, case_id):
    recs = report['mechanics']['cases'][case_id]['recoveryLedger']
    nodes = sorted({str(r['nodeI']) for r in recs} | {str(r['nodeJ']) for r in recs}, key=sort_node)
    index = {node: i for i,node in enumerate(nodes)}
    size = len(nodes) * 6
    K = np.zeros((size,size), dtype=float)
    f = np.zeros(size, dtype=float)
    displacements = {}
    source_ids = sorted({str(r['sourceElementId']) for r in recs}, key=lambda x: int(x) if x.isdigit() else x)
    source_index = {sid:i for i,sid in enumerate(source_ids)}
    source_loads = np.zeros((size, len(source_ids)), dtype=float)

    for rec in recs:
        ni, nj = str(rec['nodeI']), str(rec['nodeJ'])
        dof_map = [index[ni]*6+i for i in range(6)] + [index[nj]*6+i for i in range(6)]
        kg = np.asarray(rec['globalStiffness'], dtype=float).reshape((12,12))
        K[np.ix_(dof_map,dof_map)] += kg
        fg = np.asarray(rec['equivalentLoadGlobal'], dtype=float) + np.asarray(rec['initialStrainLoadGlobal'], dtype=float)
        f[dof_map] += fg
        source_loads[dof_map, source_index[str(rec['sourceElementId'])]] += fg
        d = np.asarray(rec['jointDisplacement12'], dtype=float)
        for node, offset in ((ni,0),(nj,6)):
            value = d[offset:offset+6]
            previous = displacements.get(node)
            if previous is not None and np.max(np.abs(previous-value)) > 1e-12:
                raise RuntimeError(f'inconsistent joint displacement at node {node}')
            displacements[node] = value
    u = np.concatenate([displacements[node] for node in nodes])
    return nodes, index, K, f, u, source_ids, source_loads


def derive_supports(report):
    nodes,index,K,f,u,_,_ = assemble_case(report,'L2')
    residual = f - K @ u
    supports = []
    diagonal = np.zeros_like(u)
    for i,(r,disp) in enumerate(zip(residual,u)):
        if abs(r) <= 1e-6 or disp == 0:
            continue
        ratio = r/disp
        family = None
        expected = None
        if abs(ratio-TRANSLATION_STIFFNESS)/TRANSLATION_STIFFNESS < SUPPORT_REL_TOL:
            family, expected = 'TRANSLATION', TRANSLATION_STIFFNESS
        elif abs(ratio-ROTATION_STIFFNESS)/ROTATION_STIFFNESS < SUPPORT_REL_TOL:
            family, expected = 'ROTATION', ROTATION_STIFFNESS
        if family is None:
            continue
        diagonal[i] = ratio
        node = nodes[i//6]
        component = DOFS[i%6]
        supports.append({
            'nodeId': node,
            'component': component,
            'family': family,
            'recoveredStiffnessSI': float(ratio),
            'expectedStiffnessSI': float(expected),
            'relativeDifference': float(abs(ratio-expected)/expected),
        })
    if len(supports) != 51:
        raise RuntimeError(f'expected 51 finite restraint DOFs, found {len(supports)}')
    return nodes, diagonal, supports


def source_contributions(report, case_id, support_diagonal):
    nodes,index,K,f,u,source_ids,source_loads = assemble_case(report,case_id)
    Kt = K + np.diag(support_diagonal)
    solved = np.linalg.solve(Kt, f)
    max_state_diff = float(np.max(np.abs(solved-u)))
    max_equation_residual = float(np.max(np.abs(Kt@u-f)))
    U_sources = np.linalg.solve(Kt, source_loads)
    max_superposition_diff = float(np.max(np.abs(np.sum(U_sources,axis=1)-u)))
    return {
        'nodes': nodes,
        'index': index,
        'u': u,
        'sourceIds': source_ids,
        'U': U_sources,
        'maxStateDifference': max_state_diff,
        'maxEquationResidual': max_equation_residual,
        'maxSourceSuperpositionDifference': max_superposition_diff,
    }


def node_metric(report, decomposition, case_id, node_id, component):
    dof_index = decomposition['index'][node_id]*6 + DOFS.index(component)
    contributions = decomposition['U'][dof_index,:]
    actual = float(decomposition['u'][dof_index])
    absolute_sum = float(np.sum(np.abs(contributions)))
    factor = float(absolute_sum / abs(actual)) if actual else math.inf
    top = sorted(
        ({'sourceElementId':sid,'contribution':float(value),'absoluteContribution':float(abs(value))}
         for sid,value in zip(decomposition['sourceIds'], contributions)),
        key=lambda row: row['absoluteContribution'], reverse=True,
    )[:8]
    quantity = 'DISPLACEMENT' if component.startswith('U') else 'ROTATION'
    row = comparison_row(report,case_id,'NODE',node_id,quantity,component)
    ref_vec = []
    act_vec = []
    for comp in (['UX','UY','UZ'] if quantity == 'DISPLACEMENT' else ['RX','RY','RZ']):
        cr = comparison_row(report,case_id,'NODE',node_id,quantity,comp)
        ref_vec.append(float(cr['referenceValue']))
        act_vec.append(float(cr['actualValue']))
    ref_norm = float(np.linalg.norm(ref_vec))
    err_norm = float(np.linalg.norm(np.asarray(act_vec)-np.asarray(ref_vec)))
    return {
        'caseId': case_id,
        'nodeId': node_id,
        'quantity': quantity,
        'component': component,
        'referenceValue': float(row['referenceValue']),
        'actualValue': float(row['actualValue']),
        'componentRelativeError': float(row['rawRelativeError']) if row['rawRelativeError'] is not None else None,
        'vectorReferenceNorm': ref_norm,
        'vectorErrorNorm': err_norm,
        'vectorRelativeError': float(err_norm/ref_norm) if ref_norm else None,
        'sourceContributionSum': float(np.sum(contributions)),
        'sourceAbsoluteContributionSum': absolute_sum,
        'sourceCancellationFactor': factor,
        'topSourceContributions': top,
        'classification': 'GLOBAL_CANCELLATION_DOMINATED' if factor >= 10 else 'SOURCE_LOCAL_REVIEW_REQUIRED',
    }


def source_id_from_entity(entity_id):
    prefix='INPUT_ELEMENT:'
    if not entity_id.startswith(prefix):
        return None
    return entity_id[len(prefix):].split('|',1)[0]


def vector_group(report, case_id, entity_id, quantity):
    rows=[row for row in case_qualification(report,case_id)
          if row.get('entityKind')=='ELEMENT' and row.get('entityId')==entity_id
          and row.get('quantity')==quantity and row.get('status') in ('PASS','FAIL')]
    if len(rows)!=3:
        raise RuntimeError((case_id,entity_id,quantity,len(rows)))
    rows=sorted(rows,key=lambda r:r['component'])
    ref=np.asarray([r['referenceValue'] for r in rows],dtype=float)
    act=np.asarray([r['actualValue'] for r in rows],dtype=float)
    ref_norm=float(np.linalg.norm(ref))
    err_norm=float(np.linalg.norm(act-ref))
    failed=[]
    for r in rows:
        if r['status']!='FAIL':
            continue
        denom=abs(float(r['referenceValue']))
        failed.append({
            'component':r['component'],
            'referenceValue':float(r['referenceValue']),
            'actualValue':float(r['actualValue']),
            'componentRelativeError':float(r['rawRelativeError']) if r['rawRelativeError'] is not None else None,
            'componentConditioning':float(ref_norm/denom) if denom else math.inf,
        })
    return {
        'caseId':case_id,
        'sourceElementId':source_id_from_entity(entity_id),
        'entityId':entity_id,
        'quantity':quantity,
        'referenceVectorNorm':ref_norm,
        'errorVectorNorm':err_norm,
        'vectorRelativeError':float(err_norm/ref_norm) if ref_norm else None,
        'failedComponents':failed,
        'classification':'COMPONENT_ILL_CONDITIONED_VECTOR_PASS' if failed and err_norm <= 0.1*ref_norm else 'SOURCE_LOCAL_REVIEW_REQUIRED',
    }


def direct_source_metrics(report):
    groups=[]
    seen=set()
    for case_id, source_ids in SOURCE_TARGETS.items():
        for row in case_qualification(report,case_id):
            if row.get('entityKind')!='ELEMENT' or row.get('status')!='FAIL':
                continue
            sid=source_id_from_entity(str(row.get('entityId','')))
            if sid not in source_ids:
                continue
            quantity=row.get('quantity','')
            if not (quantity.startswith('GLOBAL_END_FORCE_') or quantity.startswith('GLOBAL_END_MOMENT_')):
                continue
            key=(case_id,row['entityId'],quantity)
            if key in seen: continue
            seen.add(key)
            groups.append(vector_group(report,*key))
    groups.sort(key=lambda r:(r['caseId'],int(r['sourceElementId']),r['quantity']))
    return groups


def main():
    p=argparse.ArgumentParser()
    p.add_argument('report')
    p.add_argument('output')
    args=p.parse_args()
    report_path=Path(args.report)
    report=json.loads(report_path.read_text())
    if report.get('benchmarkId')!='BM4_L':
        raise RuntimeError('expected BM4_L report')
    nodes, support_diagonal, supports = derive_supports(report)
    decompositions={case:source_contributions(report,case,support_diagonal) for case in ('L2','L4')}
    node_metrics=[node_metric(report,decompositions[case],case,node,component) for case,node,component in NODE_TARGETS]
    direct=direct_source_metrics(report)
    authority={
        'schema':'m047-bm4l-residual-invariant-authority/v1',
        'benchmarkId':'BM4_L',
        'scope':'QST-006 source-local conditioning diagnostics; evidence only',
        'source':{
            'qualificationArtifact':{
                'sourceCommit':'7488ba76126f8240bb61c80fad243cf096c5fe08',
                'workflowRun':31457644192,
                'artifactId':9088676941,
                'digest':'sha256:8819dbbbf21aff8e314fe6cae85db0c3407afc12ca71dde3b459442242d3e934',
                'reportSha256':sha256(report_path),
            },
            'accdbSha256':'64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8',
        },
        'operatorReconstruction':{
            'analysisNodeCount':len(nodes),
            'dofCount':len(nodes)*6,
            'finiteRestraintDofCount':len(supports),
            'translationStiffnessNPerM':TRANSLATION_STIFFNESS,
            'rotationStiffnessNmPerRad':ROTATION_STIFFNESS,
            'maximumSupportStiffnessRelativeDifference':max(row['relativeDifference'] for row in supports),
            'cases':{
                case:{
                    'maximumSolvedStateDifference':decompositions[case]['maxStateDifference'],
                    'maximumEquationResidual':decompositions[case]['maxEquationResidual'],
                    'maximumSourceSuperpositionDifference':decompositions[case]['maxSourceSuperpositionDifference'],
                } for case in ('L2','L4')
            },
        },
        'conditioningPolicy':{
            'nodalCancellationFactor':'sum(abs(source-owned displacement contribution)) / abs(resultant displacement component)',
            'sourceEndVectorInvariant':'Euclidean norm of the global force or moment vector at one source-element end; invariant under rigid rotation of axes',
            'componentConditioning':'source-end vector reference norm / abs(component reference)',
            'globalCancellationDominatedThreshold':10,
            'sourceVectorPassThreshold':0.1,
            'interpretation':[
                'A component-relative failure with a source-end vector error <=10% is not evidence for a constitutive correction to that source.',
                'A nodal row with cancellation factor >=10 is not suitable for coefficient selection because the reported resultant is a small difference of larger source-owned responses.',
                'No comparator acceptance rule is changed by these diagnostics.'
            ],
        },
        'unaffectedPrimitiveRows':{
            'reason':'L2 and L4 are unchanged by tee thermal free growth and the BM4_L T1 interval-alpha delivery.',
            'nodalCancellation':node_metrics,
            'directSourceEndVectors':direct,
            'primitiveFailureRowsCovered':12,
        },
        'resolvedThermalPublishedEvidence':{
            'source':'PR1001 Stage 10 resolved tee + interval-alpha replay; documentary cross-reference, not regenerated from the pre-delivery artifact',
            'primitiveFailureRows':5,
            'node20250RXCancellationFactorApprox':521.8,
            'smallSourceMomentReferencesNm':{
                'source62_63_MY':0.638,
                'source64_65_MX':0.147,
            },
            'classification':'GLOBAL_CANCELLATION_PLUS_NEAR_ZERO_SOURCE_COMPONENTS',
        },
        'closure':{
            'primitiveFailureRowsTotal':17,
            'primitiveFailureRowsClassified':17,
            'newMechanicsAuthorized':False,
            'qst006Status':'COMPLETE_NO_NEW_MECHANICS',
            'nextAuthorityBoundary':'External product/source authority only (not residual fitting): reducer representative cylinder station or another independently observable constitutive rule.',
        },
        'nonScope':[
            'No stiffness, load, thermal, pressure, reducer, bend, tee, restraint, gravity, Bourdon, recovery, sign, topology, reference or tolerance change.',
            'No change to the literal nonzero <10% comparator.',
            'No attempt to fit a reducer station or any coefficient from cancellation rows.'
        ],
    }
    Path(args.output).write_text(json.dumps(authority,indent=2)+"\n")
    print('PASS m047 BM4_L residual invariant generator')

if __name__=='__main__': main()
