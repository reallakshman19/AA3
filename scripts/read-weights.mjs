import XLSX from 'xlsx';
import fs from 'fs';

try {
  const workbook = XLSX.readFile('F:\\CODE-4-SS\\3D_Converters\\docs\\Masters\\wtValveweights.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  fs.writeFileSync('C:\\Users\\reall\\AppData\\Local\\Temp\\weights.json', JSON.stringify(data, null, 2));
  console.log('Saved successfully.');
} catch (e) {
  console.error(e);
}
