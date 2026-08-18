/**
 * Verifies buildStagedJsonToInputXmlArgv() produces the exact CLI argv
 * shape stagedjson_to_inputxml.py expects, across representative option
 * combinations -- ported field-for-field from the already-validated
 * sibling repo's own invocation builder, so this asserts the port stayed
 * faithful, not just that it runs.
 */
import assert from 'node:assert/strict';
import { buildStagedJsonToInputXmlArgv } from '../src/core/geometry/adapters/stagedjson-to-inputxml-argv.js';

const SCRIPT = '/scripts/stagedjson_to_inputxml.py';
const INPUT = '/work/req-1/staged.json';
const OUTPUT = '/work/req-1/staged_stagedjson_to_inputxml.xml';

// 1. No options: only the required --input/--output pair, nothing else.
{
  const argv = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {});
  assert.deepEqual(argv, [SCRIPT, '--input', INPUT, '--output', OUTPUT]);
}

// 2. undefined options object: same as {}, not a throw.
{
  const argv = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT);
  assert.deepEqual(argv, [SCRIPT, '--input', INPUT, '--output', OUTPUT]);
}

// 3. Numeric options round-trip as --flag value pairs, string-coerced.
{
  const argv = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {
    nodeStart: 10,
    nodeStep: 10,
    temperature1: 50,
    wallThickness: 0.01,
    modulus: 203000,
    materialNum: 1,
    datumE: 100,
    datumN: 200,
    datumU: 300,
  });
  assert.deepEqual(argv, [
    SCRIPT, '--input', INPUT, '--output', OUTPUT,
    '--node-start', '10',
    '--node-step', '10',
    '--temperature1', '50',
    '--wall-thickness', '0.01',
    '--modulus', '203000',
    '--material-num', '1',
    '--datum-e', '100',
    '--datum-n', '200',
    '--datum-u', '300',
  ]);
}

// 4. Non-finite numeric options are silently omitted, not emitted as "NaN".
{
  const argv = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {
    nodeStart: Number.NaN,
    nodeStep: undefined,
    modulus: 'not-a-number',
  });
  assert.deepEqual(argv, [SCRIPT, '--input', INPUT, '--output', OUTPUT]);
}

// 5. String options use the flag=value form, and blank/whitespace-only
// strings are omitted rather than emitted as an empty flag.
{
  const argv = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {
    materialName: 'LOW CARBON',
    jobName: 'Sjson_test',
    verticalAxis: 'Y',
    supportConfigJson: '{"enabled":true}',
    inputxmlBookmark: '   ',
  });
  assert.deepEqual(argv, [
    SCRIPT, '--input', INPUT, '--output', OUTPUT,
    '--material-name=LOW CARBON',
    '--job-name=Sjson_test',
    '--vertical-axis=Y',
    '--support-config-json={"enabled":true}',
  ]);
}

// 6. Bookmark resolution: a legacy `inputxmlBookmark` string starting with
// "{" is treated as inline JSON (--bookmark-json), not a path (--bookmark).
// `--bookmark` and `--bookmark-json` are independent flags (the Python CLI
// itself decides precedence), so both can be emitted together when a path
// form and an inline `inputxmlBookmarkJson` are both supplied.
{
  const argvPathForm = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {
    inputxmlBookmark: '/work/bookmarks/default.json',
  });
  assert.deepEqual(argvPathForm.slice(5), ['--bookmark=/work/bookmarks/default.json']);

  const argvInlineLegacy = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {
    inputxmlBookmark: '{"nodeStart":10}',
  });
  assert.deepEqual(argvInlineLegacy.slice(5), ['--bookmark-json={"nodeStart":10}']);

  const argvBothForms = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {
    inputxmlBookmark: '/work/bookmarks/default.json',
    inputxmlBookmarkJson: '{"nodeStart":20}',
  });
  assert.deepEqual(argvBothForms.slice(5), [
    '--bookmark=/work/bookmarks/default.json',
    '--bookmark-json={"nodeStart":20}',
  ]);
}

// 7. Boolean flags are only ever emitted as bare flags (never with a
// value), and follow each field's own true/false polarity:
// - inferOdFromNominalBore: emitted only when truthy.
// - autoAnchors: emitted (as --no-auto-anchors) only when explicitly false
//   (matches the CLI's own auto-anchors-on-by-default semantics).
// - disableSupports: emitted (as --no-supports) only when truthy.
{
  const argvAllOff = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {
    inferOdFromNominalBore: false,
    autoAnchors: true,
    disableSupports: false,
  });
  assert.deepEqual(argvAllOff, [SCRIPT, '--input', INPUT, '--output', OUTPUT]);

  const argvAllOn = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {
    inferOdFromNominalBore: true,
    autoAnchors: false,
    disableSupports: true,
  });
  assert.deepEqual(argvAllOn.slice(5), [
    '--infer-od-from-nominal-bore',
    '--no-auto-anchors',
    '--no-supports',
  ]);

  const argvAutoAnchorsUnset = buildStagedJsonToInputXmlArgv(SCRIPT, INPUT, OUTPUT, {});
  assert.ok(!argvAutoAnchorsUnset.includes('--no-auto-anchors'), 'autoAnchors undefined must not emit --no-auto-anchors.');
}

console.log(JSON.stringify({
  check: 'stagedjson-to-inputxml-argv',
  status: 'PASS',
}));
