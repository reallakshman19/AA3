#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function cli(argv) {
  const m = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) throw new TypeError(`Invalid argument near ${String(argv[i])}`);
    m.set(argv[i].slice(2), resolve(argv[i + 1]));
  }
  for (const k of ['baseline-benchmark','candidate-benchmark','baseline-actual','candidate-actual','out','summary']) if (!m.has(k)) throw new TypeError(`Missing --${k}`);
  return Object.fromEntries(m);
}
function json(p) { return JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/u, '')); }
function caseReport(b, id) { const c = b.qualification?.cases?.find((x) => x.caseId === id); if (!c) throw new Error(`Missing ${id}`); return c; }
function sourceRows(rows, sourceId, component = null) { return rows.filter((r) => r.entityKind === 'ELEMENT' && String(r.entityId).startsWith(`INPUT_ELEMENT:${sourceId}|`) && (!component || r.component === component)); }
function targetRow(rows, nodeId, dof) { const hits = rows.filter((r) => r.entityKind === 'NODE' && String(r.entityId) === String(nodeId) && r.quantity === 'FORCE' && r.component === dof); if (hits.length !== 1) throw new Error(`Expected one target ${nodeId}/FORCE:${dof}; found ${hits.length}`); return hits[0]; }
function ledger(actual, caseId) { const l = actual.mechanics?.cases?.[caseId]?.elementLedger; if (!Array.isArray(l)) throw new Error(`Missing ${caseId} ledger`); return l; }
function reducerLedger(actual, caseId) { return ledger(actual, caseId).filter((e) => e.kind === 'REDUCER').sort((a,b)=>Number(a.sourceElementId)-Number(b.sourceElementId)); }
function countFailures(c) { const rows = c.comparison.rows; return { restraint: rows.filter((r)=>r.entityKind==='NODE'&&r.quantity==='FORCE'&&r.status==='FAIL').length, displacementRotation: rows.filter((r)=>r.entityKind==='NODE'&&['DISPLACEMENT','ROTATION'].includes(r.quantity)&&r.status==='FAIL').length, sourceEndAction: rows.filter((r)=>r.entityKind==='ELEMENT'&&String(r.entityId).startsWith('INPUT_ELEMENT:')&&r.status==='FAIL').length }; }

const input = cli(process.argv.slice(2));
const bb = json(input['baseline-benchmark']);
const cb = json(input['candidate-benchmark']);
const ba = json(input['baseline-actual']);
const ca = json(input['candidate-actual']);
const result = { schema:'lfea-m047-i031-reducer-pressure-evidence/v2', issueId:'M047', iterationId:'M047-I031', cases:{} };
for (const caseId of ['L19','L20']) {
  const br = caseReport(bb, caseId), cr = caseReport(cb, caseId);
  const reducersBefore = reducerLedger(ba, caseId), reducersAfter = reducerLedger(ca, caseId);
  if (reducersBefore.length !== reducersAfter.length) throw new Error(`${caseId} reducer ledger count changed.`);
  const reducerPressure = reducersAfter.map((after, i) => {
    const before = reducersBefore[i];
    if (String(before.sourceElementId) !== String(after.sourceElementId)) throw new Error(`${caseId} reducer source ordering changed.`);
    return { sourceElementId:String(after.sourceElementId), beforePressureAxialStrain:Number(before.pressureAxialStrain), afterPressureAxialStrain:Number(after.pressureAxialStrain), beforeFreeTranslationM:before.bourdonFreeEndTranslationM, afterFreeTranslationM:after.bourdonFreeEndTranslationM, initialLoadChanged:JSON.stringify(before.initialStrainLoadGlobal)!==JSON.stringify(after.initialStrainLoadGlobal) };
  });
  const beforeNonReducer = new Map(ledger(ba, caseId).filter((e)=>e.kind!=='REDUCER').map((e)=>[String(e.elementId), Number(e.pressureAxialStrain)]));
  const changedNonReducerPressure = ledger(ca, caseId).filter((e)=>e.kind!=='REDUCER' && beforeNonReducer.get(String(e.elementId)) !== Number(e.pressureAxialStrain)).map((e)=>String(e.elementId));
  const chain = [];
  for (const sourceId of ['13','14','15','16','17']) {
    const before = sourceRows(br.comparison.rows, sourceId, 'FX').filter((r)=>r.quantity.startsWith('GLOBAL_END_FORCE_'));
    const after = sourceRows(cr.comparison.rows, sourceId, 'FX').filter((r)=>r.quantity.startsWith('GLOBAL_END_FORCE_'));
    if (before.length !== after.length) throw new Error(`${caseId} source${sourceId} FX comparison count changed.`);
    chain.push({ sourceElementId:sourceId, rows:before.map((r,i)=>({ quantity:r.quantity, referenceValue:r.referenceValue, beforeValue:r.actualValue, beforeRelativeError:r.relativeError, beforeStatus:r.status, afterValue:after[i].actualValue, afterRelativeError:after[i].relativeError, afterStatus:after[i].status })) });
  }
  const targets = {};
  const targetSpecs = caseId === 'L19'
    ? [['20090','UY','FY'], ['21470','UY','FY']]
    : [['20030','UX','FX']];
  for (const [node,dof,globalComponent] of targetSpecs) {
    const b=targetRow(br.comparison.rows,node,dof), a=targetRow(cr.comparison.rows,node,dof);
    targets[`${node}_${globalComponent}`]={dof,globalComponent,referenceValue:b.referenceValue,beforeValue:b.actualValue,beforeRelativeError:b.relativeError,beforeStatus:b.status,afterValue:a.actualValue,afterRelativeError:a.relativeError,afterStatus:a.status};
  }
  result.cases[caseId] = { aggregate:{before:countFailures(br),after:countFailures(cr)}, reducerPressure, changedNonReducerPressure, chain13to17:chain, targets };
}
writeFileSync(input.out, `${JSON.stringify(result,null,2)}\n`, 'utf8');
const lines=['# M047 I031 reducer Bourdon pressure evidence',''];
for (const caseId of ['L19','L20']) {
  const c=result.cases[caseId]; lines.push(`## ${caseId}`,`- failures restraint: ${c.aggregate.before.restraint} -> ${c.aggregate.after.restraint}; disp/rot: ${c.aggregate.before.displacementRotation} -> ${c.aggregate.after.displacementRotation}; source actions: ${c.aggregate.before.sourceEndAction} -> ${c.aggregate.after.sourceEndAction}`,`- non-reducer pressure-strain ledger changes: ${c.changedNonReducerPressure.length}`);
  for (const r of c.reducerPressure) lines.push(`- reducer source ${r.sourceElementId}: pressure strain ${r.beforePressureAxialStrain} -> ${r.afterPressureAxialStrain}; initial vector changed=${r.initialLoadChanged}`);
  lines.push('- sources13-17 FX:'); for (const s of c.chain13to17) { const maxBefore=Math.max(...s.rows.map((r)=>Number(r.beforeRelativeError)||0)), maxAfter=Math.max(...s.rows.map((r)=>Number(r.afterRelativeError)||0)); lines.push(`  - source ${s.sourceElementId}: max rel ${(100*maxBefore).toFixed(4)}% -> ${(100*maxAfter).toFixed(4)}%`); }
  for (const [k,t] of Object.entries(c.targets)) lines.push(`- target ${k} (${t.dof}): ${(100*Number(t.beforeRelativeError)).toFixed(4)}% (${t.beforeStatus}) -> ${(100*Number(t.afterRelativeError)).toFixed(4)}% (${t.afterStatus})`);
  lines.push('');
}
writeFileSync(input.summary, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify(result));
