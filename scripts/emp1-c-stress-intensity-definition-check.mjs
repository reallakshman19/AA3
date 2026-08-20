#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const definition = {
  schema: 'emp1-c-stress-intensity-definition/v1',
  source: {
    document: 'WRC537_2013.pdf',
    rawPdfSha256: '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2',
    locators: [
      { table: 'Table 3', pdfPage: 38, printedPage: 26, shell: 'SPHERICAL' },
      { table: 'Table 5', pdfPage: 42, printedPage: 30, shell: 'CYLINDRICAL' },
    ],
  },
  outputDimension: 'STRESS',
  planeStressPrincipalAlgorithm: [
    'd=sqrt((sigma1-sigma2)^2+4*tau^2)',
    'p1=0.5*(sigma1+sigma2+d)',
    'p2=0.5*(sigma1+sigma2-d)',
    'p3=0',
    'S=max(abs(p1-p2),abs(p2-p3),abs(p3-p1))',
  ],
  interpretation: 'TWICE_MAXIMUM_SHEAR_STRESS_TRESCA_PRINCIPAL_DIFFERENCE',
};
const definitionContractHash = `sha256:${hashCanonical(definition)}`;

const cases = [
  { id:'BIAXIAL_NO_SHEAR', sigma1:100, sigma2:50, tau:0, expected:100 },
  { id:'PURE_SHEAR', sigma1:0, sigma2:0, tau:30, expected:60 },
  { id:'EQUAL_BIAXIAL_TENSION_PLANE_STRESS', sigma1:80, sigma2:80, tau:0, expected:80 },
  { id:'MIXED_SIGN', sigma1:120, sigma2:-40, tau:25, expected:null },
  { id:'COMPRESSIVE_WITH_SHEAR', sigma1:-90, sigma2:-20, tau:35, expected:null },
];
const results = [];
for (const row of cases) {
  const actual = stressIntensity(row.sigma1,row.sigma2,row.tau);
  const principal = independentPrincipalValues(row.sigma1,row.sigma2,row.tau);
  const independent = Math.max(
    Math.abs(principal[0]-principal[1]),
    Math.abs(principal[1]-principal[2]),
    Math.abs(principal[2]-principal[0]),
  );
  assert(Math.abs(actual-independent) < 1e-12, `${row.id}: independent principal mismatch`);
  if (row.expected != null) assert.equal(actual,row.expected,`${row.id}: expected`);
  assert(actual >= 0 && Number.isFinite(actual), `${row.id}: finite nonnegative stress intensity`);
  results.push({ ...row, actual, independentPrincipalValues:principal, independent });
}

// Dimensional metamorphic proof: scaling every stress component by k must scale S by |k|.
for (const k of [0.001,1,1000,-2]) {
  const base = stressIntensity(123,-47,29);
  const scaled = stressIntensity(k*123,k*-47,k*29);
  assert(Math.abs(scaled-Math.abs(k)*base) < 1e-9, `stress scaling k=${k}`);
}

console.log(JSON.stringify({
  schema:'emp1-c-stress-intensity-definition-check/v1',
  status:'PASS',
  engineeringAuthority:true,
  productionAuthority:false,
  productionImports:[],
  productionObservationUsed:false,
  definitionContractHash,
  definition,
  independentChecks:results,
  metamorphicProofs:['STRESS_SCALE_0P001','STRESS_SCALE_1','STRESS_SCALE_1000','SIGN_SCALE_MINUS2'],
},null,2));

function stressIntensity(sigma1,sigma2,tau){
  for(const [name,value] of Object.entries({sigma1,sigma2,tau})) if(!Number.isFinite(value)) throw new TypeError(`EMP1_C_STRESS_INTENSITY_NONFINITE:${name}`);
  const d=Math.sqrt((sigma1-sigma2)**2+4*tau**2);
  const p1=.5*(sigma1+sigma2+d);
  const p2=.5*(sigma1+sigma2-d);
  const p3=0;
  return Math.max(Math.abs(p1-p2),Math.abs(p2-p3),Math.abs(p3-p1));
}
function independentPrincipalValues(sigma1,sigma2,tau){
  // Independent closed-form eigenvalues of the symmetric plane-stress tensor.
  const trace=sigma1+sigma2;
  const radius=Math.sqrt(((sigma1-sigma2)/2)**2+tau**2);
  return [trace/2+radius,trace/2-radius,0];
}
function hashCanonical(value){return createHash('sha256').update(canonicalJson(value)).digest('hex');}
function canonicalJson(value){if(Array.isArray(value))return`[${value.map(canonicalJson).join(',')}]`;if(value&&typeof value==='object')return`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;return JSON.stringify(value);}
