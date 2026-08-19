/**
 * BM4 vs. real CAESAR II output.
 *
 * Passing pre-flight is not success; agreeing with CAESAR is. This module
 * solves the vendored BM4 model through the production InputXML path and
 * compares restraint reactions and nodal displacements against
 * `Output_BM4.xml` -- real CAESAR II results for this exact model.
 *
 * Sign convention: this repository reports the reaction applied BY the
 * restraint TO the structure. CAESAR's RESTRAINT_REPORT exports the
 * equal-and-opposite force applied BY the pipe TO the restraint hardware, so
 * every CAESAR reaction is negated before differencing (the same convention
 * `lfea-bm1-cii-output-comparison.mjs` already established and hand-verified).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createLinearPipingInputXmlIntake } from '../src/workspace/linear-piping-inputxml-intake.js';
import {
  authorizeLinearPipingInputXmlPreFlight,
  prepareLinearPipingInputXmlPreFlight,
} from '../src/workspace/linear-piping-inputxml-prefea.js';
import { createLfeaNativeExecutionAuthority } from '../src/lfea/native-execution-authority.js';

export const BM4_REPAIRED_PATH = fileURLToPath(new URL('../benchmarks/LFEA/BM4/InputXML_BM4.repaired.xml', import.meta.url));
export const BM4_SOURCE_PATH = fileURLToPath(new URL('../benchmarks/LFEA/BM4/InputXML_BM4.xml', import.meta.url));
export const BM4_CII_OUTPUT_PATH = fileURLToPath(new URL('../benchmarks/LFEA/BM4/Output_BM4.xml', import.meta.url));

/** Our sustained/operating cases, paired with the CAESAR case each mirrors. */
export const BM4_CASE_PAIRS = Object.freeze([
  Object.freeze({ caseId: 'IXP-WP', ciiLoadCase: 'CASE 17 (SUS) W+P1' }),
  Object.freeze({ caseId: 'IXP-WPT', ciiLoadCase: 'CASE 20 (OPE) W+T1+P1' }),
]);

const TRANSLATION_DOFS = Object.freeze([['UX', 'DX'], ['UY', 'DY'], ['UZ', 'DZ']]);

function tagAttributes(tag) {
  const out = {};
  for (const match of tag.matchAll(/([A-Z_0-9]+)="([^"]*)"/gu)) out[match[1]] = match[2];
  return out;
}

function reportBody(xml, tagName, loadCase) {
  for (const match of xml.matchAll(new RegExp(`<${tagName}[^>]*>`, 'gu'))) {
    if (!match[0].includes(`LOADCASE="${loadCase}"`)) continue;
    return xml.slice(match.index + match[0].length, xml.indexOf(`</${tagName}>`, match.index));
  }
  throw new Error(`Output_BM4.xml has no ${tagName} for ${loadCase}.`);
}

/** CAESAR displacements, exactly as reported (mm, deg). */
export function parseCiiDisplacements(xml, loadCase) {
  const body = reportBody(xml, 'DISPLACEMENT_REPORT', loadCase);
  const rows = new Map();
  for (const match of body.matchAll(/<NODE NUMBER="([^"]*)">([\s\S]*?)<\/NODE>/gu)) {
    const translations = /<TRANSLATIONS[^>]*>/u.exec(match[2]);
    if (translations === null) continue;
    const values = tagAttributes(translations[0]);
    rows.set(String(Math.round(Number(match[1]))), {
      DX: Number(values.DX), DY: Number(values.DY), DZ: Number(values.DZ),
    });
  }
  return rows;
}

/**
 * CAESAR restraint reactions, summed per node and NEGATED into this repo's
 * convention. CAESAR exports one RESTRAINT row per restraint, so a node
 * carrying (say) +Y plus GUIDE plus LIM contributes three rows that together
 * make up that node's total reaction -- which is what our solver reports as a
 * single per-DOF reaction. `types` retains CAESAR's own labels, which are the
 * evidence for which linearizations hold.
 */
