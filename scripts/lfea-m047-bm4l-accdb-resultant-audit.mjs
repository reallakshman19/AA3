#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const TARGET_CASES = Object.freeze(['L2', 'L3', 'L4', 'L5', 'L6', 'L14']);
const TARGET_LCASE = Object.freeze({ L2: 2, L3: 3, L4: 4, L5: 5, L6: 6, L14: 14 });
const SOURCE_SHA256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8';
const RELATIVE_LIMIT = 0.10;
const EPS = 1e-12;

const args = parseArgs(process.argv.slice(2));
const raw = readJson(required(args, 'raw'));
const actual = readJson(required(args, 'actual'));
const benchmark = readJson(required(args, 'report'));
const outPath = resolve(required(args, 'out'));
const summaryPath = resolve(required(args, 'summary-out'));

requireSource(raw, actual, benchmark);
const report = buildAudit(raw, actual, benchmark);
writeJson(outPath, report);
writeText(summaryPath, renderSummary(report));
console.log(JSON.stringify(report.summary, null, 2));

function buildAudit(rawExport, actualPackage, benchmarkReport) {
  const basic = requiredTable(rawExport, 'INPUT_BASIC_ELEMENT_DATA').rows;
  const coordinates = requiredTable(rawExport, 'INPUT_NODAL_COORDINATES').rows;
  const globalRows = requiredTable(rawExport, 'OUTPUT_GLOBAL_ELEMENT_FORCES').rows;
  const localRows = requiredTable(rawExport, 'OUTPUT_LOCAL_ELEMENT_FORCES').rows;

  const geometryByElement = buildGeometryIndex(basic, coordinates);
  const globalByCasePair = indexOutputRows(globalRows);
  const localByCasePair = indexOutputRows(localRows);
  const failuresByCase = comparisonFailures(benchmarkReport);

  const cases = {};
  let worstReferenceLocalGlobalInvariant = 0;
  let totalFailedComponents = 0;
  let totalComponentOnly = 0;
  let totalTrueResultant = 0;

  for (const caseId of TARGET_CASES) {
    const lcase = TARGET_LCASE[caseId];
    const sourceActual = sourceActualIndex(actualPackage.cases?.[caseId]?.rows ?? []);
    const rows = [];

    for (const geometry of geometryByElement.values()) {
      const pairKey = `${formatNode(geometry.fromNode)}->${formatNode(geometry.toNode)}`;
      const referenceGlobal = globalByCasePair.get(`${lcase}|${pairKey}`);
      const referenceLocal = localByCasePair.get(`${lcase}|${pairKey}`);
      if (!referenceGlobal || !referenceLocal) continue;

      const entry = buildResultantRow({
        caseId,
        lcase,
        geometry,
        referenceGlobal,
        referenceLocal,
        sourceActual: sourceActual.get(String(geometry.elementId)) ?? null,
      });
      worstReferenceLocalGlobalInvariant = Math.max(
        worstReferenceLocalGlobalInvariant,
        entry.referenceInternalInvariant.maximumRelativeError,
      );
      rows.push(entry);
    }

    const byElement = new Map(rows.map((row) => [String(row.elementId), row]));
    const failedComponents = failuresByCase.get(caseId) ?? [];
    const classification = classifyFailedComponents(failedComponents, byElement);
    totalFailedComponents += classification.targetedGlobalEndComponentFailures;
    totalComponentOnly += classification.componentOnlyWithResultantWithin10Percent;
    totalTrueResultant += classification.associatedResultantOver10Percent;

    cases[caseId] = Object.freeze({
      lcaseNumber: lcase,
      sourceElementResultantRows: Object.freeze(rows),
      classification,
      topResultantErrors: Object.freeze(
        rows
          .flatMap((row) => topErrorsForRow(row))
          .sort((a, b) => b.relativeError - a.relativeError || b.absoluteError - a.absoluteError)
          .slice(0, 30),
      ),
    });
  }

  const summary = Object.freeze({
    sourceSha256: SOURCE_SHA256,
    targetCases: TARGET_CASES,
    referenceLocalGlobalInvariantMaximumRelativeError: worstReferenceLocalGlobalInvariant,
    targetedGlobalEndComponentFailures: totalFailedComponents,
    componentOnlyWithAssociatedResultantsWithin10Percent: totalComponentOnly,
    associatedResultantOver10Percent: totalTrueResultant,
    interpretation: Object.freeze([
      'The ACCDB local/global invariant is evaluated only from BM4_L.ACCDB output tables; it does not use another model or external CAESAR report.',
      'A failed global component is classified as component-only when the associated axial/shear or torsion/bending resultant errors remain within the unchanged 10% issue threshold.',
      'Resultant classification is diagnostic only and does not alter issue #991 acceptance, which remains literal component-by-component comparison.',
    ]),
  });

  return Object.freeze({
    schema: 'lfea-m047-bm4l-accdb-resultant-audit/v1',
    source: Object.freeze({
      accdbSha256: SOURCE_SHA256,
      rawExportProvider: rawExport.provider,
      profileId: benchmarkReport.profileId ?? null,
    }),
    summary,
    cases: Object.freeze(cases),
  });
}

