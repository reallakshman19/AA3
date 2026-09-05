/**
 * Duplicate top-level declaration guard.
 *
 * A merge that keeps both sides of a rewritten function leaves two declarations of
 * the same name in one module. That is a SyntaxError, so the bundle never parses
 * and every tab goes blank — not only the feature that was merged. It also lets the
 * later declaration silently win, reverting whichever fix the earlier one carried.
 * That is exactly what happened to normalizeEnrichmentStatus in
 * load-calc-current-system-view.js, which shipped on main and took the whole app
 * down while looking like an ordinary merge.
 *
 * Node reports it only when the module is actually loaded, and most of these modules
 * are only reached through the browser, so nothing in the check suite noticed. This
 * is the cheap structural check that would have caught it at once.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', 'src/**/*.js'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
assert.ok(files.length > 100, 'expected to scan the whole src tree');

// Top-level only: a nested declaration of the same name is legal shadowing.
const DECLARATION = /^(?:export\s+)?(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/u;

const offenders = [];
for (const file of files) {
  const seen = new Map();
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    const match = DECLARATION.exec(line);
    if (!match) return;
    const name = match[1];
    if (seen.has(name)) {
      offenders.push(`${file}:${index + 1} redeclares '${name}' (first at line ${seen.get(name)})`);
      return;
    }
    seen.set(name, index + 1);
  });
}

assert.deepEqual(
  offenders,
  [],
  'Duplicate top-level declarations found. These are a SyntaxError at load time and\n'
  + 'usually mean a merge kept both sides of a rewritten function; resolve to the\n'
  + 'intended one rather than deleting either at random:\n  '
  + offenders.join('\n  '),
);

console.log(`  ${files.length} modules scanned, no duplicate top-level declarations`);
console.log('SOURCE_DUPLICATE_DECLARATION_CHECK_PASS');
