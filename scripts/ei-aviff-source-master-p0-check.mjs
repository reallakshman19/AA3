import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

function approx(actual, expected, tolerance, label) {
  const delta = Math.abs(actual - expected);
  assert.ok(delta <= tolerance, `${label}: expected ${expected} ± ${tolerance}, got ${actual} (delta ${delta})`);
}

function parseSimpleCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift().split(',');
  return lines.map((line) => Object.fromEntries(line.split(',').map((value, index) => [header[index], value])));
}

function sourcePwl({ p1, p2, flow, temperatureK, molecularWeight, sff = 0 }) {
  const argument = (((p1 - p2) / p1) ** 3.6)
    * (flow ** 2)
    * ((temperatureK / molecularWeight) ** 1.2);
  return 10 * Math.log10(argument) + 126.1 + sff;
}

function combinePwl(levels) {
  return 10 * Math.log10(levels.reduce((sum, level) => sum + 10 ** (level / 10), 0));
}

function aivShape({ pwlDb, outsideDiameterMm, wallThicknessMm }) {
  const ratio = outsideDiameterMm / wallThicknessMm;
  const s = 91.9 - ratio;
  const a = 3.28e-7 * ratio ** 3
    - 8.503e-5 * ratio ** 2
    + 7.063e-3 * ratio
    + 0.816;
  const B = a * (pwlDb - 0.112762 * s - 0.001812 * s ** 2 + 4.307277e-5 * s ** 3);
  return { ratio, a, s, B };
}

function flm1(ratio) {
  if (ratio >= 10) return 0.5;
  return -0.07
    + 0.91 * ratio
    + 1.32 / ratio
    - 0.48 * ratio ** 1.5
    + 0.065 * ratio ** 2;
}

function flm2(pwlDb) {
  return 0.29 + 0.09 * Math.tanh((pwlDb - 172) / 2.9);
}

function flm3(pwlDb) {
  return 0.263 + 0.087 * Math.tanh((pwlDb - 172) / 2.9);
}

function errataLog10N(B) {
  return 470711.5155
    - 63075.1242 * Math.log10(B)
    + 183685.4368 / Math.sqrt(B)
    - 575094.3273 / B ** 0.1;
}

function fatigueLof(N) {
  const unclamped = 3.1 - 0.1303 * Math.log(N);
  const Lf = Math.min(1, Math.max(0, unclamped));
  return { unclamped, Lf, lof: Lf >= 0.5 ? Lf : 0.29 };
}

