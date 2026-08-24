#!/usr/bin/env node

/**
 * Guard the Python interpreter resolution.
 *
 * A bare `python3` works on the `ubuntu-latest` runners and silently does not
 * on Windows, where that name resolves to the Microsoft Store alias stub. The
 * failure surfaces as every mesh case dying at MESH_GENERATION, which reads as
 * a broken benchmark rather than a missing interpreter -- so the regression is
 * expensive to diagnose and cheap to reintroduce. This check keeps the
 * resolution in one place.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolvePythonInterpreter, runPython } from './lib/python-interpreter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const RESOLVER = 'lib/python-interpreter.mjs';

// 1. No script may spawn a hardcoded interpreter name. The resolver itself
//    names them, which is exactly why it is excluded.
const offenders = [];
for (const entry of fs.readdirSync(SCRIPTS)) {
  if (!entry.endsWith('.mjs') && !entry.endsWith('.js')) continue;
  const text = fs.readFileSync(path.join(SCRIPTS, entry), 'utf8');
  if (/(?:execFileSync|spawnSync|exec|spawn)\(\s*['"]python3?['"]/u.test(text)) offenders.push(entry);
}
assert.deepEqual(offenders, [],
  `These scripts spawn a hardcoded Python interpreter; use runPython/resolvePythonInterpreter from ${RESOLVER}: ${offenders.join(', ')}`);

// 2. The resolver must actually find a working Python 3 on this machine.
const interpreter = resolvePythonInterpreter();
assert.ok(interpreter.command, 'resolvePythonInterpreter must return a command.');
assert.ok(Array.isArray(interpreter.prefixArgs), 'resolvePythonInterpreter must return prefixArgs.');

// 3. It must be a real interpreter, not the Store alias stub. The stub answers
//    --version with an install notice rather than a version string.
const version = String(runPython(['--version'], { encoding: 'utf8' })).trim();
assert.match(version, /^Python 3\.\d+/u,
  `Resolved interpreter did not report a Python 3 version (got ${JSON.stringify(version)}).`);
assert.doesNotMatch(version, /was not found/iu,
  'Resolved interpreter is the Microsoft Store alias stub, not a real interpreter.');

// 4. It must be able to execute a script, not merely report a version.
const probe = String(runPython(['-c', 'print("PYTHON_EXEC_OK")'], { encoding: 'utf8' })).trim();
assert.equal(probe, 'PYTHON_EXEC_OK', 'Resolved interpreter could not execute a trivial script.');

console.log(JSON.stringify({
  check: 'python-interpreter-portability',
  status: 'PASS',
  platform: process.platform,
  resolvedCommand: interpreter.command,
  resolvedPrefixArgs: interpreter.prefixArgs,
  resolutionSource: interpreter.source,
  version,
  hardcodedInterpreterCallSites: offenders.length,
}));