function buildResultantRow(input) {
  const t = input.geometry.tangent;
  const refFromForce = vector(input.referenceGlobal, ['FXF', 'FYF', 'FZF']);
  const refToForce = vector(input.referenceGlobal, ['FXT', 'FYT', 'FZT']);
  const refFromMoment = vector(input.referenceGlobal, ['MXF', 'MYF', 'MZF']);
  const refToMoment = vector(input.referenceGlobal, ['MXT', 'MYT', 'MZT']);
  const localFromForce = vector(input.referenceLocal, ['FXF', 'FYF', 'FZF']);
  const localToForce = vector(input.referenceLocal, ['FXT', 'FYT', 'FZT']);
  const localFromMoment = vector(input.referenceLocal, ['MXF', 'MYF', 'MZF']);
  const localToMoment = vector(input.referenceLocal, ['MXT', 'MYT', 'MZT']);

  const refFrom = resultants(refFromForce, refFromMoment, t);
  const refTo = resultants(refToForce, refToMoment, t);
  const localFrom = localResultants(localFromForce, localFromMoment);
  const localTo = localResultants(localToForce, localToMoment);

  const caesarDeclared = Object.freeze({
    FROM: Object.freeze({
      axialForce: Math.abs(number(input.referenceGlobal.AXIAL_FORCEF)),
      shearForce: Math.abs(number(input.referenceGlobal.SHEAR_FORCEF)),
      bendingMoment: Math.abs(number(input.referenceGlobal.BENDING_MOMENTF)),
      torsionMoment: Math.abs(number(input.referenceGlobal.TORSION_MOMENTF)),
    }),
    TO: Object.freeze({
      axialForce: Math.abs(number(input.referenceGlobal.AXIAL_FORCET)),
      shearForce: Math.abs(number(input.referenceGlobal.SHEAR_FORCET)),
      bendingMoment: Math.abs(number(input.referenceGlobal.BENDING_MOMENTT)),
      torsionMoment: Math.abs(number(input.referenceGlobal.TORSION_MOMENTT)),
    }),
  });

  const invariantComparisons = [
    compareMagnitude('FROM.axial.global-v-local', refFrom.axialForce, localFrom.axialForce),
    compareMagnitude('FROM.shear.global-v-local', refFrom.shearForce, localFrom.shearForce),
    compareMagnitude('FROM.bending.global-v-local', refFrom.bendingMoment, localFrom.bendingMoment),
    compareMagnitude('FROM.torsion.global-v-local', refFrom.torsionMoment, localFrom.torsionMoment),
    compareMagnitude('TO.axial.global-v-local', refTo.axialForce, localTo.axialForce),
    compareMagnitude('TO.shear.global-v-local', refTo.shearForce, localTo.shearForce),
    compareMagnitude('TO.bending.global-v-local', refTo.bendingMoment, localTo.bendingMoment),
    compareMagnitude('TO.torsion.global-v-local', refTo.torsionMoment, localTo.torsionMoment),
    compareMagnitude('FROM.axial.global-v-declared', refFrom.axialForce, caesarDeclared.FROM.axialForce),
    compareMagnitude('FROM.shear.global-v-declared', refFrom.shearForce, caesarDeclared.FROM.shearForce),
    compareMagnitude('FROM.bending.global-v-declared', refFrom.bendingMoment, caesarDeclared.FROM.bendingMoment),
    compareMagnitude('FROM.torsion.global-v-declared', refFrom.torsionMoment, caesarDeclared.FROM.torsionMoment),
    compareMagnitude('TO.axial.global-v-declared', refTo.axialForce, caesarDeclared.TO.axialForce),
    compareMagnitude('TO.shear.global-v-declared', refTo.shearForce, caesarDeclared.TO.shearForce),
    compareMagnitude('TO.bending.global-v-declared', refTo.bendingMoment, caesarDeclared.TO.bendingMoment),
    compareMagnitude('TO.torsion.global-v-declared', refTo.torsionMoment, caesarDeclared.TO.torsionMoment),
  ];

  const actual = input.sourceActual === null ? null : Object.freeze({
    FROM: resultants(input.sourceActual.FROM.force, input.sourceActual.FROM.moment, t),
    TO: resultants(input.sourceActual.TO.force, input.sourceActual.TO.moment, t),
  });
  const comparison = actual === null ? null : Object.freeze({
    FROM: compareResultants(actual.FROM, refFrom),
    TO: compareResultants(actual.TO, refTo),
  });

  return Object.freeze({
    caseId: input.caseId,
    lcaseNumber: input.lcase,
    elementId: input.geometry.elementId,
    fromNode: input.geometry.fromNode,
    toNode: input.geometry.toNode,
    kind: input.geometry.kind,
    tangent: Object.freeze(t),
    reference: Object.freeze({ FROM: refFrom, TO: refTo }),
    referenceLocal: Object.freeze({ FROM: localFrom, TO: localTo }),
    caesarDeclared,
    referenceInternalInvariant: Object.freeze({
      maximumRelativeError: Math.max(...invariantComparisons.map((row) => row.relativeError)),
      comparisons: Object.freeze(invariantComparisons),
    }),
    actual,
    comparison,
  });
}

