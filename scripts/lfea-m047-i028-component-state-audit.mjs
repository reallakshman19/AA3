#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const LOCKED_SHA = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21';
const TYPE_NAMES = Object.freeze({
  1: 'REINFORCED_FABRICATED_TEE', 2: 'FABRICATED_TEE', 3: 'WELDING_TEE',
  4: 'SWEEPOLET', 5: 'WELDOLET', 6: 'EXTRUDED_OUTLET', 7: 'BUTT_WELD',
  8: 'SOCKET_WELD', 9: 'SOCKET_WELD_UNFINISHED', 10: 'TAPERED_TRANSITION',
  11: 'THREADED_JOINT', 12: 'DOUBLE_WELDED_SLIP_ON', 13: 'LAP_JOINT_FLANGE',
});

function cli(argv) {
  const m = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) throw new TypeError(`Invalid argument near ${String(argv[i])}`);
    m.set(argv[i].slice(2), resolve(argv[i + 1]));
  }
  for (const k of ['raw','baseline-benchmark','solver','out','summary']) if (!m.has(k)) throw new TypeError(`Missing --${k}`);
  return Object.fromEntries(m);
}
function json(path) { return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/u, '')); }
function table(raw, name) {
  const t = raw.tables?.[name];
  if (!t || !Array.isArray(t.rows)) throw new TypeError(`Missing table ${name}`);
  return t.rows;
}
function n(v) { const x = Number(v); return Number.isFinite(x) ? x : null; }
function s(v) { return String(v ?? '').trim(); }
function active(v) { const x = n(v); return x !== null && x > 0; }
function norm(v) { return Math.hypot(...v); }
function angleDeg(a,b) {
  const na=norm(a), nb=norm(b); if (!(na>0&&nb>0)) return null;
  const d=a.reduce((q,x,i)=>q+x*b[i],0)/(na*nb);
  return Math.acos(Math.max(-1,Math.min(1,d)))*180/Math.PI;
}
function sha256(text) { return createHash('sha256').update(text,'utf8').digest('hex'); }
function keyElement(row) { return `${s(row.FROM_NODE)}->${s(row.TO_NODE)}|${s(row.ELEMENT_NAME)}`; }
function maxAbs(values) { return values.length ? Math.max(...values.map((x)=>Math.abs(x))) : 0; }

function caseRows(rows, id) { return rows.filter((r)=>n(r.LCASE_NUM)===id); }
function compareCases(rows, aCase, bCase, identity, fields) {
  const a = new Map(caseRows(rows,aCase).map((r)=>[identity(r),r]));
  const b = new Map(caseRows(rows,bCase).map((r)=>[identity(r),r]));
  const keys=[...new Set([...a.keys(),...b.keys()])].sort();
  const diffs=[];
  for (const k of keys) {
    const ar=a.get(k), br=b.get(k);
    if (!ar || !br) { diffs.push({identity:k,field:'ROW_PRESENCE',a:!!ar,b:!!br,absDifference:null}); continue; }
    for (const f of fields) {
      const av=n(ar[f]), bv=n(br[f]); if (av===null || bv===null) continue;
      const d=bv-av; if (Math.abs(d)>1e-12) diffs.push({identity:k,field:f,a:av,b:bv,absDifference:Math.abs(d)});
    }
  }
  return {
    aCase,bCase,rowCountA:a.size,rowCountB:b.size,changedComponentCount:diffs.length,
    maximumAbsoluteDifference:maxAbs(diffs.map((x)=>x.absDifference??0)),
    largest:diffs.filter((x)=>x.absDifference!==null).sort((x,y)=>y.absDifference-x.absDifference).slice(0,20),
  };
}

const input=cli(process.argv.slice(2));
const rawText=readFileSync(input.raw,'utf8').replace(/^\uFEFF/u,'');
const raw=JSON.parse(rawText);
if (raw?.source?.sha256!==LOCKED_SHA) throw new Error(`ACCDB custody mismatch: ${String(raw?.source?.sha256)}`);
const basic=table(raw,'INPUT_BASIC_ELEMENT_DATA');
const bends=table(raw,'INPUT_BENDS');
const siftees=table(raw,'INPUT_SIFTEES');
const outD=table(raw,'OUTPUT_DISPLACEMENTS');
const outF=table(raw,'OUTPUT_GLOBAL_ELEMENT_FORCES');
const outR=table(raw,'OUTPUT_RESTRAINTS_SUMMARY');
const benchmark=json(input['baseline-benchmark']);
const solverText=readFileSync(input.solver,'utf8');

