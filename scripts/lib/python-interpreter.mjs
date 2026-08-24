import { execFileSync } from 'node:child_process';

/**
 * Resolve a working Python 3 interpreter.
 *
 * The qualification scripts used to invoke `python3` directly. That is correct
 * on the `ubuntu-latest` runners, where `python3` is preinstalled, and wrong on
 * Windows, where `python3` resolves to the Microsoft Store *alias stub* -- an
 * executable that exists on PATH, is not an interpreter, and answers every call
 * with "Python was not found; run without arguments to install from the
 * Microsoft Store". A developer with Python installed as `python` or `py` would
 * still see every mesh case fail at MESH_GENERATION, which reads as a broken
 * benchmark rather than a missing PATH entry.
 *
 * So the interpreter is probed rather than assumed: a candidate only qualifies
 * if it actually prints a Python 3 version. That check rejects the Store stub
 * whether it exits non-zero or prints its notice and exits clean.
 *
 * Order on Windows puts the `py` launcher first because it is the documented
 * entry point and is never shadowed by the stub. `LAFEA_PYTHON` (or `PYTHON`)
 * overrides everything for pinned or virtualenv interpreters.
 */

const VERSION_PATTERN = /^Python 3\.\d+/u;
const PROBE_TIMEOUT_MS = 15000;

let cachedInterpreter = null;

function candidateInterpreters() {
  const candidates = [];
  const override = process.env.LAFEA_PYTHON ?? process.env.PYTHON ?? '';
  if (override.trim()) candidates.push({ command: override.trim(), prefixArgs: [], source: 'ENV_OVERRIDE' });
  if (process.platform === 'win32') {
    candidates.push({ command: 'py', prefixArgs: ['-3'], source: 'WINDOWS_PY_LAUNCHER' });
    candidates.push({ command: 'python', prefixArgs: [], source: 'WINDOWS_PYTHON' });
    candidates.push({ command: 'python3', prefixArgs: [], source: 'WINDOWS_PYTHON3' });
  } else {
    candidates.push({ command: 'python3', prefixArgs: [], source: 'POSIX_PYTHON3' });
    candidates.push({ command: 'python', prefixArgs: [], source: 'POSIX_PYTHON' });
  }
  return candidates;
}

function probe(candidate) {
  try {
    const output = execFileSync(candidate.command, [...candidate.prefixArgs, '--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: PROBE_TIMEOUT_MS,
    });
    // The Store stub prints its notice instead of a version, so matching the
    // version string is what distinguishes a real interpreter from the alias.
    return VERSION_PATTERN.test(String(output).trim());
  } catch {
    return false;
  }
}

/** The resolved interpreter, probed once per process. */
export function resolvePythonInterpreter() {
  if (cachedInterpreter !== null) return cachedInterpreter;
  const attempted = [];
  for (const candidate of candidateInterpreters()) {
    attempted.push(candidate.command);
    if (probe(candidate)) {
      cachedInterpreter = Object.freeze({ ...candidate });
      return cachedInterpreter;
    }
  }
  const error = new Error(
    `No working Python 3 interpreter was found. Tried: ${attempted.join(', ')}. `
    + 'Install Python 3 or set LAFEA_PYTHON to its absolute path. '
    + 'On Windows, a bare "python3" on PATH is usually the Microsoft Store alias stub, not an interpreter.',
  );
  error.code = 'PYTHON_INTERPRETER_NOT_FOUND';
  throw error;
}

/** Run a Python script with the resolved interpreter. Mirrors execFileSync. */
export function runPython(args, options = {}) {
  const { command, prefixArgs } = resolvePythonInterpreter();
  return execFileSync(command, [...prefixArgs, ...args], options);
}
