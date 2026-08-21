import assert from 'node:assert/strict';

/** Validation-only Table-5 numerical reconstruction. No production imports. */
export function evaluateIndependentWrc537Table5({geometry,stressConcentration,loads,curveOrdinates,signs,locations}={}){
  const LOC=requireLocations(locations);
  const Rm=positive(geometry?.meanRadius,'MEAN_RADIUS');
  const T=positive(geometry?.shellThickness,'SHELL_THICKNESS');
  const r0=positive(geometry?.attachmentRadius,'ATTACHMENT_RADIUS');
  const beta=positive(geometry?.beta,'BETA');
  const Kn=positive(stressConcentration?.Kn,'KN');
  const Kb=positive(stressConcentration?.Kb,'KB');
  const L=normalizeLoads(loads);
  const q=normalizeOrdinates(curveOrdinates);
  const S=requireSigns(signs,LOC.length);
  const scale=deepFreeze({
    pMem:Math.abs(L.P)*Kn/(Rm*T),
    pBend:6*Math.abs(L.P)*Kb/T**2,
    mcMem:Math.abs(L.Mc)*Kn/(Rm**2*beta*T),
    mcBend:6*Math.abs(L.Mc)*Kb/(Rm*beta*T**2),
    mlMem:Math.abs(L.Ml)*Kn/(Rm**2*beta*T),
    mlBend:6*Math.abs(L.Ml)*Kb/(Rm*beta*T**2),
    vcShear:Math.abs(L.Vc)/(Math.PI*r0*T),
    vlShear:Math.abs(L.Vl)/(Math.PI*r0*T),
    mtShear:Math.abs(L.Mt)/(2*Math.PI*r0**2*T),
  });
  const circumferentialComponents=deepFreeze({
    Pmem:apply(S.pMem,L.P,grouped(q.circ.Pmem_AB*scale.pMem,q.circ.Pmem_CD*scale.pMem)),
    Pbend:apply(S.pBend,L.P,grouped(q.circ.Pbend_AB*scale.pBend,q.circ.Pbend_CD*scale.pBend)),
    Mcmem:apply(S.mcMem,L.Mc,q.circ.Mcmem*scale.mcMem),
    Mcbend:apply(S.mcBend,L.Mc,q.circ.Mcbend*scale.mcBend),
    Mlmem:apply(S.mlMem,L.Ml,q.circ.Mlmem*scale.mlMem),
    Mlbend:apply(S.mlBend,L.Ml,q.circ.Mlbend*scale.mlBend),
  });
  const longitudinalComponents=deepFreeze({
    Pmem:apply(S.pMem,L.P,grouped(q.long.Pmem_AB*scale.pMem,q.long.Pmem_CD*scale.pMem)),
    Pbend:apply(S.pBend,L.P,grouped(q.long.Pbend_AB*scale.pBend,q.long.Pbend_CD*scale.pBend)),
    Mcmem:apply(S.mcMem,L.Mc,q.long.Mcmem*scale.mcMem),
    Mcbend:apply(S.mcBend,L.Mc,q.long.Mcbend*scale.mcBend),
    Mlmem:apply(S.mlMem,L.Ml,q.long.Mlmem*scale.mlMem),
    Mlbend:apply(S.mlBend,L.Ml,q.long.Mlbend*scale.mlBend),
  });
  const shearComponents=deepFreeze({
    Vc:apply(S.vc,L.Vc,scale.vcShear),
    Vl:apply(S.vl,L.Vl,scale.vlShear),
    Mt:apply(S.mt,L.Mt,scale.mtShear),
  });
  const circumferential=sum(circumferentialComponents,LOC);
  const longitudinal=sum(longitudinalComponents,LOC);
  const shear=sum(shearComponents,LOC);
  const stressIntensity=LOC.map((_,i)=>tresca(circumferential[i],longitudinal[i],shear[i]));
  return deepFreeze({
    schema:'emp1-wrc537-independent-table5-handcalc/v1',
    locations:[...LOC],
    scale,
    components:{circumferential:circumferentialComponents,longitudinal:longitudinalComponents,shear:shearComponents},
    stresses:{circumferential,longitudinal,shear,stressIntensity},
    trace:{
      loadToScale:{P:['pMem','pBend'],Mc:['mcMem','mcBend'],Ml:['mlMem','mlBend'],Vc:['vcShear'],Vl:['vlShear'],Mt:['mtShear']},
      superposition:'ALGEBRAIC_COMPONENT_SUM_AT_EACH_TABLE5_LOCATION',
      stressIntensity:'PLANE_STRESS_TRESCA_FROM_SIGMA_PHI_SIGMA_X_TAU',
    },
  });
}

