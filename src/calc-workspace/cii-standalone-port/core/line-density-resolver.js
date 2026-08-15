const BLANK_DENSITY_VALUES = new Set(['', '-', '--', '---', 'NA', 'N/A', 'NULL', 'NONE', 'NIL']);

function rawText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

export function isBlankDensityValue(value) {
  const normalized = rawText(value).toUpperCase().replace(/\s+/g, '');
  return BLANK_DENSITY_VALUES.has(normalized);
}

function text(value) {
  const raw = rawText(value);
  return isBlankDensityValue(raw) ? '' : raw;
}

export function resolveDensityRangeToMax(value) {
  const raw = text(value);
  if (!raw) return '';
  const withoutCommas = raw.replace(/,/g, '');
  if (Number.isFinite(Number(withoutCommas))) return raw;
  const pair = withoutCommas.match(/^(-?\d+(?:\.\d+)?)\s*(?:-|\/|\bto\b)\s*(-?\d+(?:\.\d+)?)$/i);
  if (pair) {
    const left = Number(pair[1]);
    const right = Number(pair[2]);
    if (Number.isFinite(left) && Number.isFinite(right)) return String(Math.max(left, right));
  }
  const values = (withoutCommas.match(/\d+(?:\.\d+)?/g) || []).map(Number).filter(Number.isFinite);
  return values.length > 1 ? String(Math.max(...values)) : raw;
}

function upper(value) {
  return text(value).toUpperCase();
}

function readRowValue(row, keys = []) {
  if (!row || typeof row !== 'object') return '';
  const raw = row._raw || row;
  for (const key of keys) {
    if (!key) continue;
    const value = row[key] ?? raw[key];
    const cleaned = text(value);
    if (cleaned) return cleaned;
  }
  return '';
}

function readMappedRowValue(row, canonicalKey, aliases, fieldMap) {
  return readRowValue(row, [fieldMap?.[canonicalKey], canonicalKey, ...aliases]);
}

function readDirectDensity(row, fieldMap) {
  if (!row || typeof row !== 'object') return '';
  const source = row._raw && typeof row._raw === 'object' ? row._raw : row;
  const mapped = fieldMap?.density;
  const phaseSpecificHeaders = new Set([
    fieldMap?.densityMixed,
    fieldMap?.densityGas,
    fieldMap?.densityLiquid,
  ].filter(Boolean));
  if (mapped && !phaseSpecificHeaders.has(mapped)) {
    const mappedValue = text(source[mapped] ?? row[mapped]);
    if (mappedValue) return mappedValue;
  }

  return readRowValue(source, ['density', ...DENSITY_ALIASES.density]);
}

function readOverride(processOverride, key) {
  if (!processOverride || typeof processOverride !== 'object') return '';
  if (!Object.prototype.hasOwnProperty.call(processOverride, key)) return '';
  return text(processOverride[key]);
}

function densityResult(value, source, phase, selected) {
  const raw = text(value);
  const resolved = resolveDensityRangeToMax(raw);
  const resolvedSource = raw && resolved && raw !== resolved ? `${source}-range-max` : source;
  return { value: resolved, source: resolvedSource, phase, selected };
}

const DENSITY_ALIASES = Object.freeze({
  density: Object.freeze([
    'Density', 'DENSITY', 'FluidDensity', 'Fluid Density', 'Density kg/m3', 'kg/m3',
    'Oper Density', 'Operating Density', 'OPERATING_DENSITY', 'Operating Fluid Density',
  ]),
  densityMixed: Object.freeze([
    'Density Mixed', 'Mixed Density', 'Mixed kg/m3', 'Density (Mixed)', 'Mixed', 'MIXED_DENSITY',
  ]),
  densityGas: Object.freeze([
    'Density Gas', 'Gas Density', 'Gas kg/m3', 'Density (Gas)', 'Gas', 'GAS_DENSITY',
  ]),
  densityLiquid: Object.freeze([
    'Density Liquid', 'Liquid Density', 'Liquid kg/m3', 'Density (Liquid)', 'Liquid', 'Liq Density', 'LIQ_DENSITY',
  ]),
  phase: Object.freeze(['Phase', 'PHASE', 'Fluid Phase', 'Medium Phase', 'Medium', 'State', 'FLUID_PHASE']),
});

const PHASE_SOURCE = Object.freeze({
  densityMixed: 'linelist-density-mixed',
  densityGas: 'linelist-density-gas',
  densityLiquid: 'linelist-density-liquid',
});

function phaseClass(phase) {
  if (phase.startsWith('M') || phase.includes('MIX')) return 'MIXED';
  if (phase.startsWith('G') || phase.includes('GAS')) return 'GAS';
  if (phase.startsWith('L') || phase.includes('LIQ')) return 'LIQUID';
  return '';
}

function uniquePhaseCandidate(candidates, phase) {
  const available = Object.entries(candidates).filter(([, value]) => text(value));
  if (available.length !== 1) {
    return {
      value: '',
      source: available.length > 1 ? 'ambiguous-phase-density' : 'none',
      phase,
      selected: '',
    };
  }
  const [selected, value] = available[0];
  return densityResult(value, PHASE_SOURCE[selected], phase, selected);
}

export function resolveLineListDensity(row, processOverride = null, fieldMap = null) {
  const overrideDensity = readOverride(processOverride, 'density');
  if (overrideDensity) return densityResult(overrideDensity, 'override', '', 'density');

  const direct = readDirectDensity(row, fieldMap);
  const mixed = readMappedRowValue(row, 'densityMixed', DENSITY_ALIASES.densityMixed, fieldMap);
  const gas = readMappedRowValue(row, 'densityGas', DENSITY_ALIASES.densityGas, fieldMap);
  const liquid = readMappedRowValue(row, 'densityLiquid', DENSITY_ALIASES.densityLiquid, fieldMap);
  const phase = upper(readMappedRowValue(row, 'phase', DENSITY_ALIASES.phase, fieldMap));

  if (direct) return densityResult(direct, 'linelist-density', phase, 'density');

  const classified = phaseClass(phase);
  if (classified === 'MIXED') {
    return mixed
      ? densityResult(mixed, PHASE_SOURCE.densityMixed, phase, 'densityMixed')
      : { value: '', source: 'missing-phase-density', phase, selected: 'densityMixed' };
  }
  if (classified === 'GAS') {
    return gas
      ? densityResult(gas, PHASE_SOURCE.densityGas, phase, 'densityGas')
      : { value: '', source: 'missing-phase-density', phase, selected: 'densityGas' };
  }
  if (classified === 'LIQUID') {
    return liquid
      ? densityResult(liquid, PHASE_SOURCE.densityLiquid, phase, 'densityLiquid')
      : { value: '', source: 'missing-phase-density', phase, selected: 'densityLiquid' };
  }

  return uniquePhaseCandidate({ densityMixed: mixed, densityGas: gas, densityLiquid: liquid }, phase);
}

export function computeRowOperatingFluidDensity(row, fieldMap = null) {
  return resolveLineListDensity(row, null, fieldMap).value || '';
}
