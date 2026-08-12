import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildBm4lL13StateTraceCaptureTemplate,
  sealBm4lL13StateTraceCapture,
} from '../src/core/nonlinear-restraint-friction/caesar-bm4l-l13-state-trace-capture.js';
import {
  BM4L_L13_STATE_TRACE_EVIDENCE_STATUS,
  assessBm4lL13StateTraceEvidence,
} from '../src/core/nonlinear-restraint-friction/caesar-bm4l-l13-state-trace-evidence-gate.js';

const contract = JSON.parse(fs.readFileSync(
  new URL('../benchmarks/LFEA/CAESAR_ACCDB/m047-bm4l-l13-state-trace-contract.json', import.meta.url),
  'utf8',
));

const templateOut = argValue('--template-out=');
if (templateOut) {
  const iterationCount = Number(argValue('--iterations=') ?? 2);
  const captureMode = argValue('--capture-mode=')
    ?? 'INCORE_SOLVER_AND_ACTIVE_BOUNDARY_CONDITIONS';
  const template = buildBm4lL13StateTraceCaptureTemplate(contract, {
    iterationCount,
    captureMode,
  });
  writeJson(templateOut, template);
  console.log(JSON.stringify({
    status: 'CAPTURE_TEMPLATE_WRITTEN',
    output: templateOut,
    iterations: template.iterations.length,
    rowsPerIteration: template.iterations[0].restraints.length,
    frictionSitesPerIteration: contract.friction.siteCount,
    positiveGapRowsPerIteration: contract.positiveGapRows.length,
    next: 'Transcribe exact product-observed states, then seal to an immutable raw capture bundle.',
  }, null, 2));
  process.exit(0);
}

const input = argValue('--input=');
if (!input) {
  console.error([
    'Usage:',
    '  template: node scripts/lfea-m047-bm4l-l13-state-trace-capture.mjs --template-out=<trace.json> --iterations=<N>',
    '  seal:     node scripts/lfea-m047-bm4l-l13-state-trace-capture.mjs --input=<filled.json> --raw-capture=<bundle> --out=<sealed.json>',
    '  inspect:  node scripts/lfea-m047-bm4l-l13-state-trace-capture.mjs --input=<sealed.json>',
  ].join('\n'));
  process.exit(2);
}

let evidence = JSON.parse(fs.readFileSync(input, 'utf8'));
const rawCapture = argValue('--raw-capture=');
if (rawCapture) {
  const output = argValue('--out=');
  if (!output) throw new Error('--out is required when --raw-capture is supplied');
  const rawBytes = fs.readFileSync(rawCapture);
  const traceSha256 = crypto.createHash('sha256').update(rawBytes).digest('hex');
  evidence = sealBm4lL13StateTraceCapture(evidence, {
    traceFileName: path.basename(rawCapture),
    traceSha256,
  });
  writeJson(output, evidence);
}

const assessment = assessBm4lL13StateTraceEvidence(evidence);
console.log(JSON.stringify({
  assessment,
  sealedOutput: rawCapture ? argValue('--out=') : null,
  authorityReminder: {
    productionMechanicsAuthorized: false,
    l13RescoreAuthorized: false,
  },
}, null, 2));
process.exit(
  assessment.status === BM4L_L13_STATE_TRACE_EVIDENCE_STATUS.READY_FOR_ENGINEERING_REVIEW
    ? 0
    : 2,
);

function argValue(prefix) {
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function writeJson(outputPath, value) {
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}
