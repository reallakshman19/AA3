import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const REQUIRED_KEYS=Object.freeze(['Pmem_AB','Pmem_CD','Pbend_AB','Pbend_CD','Mcmem','Mcbend','Mlmem','Mlbend']);
const EXPECTED_SCHEMA='emp1-wrc537-table5-reviewed-interpretation/v1';

/**
 * Validation-only WRC Table-5 authority. This module must remain independent of
 * production EMP.1 code. WRC Table 5 supplies the allowed figure cells and
 * algebraic signs. The reviewed interpretation binds OCR rows to engineering
 * meanings. CAUx is used only to verify the historical worked-case location /
 * alternative selection retained by the gamma5 comparison vector.
 */
export function deriveIndependentWrc537Table5Authority({
  wrcMarkdown,
  cauxMarkdown,
  reviewedInterpretation,
}={}){
  assert.equal(typeof wrcMarkdown,'string','WRC markdown required');
  assert.equal(typeof cauxMarkdown,'string','CAUx markdown required');
  const interpretation=requireReviewedInterpretation(reviewedInterpretation);
  const table5=between(wrcMarkdown,/^### Table 5\b.*$/mu,/^### Table 6\b.*$/mu,'WRC Table 5');
  requireAnchors(table5,interpretation.requiredSourceAnchors);
  const parsedSigns=deriveTable5Signs(table5);
  assert.deepEqual(parsedSigns,interpretation.reviewedSigns,
    'WRC_TABLE5_REVIEWED_SIGN_INTERPRETATION_DRIFT');
  validateReviewedFigureAuthority(table5,interpretation.figureAuthority);
  const historicalFigureMap=reviewedHistoricalFigureMap(interpretation.figureAuthority);
  const cauxHistoricalMap=deriveCauxFigureMap(cauxMarkdown);
  assert.deepEqual(cauxHistoricalMap,historicalFigureMap,
    'WRC_TABLE5_HISTORICAL_CAUX_LOCATION_SELECTION_MISMATCH');

  const sourceSemanticHash=sha256(table5);
  const signAuthorityHash=sha256(canonical(parsedSigns));
  const historicalFigureMapHash=sha256(canonical(historicalFigureMap));
  const payload={
    schema:'emp1-wrc537-independent-table5-source-authority/v2',
    authority:'VALIDATION_ONLY_NOT_PRODUCTION_METHOD_AUTHORITY',
    productionImports:[],
    productionObservationUsedToSetAuthority:false,
    locations:[...interpretation.locations],
    figureAuthority:structuredClone(interpretation.figureAuthority),
    historicalFigureMap,
    signs:parsedSigns,
    hashes:{
      sourceSemanticHash,
      table5InterpretationHash:interpretation.semanticHash,
      signAuthorityHash,
      historicalFigureMapHash,
    },
    sourceCustody:{
      signAuthority:'WRC537_2013/Table5/pp41-42',
      allowedFigureAuthority:'WRC537_2013/Table5/pp41-42',
      reviewedInterpretation:'validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json',
      historicalFigureSelectionValidation:'CAUx_2017_WRC01f/pp24-27',
      historicalFigureSelectionValidationClass:'INDEPENDENT_SECONDARY_VALIDATION_EVIDENCE',
      productionSelectionAuthority:false,
    },
  };
  return deepFreeze({...payload,authorityHash:sha256(canonical(payload))});
}

export function assertIndependentHistoricalFigureMap(candidate,authority){
  try{
    assert.deepEqual(candidate,authority?.historicalFigureMap);
  }catch{
    throw oracleError('WRC_TABLE5_FIGURE_SELECTION_MISMATCH');
  }
  return true;
}

export function assertIndependentSignMatrix(candidate,authority){
  try{
    assert.deepEqual(candidate,authority?.signs);
  }catch{
    throw oracleError('WRC_TABLE5_SIGN_MATRIX_MISMATCH');
  }
  return true;
}

function requireReviewedInterpretation(value){
  assert(value&&typeof value==='object'&&!Array.isArray(value),'reviewed interpretation required');
  assert.equal(value.schema,EXPECTED_SCHEMA,'reviewed interpretation schema');
  const retained=value.semanticHash;
  assert.match(retained,/^[0-9a-f]{64}$/u,'reviewed interpretation semantic hash');
  const copy=structuredClone(value);delete copy.semanticHash;
  assert.equal(sha256(canonical(copy)),retained,'reviewed interpretation semantic hash drift');
  assert.deepEqual(value.locations,['Au','Al','Bu','Bl','Cu','Cl','Du','Dl'],'reviewed locations drift');
  assert.equal(value.authority?.productionMethodAuthority,false,'reviewed interpretation cannot grant production authority');
  return deepFreeze(structuredClone(value));
}

function requireAnchors(table5,anchors){
  assert(Array.isArray(anchors)&&anchors.length>0,'source anchors required');
  for(const anchor of anchors){
    assert(table5.includes(anchor),`WRC_TABLE5_SOURCE_ANCHOR_MISSING:${anchor}`);
  }
}

function validateReviewedFigureAuthority(table5,authority){
  const rows=table5.replace(/\r/gu,'').split('\n').map(parseRow).filter(Boolean);
  const references=new Set(rows.map((row)=>normalizeReference(row[0])).filter(Boolean));
  for(const family of ['circumferential','longitudinal']){
    const group=authority?.[family];
    assert(group&&typeof group==='object',`reviewed figure family missing:${family}`);
    assert.deepEqual(Object.keys(group).sort(),[...REQUIRED_KEYS].sort(),`reviewed figure keys:${family}`);
    for(const [key,item] of Object.entries(group)){
      const reference=normalizeReference(item.wrcReferenceCell);
      assert(references.has(reference),`WRC_TABLE5_REFERENCE_CELL_MISSING:${family}.${key}:${item.wrcReferenceCell}`);
      const sourceFigures=figuresFromReference(item.wrcReferenceCell);
      assert.deepEqual([...item.allowedFigures].sort(),sourceFigures.sort(),`WRC_TABLE5_ALLOWED_FIGURE_DRIFT:${family}.${key}`);
      assert(item.allowedFigures.includes(item.historicalGamma5Figure),`WRC_TABLE5_HISTORICAL_FIGURE_NOT_ALLOWED:${family}.${key}`);
      if(item.selectionRequiresSeparateProductionAuthority===true){
        assert.equal(item.locationBindingAuthority,'CAUX_HISTORICAL_WORKED_CASE');
      }
    }
  }
}

function reviewedHistoricalFigureMap(authority){
  return deepFreeze(Object.fromEntries(['circumferential','longitudinal'].map((family)=>[
    family,
    Object.fromEntries(REQUIRED_KEYS.map((key)=>[key,authority[family][key].historicalGamma5Figure])),
  ])));
}

function deriveTable5Signs(table5){
  const rows=table5.replace(/\r/gu,'').split('\n').map(parseRow).filter(Boolean);
  const pMem=equalSigns(signsByRef(rows,'3C'),signsByRef(rows,'4C'),'P membrane');
  const pBend=equalSigns(signsByRef(rows,'1C OR 2C-1'),signsByRef(rows,'1C-1 OR 2C'),'P bending');
  const mcMem=equalSigns(signsByRef(rows,'3A'),signsByRef(rows,'4A'),'Mc membrane');
  const mcBend=equalSigns(signsByRef(rows,'1A'),signsByRef(rows,'2A'),'Mc bending');
  const mlMem=equalSigns(signsByRef(rows,'3B'),signsByRef(rows,'4B'),'Ml membrane');
  const mlBend=equalSigns(signsByRef(rows,'1B OR 1B-1'),signsByRef(rows,'2B OR 2B-1'),'Ml bending');
  const mt=signsFromRow(findRow(rows,(row)=>row.join(' ').includes('Shear stress due to Torsion')),'torsion');
  const vc=signsAfter(rows,(row)=>row.join(' ').includes('Shear stress due to load V C'),'Vc');
  const vl=signsAfter(rows,(row)=>row.join(' ').includes('Shear stress due to load V L'),'Vl');
  return deepFreeze({pMem,pBend,mcMem,mcBend,mlMem,mlBend,vc,vl,mt});
}

function deriveCauxFigureMap(markdown){
  const map={circumferential:{},longitudinal:{}};
  const rows=markdown.replace(/\r/gu,'').split('\n').map(parseRow).filter(Boolean);
  for(const row of rows){
    if(row.length!==5) continue;
    const location=locationGroup(row[4]);
    const figure=normalizeFigure(row[2]);
    const descriptor=classifyDescriptor(row[0],location);
    if(!location||!figure||!descriptor) continue;
    const target=map[descriptor.family];
    if(Object.hasOwn(target,descriptor.key)) assert.equal(target[descriptor.key],figure,`CAUx duplicate figure drift:${descriptor.family}.${descriptor.key}`);
    else target[descriptor.key]=figure;
  }
  for(const family of ['circumferential','longitudinal']) assert.deepEqual(Object.keys(map[family]).sort(),[...REQUIRED_KEYS].sort(),`CAUx figure-map completeness:${family}`);
  return deepFreeze(map);
}

function classifyDescriptor(raw,location){
  const text=String(raw??'').replaceAll('**','').replaceAll('$','').trim();
  const family=text.includes('\\phi')?'circumferential':/(?:N|M)_x\b/u.test(text)?'longitudinal':null;
  if(!family) return null;
  const kind=/^N_/u.test(text)?'mem':/^M_/u.test(text)?'bend':null;
  if(!kind) return null;
  const load=text.includes('M_C')?'Mc':text.includes('M_L')?'Ml':/(^|[^A-Za-z])P([^A-Za-z]|$)/u.test(text)?'P':null;
  if(!load) return null;
  if(load==='P'){
    if(location!=='AB'&&location!=='CD') return null;
    return {family,key:`P${kind}_${location}`};
  }
  if(location!=='ALL') return null;
  return {family,key:`${load}${kind}`};
}

function figuresFromReference(value){return [...String(value).toUpperCase().matchAll(/[1-4][ABC](?:-1)?/gu)].map((match)=>match[0]);}
function normalizeReference(value){return String(value??'').replace(/\s+/gu,' ').trim().toUpperCase();}
function normalizeFigure(value){let text=String(value??'').replace(/[*!\s]/gu,'').toUpperCase();if(!text)return null;const compact=text.match(/^([12][BC])1$/u);if(compact)text=`${compact[1]}-1`;return /^(?:[1-4][ABC](?:-1)?)$/u.test(text)?text:null;}
function locationGroup(value){const text=String(value??'').replace(/\s+/gu,'').toUpperCase();if(text==='(A,B)')return'AB';if(text==='(C,D)')return'CD';if(text==='(A,B,C,D)')return'ALL';return null;}
function signsByRef(rows,reference){const expected=normalizeReference(reference);const row=findRow(rows,(candidate)=>normalizeReference(candidate[0])===expected);return signsFromRow(row,reference);}
function signsAfter(rows,predicate,label){const index=rows.findIndex(predicate);assert(index>=0,`WRC Table5 marker missing:${label}`);for(let i=index+1;i<Math.min(rows.length,index+5);i++){const signs=trySigns(rows[i]);if(signs&&signs.some((value)=>value!==0))return signs;}throw new Error(`WRC Table5 sign row missing:${label}`);}
function signsFromRow(row,label){const signs=trySigns(row);assert(signs&&signs.some((value)=>value!==0),`WRC Table5 signs missing:${label}`);return signs;}
function trySigns(row){if(!Array.isArray(row)||row.length<8)return null;const cells=row.slice(-8);if(cells.some((cell)=>cell!==''&&cell!=='+'&&cell!=='-'))return null;return cells.map((cell)=>cell==='+'?1:cell==='-'?-1:0);}
function equalSigns(a,b,label){assert.deepEqual(a,b,`WRC Table5 paired sign drift:${label}`);return a;}
function findRow(rows,predicate){const row=rows.find(predicate);assert(row,'WRC Table5 row missing');return row;}
function parseRow(line){const text=String(line??'').trim();if(!text.startsWith('|')||!text.endsWith('|'))return null;return text.slice(1,-1).split('|').map((cell)=>cell.trim());}
function between(text,startRe,endRe,label){const start=startRe.exec(text);assert(start,`${label} start missing`);const rest=text.slice(start.index+start[0].length);const end=endRe.exec(rest);assert(end,`${label} end missing`);return rest.slice(0,end.index);}
function canonical(value){if(Array.isArray(value))return`[${value.map(canonical).join(',')}]`;if(value&&typeof value==='object')return`{${Object.keys(value).sort().map((key)=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;return JSON.stringify(value);}
function sha256(text){return createHash('sha256').update(text).digest('hex');}
function oracleError(code){const error=new TypeError(code);error.code=code;return error;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