const byPtr=new Map();
for (const row of siftees) {
  const p=n(row.SIF_PTR); if (!Number.isInteger(p)) continue;
  if (!byPtr.has(p)) byPtr.set(p,[]); byPtr.get(p).push(row);
}
const intSources=basic.filter((r)=>active(r.INT_PTR)).map((r)=>{
  const ptr=n(r.INT_PTR); const declarations=(byPtr.get(ptr)??[]).map((d)=>{
    const type=n(d.TYPE); const node=s(d.NODE);
    const incident=basic.filter((e)=>s(e.FROM_NODE)===node||s(e.TO_NODE)===node).length;
    return {
      sifPtr:n(d.SIF_PTR), sifNum:n(d.SIF_NUM), node, branchNode:s(d.BRANCHNODE), type,
      typeName:TYPE_NAMES[type]??`TYPE_${type}`, category:type>=1&&type<=6?'TEE':type>=7&&type<=13?'JOINT':'OTHER',
      incidentElementCount:incident,
      b31jFlexibilityCandidate:type>=1&&type<=6,
      currentSolverType3ThreeLegCoverage:type===3&&incident===3,
      declaredFields:Object.fromEntries(Object.entries(d).filter(([k])=>!['JOBNAME','ISSUE_NO','UPDATE_TIME'].includes(k))),
    };
  });
  return {sourceElementId:s(r.ELEMENTID),fromNode:s(r.FROM_NODE),toNode:s(r.TO_NODE),intPtr:ptr,declarations};
});
const declarations=intSources.flatMap((x)=>x.declarations.map((d)=>({...d,sourceElementId:x.sourceElementId})));

const bendRows=new Map(bends.map((r)=>[n(r.BEND_PTR),r]));
const bendInventory=[];
for (const row of basic.filter((r)=>active(r.BEND_PTR))) {
  const outgoing=basic.filter((e)=>s(e.FROM_NODE)===s(row.TO_NODE));
  const vin=[n(row.DELTA_X),n(row.DELTA_Y),n(row.DELTA_Z)];
  const vout=outgoing.length===1?[n(outgoing[0].DELTA_X),n(outgoing[0].DELTA_Y),n(outgoing[0].DELTA_Z)]:null;
  bendInventory.push({
    sourceElementId:s(row.ELEMENTID), bendPtr:n(row.BEND_PTR), fromNode:s(row.FROM_NODE), intersectionNode:s(row.TO_NODE),
    outgoingSourceElementId:outgoing.length===1?s(outgoing[0].ELEMENTID):null,
    bendAngleDegrees:vout?angleDeg(vin,vout):null, radiusMm:n(bendRows.get(n(row.BEND_PTR))?.RADIUS),
    declaration:bendRows.get(n(row.BEND_PTR))??null,
  });
}
const allBends90=bendInventory.length===12&&bendInventory.every((b)=>Math.abs((b.bendAngleDegrees??0)-90)<1e-9);

const sameFormula={
  sustained:{
    displacement:compareCases(outD,17,19,(r)=>s(r.NODE),['DX','DY','DZ','RX','RY','RZ']),
    restraint:compareCases(outR,17,19,(r)=>s(r.NODE),['FX','FY','FZ','MX','MY','MZ']),
    elementAction:compareCases(outF,17,19,keyElement,['FXF','FYF','FZF','MXF','MYF','MZF','FXT','FYT','FZT','MXT','MYT','MZT']),
  },
  operating:{
    displacement:compareCases(outD,2,20,(r)=>s(r.NODE),['DX','DY','DZ','RX','RY','RZ']),
    restraint:compareCases(outR,2,20,(r)=>s(r.NODE),['FX','FY','FZ','MX','MY','MZ']),
    elementAction:compareCases(outF,2,20,keyElement,['FXF','FYF','FZF','MXF','MYF','MZF','FXT','FYT','FZT','MXT','MYT','MZT']),
  },
};

