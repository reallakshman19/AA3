#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const oracleRoot='scripts/oracles/emp1-wrc537';
const files=await walk(oracleRoot);
const additional=[
  'scripts/emp1-wrc-gamma5-full-table5-independent-handcalc.mjs',
  'scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs',
  'scripts/emp1-wrc-gamma5-post-authority-independent-refreeze.mjs',
  'scripts/emp1-wrc-gamma5-post-authority-refreeze-falsifiers.mjs',
];
const forbiddenImports=[
  /(?:from\s+|import\s*\()['"][^'"]*src\/core\//u,
  /(?:from\s+|import\s*\()['"][^'"]*src\/workspace\//u,
  /emp1-wrc537-cylindrical-bounded-adapter\.js/u,
  /emp1-wrc537-longitudinal-moment-curve-selection\.js/u,
  /emp1-wrc537-cylindrical-table5\.js/u,
];
const violations=[];
for(const path of [...files,...additional]){
  const source=await readFile(path,'utf8');
  for(const rule of forbiddenImports){
    if(rule.test(source)) violations.push({path,rule:String(rule)});
  }
}
assert.equal(violations.length,0,
  `EMP1_WRC_ORACLE_COMMON_MODE_DEPENDENCY:${JSON.stringify(violations)}`);

// Oracle modules may carry source-derived reviewed data, but must not hide a
// copied production FIGURE_BASE/SIGN constant behind a new filename.
for(const path of files){
  const source=await readFile(path,'utf8');
  assert.doesNotMatch(source,/\bFIGURE_BASE\b/u,`EMP1_WRC_ORACLE_COPIED_PRODUCTION_FIGURE_BASE:${path}`);
  assert.doesNotMatch(source,/const\s+SIGN\s*=\s*(?:deepFreeze\s*\()?\{/u,`EMP1_WRC_ORACLE_COPIED_PRODUCTION_SIGN_MATRIX:${path}`);
}

console.log(JSON.stringify({
  schema:'emp1-wrc537-independent-oracle-import-firewall/v1',
  status:'PASS_ZERO_PRODUCTION_SEMANTIC_IMPORTS',
  oracleRoot,
  scannedFiles:[...files,...additional],
  productionSemanticImports:0,
  copiedProductionConstantPatterns:0,
},null,2));

async function walk(root){
  const output=[];
  for(const entry of await readdir(root,{withFileTypes:true})){
    const path=join(root,entry.name);
    if(entry.isDirectory()) output.push(...await walk(path));
    else if(entry.isFile()&&path.endsWith('.mjs')) output.push(relative('.',path));
  }
  return output.sort();
}