function classifyFailedComponents(failures, byElement) {
  let targeted = 0;
  let componentOnly = 0;
  let resultantFail = 0;
  let unmatched = 0;
  const rows = [];

  for (const failure of failures) {
    if (failure.entityKind !== 'ELEMENT' || !String(failure.quantity).startsWith('GLOBAL_END_')) continue;
    targeted += 1;
    const parsed = sourceElementId(failure.entityId);
    const end = String(failure.quantity).endsWith('_FROM') ? 'FROM' : 'TO';
    const audit = parsed === null ? null : byElement.get(parsed);
    if (!audit?.comparison) {
      unmatched += 1;
      continue;
    }

    const isForce = String(failure.quantity).includes('FORCE');
    const cmp = audit.comparison[end];
    const relevant = isForce
      ? [cmp.axialForce, cmp.shearForce]
      : [cmp.bendingMoment, cmp.torsionMoment];
    const over = relevant.some((entry) => entry.relativeError > RELATIVE_LIMIT);
    if (over) resultantFail += 1;
    else componentOnly += 1;
    rows.push(Object.freeze({
      entityId: failure.entityId,
      elementId: parsed,
      end,
      quantity: failure.quantity,
      component: failure.component,
      referenceValue: failure.referenceValue,
      actualValue: failure.actualValue,
      componentRelativeError: failure.rawRelativeError,
      classification: over ? 'ASSOCIATED_RESULTANT_OVER_10_PERCENT' : 'COMPONENT_ONLY_RESULTANTS_WITHIN_10_PERCENT',
      associatedResultants: Object.freeze(relevant),
    }));
  }

  return Object.freeze({
    targetedGlobalEndComponentFailures: targeted,
    componentOnlyWithResultantWithin10Percent: componentOnly,
    associatedResultantOver10Percent: resultantFail,
    unmatched,
    rows: Object.freeze(rows),
  });
}

function compareResultants(actual, reference) {
  return Object.freeze({
    axialForce: compareMagnitude('axialForce', actual.axialForce, reference.axialForce),
    shearForce: compareMagnitude('shearForce', actual.shearForce, reference.shearForce),
    bendingMoment: compareMagnitude('bendingMoment', actual.bendingMoment, reference.bendingMoment),
    torsionMoment: compareMagnitude('torsionMoment', actual.torsionMoment, reference.torsionMoment),
  });
}

function topErrorsForRow(row) {
  if (!row.comparison) return [];
  const out = [];
  for (const end of ['FROM', 'TO']) {
    for (const quantity of ['axialForce', 'shearForce', 'bendingMoment', 'torsionMoment']) {
      const cmp = row.comparison[end][quantity];
      out.push(Object.freeze({
        elementId: row.elementId,
        fromNode: row.fromNode,
        toNode: row.toNode,
        kind: row.kind,
        end,
        quantity,
        reference: cmp.reference,
        actual: cmp.actual,
        absoluteError: cmp.absoluteError,
        relativeError: cmp.relativeError,
      }));
    }
  }
  return out;
}

