#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const input = readArg('--pdf-text');
if (!input) throw new TypeError('EMP1_WRC_FULL_PDF_TEXT_REQUIRED');
const text = await readFile(resolve(input), 'utf8');
const pages = text.replace(/\r/gu, '').split('\f');
const patterns = [
  { id: 'INTERPOLATION', re: /interpol/iu },
  { id: 'EXTRAPOLATION', re: /extrapolat/iu },
  { id: 'CURVE_FIT', re: /curve\s+fit/iu },
  { id: 'BETWEEN_CURVES', re: /between.{0,80}curves|curves.{0,80}between/iu },
  { id: 'BETWEEN_VALUES', re: /between.{0,80}values|values.{0,80}between/iu },
  { id: 'READ_CURVE', re: /read.{0,40}curve|curve.{0,40}read/iu },
];
const hits = [];
for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
  const lines = pages[pageIndex].split('\n');
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (const pattern of patterns) {
      if (!pattern.re.test(line)) continue;
      hits.push({
        pattern: pattern.id,
        pdfPage: pageIndex + 1,
        line: lineIndex + 1,
        context: lines.slice(Math.max(0, lineIndex - 3), Math.min(lines.length, lineIndex + 4)).join('\n').trim(),
      });
    }
  }
}
const interpolationHits = hits.filter((row) => row.pattern === 'INTERPOLATION' || row.pattern === 'BETWEEN_CURVES' || row.pattern === 'BETWEEN_VALUES');
console.log(JSON.stringify({
  schema: 'emp1-wrc-interpolation-source-scan/v1',
  status: 'PASS_SCAN_COMPLETE',
  sourceRawPdfSha256: '698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2',
  pageCount: pages.length,
  interpolationAuthorityCandidateHitCount: interpolationHits.length,
  hits,
  authorityNote: 'Text-search presence may identify candidate source authority. Text-search absence does not by itself authorize an interpolation rule; it leaves interpolation source authority unresolved.',
}, null, 2));

function readArg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}