function checkFit() {
  const ref = read('docs/EI data/EI-P0-FIT/T2-2_source_reference.yaml');
  assert.match(ref, /gas: "sqrt\(mu_gas \/ 0\.001\)"/);
  assert.match(ref, /gas: "LOF_FIT = rho_v2 \* FVF \/ Fv"/);
  assert.doesNotMatch(ref, /^\s*gas:\s*"1\s*\/\s*\(mu.*1000/im);

  approx(Math.sqrt(2e-5 / 0.001), 0.1414213562373095, 1e-12, 'FIT FVF at 2e-5 Pa.s');
  approx(Math.sqrt(1e-5 / 0.001), 0.1, 1e-12, 'FIT FVF at 1e-5 Pa.s');

  const coeffRows = parseSimpleCsv(read('docs/EI data/EI-P0-FIT/T2-2_fv_coefficients.csv'));
  const mediumStiff = coeffRows.find((row) => row.support_class === 'Medium Stiff');
  assert.ok(mediumStiff, 'FIT Medium Stiff coefficient row must exist');
  const d = 168.275;
  const t = 7.112;
  const alpha = Number(mediumStiff.alpha_c0) + Number(mediumStiff.alpha_c1_dext) * d;
  const beta = Number(mediumStiff.beta_c0) + Number(mediumStiff.beta_ln_coeff) * Math.log(d);
  const fv = alpha * (d / t) ** beta;
  approx(alpha, 346183, 1, 'FIT D2 6-inch alpha');
  approx(beta, -0.9341, 0.0001, 'FIT D2 6-inch beta');
  approx(fv, 18022, 1, 'FIT D2 6-inch Fv');
}

function checkAivT25() {
  const text = read('docs/EI data/EI-P0-AIV/T2-5_flowchart.yaml');
  assert.match(text, /W\^2/);
  assert.doesNotMatch(text, /^\s*equation:.*W\^0\.2/m);
  assert.match(text, /SFF=6 for sonic conditions; otherwise SFF=0/);
  assert.match(text, /attenuation_dB = 60 \* L_dis_m \/ Dint_mm/);
  assert.match(text, /PWL_total = 10 \* log10\(sum\(10\^\(PWL_i \/ 10\)\)\)/);
  assert.match(text, /greatest welded-discontinuity LOF encountered/);

  const flow = 53482 / 3600;
  const relief = sourcePwl({ p1: 99e5, p2: 1e5, flow, temperatureK: 137 + 273.15, molecularWeight: 21.75 });
  const recycle = sourcePwl({ p1: 88e5, p2: 26e5, flow, temperatureK: 136.7 + 273.15, molecularWeight: 21.75 });
  approx(relief, 164.7, 0.05, 'AIV D2.3 relief source PWL');
  approx(recycle, 159.4, 0.05, 'AIV D2.3 recycle source PWL');

  const attenuation = 60 * 0.8 / 154;
  approx(attenuation, 0.312, 0.001, 'AIV D2.3 attenuation');
  approx(164.7 - attenuation, 164.4, 0.05, 'AIV D2.3 discontinuity PWL');
  approx(combinePwl([160, 160]), 163.0102999566398, 1e-12, 'AIV two-source 160 dB energy sum');
}

function checkAivT26() {
  const flowchart = read('docs/EI data/EI-P0-AIV/T2-6_flowchart.yaml');
  assert.match(flowchart, /SOURCE_CORROBORATED_AND_D2_3_REPRODUCED/);
  assert.match(flowchart, /a = 3\.28e-7\*R\^3 - 8\.503e-5\*R\^2 \+ 7\.063e-3\*R \+ 0\.816/);
  assert.match(flowchart, /B = a \* \(PWL - 0\.112762\*s - 0\.001812\*s\^2 \+ 4\.307277e-5\*s\^3\)/);
  assert.match(flowchart, /470711\.5155/);
  assert.match(flowchart, /183685\.4368\/sqrt\(B\)/);
  assert.match(flowchart, /575094\.3273\/B\^0\.1/);
  assert.match(flowchart, /FLM1 = 0\.5/);
  assert.match(flowchart, /FLM3 = 0\.263 \+ 0\.087\*tanh/);
  assert.match(flowchart, /fatigue_factor_equation: "Lf = 3\.1 - 0\.1303\*ln\(N\)"/);
  assert.match(flowchart, /LOF = Lf/);
  assert.match(flowchart, /LOF = 0\.29/);
  assert.doesNotMatch(flowchart, /^\s*equation:\s*"log10_N = 47\.0712/m);

  const publishedPointPwl = 164.7 - 60 * 0.8 / 154;
  const shape = aivShape({ pwlDb: publishedPointPwl, outsideDiameterMm: 168.3, wallThicknessMm: 7.11 });
  approx(shape.a, 0.93989, 0.00001, 'AIV D2.3 a');
  approx(shape.s, 68.229, 0.001, 'AIV D2.3 s');
  approx(shape.B, 152.207, 0.001, 'AIV D2.3 B');

  const log10N = errataLog10N(shape.B);
  approx(log10N, 9.9026, 0.0001, 'AIV official errata log10N');
  const N = 10 ** log10N;
  approx(N, 7.99e9, 1e7, 'AIV official errata N');

  const ratio = 168.3 / 60.3;
  approx(flm1(ratio), 1.2109758194311824, 1e-12, 'AIV D2.3 independent FLM1');
  assert.equal(flm1(10), 0.5);
  assert.equal(flm1(15), 0.5);
  approx(flm2(publishedPointPwl), 0.2009, 0.0001, 'AIV D2.3 FLM2');
  assert.ok(flm3(172) === 0.263, 'AIV FLM3 center point must equal 0.263');

  const publishedChainN = N * 1.2133 * flm2(publishedPointPwl);
  approx(publishedChainN, 1.95e9, 1e7, 'AIV D2.3 N after published FLM1 and FLM2');
  const d23Fatigue = fatigueLof(publishedChainN);
  approx(d23Fatigue.Lf, 0.31, 0.01, 'AIV D2.3 Lf');
  assert.equal(d23Fatigue.lof, 0.29);
  assert.equal(fatigueLof(1).Lf, 1);
  assert.equal(fatigueLof(1).lof, 1);
  assert.equal(fatigueLof(1e20).Lf, 0);
  assert.equal(fatigueLof(1e20).lof, 0.29);

  const diameterRows = parseSimpleCsv(read('docs/EI data/EI-P0-AIV/T2-6_diameter_ratio_modifier.csv'));
  for (const row of diameterRows) {
    approx(Number(row.flm1_calculated), flm1(Number(row.dext_ratio_D_over_d)), 6e-6, `FLM1 row ${row.dext_ratio_D_over_d}`);
  }
  const d23 = diameterRows.find((row) => row.authority_state === 'D2_3_RECALCULATION_PUBLISHED_VARIANCE_OPEN');
  assert.equal(d23?.published_d2_3_anchor, '1.2133');
  const ten = diameterRows.find((row) => row.dext_ratio_D_over_d === '10.0');
  assert.equal(ten?.authority_state, 'SOURCE_CORROBORATED_CONSTANT_BRANCH');

  const connectionRows = parseSimpleCsv(read('docs/EI data/EI-P0-AIV/T2-6_connection_modifier.csv'));
  for (const row of connectionRows) {
    approx(Number(row.weldolet_flm2_calculated), flm2(Number(row.pwl_db)), 6e-6, `FLM2 row ${row.pwl_db}`);
  }

  const material = read('docs/EI data/EI-P0-AIV/T2-6_material_modifier.csv');
  assert.match(material, /DUPLEX,APPLY_FLM3/);
  assert.match(material, /NOT_DUPLEX,NO_FLM3_MULTIPLIER/);
  assert.match(material, /FAIL_CLOSED_NO_CLASSIFICATION_INFERENCE/);
}

function checkAuthority() {
  const sourceRegister = read('docs/EI data/EI-P0-AIV/T2-7_method_source_register.yaml');
  assert.match(sourceRegister, /SOURCE_CORROBORATED_AND_WORKED_EXAMPLE_REPRODUCED/);
  assert.match(sourceRegister, /BLOCKED_PENDING_PINNED_PDF_VISUAL_PARITY_AND_DOWNSTREAM_QUALIFICATION/);
  assert.match(sourceRegister, /EXACT_PINNED_PDF_VISUAL_PARITY/);
  assert.match(sourceRegister, /INDEPENDENT_MULTI_SOURCE_BENCHMARK/);
  assert.match(sourceRegister, /GOVERNED_DISCONTINUITY_INVENTORY_COMPLETENESS/);

  const p1 = read('docs/EI data/EI-P1-IDENTIFICATION/AUTHORITY_STATUS.yaml');
  assert.match(p1, /QUARANTINED_NOT_ENGINEERING_AUTHORITY/);
  assert.match(p1, /PRODUCTION_APPLICABILITY/);

  const global = read('docs/EI data/EI_SOURCE_AUTHORITY_STATUS.md');
  assert.match(global, /SOURCE-CORROBORATED \/ D\.2\.3 REPRODUCED/);
  assert.match(global, /exactPinnedPdfVisualParity = NOT_RUN \/ TRANSPORT_BLOCKED/);
  assert.match(global, /REFERENCE COMPILATION, NOT TRUST ROOT/);

  const readme = read('docs/EI data/README.md');
  assert.match(readme, /does \*\*not\*\* automatically grant engineering authority/);
  assert.match(readme, /QUARANTINED_NOT_ENGINEERING_AUTHORITY/);
}

checkFit();
checkAivT25();
checkAivT26();
checkAuthority();

process.stdout.write(`${JSON.stringify({
  schema: 'EiAviffSourceMasterP0Check.v2',
  status: 'PASS',
  checks: [
    'FIT',
    'AIV_T2_5_SOURCE_CORROBORATED',
    'AIV_T2_6_SOURCE_CORROBORATED',
    'D2_3_FULL_CHAIN_REPRODUCTION',
    'AUTHORITY_BOUNDARIES',
  ],
  exactPinnedPdfVisualParity: 'NOT_RUN_TRANSPORT_BLOCKED',
  sourceEquationCorroboration: 'PASS',
  d23NumericalReproduction: 'PASS',
  screeningAuthorityPromotion: false,
  designAuthority: false,
}, null, 2)}\n`);
