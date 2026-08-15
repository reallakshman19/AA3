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

function readRowValue(row, keys = [], fieldMap = null) {
  if (!row || typeof row !== 'object') return '';
  const raw = row._raw || row;
  for (const key of keys) {
    if (!key) continue;
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      const cleaned = text(row[key]);
      if (cleaned) return cleaned;
    }
    if (raw[key] !== undefined && raw[key] !== null && String(raw[key]).trim() !== '') {
      const cleaned = text(raw[key]);
      if (cleaned) return cleaned;
    }
    if (fieldMap && fieldMap[key] && raw[fieldMap[key]] !== undefined && raw[fieldMap[key]] !== null && String(raw[fieldMap[key]]).trim() !== '') {
      const cleaned = text(raw[fieldMap[key]]);
      if (cleaned) return cleaned;
    }
  }
  return '';
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
  density: Object.freeze(['density', 'Density', 'DENSITY', 'FluidDensity', 'Fluid Density', 'Density kg/m3', 'kg/m3', 'Oper Density', 'Operating Density', 'OPERATING_DENSITY', 'Operating Fluid Density']),
  densityMixed: Object.freeze(['densityMixed', 'Density Mixed', 'Mixed Density', 'Mixed kg/m3', 'Density (Mixed)', 'Mixed', 'MIXED_DENSITY']),
  densityGas: Object.freeze(['densityGas', 'Density Gas', 'Gas Density', 'Gas kg/m3', 'Density (Gas)', 'Gas', 'GAS_DENSITY']),
  densityLiquid: Object.freeze(['densityLiquid', 'Density Liquid', 'Liquid Density', 'Liquid kg/m3', 'Density (Liquid)', 'Liquid', 'Liq Density', 'LIQ_DENSITY']),
  phase: Object.freeze(['phase', 'Phase', 'PHASE', 'Fluid Phase', 'Medium Phase', 'Medium', 'State', 'FLUID_PHASE']),
});

export function resolveLineListDensity(row, processOverride = null, fieldMap = null) {
  const overrideDensity = readOverride(processOverride, 'density');
  if (overrideDensity) return densityResult(overrideDensity, 'override', '', 'density');

  const direct = readRowValue(row, DENSITY_ALIASES.density, fieldMap);
  const mixed = readRowValue(row, DENSITY_ALIASES.densityMixed, fieldMap);
  const gas = readRowValue(row, DENSITY_ALIASES.densityGas, fieldMap);
  const liquid = readRowValue(row, DENSITY_ALIASES.densityLiquid, fieldMap);
  const phase = upper(readRowValue(row, DENSITY_ALIASES.phase, fieldMap));

  if (phase.startsWith('M') || phase.includes('MIX')) {
    if (liquid) return densityResult(liquid, 'linelist-density-liquid', phase, 'densityLiquid');
    if (mixed) return densityResult(mixed, 'linelist-density-mixed', phase, 'densityMixed');
  }
  if ((phase.startsWith('G') || phase.includes('GAS')) && gas) return densityResult(gas, 'linelist-density-gas', phase, 'densityGas');
  if ((phase.startsWith('L') || phase.includes('LIQ')) && liquid) return densityResult(liquid, 'linelist-density-liquid', phase, 'densityLiquid');

  if (direct) return densityResult(direct, 'linelist-density', phase, 'density');
  if (liquid) return densityResult(liquid, 'linelist-density-liquid', phase, 'densityLiquid');
  if (gas) return densityResult(gas, 'linelist-density-gas', phase, 'densityGas');
  if (mixed) return densityResult(mixed, 'linelist-density-mixed', phase, 'densityMixed');
  return { value: '', source: 'none', phase, selected: '' };
}

export function computeRowOperatingFluidDensity(row, fieldMap = null) {
  if (!row || typeof row !== 'object') return '';
  const result = resolveLineListDensity(row, null, fieldMap);
  return result?.value || '';
}