export function parseCiiRestraints(xml, loadCase) {
  const body = reportBody(xml, 'RESTRAINT_REPORT', loadCase);
  const rows = new Map();
  for (const match of body.matchAll(/<RESTRAINT NODE="([^"]*)" TYPE="([^"]*)"[\s\S]*?<FORCES ([^/]*)\//gu)) {
    const node = String(Math.round(Number(match[1])));
    const values = tagAttributes(`<x ${match[3]}>`);
    const previous = rows.get(node) ?? { UX: 0, UY: 0, UZ: 0, types: [] };
    rows.set(node, {
      UX: previous.UX - Number(values.FX),
      UY: previous.UY - Number(values.FY),
      UZ: previous.UZ - Number(values.FZ),
      types: [...previous.types, match[2]],
    });
  }
  return rows;
}

function byNode(rows) {
  const out = new Map();
  for (const row of rows) {
    const node = String(row.nodeId).replace(/^.*\.N/u, '');
    if (!out.has(node)) out.set(node, {});
    out.get(node)[row.dof] = row.value;
  }
  return out;
}

/** Solve BM4 through the same production path the LFEA tab uses. */
export function solveBm4(caseIds) {
  const content = readFileSync(BM4_REPAIRED_PATH, 'utf8');
  let preFlight = prepareLinearPipingInputXmlPreFlight(
    createLinearPipingInputXmlIntake({ fileName: 'InputXML_BM4.repaired.xml', content }, { requestedCaseIds: caseIds }),
  );
  if (preFlight.status === 'BLOCK') {
    throw new Error('BM4 unexpectedly BLOCKED at pre-flight; see lfea-bm4-inputxml-preflight-check.mjs.');
  }
  if (!preFlight.solveAuthorized) {
    preFlight = authorizeLinearPipingInputXmlPreFlight(preFlight, {
      approverIdentity: 'LFEA-BM4-CII-COMPARISON',
      reason: 'Comparison-only acceptance of the disclosed conditional limitation set.',
    });
  }
  const state = createLfeaNativeExecutionAuthority().run(preFlight, { requestedCaseIds: caseIds });
  return { preFlight, batch: state.execution };
}

function percent(ours, cii) {
  return cii === 0 ? null : ((ours - cii) / Math.abs(cii)) * 100;
}

export function buildBm4CiiComparison() {
  const xml = readFileSync(BM4_CII_OUTPUT_PATH, 'utf8');
  const caseIds = BM4_CASE_PAIRS.map((row) => row.caseId);
  const { batch } = solveBm4(caseIds);
  const cases = {};
  for (const { caseId, ciiLoadCase } of BM4_CASE_PAIRS) {
    const execution = batch.caseExecutions.find((row) => row.caseId === caseId);
    cases[caseId] = {
      ciiLoadCase,
      executionStatus: execution.executionStatus,
      diagnostics: solverDiagnosticSummary(execution.execution.diagnostics),
      restraint: compareRestraints(execution, parseCiiRestraints(xml, ciiLoadCase)),
      displacement: compareDisplacements(execution, parseCiiDisplacements(xml, ciiLoadCase)),
    };
  }
  return {
    schema: 'lfea-bm4-cii-output-comparison/v1',
    cases,
    limitations: BM4_COMPARISON_LIMITATIONS,
  };
}

function solverDiagnosticSummary(diagnostics) {
  return {
    residual: { value: diagnostics.residual.value, limit: diagnostics.residual.limit, status: diagnostics.residual.status },
    forceEquilibrium: { value: diagnostics.forceEquilibrium.value, status: diagnostics.forceEquilibrium.status },
    momentEquilibrium: { value: diagnostics.momentEquilibrium.value, status: diagnostics.momentEquilibrium.status },
    energyBalance: { value: diagnostics.energyBalance.value, status: diagnostics.energyBalance.status },
    conditionEstimate: { value: diagnostics.conditioning.value, status: diagnostics.conditioning.status },
  };
}

function compareRestraints(execution, cii) {
  const ours = byNode(execution.execution.reactions);
  const matched = [];
  const unmatchedCiiNodes = [];
  let ourTotalUY = 0;
  let ciiTotalUY = 0;
  for (const [nodeId, ciiRow] of cii) {
    const ourRow = ours.get(nodeId);
    if (ourRow === undefined) { unmatchedCiiNodes.push(nodeId); continue; }
    const row = { nodeId, ciiTypes: ciiRow.types.join(' + ') };
    for (const dof of ['UX', 'UY', 'UZ']) {
      const oursValue = ourRow[dof] ?? 0;
      row[dof] = { ours: oursValue, cii: ciiRow[dof], difference: oursValue - ciiRow[dof], percentDifference: percent(oursValue, ciiRow[dof]) };
    }
    ourTotalUY += row.UY.ours;
    ciiTotalUY += row.UY.cii;
    matched.push(row);
  }
  return {
    matched,
    unmatchedCiiNodes,
    unmatchedOurNodes: [...ours.keys()].filter((node) => !cii.has(node)),
    totalUY: { ours: ourTotalUY, cii: ciiTotalUY, percentDifference: percent(ourTotalUY, ciiTotalUY) },
    unilateralTensionNodes: unilateralTensionNodes(matched),
  };
}

/**
 * A "+Y" support can only push the pipe up. Where our linearization reports a
 * downward (negative UY) reaction at one, it is holding the pipe DOWN -- a
 * support CAESAR's nonlinear solve lifts off instead. This is the single
 * crispest, checkable signature of the unilateral-restraint linearization, so
 * it is measured and reported rather than left implicit.
 */
function unilateralTensionNodes(matched) {
  return matched
    .filter((row) => row.ciiTypes.includes('+Y') && !row.ciiTypes.includes('ANC') && row.UY.ours < 0)
    .map((row) => ({ nodeId: row.nodeId, ciiTypes: row.ciiTypes, ourUY: row.UY.ours, ciiUY: row.UY.cii }));
}

function compareDisplacements(execution, cii) {
  const ours = byNode(execution.execution.displacement);
  const matched = [];
  let ourSum = 0;
  let ciiSum = 0;
  for (const [nodeId, ciiRow] of cii) {
    const ourRow = ours.get(nodeId);
    if (ourRow === undefined) continue;
    const row = { nodeId };
    for (const [ourDof, ciiDof] of TRANSLATION_DOFS) {
      // Our translations are metres; CAESAR reports millimetres.
      const oursValue = (ourRow[ourDof] ?? 0) * 1000;
      row[ourDof] = { ours: oursValue, cii: ciiRow[ciiDof], difference: oursValue - ciiRow[ciiDof] };
      ourSum += Math.abs(oursValue);
      ciiSum += Math.abs(ciiRow[ciiDof]);
    }
    matched.push(row);
  }
  return {
    matched,
    unmatchedCiiNodes: [...cii.keys()].filter((node) => !ours.has(node)),
    totalAbsoluteTranslation: { ours: ourSum, cii: ciiSum, ratio: ciiSum === 0 ? null : ourSum / ciiSum },
  };
}

export const BM4_COMPARISON_LIMITATIONS = Object.freeze([
  'CAESAR solved BM4 with its nonlinear restraint treatment active: unilateral (+Y) supports lift off, and gapped GUIDE/LIM supports stay open until their gap closes. This consumer linearizes every restrained DOF as bidirectionally FIXED and discloses that as GENERIC_APPROX_GAP_CLOSED / GENERIC_APPROX_FRICTION_IGNORED. Every deviation recorded here at a gapped or unilateral support is attributable to that declared approximation, not to a solver defect.',
  'CAESAR reports 112 displacement nodes against this model\'s 97: CAESAR inserts its own intermediate bend nodes. Only the 97 nodes declared by the source model are compared; no approximate station matching is used.',
  'reaction values are the reaction applied BY the restraint TO the structure (this repository\'s standing convention). CAESAR\'s RESTRAINT_REPORT exports the equal-and-opposite force applied BY the pipe TO the restraint hardware, so every CAESAR reaction is negated before differencing.',
  'The comparison runs on InputXML_BM4.repaired.xml, whose three corrected backtracking elements are documented in benchmarks/LFEA/BM4/PROVENANCE.md and reproducible via scripts/lfea-bm4-collinear-repair.mjs. The as-received model BLOCKs on TOPOLOGY_COLLINEAR_SEGMENT_OVERLAP and cannot be solved at all.',
]);