function resultants(force, moment, tangent) {
  const axialSigned = dot(force, tangent);
  const torsionSigned = dot(moment, tangent);
  const shearVector = subtract(force, scale(tangent, axialSigned));
  const bendingVector = subtract(moment, scale(tangent, torsionSigned));
  return Object.freeze({
    axialForce: Math.abs(axialSigned),
    shearForce: norm(shearVector),
    bendingMoment: norm(bendingVector),
    torsionMoment: Math.abs(torsionSigned),
  });
}

function localResultants(force, moment) {
  return Object.freeze({
    axialForce: Math.abs(force[0]),
    shearForce: Math.hypot(force[1], force[2]),
    bendingMoment: Math.hypot(moment[1], moment[2]),
    torsionMoment: Math.abs(moment[0]),
  });
}

function sourceActualIndex(rows) {
  const map = new Map();
  for (const row of rows) {
    const elementId = sourceElementId(row.entityId);
    if (elementId === null) continue;
    const end = String(row.quantity).endsWith('_FROM') ? 'FROM'
      : String(row.quantity).endsWith('_TO') ? 'TO' : null;
    if (end === null) continue;
    const isForce = String(row.quantity).includes('FORCE');
    const isMoment = String(row.quantity).includes('MOMENT');
    if (!isForce && !isMoment) continue;
    const entry = map.get(elementId) ?? {
      FROM: { force: [0, 0, 0], moment: [0, 0, 0] },
      TO: { force: [0, 0, 0], moment: [0, 0, 0] },
    };
    const index = componentIndex(row.component);
    if (index === null) continue;
    if (isForce) entry[end].force[index] = number(row.value);
    if (isMoment) entry[end].moment[index] = number(row.value);
    map.set(elementId, entry);
  }
  return map;
}

function comparisonFailures(report) {
  const map = new Map();
  for (const caseRecord of report.qualification?.cases ?? []) {
    const id = String(caseRecord.caseId);
    if (!TARGET_CASES.includes(id)) continue;
    map.set(id, Object.freeze((caseRecord.comparison?.rows ?? []).filter((row) => row.status === 'FAIL')));
  }
  return map;
}

function buildGeometryIndex(basicRows, coordinateRows) {
  const coordinates = new Map(coordinateRows.map((row) => [String(row.ELEMENTID ?? `${row.FROM_NODE}->${row.TO_NODE}`), row]));
  const byPair = new Map(coordinateRows.map((row) => [`${formatNode(row.FROM_NODE)}->${formatNode(row.TO_NODE)}`, row]));
  const map = new Map();
  for (const row of basicRows) {
    const pairKey = `${formatNode(row.FROM_NODE)}->${formatNode(row.TO_NODE)}`;
    const c = coordinates.get(String(row.ELEMENTID)) ?? byPair.get(pairKey);
    if (!c) throw new Error(`Missing nodal coordinates for ACCDB element ${row.ELEMENTID}.`);
    const from = [number(c.FROM_NODE_X) * 0.001, number(c.FROM_NODE_Y) * 0.001, number(c.FROM_NODE_Z) * 0.001];
    const to = [number(c.TO_NODE_X) * 0.001, number(c.TO_NODE_Y) * 0.001, number(c.TO_NODE_Z) * 0.001];
    const delta = subtract(to, from);
    const length = norm(delta);
    if (!(length > EPS)) throw new Error(`Zero source chord for element ${row.ELEMENTID}.`);
    map.set(String(row.ELEMENTID), Object.freeze({
      elementId: String(row.ELEMENTID),
      fromNode: String(row.FROM_NODE),
      toNode: String(row.TO_NODE),
      kind: number(row.BEND_PTR) > 0 ? 'BEND_SOURCE'
        : number(row.RIGID_PTR) > 0 ? 'RIGID_SOURCE'
        : number(row.REDUCER_PTR) > 0 ? 'REDUCER_SOURCE'
        : 'FRAME_SOURCE',
      tangent: Object.freeze(delta.map((value) => value / length)),
    }));
  }
  return map;
}

function indexOutputRows(rows) {
  const map = new Map();
  for (const row of rows) {
    const lcase = Number(row.LCASE_NUM);
    if (!Object.values(TARGET_LCASE).includes(lcase)) continue;
    const key = `${lcase}|${formatNode(row.FROM_NODE)}->${formatNode(row.TO_NODE)}`;
    if (map.has(key)) throw new Error(`Duplicate ACCDB output row ${key}.`);
    map.set(key, row);
  }
  return map;
}

