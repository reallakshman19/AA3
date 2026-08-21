const LOCATIONS = Object.freeze(['Au','Al','Bu','Bl','Cu','Cl','Du','Dl']);
const SIGN = deepFreeze({
  pMem:  [-1,-1,-1,-1,-1,-1,-1,-1],
  pBend: [-1, 1,-1, 1,-1, 1,-1, 1],
  mcMem: [ 0, 0, 0, 0,-1,-1, 1, 1],
  mcBend:[ 0, 0, 0, 0,-1, 1, 1,-1],
  mlMem: [-1,-1, 1, 1, 0, 0, 0, 0],
  mlBend:[-1, 1, 1,-1, 0, 0, 0, 0],
  vc:     [ 1, 1,-1,-1, 0, 0, 0, 0],
  vl:     [ 0, 0, 0, 0,-1,-1, 1, 1],
  mt:     [ 1, 1, 1, 1, 1, 1, 1, 1],
});
export const EMP1_WRC537_CYL_TABLE5_SCHEMA = 'emp1-wrc537-cylindrical-table5-result/v2';
export const EMP1_WRC537_CYL_LOCATIONS = LOCATIONS;
export const EMP1_WRC537_CYL_TABLE5_STRESS_SCOPE = deepFreeze({
  domain: 'HOST_CYLINDRICAL_SHELL_AT_ATTACHMENT_SHELL_JUNCTURE',
  shellStressesCalculated: true,
  attachmentStressesCalculated: false,
  nozzleStressesCalculated: false,
  recoveryLocation: 'ATTACHMENT_SHELL_JUNCTURE',
  sourceSection: 'WRC537_4.5.3',
});

