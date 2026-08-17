import { createDiagnostic, DIAGNOSTIC_SEVERITY, sortDiagnostics } from './diagnostics.js';
import { createEvidenceIndex, findAllIndexedEvidence } from './evidence-index.js';
import { deepFreeze, finiteNumber, stringValue } from './immutable.js';

const SUPPORT_TYPE_FALLBACK_GROUPS = Object.freeze([
  Object.freeze({
    authority: 'MAPPED_SUPPORT_KIND',
    aliases: Object.freeze(['SUPPORT_KIND', 'SUPPORT_MAPPER_KIND']),
  }),
  Object.freeze({
    authority: 'LEGACY_SUPPORT_CODE',
    aliases: Object.freeze(['MDSSUPPTYPE', 'CMPSUPTYPE']),
  }),
  Object.freeze({
    authority: 'SUPPORT_DESCRIPTION',
    aliases: Object.freeze(['DTXR', 'DESCRIPTION']),
  }),
]);

export function collectSupportEvidence(specs, roots, scope, evidenceIndex) {
  const index = evidenceIndex || createEvidenceIndex(roots);
  const values = {};
  const diagnostics = [];
  Object.entries(specs).forEach(([field, spec]) => {
    const found = findAllByAliases(index, spec.aliases);
    const normalized = normalizeFound(found, spec, field, scope, diagnostics);
    if (normalized.length) values[field] = normalized;
    const distinct = new Set(normalized.map((row) => canonicalValue(row.value)));
    if (distinct.size > 1) diagnostics.push(conflictDiagnostic(field, scope, normalized));
  });
  if (!values.supportTypes?.length) {
    const inferred = inferSupportTypeEvidence(index, scope, diagnostics);
    if (inferred.length) values.supportTypes = inferred;
  }
  return deepFreeze({ values, diagnostics: sortDiagnostics(diagnostics) });
}

function inferSupportTypeEvidence(index, scope, diagnostics) {
  for (const group of SUPPORT_TYPE_FALLBACK_GROUPS) {
    const rows = findAllByAliases(index, group.aliases).flatMap((row) => {
      const family = classifySupportFamilyToken(row.value, group.authority);
      return family ? [{ ...row, family }] : [];
    });
    if (!rows.length) continue;

    const families = [...new Set(rows.map((row) => row.family))];
    if (families.length > 1) {
      diagnostics.push(createDiagnostic(
        'SUPPORT_TYPE_INFERENCE_CONFLICT',
        'Fallback support-family evidence resolves to more than one family; no family was invented.',
        {
          severity: DIAGNOSTIC_SEVERITY.WARNING,
          scope,
          authority: group.authority,
          sourcePaths: rows.map((row) => row.sourcePath),
          values: rows.map((row) => row.value),
          families,
        },
      ));
      return [];
    }

    const representative = rows.find((row) => row.family === families[0]);
    diagnostics.push(createDiagnostic(
      'SUPPORT_TYPE_INFERRED',
      `Support family ${families[0]} was resolved from governed fallback source evidence.`,
      {
        severity: DIAGNOSTIC_SEVERITY.INFO,
        scope,
        authority: group.authority,
        sourcePath: representative.sourcePath,
        sourceValue: representative.value,
        family: families[0],
      },
    ));
    return [deepFreeze({
      value: families[0],
      unit: '',
      sourceKind: `INFERRED_${representative.sourceKind}`,
      sourcePath: representative.sourcePath,
    })];
  }
  return [];
}

function classifySupportFamilyToken(value, authority) {
  const raw = stringValue(value).toUpperCase();
  if (!raw) return null;
  const token = raw.replace(/[ _]+/gu, ' ').trim();

  // Direction-specific families take precedence over generic support wording.
  if (/\bGUIDE\b|\bGT0?1\b/iu.test(token)) return 'GUIDE';
  if (/\bLINE\s*STOP\b|\bLINESTOP\b|\bST0?6\b|^LS[- ]/iu.test(token)) return 'LINE_STOP';
  if (/\bSPRING\b|\bHANGER\b/iu.test(token)) return 'SPRING';

  // Only strong, explicit anchor wording is accepted. "Directional anchor"
  // descriptions may represent line-stop hardware and are therefore excluded.
  if (authority !== 'SUPPORT_DESCRIPTION'
      && /\bANCHOR\b|\bFIXED\b|\bANCI\b/iu.test(token)) return 'ANCHOR';
  if (authority === 'SUPPORT_DESCRIPTION'
      && /\bANCHOR\b/iu.test(token)
      && !/\bDIRECTIONAL\b/iu.test(token)) return 'ANCHOR';

  if (/\bPIPE\s*REST\b|\bREST\b|\bWEAR\s*PLATE\b|\bW\.?\s*PAD\b/iu.test(token)) return 'REST';
  if (authority === 'LEGACY_SUPPORT_CODE' && /^SH[- ]/iu.test(token)) return 'REST';
  return null;
}

function findAllByAliases(index, aliases) {
  const found = findAllIndexedEvidence(index, aliases).flatMap((row) => (
    flattenValue(row.value).map((value) => ({
      value,
      sourcePath: row.sourcePath,
      sourceKind: rootKind(row.rootPath),
    }))
  ));
  const unique = new Map(found.map((row) => [`${row.sourcePath}|${canonicalValue(row.value)}`, row]));
  return [...unique.values()].sort(foundOrder);
}

function normalizeFound(found, spec, field, scope, diagnostics) {
  return found.flatMap((row) => {
    const normalized = normalizeValue(row.value, spec.kind);
    if (!normalized.valid) {
      diagnostics.push(invalidDiagnostic(field, scope, row));
      return [];
    }
    return [deepFreeze({
      value: normalized.value,
      unit: stringValue(spec.unit),
      sourceKind: row.sourceKind,
      sourcePath: row.sourcePath,
    })];
  });
}

function normalizeValue(value, kind) {
  if (kind === 'number') {
    const numeric = finiteNumber(value);
    return { valid: numeric !== null, value: numeric };
  }
  const text = stringValue(value);
  return { valid: Boolean(text), value: text };
}

function flattenValue(value) {
  return Array.isArray(value) ? value : [value];
}

function conflictDiagnostic(field, scope, rows) {
  return createDiagnostic(
    'SUPPORT_EVIDENCE_CONFLICT',
    `${field} contains conflicting explicit source values.`,
    {
      severity: DIAGNOSTIC_SEVERITY.WARNING,
      scope,
      field,
      sourcePaths: rows.map((row) => row.sourcePath),
      values: rows.map((row) => row.value),
    },
  );
}

function invalidDiagnostic(field, scope, row) {
  return createDiagnostic(
    'SUPPORT_EVIDENCE_INVALID',
    `${field} could not be normalized without inventing a value.`,
    {
      severity: DIAGNOSTIC_SEVERITY.WARNING,
      scope,
      field,
      sourcePath: row.sourcePath,
    },
  );
}

function rootKind(path) {
  return path.split('.')[0] || 'source';
}

function canonicalValue(value) {
  return typeof value === 'number' ? String(value) : stringValue(value).toUpperCase();
}

function foundOrder(left, right) {
  return `${left.sourceKind}|${left.sourcePath}|${canonicalValue(left.value)}`
    .localeCompare(`${right.sourceKind}|${right.sourcePath}|${canonicalValue(right.value)}`);
}