const stiffness=1e13;
const restraintBound={};
for (const caseId of [19,20]) {
  const rows=caseRows(outR,caseId);
  const maxForce=maxAbs(rows.flatMap((r)=>[n(r.FX)||0,n(r.FY)||0,n(r.FZ)||0]));
  const maxMoment=maxAbs(rows.flatMap((r)=>[n(r.MX)||0,n(r.MY)||0,n(r.MZ)||0]));
  restraintBound[`L${caseId}`]={maxAbsForceN:maxForce,maxAbsMomentNm:maxMoment,maxTranslationComplianceM:maxForce/stiffness,maxRotationComplianceRad:maxMoment/stiffness};
}

const qcase=benchmark.qualification?.cases?.find((c)=>c.caseId==='L19');
const comparisonRows=qcase?.comparison?.rows??[];
const sourceFails=comparisonRows.filter((r)=>r.status==='FAIL'&&s(r.entityId).startsWith('INPUT_ELEMENT:')).map((r)=>{
  const m=/^INPUT_ELEMENT:(\d+)\|/u.exec(s(r.entityId)); const sourceId=m?m[1]:null;
  const src=basic.find((e)=>s(e.ELEMENTID)===sourceId);
  const isBend=src?active(src.BEND_PTR):false;
  const intPtr=src&&active(src.INT_PTR)?n(src.INT_PTR):null;
  const nodes=src?[s(src.FROM_NODE),s(src.TO_NODE)]:[];
  const adjacentBendSources=basic.filter((b)=>active(b.BEND_PTR)&&[s(b.FROM_NODE),s(b.TO_NODE)].some((node)=>nodes.includes(node))).map((b)=>s(b.ELEMENTID));
  return {sourceElementId:sourceId,identity:r.identity,quantity:r.quantity,component:r.component,relativeError:r.relativeError,referenceValue:r.referenceValue,actualValue:r.actualValue,intPtr,isBend,adjacentBendSources};
});

const solverObservations={
  explicitSmooth90False:/smooth90FlexibilityCorrection:\s*false/u.test(solverText),
  type3OnlyTeeDiscovery:/Number\(row\.TYPE\)\s*===\s*CAESAR_WELDING_TEE_TYPE/u.test(solverText),
  hotModulusSelectedForThermal:/caseMode\.thermal\s*\?\s*row\.HOT_MOD1\s*:\s*row\.MODULUS/u.test(solverText),
};

