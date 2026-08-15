import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

try {
  const workbook = XLSX.readFile('F:\\CODE-4-SS\\3D_Converters\\docs\\Masters\\wtValveweights.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  // Map to the normalized fields expected by the system
  const normalizedData = data.map(row => ({
    ...row,
    bore: row.DN || row.NS * 25,
    rating: row.Rating || 150,
    length: row['RF-F/F'] || row['BW-F/F'] || 0,
    valveType: row.TypeDesc || row.Type,
    weight: row['RF/RTJ KG'] || row['BW KG'] || 0
  }));

  const outPath = 'F:\\CODE-6\\Advanced_Analysis\\src\\workspace\\default-weight-master.js';
  const content = `// Auto-generated from F:\\CODE-4-SS\\3D_Converters\\docs\\Masters\\wtValveweights.xlsx
export const DEFAULT_WEIGHT_MASTER_ROWS = ${JSON.stringify(normalizedData, null, 2)};
`;

  fs.writeFileSync(outPath, content);
  console.log(`Saved successfully to ${outPath}. Total rows: ${normalizedData.length}`);
} catch (e) {
  console.error(e);
}
