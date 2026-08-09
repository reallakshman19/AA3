#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parse(argv) {
  const m = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i]?.startsWith('--') || argv[i + 1] === undefined) throw new TypeError(`Invalid argument near ${String(argv[i])}`);
    m.set(argv[i].slice(2), resolve(argv[i + 1]));
  }
  for (const key of ['baseline-benchmark','candidate-benchmark','baseline-actual','candidate-actual','out','summary']) {
    if (!m.has(key)) throw new TypeError(`Missing --${key}`);
  }
  return Object.fromEntries(m);
}
function json(path) { return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/u, '')); }
function caseReport(report, caseId) {
  const value = report.qualification?.cases?.find((entry) => entry.caseId === caseId);
  if (!value?.comparison?.rows) throw new Error(`Missing ${caseId} comparison rows.`);
  return value;
}
function physical(rows) { return rows.filter((r) => Number.isFinite(r.referenceValue) && Number.isFinite(r.actualValue)); }
function countFailures(rows) {
  const p = physical(rows);
  return {
    restraint: p.filter((r) => r.entityKind === 'NODE' && ['FORCE','MOMENT'].includes(r.quantity) && r.status === 'FAIL').length,
    displacementRotation: p.filter((r) => r.entityKind === 'NODE' && ['DISPLACEMENT','ROTATION'].includes(r.quantity) && r.status === 'FAIL').length,
    sourceEndAction: p.filter((r) => r.entityKind === 'ELEMENT' && String(r.entityId).startsWith('INPUT_ELEMENT:') && r.status === 'FAIL').length,
  };
}
function nodeRow(rows, nodeId, quantity, component) {
  const hits = physical(rows).filter((r) => r.entityKind === 'NODE' && String(r.entityId) === String(nodeId) && r.quantity === quantity && r.component === component);
  if (hits.length !== 1) throw new Error(`Expected one node row ${nodeId}/${quantity}:${component}; found ${hits.length}.`);
  return hits[0];
}
function sourceRow(rows, sourceId, quantity, component) {
  const hits = physical(rows).filter((r) => r.entityKind === 'ELEMENT' && String(r.entityId).startsWith(`INPUT_ELEMENT:${sourceId}|`) && r.quantity === quantity && r.component === component);
  if (hits.length !== 1) throw new Error(`Expected one source row ${sourceId}/${quantity}:${component}; found ${hits.length}.`);
  return hits[0];
}
function witness(row) {
  return {
    referenceValue: row.referenceValue,
    actualValue: row.actualValue,
    relativeError: row.relativeError,
    percentError: row.relativeError === null ? null : 100 * Number(row.relativeError),
    status: row.status,
    unit: row.unit,
  };
}
function compareRow(before, after) {
  if (before.referenceValue !== after.referenceValue || before.unit !== after.unit) throw new Error('Reference custody changed for tracked row.');
  return { before: witness(before), after: witness(after), actualDelta: after.actualValue - before.actualValue, relativeErrorDelta: Number(after.relativeError ?? 0) - Number(before.relativeError ?? 0) };
}
function failures(rows, family) {
  const p = physical(rows);
  let selected;
  if (family === 'restraint') selected = p.filter((r) => r.entityKind === 'NODE' && ['FORCE','MOMENT'].includes(r.quantity));
  else if (family === 'sourceEndAction') selected = p.filter((r) => r.entityKind === 'ELEMENT' && String(r.entityId).startsWith('INPUT_ELEMENT:'));
  else throw new Error(`Unknown failure family ${family}`);
  return selected.filter((r) => r.status === 'FAIL').map((r) => ({ entityId:r.entityId, quantity:r.quantity, component:r.component, referenceValue:r.referenceValue, actualValue:r.actualValue, relativeError:r.relativeError, percentError:100*Number(r.relativeError ?? 0), unit:r.unit }));
}
function reducerLedger(actual, caseId) {
  const ledger = actual.mechanics?.cases?.[caseId]?.elementLedger;
  if (!Array.isArray(ledger)) throw new Error(`Missing ${caseId} element ledger.`);
  return ledger.filter((e) => e.kind === 'REDUCER').sort((a,b) => Number(a.sourceElementId)-Number(b.sourceElementId));
}
function reducerCustody(baseActual, candActual, caseId) {
  const b = reducerLedger(baseActual, caseId), c = reducerLedger(candActual, caseId);
  if (b.length !== c.length) throw new Error(`${caseId} reducer count changed.`);
  return c.map((after, index) => {
    const before = b[index];
    if (String(before.sourceElementId) !== String(after.sourceElementId)) throw new Error(`${caseId} reducer ordering changed.`);
    return {
      sourceElementId: String(after.sourceElementId),
      beforePressureAxialStrain: Number(before.pressureAxialStrain),
      afterPressureAxialStrain: Number(after.pressureAxialStrain),
      pressureStrainDelta: Number(after.pressureAxialStrain) - Number(before.pressureAxialStrain),
      beforeFreeTranslationM: before.bourdonFreeEndTranslationM,
      afterFreeTranslationM: after.bourdonFreeEndTranslationM,
    };
  });
}