const audit={
  schema:'lfea-m047-i028-component-state-audit/v1',issueId:'M047',iterationId:'M047-I028',
  sourceAccdbSha256:raw.source.sha256,rawExportSha256:sha256(rawText),sourceElementCount:basic.length,
  intersections:{activeIntPtrSourceCount:intSources.length,sifteeRowCount:siftees.length,intSources,declarations,
    typeCounts:Object.fromEntries([...new Set(declarations.map((d)=>d.type))].sort((a,b)=>a-b).map((t)=>[String(t),declarations.filter((d)=>d.type===t).length])),
    flexibilityCandidateCount:declarations.filter((d)=>d.b31jFlexibilityCandidate).length,
    currentSolverCoveredDeclarationCount:declarations.filter((d)=>d.currentSolverType3ThreeLegCoverage).length,
    unmodeledTeeFlexibilityCandidates:declarations.filter((d)=>d.b31jFlexibilityCandidate&&!d.currentSolverType3ThreeLegCoverage),
  },
  bends:{count:bendInventory.length,allExactly90Degrees:allBends90,inventory:bendInventory,
    currentSolverSmooth90CorrectionFalse:solverObservations.explicitSmooth90False},
  loadCaseState:{sameFormulaComparisons:sameFormula,formulaTextIsCompleteState:false},
  restraintDefaultStiffness:{value:stiffness,units:'N/m translational and N*m/rad rotational',bounds:restraintBound},
  l19SourceEndActionFailures:{count:sourceFails.length,rows:sourceFails,
    uniqueSources:[...new Set(sourceFails.map((r)=>r.sourceElementId))].sort((a,b)=>Number(a)-Number(b)),
    failuresOnActiveIntPtr:sourceFails.filter((r)=>r.intPtr!==null).length,
    failuresAdjacentToBend:sourceFails.filter((r)=>r.adjacentBendSources.length>0).length},
  solverObservations,
  conclusions:[],
};
if (audit.intersections.unmodeledTeeFlexibilityCandidates.length) audit.conclusions.push('UNMODELED_B31J_TEE_FLEXIBILITY_DECLARATION_PRESENT');
else audit.conclusions.push('NO_UNMODELED_B31J_TEE_FLEXIBILITY_DECLARATION_FOUND_BY_TYPE_TOPOLOGY_AUDIT');
if (allBends90&&solverObservations.explicitSmooth90False) audit.conclusions.push('ALL_BENDS_90_AND_CURRENT_SOLVER_EXPLICITLY_USES_GENERAL_1P65_OVER_H_BASIS_SMOOTH90_AUTHORITY_REQUIRED');
if (sameFormula.sustained.restraint.changedComponentCount||sameFormula.operating.restraint.changedComponentCount) audit.conclusions.push('CASE_FORMULA_TEXT_PROVEN_INSUFFICIENT_TO_IDENTIFY_CAESAR_SOLVED_STATE');
if (Math.max(restraintBound.L19.maxTranslationComplianceM,restraintBound.L20.maxTranslationComplianceM)<1e-7) audit.conclusions.push('DEFAULT_1E13_RESTRAINT_STIFFNESS_VS_FIXED_DOF_TRANSLATION_EFFECT_BOUNDED_NEGLIGIBLE_AT_REACTION_SCALE');
if (solverObservations.hotModulusSelectedForThermal) audit.conclusions.push('THERMAL_CASE_HOT_MODULUS_SELECTOR_SEMANTIC_DEFECT_RETAIN_I016_NUMERIC_NEUTRALITY');

writeFileSync(input.out,`${JSON.stringify(audit,null,2)}\n`,'utf8');
const lines=[
  '# M047 I028 atomic component/load-case state audit','',
  `- ACCDB: \`${audit.sourceAccdbSha256}\``,
  `- active INT_PTR sources: ${intSources.length}; INPUT_SIFTEES rows: ${siftees.length}`,
  `- SIF/tee type counts: ${Object.entries(audit.intersections.typeCounts).map(([k,v])=>`${k}:${v}`).join(', ')||'none'}`,
  `- B31J tee flexibility candidates: ${audit.intersections.flexibilityCandidateCount}; current TYPE=3 three-leg coverage: ${audit.intersections.currentSolverCoveredDeclarationCount}; unmodeled tee candidates: ${audit.intersections.unmodeledTeeFlexibilityCandidates.length}`,
  `- bends: ${bendInventory.length}; all 90 deg: ${allBends90}; current solver smooth90=false: ${solverObservations.explicitSmooth90False}`,
  `- L17 vs L19 changed components: displacement ${sameFormula.sustained.displacement.changedComponentCount}, restraint ${sameFormula.sustained.restraint.changedComponentCount}, element action ${sameFormula.sustained.elementAction.changedComponentCount}`,
  `- L2 vs L20 changed components: displacement ${sameFormula.operating.displacement.changedComponentCount}, restraint ${sameFormula.operating.restraint.changedComponentCount}, element action ${sameFormula.operating.elementAction.changedComponentCount}`,
  `- finite 1e13 stiffness displacement bound: L19 ${restraintBound.L19.maxTranslationComplianceM} m; L20 ${restraintBound.L20.maxTranslationComplianceM} m`,
  `- baseline L19 source-end-action failing rows: ${sourceFails.length}; on INT_PTR sources: ${audit.l19SourceEndActionFailures.failuresOnActiveIntPtr}; adjacent to bend source: ${audit.l19SourceEndActionFailures.failuresAdjacentToBend}`,
  '', '## Conclusions', ...audit.conclusions.map((x)=>`- ${x}`), '',
];
writeFileSync(input.summary,`${lines.join('\n')}\n`,'utf8');
console.log(JSON.stringify({conclusions:audit.conclusions,unmodeledTeeCandidates:audit.intersections.unmodeledTeeFlexibilityCandidates.length,allBends90}));
