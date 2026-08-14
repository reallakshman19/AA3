#!/usr/bin/env node
/**
 * M047 Stage 2 data-only forensic for the one-axis over-cap restraint at node 20710.
 * Changes no solver mechanic. Reads raw ACCDB input/output rows and proves whether
 * the reference signal can be attributed to row mapping, co-located restraints,
 * cap partition, output aggregation, or nodal disequilibrium.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractCaesarAccdbTables } from '../src/core/fea-benchmarks/caesar-accdb-reader.js';
import { canonicalPrettyStringify, semanticHash } from '../src/core/shared-piping-model/canonical-json.js';

const EXPECTED_ACCDB = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const NODE = '20710';
const TABLES = [
  'INPUT_RESTRAINTS', 'INPUT_BASIC_ELEMENT_DATA', 'INPUT_BENDS', 'RESTRAINT_TYPES',
  'OUTPUT_RESTRAINTS', 'OUTPUT_RESTRAINTS_SUMMARY', 'OUTPUT_GLOBAL_ELEMENT_FORCES',
];

function n(v) { return Number(v); }
function abs(v) { return Math.abs(n(v)); }
function rowCase(row) { return Number(row.LCASE_NUM); }
function pick(row, fields) { return Object.fromEntries(fields.map((f) => [f, row[f]])); }

async function buildForensic({ accdbPath }) {
  const raw = await extractCaesarAccdbTables({ accdbPath, tableNames: TABLES, expectedSha256: EXPECTED_ACCDB });
  const inputs = raw.tables.INPUT_RESTRAINTS.rows.filter((r) => String(r.NODE_NUM) === NODE);
  const yInput = inputs.find((r) => n(r.RES_TYPEID) === 3);
  const limInput = inputs.find((r) => n(r.RES_TYPEID) === 9);
  if (!yInput || !limInput) throw new Error('20710 forensic requires one Rigid Y row and one Rigid LIM row.');
  if (!(n(yInput.FRIC_COEF) > 0) || !(n(limInput.FRIC_COEF) < 0)) {
    throw new Error('20710 friction declaration no longer matches governed Y-friction/LIM-frictionless boundary.');
  }
  const mu = n(yInput.FRIC_COEF);
  const typeById = new Map(raw.tables.RESTRAINT_TYPES.rows.map((r) => [n(r.RES_TYPEID), String(r.RES_TYPE)]));
  const perRestraint = raw.tables.OUTPUT_RESTRAINTS.rows.filter((r) => String(r.NODE) === NODE);
  const summary = raw.tables.OUTPUT_RESTRAINTS_SUMMARY.rows.filter((r) => String(r.NODE) === NODE);
  const yCases = perRestraint.filter((r) => String(r.TYPE) === 'Rigid Y').sort((a,b)=>rowCase(a)-rowCase(b));
  const limCases = perRestraint.filter((r) => String(r.TYPE) === 'Rigid LIM').sort((a,b)=>rowCase(a)-rowCase(b));
  const l13Y = yCases.find((r) => rowCase(r) === 13);
  const l13Lim = limCases.find((r) => rowCase(r) === 13);
  const l13Summary = summary.find((r) => rowCase(r) === 13);
  if (!l13Y || !l13Lim || !l13Summary) throw new Error('20710 L13 output rows are missing.');

  const finalNormal = abs(l13Y.FY);
  const tangent = abs(l13Y.FZ);
  const finalCap = mu * finalNormal;
  const utilisation = tangent / finalCap;
  const impliedNormal = tangent / mu;

  const frictionEnabled = [1,7,13].map((caseNo) => {
    const row = yCases.find((r) => rowCase(r) === caseNo);
    const normal = abs(row.FY); const fz = abs(row.FZ); const cap = mu * normal;
    return {
      caseNumber: caseNo,
      case: row.CASE,
      normalY_N: normal,
      tangentZ_N: fz,
      finalNormalCapN: cap,
      finalNormalUtilisation: cap > 0 ? fz / cap : null,
      impliedCapacityNormalN: fz / mu,
    };
  });
  const frictionless = [2,3,4,5,6].map((caseNo) => {
    const row = yCases.find((r) => rowCase(r) === caseNo);
    return { caseNumber: caseNo, case: row.CASE, FY_N: n(row.FY), FZ_N: n(row.FZ) };
  });

  const elements = raw.tables.INPUT_BASIC_ELEMENT_DATA.rows.filter((r) =>
    String(r.FROM_NODE) === NODE || String(r.TO_NODE) === NODE);
  const l13Ends = raw.tables.OUTPUT_GLOBAL_ELEMENT_FORCES.rows.filter((r) => rowCase(r) === 13
    && (String(r.FROM_NODE) === NODE || String(r.TO_NODE) === NODE));
  if (l13Ends.length !== 2) throw new Error(`Expected two L13 incident elements at 20710, got ${l13Ends.length}.`);
  const incident = { FX: 0, FY: 0, FZ: 0 };
  for (const r of l13Ends) {
    const atFrom = String(r.FROM_NODE) === NODE;
    incident.FX += n(r[atFrom ? 'FXF' : 'FXT']);
    incident.FY += n(r[atFrom ? 'FYF' : 'FYT']);
    incident.FZ += n(r[atFrom ? 'FZF' : 'FZT']);
  }
  const reaction = { FX: n(l13Summary.FX), FY: n(l13Summary.FY), FZ: n(l13Summary.FZ) };
  const equilibriumResidual = {
    FX: incident.FX + reaction.FX,
    FY: incident.FY + reaction.FY,
    FZ: incident.FZ + reaction.FZ,
  };
  const maxEquilibriumResidual = Math.max(...Object.values(equilibriumResidual).map(Math.abs));
  const equilibriumScale = Math.max(...Object.values(reaction).map(Math.abs));
  const equilibriumRelativeResidual = equilibriumScale > 0 ? maxEquilibriumResidual / equilibriumScale : null;
  const outputRoundoffRelativeLimit = 1e-6;

  const allFinalNormals = yCases.map((r) => ({ caseNumber: rowCase(r), normalY_N: abs(r.FY) }));
  const closestFinalNormal = [...allFinalNormals]
    .sort((a,b)=>Math.abs(a.normalY_N-impliedNormal)-Math.abs(b.normalY_N-impliedNormal))[0];

  const bendRows = raw.tables.INPUT_BENDS.rows;
  const bendPtr6 = bendRows.find((r) => n(r.BEND_PTR) === 6) ?? null;
  const nearbyElementRows = raw.tables.INPUT_BASIC_ELEMENT_DATA.rows.filter((r) =>
    [20690,20700,20710,20760].includes(n(r.FROM_NODE)) || [20690,20700,20710,20760].includes(n(r.TO_NODE)));

  const record = {
    schema: 'm047-bm4l-stage2-20710-forensic/v1',
    sourceAccdbSha256: raw.source.sha256,
    nodeId: NODE,
    sourceDeclarations: {
      rows: inputs.map((r) => ({
        restraintPointer: n(r.REST_PTR),
        restraintTypeId: n(r.RES_TYPEID),
        restraintType: typeById.get(n(r.RES_TYPEID)),
        frictionCoefficient: n(r.FRIC_COEF),
        stiffness: n(r.STIFFNESS), gap: n(r.GAP), cnode: n(r.CNODE),
        cosine: [n(r.XCOSINE),n(r.YCOSINE),n(r.ZCOSINE)],
      })),
      governedInterpretation: 'Rigid Y carries mu=0.3 and is the friction restraint; co-located Rigid LIM is frictionless and removes X, leaving Z as the only free tangent.',
      freeTangentialAxes: ['Z'],
    },
    l13Reference: {
      individualRigidY: pick(l13Y,['FX','FY','FZ','RESULTANTF','FUNITS','TYPE']),
      individualRigidLim: pick(l13Lim,['FX','FY','FZ','RESULTANTF','FUNITS','TYPE']),
      nodeSummary: pick(l13Summary,['FX','FY','FZ','RESULTANTF','FUNITS','TYPE']),
      coefficientOfFriction: mu,
      finalNormalY_N: finalNormal,
      referenceTangentZ_N: tangent,
      capFromFinalOwnNormalN: finalCap,
      referenceUtilisationAgainstFinalOwnNormal: utilisation,
      impliedNormalRequiredForExactCapN: impliedNormal,
      impliedNormalExcessOverFinalN: impliedNormal-finalNormal,
      impliedNormalExcessPercent: 100*(impliedNormal-finalNormal)/finalNormal,
    },
    crossCase: {
      frictionEnabledCases: frictionEnabled,
      frictionlessCases: frictionless,
      interpretation: 'L1 and L13 show ~1.11 utilisation while L7 is ~1.00; a fixed coefficient or load-case multiplier scaling error is therefore not supported by the raw outputs.',
      closestPublishedFinalNormalToL13ImpliedNormal: closestFinalNormal,
      impliedL13NormalAppearsAsPublishedFinalNormal: Math.abs(closestFinalNormal.normalY_N-impliedNormal) < 1e-6,
    },
    outputMapping: {
      rigidYRowCarriesTangentZDirectly: n(l13Y.FZ) === n(l13Summary.FZ),
      rigidLimCarriesOnlyX: n(l13Lim.FY) === 0 && n(l13Lim.FZ) === 0,
      summaryIsExactSumOfIndividualRows: ['FX','FY','FZ'].every((f) =>
        Math.abs(n(l13Summary[f]) - (n(l13Y[f]) + n(l13Lim[f]))) < 1e-9),
      conclusion: 'The 624.738 N Z force is present on the individual Rigid Y restraint row; it is not created by merging the co-located LIM into the summary.',
    },
    nodalEquilibrium: {
      incidentElementEnds: l13Ends.map((r) => ({
        fromNode: n(r.FROM_NODE), toNode: n(r.TO_NODE),
        nodeEnd: String(r.FROM_NODE) === NODE ? 'FROM' : 'TO',
        forceN: String(r.FROM_NODE) === NODE ? [n(r.FXF),n(r.FYF),n(r.FZF)] : [n(r.FXT),n(r.FYT),n(r.FZT)],
      })),
      incidentSumN: incident,
      restraintSummaryReactionN: reaction,
      residualIncidentPlusReactionN: equilibriumResidual,
      maximumAbsoluteResidualN: maxEquilibriumResidual,
      reactionScaleN: equilibriumScale,
      relativeResidual: equilibriumRelativeResidual,
      outputRoundoffRelativeLimit,
      boundary: 'DATA_ONLY_RAW_OUTPUT_ROW_ARITHMETIC_CHECK_NOT_A_SOLVER_QUALIFICATION_TOLERANCE',
      status: equilibriumRelativeResidual !== null && equilibriumRelativeResidual <= outputRoundoffRelativeLimit ? 'PASS_FLOAT32_ROUNDOFF' : 'FAIL',
      conclusion: 'The over-cap Z reaction is required by the published L13 element-end equilibrium; it is not a detached reporting artifact.',
    },
    localGeometry: {
      incidentInputElements: elements.map((r) => ({ elementId:n(r.ELEMENTID), fromNode:n(r.FROM_NODE),toNode:n(r.TO_NODE),delta:[n(r.DELTA_X),n(r.DELTA_Y),n(r.DELTA_Z)],bendPointer:n(r.BEND_PTR),restraintPointer:n(r.REST_PTR) })),
      adjacentBendPointer6: bendPtr6 === null ? null : pick(bendPtr6,['BEND_PTR','RADIUS','NODE1','NODE2','NODE3']),
      nearbyElements: nearbyElementRows.map((r) => ({ elementId:n(r.ELEMENTID),fromNode:n(r.FROM_NODE),toNode:n(r.TO_NODE),delta:[n(r.DELTA_X),n(r.DELTA_Y),n(r.DELTA_Z)],bendPointer:n(r.BEND_PTR) })),
      conclusion: '20710 is bend-adjacent but is not a declared bend station; R5 therefore does not authorize a rotated friction plane.',
    },
    exclusions: {
      perAxisPartitionCanDirectlyExplain20710: false,
      coefficientOrMultiplierMismatchSupported: false,
      summaryAggregationArtifactSupported: false,
      nodalDisequilibriumSupported: false,
      bendTangentPlaneChangeAuthorized: false,
    },
    remainingHypothesis: {
      status: 'UNRESOLVED_DATA_SUPPORTED_DIRECTION',
      text: 'The raw file leaves a case-dependent capacity-history/timing mechanism as the leading explanation: the force corresponds to an implied normal larger than the published final own normal, while no source field declares a larger coefficient or alternate normal. This is an inference, not yet a measured solver mechanic.',
      nextDiscriminator: 'Instrument accepted D1 with a lagged-normal capacity update only, using previous-iteration own-restraint normal for mu|N| while keeping final equilibrium and all convergence gates unchanged.',
    },
  };
  return { ...record, diagnosticSemanticHash: semanticHash(record) };
}

function parse(argv){ const a=new Map(); for(let i=0;i<argv.length;i+=2)a.set(argv[i],argv[i+1]); const accdbPath=a.get('--accdb'); if(!accdbPath)throw new TypeError('Usage: --accdb <BM4_L.ACCDB> [--out file]'); return {accdbPath,out:a.get('--out')}; }
const scriptPath=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===scriptPath){ const a=parse(process.argv.slice(2)); const r=await buildForensic(a); if(a.out){const p=resolve(a.out);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,`${canonicalPrettyStringify(r)}\n`);} process.stdout.write(`${canonicalPrettyStringify({utilisation:r.l13Reference.referenceUtilisationAgainstFinalOwnNormal,impliedNormalN:r.l13Reference.impliedNormalRequiredForExactCapN,equilibrium:r.nodalEquilibrium.status,next:r.remainingHypothesis.nextDiscriminator})}\n`); }
export { buildForensic };
