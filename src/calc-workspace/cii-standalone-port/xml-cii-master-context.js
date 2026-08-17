import { prepareXmlCiiMasterContext as prepareCoreMasterContext } from './core/master-context.js';

export const STANDALONE_IMPORT_MASTER_DEFS = Object.freeze([
  { key: 'lineList', label: 'Line List Master', description: 'Line ID, P1, T1, T2, Phase, Fluid Density mapping.' },
  { key: 'pipingClass', label: 'Piping Class Master', description: 'Bore, Rating, Schedule, Material Specification lookup.' },
  { key: 'weight', label: 'Weight Master', description: 'Valve, Flange, Component dry & wet weight database.' },
  { key: 'material', label: 'Material Map Master', description: 'PCF Material code to ASTM description cross-reference.' }
]);

export async function prepareStandaloneImportMasters(options = {}) {
  return prepareCoreMasterContext(options);
}

export function summarizeStandaloneImportMasters(masterContext) {
  if (!masterContext) return STANDALONE_IMPORT_MASTER_DEFS.map(d => ({ ...d, rowCount: 0, rows: [], previewRows: [], diagnostics: [] }));

  const raw = masterContext.rawRows || {};
  const lineRows = masterContext.lineRows?.length ? masterContext.lineRows : raw.lineList || [];
  const pipingClassRows = masterContext.pipingClassRows?.length ? masterContext.pipingClassRows : raw.pipingClass || [];
  const weightRows = masterContext.weightMasterRows?.length ? masterContext.weightMasterRows : raw.weight || [];
  const materialRows = masterContext.materialMapRows?.length ? masterContext.materialMapRows : raw.materialMap || [];

  return [
    {
      ...STANDALONE_IMPORT_MASTER_DEFS[0],
      rowCount: lineRows.length,
      rows: lineRows,
      previewRows: lineRows.slice(0, 50),
      diagnostics: masterContext.diagnostics?.lineList || [],
      sourceMetadata: masterContext.sourceMetadata?.lineList || { source: 'not-loaded', sourceType: 'empty', status: 'pending' }
    },
    {
      ...STANDALONE_IMPORT_MASTER_DEFS[1],
      rowCount: pipingClassRows.length,
      rows: pipingClassRows,
      previewRows: pipingClassRows.slice(0, 50),
      diagnostics: masterContext.diagnostics?.pipingClass || [],
      sourceMetadata: masterContext.sourceMetadata?.pipingClass || { source: 'not-loaded', sourceType: 'empty', status: 'pending' }
    },
    {
      ...STANDALONE_IMPORT_MASTER_DEFS[2],
      rowCount: weightRows.length,
      rows: weightRows,
      previewRows: weightRows.slice(0, 50),
      diagnostics: masterContext.diagnostics?.weight || [],
      sourceMetadata: masterContext.sourceMetadata?.weight || { source: 'not-loaded', sourceType: 'empty', status: 'pending' }
    },
    {
      ...STANDALONE_IMPORT_MASTER_DEFS[3],
      key: 'materialMap',
      label: 'Material Map Master',
      description: 'PCF Material code to ASTM description cross-reference.',
      rowCount: materialRows.length,
      rows: materialRows,
      previewRows: materialRows.slice(0, 50),
      diagnostics: masterContext.diagnostics?.materialMap || [],
      sourceMetadata: masterContext.sourceMetadata?.materialMap || { source: 'not-loaded', sourceType: 'empty', status: 'pending' }
    }
  ];
}