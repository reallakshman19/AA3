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

function flm1(ratio) {
  return -0.07
    + 0.91 * ratio
    + 1.32 / ratio
    - 0.48 * ratio ** 1.5
    + 0.065 * ratio ** 2;
}

function flm2(pwlDb) {
  return 0.29 + 0.09 * Math.tanh((pwlDb - 172) / 2.9);
}

function errataLog10N(B) {
  return 470711.5155
    - 63075.1242 * Math.log10(B)
    + 183685.4368 / Math.sqrt(B)
    - 575094.3273 / B ** 0.1;
}

function checkFit() {
  const ref = read('docs/EI data/EI-P0-FIT/T2-2_source_reference.yaml');
  assert.match(ref, /gas: "sqrt\(mu_gas \/ 0\.001\)"/);
  assert.match(ref, /gas: "LOF_FIT = rho_v2 \* FVF \/ Fv"/);
  assert.doesNotMatch(ref, /1\s*\/\s*\(mu.*1000/i);

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
  assert.doesNotMatch(text, /W\^0\.2/);
  assert.match(text, /attenuation_dB = 60 \* L_dis_m \/ Dint_mm/);
  assert.match(text, /Do NOT convert L_dis and Dint to the same unit/);

  const flow = 53482 / 3600;
  const relief = sourcePwl({ p1: 99e5, p2: 1e5, flow, temperatureK: 137 + 273.15, molecularWeight: 21.75 });
  const recycle = sourcePwl({ p1: 88e5, p2: 26e5, flow, temperatureK: 136.7 + 273.15, molecularWeight: 21.75 });
  approx(relief, 164.7, 0.05, 'AIV D2.3 relief source PWL');
  approx(recycle, 159.4, 0.05, 'AIV D2.3 recycle source PWL');

  const attenuation = 60 * 0.8 / 154;
  approx(attenuation, 0.312, 0.001, 'AIV D2.3 attenuation');
  approx(164.7 - attenuation, 164.4, 0.05, 'AIV D2.3 discontinuity PWL');
}

function checkAivT26() {
  const flowchart = read('docs/EI data/EI-P0-AIV/T2-6_flowchart.yaml');
  assert.match(flowchart, /470711\.5155/);
  assert.match(flowchart, /183685\.4368\/sqrt\(B\)/);
  assert.match(flowchart, /575094\.3273\/B\^0\.1/);
  assert.doesNotMatch(flowchart, /log10_N = 47\.0712/);
  assert.match(flowchart, /fatigue_factor_equation: "Lf = 3\.1 - 0\.1303\*ln\(N\)"/);
  assert.doesNotMatch(flowchart, /Lf = 1\.30/);
  assert.match(flowchart, /A_S_B_EQUATIONS|A, S and B/);
  assert.match(flowchart, /UNRESOLVED_PENDING_CONTROLLED_T2_6_HUMAN_RECONCILIATION/);

  const log10N = errataLog10N(152.207);
  approx(log10N, 9.9026, 0.0001, 'AIV official errata log10N');
  approx(10 ** log10N, 7.99e9, 1e7, 'AIV official errata N');
  approx(flm2(164.4), 0.2009, 0.0001, 'AIV D2.3 FLM2');
  approx(3.1 - 0.1303 * Math.log(1.95e9), 0.31, 0.01, 'AIV D2.3 Lf');

  const diameterRows = parseSimpleCsv(read('docs/EI data/EI-P0-AIV/T2-6_diameter_ratio_modifier.csv'));
  for (const row of diameterRows) {
    if (!row.flm1_calculated) continue;
    approx(Number(row.flm1_calculated), flm1(Number(row.dext_ratio_D_over_d)), 6e-6, `FLM1 row ${row.dext_ratio_D_over_d}`);
  }
  const d23 = diameterRows.find((row) => row.authority_state === 'D2_3_RECALCULATION_PUBLISHED_VARIANCE_OPEN');
  assert.equal(d23?.published_d2_3_anchor, '1.2133');
  approx(Number(d23?.flm1_calculated), 1.2109758194311824, 1e-12, 'AIV D2.3 independent FLM1');
  const unresolvedTen = diameterRows.find((row) => row.dext_ratio_D_over_d === '10.0');
  assert.equal(unresolvedTen?.authority_state, 'UNRESOLVED_PENDING_DIRECT_T2_6_SOURCE_RECONCILIATION');

  const connectionRows = parseSimpleCsv(read('docs/EI data/EI-P0-AIV/T2-6_connection_modifier.csv'));
  for (const row of connectionRows) {
    approx(Number(row.weldolet_flm2_calculated), flm2(Number(row.pwl_db)), 6e-6, `FLM2 row ${row.pwl_db}`);
  }

  const material = read('docs/EI data/EI-P0-AIV/T2-6_material_modifier.csv');
  assert.match(material, /QUARANTINED_PENDING_DIRECT_T2_6_SOURCE_RECONCILIATION/);
  assert.doesNotMatch(material, /FLM3\s*=/);
}

function checkAuthority() {
  const sourceRegister = read('docs/EI data/EI-P0-AIV/T2-7_method_source_register.yaml');
  assert.match(sourceRegister, /PARTIAL_SOURCE_RECONCILIATION/);
  assert.match(sourceRegister, /BLOCKED_PENDING_CONTROLLED_T2_6_HUMAN_RECONCILIATION/);
  assert.match(sourceRegister, /60 \* L_dis_m \/ Dint_mm/);

  const p1 = read('docs/EI data/EI-P1-IDENTIFICATION/AUTHORITY_STATUS.yaml');
  assert.match(p1, /QUARANTINED_NOT_ENGINEERING_AUTHORITY/);
  assert.match(p1, /P1_IDENTIFICATION_SCORING_AUTHORITY|PRODUCTION_APPLICABILITY/);

  const global = read('docs/EI data/EI_SOURCE_AUTHORITY_STATUS.md');
  assert.match(global, /REFERENCE COMPILATION, NOT TRUST ROOT/);
  assert.match(global, /A\/S\/B/);

  const readme = read('docs/EI data/README.md');
  assert.match(readme, /does \*\*not\*\* automatically grant engineering authority/);
  assert.match(readme, /QUARANTINED_NOT_ENGINEERING_AUTHORITY/);
}

checkFit();
checkAivT25();
checkAivT26();
checkAuthority();

process.stdout.write(`${JSON.stringify({
  schema: 'EiAviffSourceMasterP0Check.v1',
  status: 'PASS',
  checks: ['FIT', 'AIV_T2_5', 'AIV_T2_6_VERIFIED_SUBSET', 'AUTHORITY_QUARANTINE'],
  designAuthority: false,
  sourcePromotionBeyondVerifiedSubset: false,
}, null, 2)}\n`);