export function assertLoadReversal(positive,negative,label){
  for(const family of ['circumferential','longitudinal','shear']){
    const a=positive.components[family];const b=negative.components[family];
    for(const key of Object.keys(a)){
      a[key].forEach((value,index)=>assert.ok(close(b[key][index],-value),`WRC_LOAD_REVERSAL_MISMATCH:${label}:${family}.${key}[${index}]`));
    }
  }
}

export function assertSuperposition(combined,singles){
  for(const stress of ['circumferential','longitudinal','shear']){
    combined.stresses[stress].forEach((value,index)=>{
      const expected=singles.reduce((sum,item)=>sum+item.stresses[stress][index],0);
      assert.ok(close(value,expected),`WRC_TABLE5_SUPERPOSITION_MISMATCH:${stress}[${index}]`);
    });
  }
}

export function assertZeroIsolation(result,activeLoad){
  const permitted={
    P:new Set(['circumferential.Pmem','circumferential.Pbend','longitudinal.Pmem','longitudinal.Pbend']),
    Mc:new Set(['circumferential.Mcmem','circumferential.Mcbend','longitudinal.Mcmem','longitudinal.Mcbend']),
    Ml:new Set(['circumferential.Mlmem','circumferential.Mlbend','longitudinal.Mlmem','longitudinal.Mlbend']),
    Vc:new Set(['shear.Vc']),Vl:new Set(['shear.Vl']),Mt:new Set(['shear.Mt']),
  }[activeLoad];
  assert(permitted,`unsupported load:${activeLoad}`);
  for(const family of ['circumferential','longitudinal','shear']) for(const [key,row] of Object.entries(result.components[family])){
    if(permitted.has(`${family}.${key}`)) continue;
    row.forEach((value,index)=>assert.ok(close(value,0),`WRC_ZERO_ISOLATION_MISMATCH:${activeLoad}:${family}.${key}[${index}]`));
  }
}

function requireLocations(value){assert.deepEqual(value,['Au','Al','Bu','Bl','Cu','Cl','Du','Dl'],'Table5 locations');return value;}
function requireSigns(value,count){const keys=['pMem','pBend','mcMem','mcBend','mlMem','mlBend','vc','vl','mt'];assert(value&&typeof value==='object');for(const key of keys){assert(Array.isArray(value[key])&&value[key].length===count,`signs:${key}`);assert(value[key].every((v)=>[-1,0,1].includes(v)),`sign values:${key}`);}return value;}
function normalizeLoads(value={}){return deepFreeze(Object.fromEntries(['P','Vc','Vl','Mc','Ml','Mt'].map((key)=>[key,finite(value[key]??0,`LOAD_${key.toUpperCase()}`)])));}
function normalizeOrdinates(value={}){return deepFreeze({circ:family(value.circ,'CIRC'),long:family(value.long,'LONG')});}
function family(value,label){assert(value&&typeof value==='object'&&!Array.isArray(value),`${label} ordinates`);const keys=['Pmem_AB','Pmem_CD','Pbend_AB','Pbend_CD','Mcmem','Mcbend','Mlmem','Mlbend'];return Object.fromEntries(keys.map((key)=>{const number=finite(value[key],`${label}_${key}`);assert(number>=0,`${label}_${key}:negative`);return[key,number];}));}
function apply(signs,load,magnitude){const values=Array.isArray(magnitude)?magnitude:Array(signs.length).fill(magnitude);const direction=load<0?-1:1;return signs.map((sign,index)=>zero(sign*direction*values[index]));}
function grouped(ab,cd){return[ab,ab,ab,ab,cd,cd,cd,cd];}
function sum(parts,locations){const rows=Object.values(parts);return locations.map((_,index)=>zero(rows.reduce((total,row)=>total+row[index],0)));}
function tresca(a,b,t){const d=Math.sqrt((a-b)**2+4*t**2),p1=.5*(a+b+d),p2=.5*(a+b-d),p3=0;return Math.max(Math.abs(p1-p2),Math.abs(p2-p3),Math.abs(p3-p1));}
function positive(value,label){const number=finite(value,label);assert(number>0,`${label}:nonpositive`);return number;}
function finite(value,label){assert(Number.isFinite(value),`${label}:invalid`);return Number(value);}
function close(a,b){return Math.abs(a-b)<=Math.max(1,Math.abs(a),Math.abs(b))*1e-12;}
function zero(v){return Object.is(v,-0)?0:v;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