const input = parse(process.argv.slice(2));
const bb = json(input['baseline-benchmark']);
const cb = json(input['candidate-benchmark']);
const ba = json(input['baseline-actual']);
const ca = json(input['candidate-actual']);
const result = { schema:'lfea-m047-i032-short-straight-evidence/v1', issueId:'M047', iterationId:'M047-I032', cases:{} };

for (const caseId of ['L19','L20']) {
  const br = caseReport(bb, caseId), cr = caseReport(cb, caseId);
  const entry = {
    aggregate: { before: countFailures(br.comparison.rows), after: countFailures(cr.comparison.rows) },
    failingRestraintsAfter: failures(cr.comparison.rows, 'restraint'),
    failingSourceActionsAfter: failures(cr.comparison.rows, 'sourceEndAction'),
    reducerCustody: reducerCustody(ba, ca, caseId),
  };
  if (caseId === 'L19') {
    entry.restraintTargets = {
      '20090_FY': compareRow(nodeRow(br.comparison.rows,'20090','FORCE','UY'), nodeRow(cr.comparison.rows,'20090','FORCE','UY')),
      '21470_FY': compareRow(nodeRow(br.comparison.rows,'21470','FORCE','UY'), nodeRow(cr.comparison.rows,'21470','FORCE','UY')),
    };
    entry.sourceTargets = {
      '4_TO_FY': compareRow(sourceRow(br.comparison.rows,'4','GLOBAL_END_FORCE_TO','FY'), sourceRow(cr.comparison.rows,'4','GLOBAL_END_FORCE_TO','FY')),
      '4_TO_MZ': compareRow(sourceRow(br.comparison.rows,'4','GLOBAL_END_MOMENT_TO','MZ'), sourceRow(cr.comparison.rows,'4','GLOBAL_END_MOMENT_TO','MZ')),
      '37_TO_MZ': compareRow(sourceRow(br.comparison.rows,'37','GLOBAL_END_MOMENT_TO','MZ'), sourceRow(cr.comparison.rows,'37','GLOBAL_END_MOMENT_TO','MZ')),
      '38_FROM_MZ': compareRow(sourceRow(br.comparison.rows,'38','GLOBAL_END_MOMENT_FROM','MZ'), sourceRow(cr.comparison.rows,'38','GLOBAL_END_MOMENT_FROM','MZ')),
      '44_FROM_MZ': compareRow(sourceRow(br.comparison.rows,'44','GLOBAL_END_MOMENT_FROM','MZ'), sourceRow(cr.comparison.rows,'44','GLOBAL_END_MOMENT_FROM','MZ')),
    };
    entry.reducerChain13to17 = [];
    for (const sourceId of ['13','14','15','16','17']) {
      for (const quantity of ['GLOBAL_END_FORCE_FROM','GLOBAL_END_FORCE_TO']) {
        entry.reducerChain13to17.push({ sourceElementId:sourceId, quantity, ...compareRow(sourceRow(br.comparison.rows,sourceId,quantity,'FX'), sourceRow(cr.comparison.rows,sourceId,quantity,'FX')) });
      }
    }
  } else {
    entry.restraintTargets = {
      '20030_FX': compareRow(nodeRow(br.comparison.rows,'20030','FORCE','UX'), nodeRow(cr.comparison.rows,'20030','FORCE','UX')),
    };
  }
  result.cases[caseId] = entry;
}

writeFileSync(input.out, `${JSON.stringify(result,null,2)}\n`, 'utf8');
const lines = ['# M047 I032 short straight carrier composition evidence',''];
for (const caseId of ['L19','L20']) {
  const c = result.cases[caseId];
  lines.push(`## ${caseId}`);
  lines.push(`- failures restraint: ${c.aggregate.before.restraint} -> ${c.aggregate.after.restraint}; disp/rot: ${c.aggregate.before.displacementRotation} -> ${c.aggregate.after.displacementRotation}; source actions: ${c.aggregate.before.sourceEndAction} -> ${c.aggregate.after.sourceEndAction}`);
  for (const [name,value] of Object.entries(c.restraintTargets ?? {})) lines.push(`- restraint ${name}: ${value.before.percentError.toFixed(4)}% (${value.before.status}) -> ${value.after.percentError.toFixed(4)}% (${value.after.status})`);
  for (const [name,value] of Object.entries(c.sourceTargets ?? {})) lines.push(`- source ${name}: ${value.before.percentError.toFixed(4)}% (${value.before.status}) -> ${value.after.percentError.toFixed(4)}% (${value.after.status})`);
  lines.push(`- failing restraints after: ${c.failingRestraintsAfter.length}; failing source-action rows after: ${c.failingSourceActionsAfter.length}`);
  lines.push('');
}
writeFileSync(input.summary, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify(result));