function compareMagnitude(label, actualInput, referenceInput) {
  const actual = Math.abs(number(actualInput));
  const reference = Math.abs(number(referenceInput));
  const absoluteError = Math.abs(actual - reference);
  const relativeError = reference > EPS ? absoluteError / reference : (absoluteError <= EPS ? 0 : Number.POSITIVE_INFINITY);
  return Object.freeze({ label, actual, reference, absoluteError, relativeError });
}

function renderSummary(report) {
  const lines = [];
  lines.push('# BM4_L ACCDB-only resultant audit');
  lines.push('');
  lines.push(`Source ACCDB SHA-256: \`${report.source.accdbSha256}\``);
  lines.push('');
  lines.push('This audit consumes only BM4_L.ACCDB input/output tables plus the LFEA solve being compared. It does not alter the literal issue acceptance threshold.');
  lines.push('');
  lines.push(`Maximum CAESAR local/global resultant invariant error: **${formatPercent(report.summary.referenceLocalGlobalInvariantMaximumRelativeError)}**.`);
  lines.push('');
  lines.push('| Case | Global end component fails | Resultants <=10% | Associated resultant >10% | Unmatched |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const caseId of TARGET_CASES) {
    const c = report.cases[caseId].classification;
    lines.push(`| ${caseId} | ${c.targetedGlobalEndComponentFailures} | ${c.componentOnlyWithResultantWithin10Percent} | ${c.associatedResultantOver10Percent} | ${c.unmatched} |`);
  }
  lines.push('');
  lines.push('## Highest resultant errors');
  lines.push('');
  for (const caseId of TARGET_CASES) {
    lines.push(`### ${caseId}`);
    lines.push('');
    lines.push('| Element | End | Resultant | Reference | LFEA | Error |');
    lines.push('|---|---|---|---:|---:|---:|');
    for (const row of report.cases[caseId].topResultantErrors.slice(0, 12)) {
      lines.push(`| ${row.elementId} (${row.fromNode}->${row.toNode}) | ${row.end} | ${row.quantity} | ${formatNumber(row.reference)} | ${formatNumber(row.actual)} | ${formatPercent(row.relativeError)} |`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function requiredTable(raw, name) {
  const table = raw.tables?.[name];
  if (!table || !Array.isArray(table.rows)) throw new Error(`Missing ACCDB table ${name}.`);
  return table;
}

function requireSource(raw, actual, report) {
  const hashes = [raw.source?.sha256, actual.sourceAccdbSha256, report.source?.sha256]
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase());
  for (const hash of hashes) if (hash !== SOURCE_SHA256) throw new Error(`BM4_L ACCDB custody mismatch: ${hash}.`);
}

function sourceElementId(entityId) {
  const match = /^INPUT_ELEMENT:(\d+)\|/u.exec(String(entityId));
  return match ? match[1] : null;
}

function componentIndex(component) {
  const c = String(component).toUpperCase();
  if (c.endsWith('X')) return 0;
  if (c.endsWith('Y')) return 1;
  if (c.endsWith('Z')) return 2;
  return null;
}

function vector(row, fields) { return fields.map((field) => number(row[field])); }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function subtract(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function scale(v, s) { return [v[0] * s, v[1] * s, v[2] * s]; }
function norm(v) { return Math.hypot(v[0], v[1], v[2]); }
function number(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Expected finite number, got ${String(value)}.`);
  return n;
}
function formatNode(value) { return String(Number(value)); }
function formatNumber(value) { return Number.isFinite(value) ? Number(value).toPrecision(6) : String(value); }
function formatPercent(value) { return Number.isFinite(value) ? `${(value * 100).toFixed(3)}%` : 'inf'; }

function parseArgs(values) {
  const out = {};
  for (let i = 0; i < values.length; i += 2) {
    const key = String(values[i] ?? '').replace(/^--/u, '');
    out[key] = values[i + 1];
  }
  return out;
}
function required(map, key) {
  const value = map[key];
  if (!value) throw new Error(`Missing --${key}.`);
  return value;
}
function readJson(path) { return JSON.parse(readFileSync(resolve(path), 'utf8').replace(/^\uFEFF/u, '')); }
function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value, 'utf8');
}