export function evaluateEmp1Wrc537CylindricalTable5(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw table5Error('EMP1_WRC537_TABLE5_INPUT_REQUIRED');
  const Rm = positive(input.geometry?.meanRadius, 'MEAN_RADIUS');
  const T = positive(input.geometry?.shellThickness, 'SHELL_THICKNESS');
  const r0 = positive(input.geometry?.attachmentRadius, 'ATTACHMENT_RADIUS');
  const beta = positive(input.geometry?.beta, 'BETA');
  const Kn = positive(input.stressConcentration?.Kn, 'KN');
  const Kb = positive(input.stressConcentration?.Kb, 'KB');
  const loads = normalizeLoads(input.loads);
  const q = normalizeOrdinates(input.curveOrdinates);
  const scale = deepFreeze({
    pMem: Math.abs(loads.P) * Kn / (Rm * T),
    pBend: 6 * Math.abs(loads.P) * Kb / (T ** 2),
    mcMem: Math.abs(loads.Mc) * Kn / (Rm ** 2 * beta * T),
    mcBend: 6 * Math.abs(loads.Mc) * Kb / (Rm * beta * T ** 2),
    mlMem: Math.abs(loads.Ml) * Kn / (Rm ** 2 * beta * T),
    mlBend: 6 * Math.abs(loads.Ml) * Kb / (Rm * beta * T ** 2),
    vcShear: Math.abs(loads.Vc) / (Math.PI * r0 * T),
    vlShear: Math.abs(loads.Vl) / (Math.PI * r0 * T),
    mtShear: Math.abs(loads.Mt) / (2 * Math.PI * r0 ** 2 * T),
  });
  const circumferentialComponents = deepFreeze({
    Pmem: applySigns(SIGN.pMem, loads.P, grouped(q.circ.Pmem_AB * scale.pMem, q.circ.Pmem_CD * scale.pMem)),
    Pbend: applySigns(SIGN.pBend, loads.P, grouped(q.circ.Pbend_AB * scale.pBend, q.circ.Pbend_CD * scale.pBend)),
    Mcmem: applySigns(SIGN.mcMem, loads.Mc, q.circ.Mcmem * scale.mcMem),
    Mcbend: applySigns(SIGN.mcBend, loads.Mc, q.circ.Mcbend * scale.mcBend),
    Mlmem: applySigns(SIGN.mlMem, loads.Ml, q.circ.Mlmem * scale.mlMem),
    Mlbend: applySigns(SIGN.mlBend, loads.Ml, q.circ.Mlbend * scale.mlBend),
  });
  const longitudinalComponents = deepFreeze({
    Pmem: applySigns(SIGN.pMem, loads.P, grouped(q.long.Pmem_AB * scale.pMem, q.long.Pmem_CD * scale.pMem)),
    Pbend: applySigns(SIGN.pBend, loads.P, grouped(q.long.Pbend_AB * scale.pBend, q.long.Pbend_CD * scale.pBend)),
    Mcmem: applySigns(SIGN.mcMem, loads.Mc, q.long.Mcmem * scale.mcMem),
    Mcbend: applySigns(SIGN.mcBend, loads.Mc, q.long.Mcbend * scale.mcBend),
    Mlmem: applySigns(SIGN.mlMem, loads.Ml, q.long.Mlmem * scale.mlMem),
    Mlbend: applySigns(SIGN.mlBend, loads.Ml, q.long.Mlbend * scale.mlBend),
  });
  const shearComponents = deepFreeze({
    Vc: applySigns(SIGN.vc, loads.Vc, scale.vcShear),
    Vl: applySigns(SIGN.vl, loads.Vl, scale.vlShear),
    Mt: applySigns(SIGN.mt, loads.Mt, scale.mtShear),
  });
  const circumferential = sumComponentArrays(circumferentialComponents);
  const longitudinal = sumComponentArrays(longitudinalComponents);
  const shear = sumComponentArrays(shearComponents);
  const stressIntensity = LOCATIONS.map((_, index) => planeStressTresca(circumferential[index], longitudinal[index], shear[index]));
  return deepFreeze({
    schema: EMP1_WRC537_CYL_TABLE5_SCHEMA,
    state: 'EVALUATED_TABLE5',
    engineeringUseAuthorized: true,
    curveSelectionAuthority: false,
    fullDomainAuthority: false,
    globalRouteAuthority: false,
    stressScope: EMP1_WRC537_CYL_TABLE5_STRESS_SCOPE,
    locations: [...LOCATIONS],
    scale,
    components: { circumferential: circumferentialComponents, longitudinal: longitudinalComponents, shear: shearComponents },
    stresses: { circumferential, longitudinal, shear, stressIntensity },
  });
}
export function emp1Wrc537PlaneStressIntensity(sigmaPhi, sigmaX, tau) { return planeStressTresca(finite(sigmaPhi, 'SIGMA_PHI'), finite(sigmaX, 'SIGMA_X'), finite(tau, 'TAU')); }
function planeStressTresca(sigmaPhi, sigmaX, tau) { const d=Math.sqrt((sigmaPhi-sigmaX)**2+4*tau**2); const p1=0.5*(sigmaPhi+sigmaX+d),p2=0.5*(sigmaPhi+sigmaX-d),p3=0; return Math.max(Math.abs(p1-p2),Math.abs(p2-p3),Math.abs(p3-p1)); }
function normalizeLoads(value={}) { return deepFreeze({P:finite(value.P,'LOAD_P'),Vc:finite(value.Vc,'LOAD_VC'),Vl:finite(value.Vl,'LOAD_VL'),Mc:finite(value.Mc,'LOAD_MC'),Ml:finite(value.Ml,'LOAD_ML'),Mt:finite(value.Mt,'LOAD_MT')}); }
function normalizeOrdinates(value={}) { return deepFreeze({circ:normalizeFamily(value.circ,'CIRC'),long:normalizeFamily(value.long,'LONG')}); }
function normalizeFamily(value,label) { if(!value||typeof value!=='object'||Array.isArray(value)) throw table5Error(`EMP1_WRC537_TABLE5_${label}_ORDINATES_REQUIRED`); const keys=['Pmem_AB','Pmem_CD','Pbend_AB','Pbend_CD','Mcmem','Mcbend','Mlmem','Mlbend']; return Object.fromEntries(keys.map((key)=>{const number=finite(value[key],`${label}_${key.toUpperCase()}`);if(number<0)throw table5Error(`EMP1_WRC537_TABLE5_${label}_${key.toUpperCase()}_NEGATIVE_ORDINATE`);return [key,number];})); }
function applySigns(signs,load,magnitude){const values=Array.isArray(magnitude)?magnitude:Array(signs.length).fill(magnitude),direction=load<0?-1:1;return signs.map((sourceSign,index)=>normalizeZero(sourceSign*direction*values[index]));}
function grouped(ab,cd){return [ab,ab,ab,ab,cd,cd,cd,cd];}
function sumComponentArrays(components){const rows=Object.values(components);return LOCATIONS.map((_,index)=>normalizeZero(rows.reduce((sum,row)=>sum+row[index],0)));}
function positive(value,label){const number=finite(value,label);if(number<=0)throw table5Error(`EMP1_WRC537_TABLE5_${label}_NONPOSITIVE`);return number;}
function finite(value,label){if(!Number.isFinite(value))throw table5Error(`EMP1_WRC537_TABLE5_${label}_INVALID`);return value;}
function normalizeZero(value){return Object.is(value,-0)?0:value;}
function table5Error(code){const error=new TypeError(code);error.code=code;return error;}
function deepFreeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(deepFreeze);return Object.freeze(value);}
