/**
 * Worker entry: runs the real, validated `stagedjson_to_inputxml.py`
 * converter in-browser via Pyodide, producing genuine CAESAR II InputXML
 * text from StagedJSON text. Message protocol mirrors `lfea-worker.js`
 * (RUN/COMPLETE/FAILURE), so `stagedjson-to-inputxml-worker-client.js`
 * can reuse the same client shape as `lfea-worker-client.js`.
 */
import { buildStagedJsonToInputXmlArgv } from './stagedjson-to-inputxml-argv.js';

// Public assets are served relative to the app's configured base URL, not
// relative to this (bundled, relocated-at-build-time) worker file's own
// location, so resolve against `import.meta.env.BASE_URL` rather than a
// relative `import.meta.url` path.
const PYODIDE_INDEX_URL = new URL('vendor/pyodide/', new URL(import.meta.env.BASE_URL, self.location.href)).href;
const SCRIPTS_BASE_URL = new URL('vendor/stagedjson-to-inputxml-scripts/', new URL(import.meta.env.BASE_URL, self.location.href)).href;
const SCRIPT_FILE_NAMES = Object.freeze([
  'inputxml_bookmark.py',
  'stagedjson_inputxml_diagnostics.py',
  'support_restraint.py',
  'stagedjson_to_inputxml.py',
]);

const RUN_SNIPPET = `
import runpy
import sys
import traceback

exit_code = 0
sys.argv = list(job_argv)
try:
    runpy.run_path(job_script_path, run_name="__main__")
except SystemExit as exc:
    code = exc.code
    if code is None:
        exit_code = 0
    elif isinstance(code, int):
        exit_code = code
    else:
        print(code, file=sys.stderr)
        exit_code = 1
except Exception:
    traceback.print_exc()
    exit_code = 1

exit_code
`;

let pyodidePromise = null;
let scriptsLoaded = false;

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = import(/* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`)
      .then(({ loadPyodide }) => loadPyodide({ indexURL: PYODIDE_INDEX_URL }));
  }
  return pyodidePromise;
}

async function ensureScripts(pyodide) {
  if (scriptsLoaded) return;
  pyodide.FS.mkdirTree('/scripts');
  pyodide.FS.mkdirTree('/work');
  for (const fileName of SCRIPT_FILE_NAMES) {
    const response = await fetch(`${SCRIPTS_BASE_URL}${fileName}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load converter script ${fileName}: HTTP ${response.status}`);
    }
    const text = await response.text();
    if (!text.trim()) throw new Error(`Converter script ${fileName} loaded as empty text.`);
    pyodide.FS.writeFile(`/scripts/${fileName}`, text, { encoding: 'utf8' });
  }
  pyodide.runPython('import sys\nif "/scripts" not in sys.path:\n    sys.path.insert(0, "/scripts")\n');
  scriptsLoaded = true;
}

function sanitizeFileName(name) {
  const normalized = String(name ?? '').trim();
  if (!normalized) return 'staged.json';
  return normalized.replace(/[\\/:*?"<>|]/g, '_');
}

function baseNameWithoutExtension(name) {
  const cleaned = sanitizeFileName(name);
  const idx = cleaned.lastIndexOf('.');
  return idx > 0 ? cleaned.slice(0, idx) : cleaned;
}

async function runConversion({ stagedJsonText, sourceName, options, requestId }) {
  const pyodide = await getPyodide();
  await ensureScripts(pyodide);

  const jobDir = `/work/${sanitizeFileName(requestId)}`;
  pyodide.FS.mkdirTree(jobDir);

  const inputFileName = sanitizeFileName(sourceName || 'staged.json');
  const stem = baseNameWithoutExtension(inputFileName);
  const inputPath = `${jobDir}/${inputFileName}`;
  const outputName = `${stem}_stagedjson_to_inputxml.xml`;
  const outputPath = `${jobDir}/${outputName}`;
  // Matches `diagnostics_path_for()` in stagedjson_inputxml_diagnostics.py:
  // it appends the suffix onto the *output* file's stem (which already
  // ends in "_stagedjson_to_inputxml"), not onto the original input stem.
  const diagnosticsName = `${outputName.replace(/\.xml$/i, '')}_stagedjson_to_inputxml_diagnostics.json`;
  const diagnosticsPath = `${jobDir}/${diagnosticsName}`;

  pyodide.FS.writeFile(inputPath, new TextEncoder().encode(stagedJsonText));

  const argv = buildStagedJsonToInputXmlArgv('/scripts/stagedjson_to_inputxml.py', inputPath, outputPath, options);

  const stdout = [];
  const stderr = [];
  pyodide.setStdout({ batched: (text) => stdout.push(text) });
  pyodide.setStderr({ batched: (text) => stderr.push(text) });
  pyodide.globals.set('job_script_path', argv[0]);
  pyodide.globals.set('job_argv', argv);
  const exitCode = Number(await pyodide.runPythonAsync(RUN_SNIPPET));

  let diagnostics = null;
  try {
    diagnostics = JSON.parse(pyodide.FS.readFile(diagnosticsPath, { encoding: 'utf8' }));
  } catch {
    diagnostics = null;
  }

  if (exitCode !== 0) {
    const error = new Error(
      diagnostics
        ? 'StagedJSON -> InputXML conversion failed; see diagnostics for details.'
        : `StagedJSON -> InputXML conversion exited with code ${exitCode}.`,
    );
    error.code = 'STAGEDJSON_TO_INPUTXML_CONVERSION_FAILED';
    error.diagnostics = diagnostics;
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  }

  const inputXmlText = pyodide.FS.readFile(outputPath, { encoding: 'utf8' });
  return { inputXmlText, diagnostics, outputName, diagnosticsName, stdout, stderr };
}

globalThis.addEventListener('message', async (event) => {
  const request = event.data ?? {};
  if (request.type !== 'RUN' || typeof request.requestId !== 'string') return;
  try {
    const result = await runConversion({ ...(request.input ?? {}), requestId: request.requestId });
    globalThis.postMessage({ type: 'COMPLETE', requestId: request.requestId, result });
  } catch (error) {
    globalThis.postMessage({
      type: 'FAILURE',
      requestId: request.requestId,
      error: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : 'Unknown StagedJSON -> InputXML worker failure.',
        code: typeof error?.code === 'string' ? error.code : null,
        diagnostics: error?.diagnostics ?? null,
      },
    });
  }
});
