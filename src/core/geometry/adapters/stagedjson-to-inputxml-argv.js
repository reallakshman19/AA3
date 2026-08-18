/**
 * Builds the exact `stagedjson_to_inputxml.py` CLI argv for a given options
 * object. Mirrors, field-for-field, the `stagedjson_to_inputxml` branch of
 * the validated sibling converter's own `invocation-builder.js` (the same
 * argv shape already exercised against real production StagedJSON data),
 * so this port does not silently diverge from validated behavior.
 */

function toStringValue(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function pushOptionalStringArg(argv, flag, value) {
  const text = toStringValue(value).trim();
  if (!text) return;
  argv.push(`${flag}=${text}`);
}

function pushOptionalNumberArg(argv, flag, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  argv.push(flag, String(numeric));
}

export function buildStagedJsonToInputXmlArgv(scriptPath, inputPath, outputPath, options = {}) {
  const argv = [scriptPath, '--input', inputPath, '--output', outputPath];

  const legacyBookmark = toStringValue(options.inputxmlBookmark).trim();
  const inlineBookmark = toStringValue(options.inputxmlBookmarkJson).trim()
    || (legacyBookmark.startsWith('{') ? legacyBookmark : '');
  const bookmarkPath = legacyBookmark && !legacyBookmark.startsWith('{') ? legacyBookmark : '';
  pushOptionalStringArg(argv, '--bookmark', bookmarkPath);
  pushOptionalStringArg(argv, '--bookmark-json', inlineBookmark);
  pushOptionalNumberArg(argv, '--node-start', options.nodeStart);
  pushOptionalNumberArg(argv, '--node-step', options.nodeStep);
  pushOptionalNumberArg(argv, '--temperature1', options.temperature1);
  pushOptionalNumberArg(argv, '--wall-thickness', options.wallThickness);
  pushOptionalNumberArg(argv, '--modulus', options.modulus);
  pushOptionalNumberArg(argv, '--material-num', options.materialNum);
  pushOptionalStringArg(argv, '--material-name', options.materialName);
  pushOptionalStringArg(argv, '--job-name', options.jobName);
  pushOptionalStringArg(argv, '--vertical-axis', options.verticalAxis);
  pushOptionalStringArg(argv, '--support-config-json', options.supportConfigJson);
  pushOptionalNumberArg(argv, '--datum-e', options.datumE);
  pushOptionalNumberArg(argv, '--datum-n', options.datumN);
  pushOptionalNumberArg(argv, '--datum-u', options.datumU);
  if (options.inferOdFromNominalBore) argv.push('--infer-od-from-nominal-bore');
  if (options.autoAnchors === false) argv.push('--no-auto-anchors');
  if (options.disableSupports) argv.push('--no-supports');

  return argv;
}
