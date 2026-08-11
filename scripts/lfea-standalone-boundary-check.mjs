import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedEntry = argumentValue('--entry');
const ENTRY = path.resolve(ROOT, requestedEntry ?? 'src/lfea/main.js');
const HTML = path.join(ROOT, 'lfea.html');

const FORBIDDEN_EXACT = new Set([
  'src/main.js',
  'src/workspace/bootstrap.js',
  'src/workspace/application-shell-controller.js',
  'src/workspace/lafea-workbench-controller.js',
]);

const IMPORT_RE = /(?:import|export)\s+(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;
const URL_RE = /new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/gu;
const SCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);

if (!requestedEntry) assertStandaloneHtml();
assert(fs.existsSync(ENTRY), `Standalone boundary entry is missing: ${repoRelative(ENTRY)}.`);

const visited = new Set();
walk(ENTRY, []);

if (!requestedEntry) {
  const entrySource = fs.readFileSync(ENTRY, 'utf8');
  const bootstrapSource = fs.readFileSync(path.join(ROOT, 'src/lfea/bootstrap.js'), 'utf8');
  const layoutSource = fs.readFileSync(path.join(ROOT, 'src/lfea/standalone-layout.js'), 'utf8');
  assert(!entrySource.includes('bootstrapAnalysisWorkspace'),
    'Standalone LFEA entry must not call the combined workspace bootstrap.');
  assert(!entrySource.includes('AnalysisWorkspace'),
    'Standalone LFEA entry must not publish the legacy AnalysisWorkspace global.');
  assert(!bootstrapSource.includes('bootstrapAnalysisWorkspace'),
    'Standalone LFEA bootstrap must not call the combined workspace bootstrap.');
  assert(bootstrapSource.includes('LfeaStandaloneInputXmlSourceController'),
    'Standalone LFEA bootstrap must compose the governed native InputXML source controller.');
  for (const viewId of ['source', 'review', 'model', 'analysis']) {
    assert(layoutSource.includes(`id: '${viewId}'`) && layoutSource.includes(`state: 'available'`),
      `Standalone LFEA ${viewId} view must be an available application-owned route.`);
  }
  assert(layoutSource.includes("id: 'verification'") && layoutSource.includes('verification workbench'),
    'Element-FEA workbench must be explicitly scoped to Verification.');
}

console.log(`LFEA standalone boundary PASS (${visited.size} local modules inspected).`);

function walk(filePath, ancestry) {
  const absolute = path.resolve(filePath);
  const relative = repoRelative(absolute);
  if (visited.has(relative)) return;

  assertAllowed(relative, ancestry);
  visited.add(relative);

  const source = fs.readFileSync(absolute, 'utf8');
  const specifiers = [...importSpecifiers(source), ...urlSpecifiers(source)];
  for (const specifier of specifiers) {
    if (!specifier.startsWith('.')) continue;
    const resolved = resolveLocalModule(absolute, specifier);
    if (!resolved) continue;
    walk(resolved, [...ancestry, relative]);
  }
}

function assertAllowed(relativePath, ancestry) {
  const normalized = relativePath.replaceAll('\\', '/');
  const isLafeaPath = normalized.split('/').some((segment) => segment.startsWith('lafea'));
  if (isLafeaPath || FORBIDDEN_EXACT.has(normalized)) {
    const chain = [...ancestry, normalized].join(' -> ');
    throw new Error(`Forbidden LAFEA/legacy dependency in standalone LFEA closure: ${chain}`);
  }
}

function* importSpecifiers(source) {
  IMPORT_RE.lastIndex = 0;
  let match;
  while ((match = IMPORT_RE.exec(source)) !== null) {
    yield match[1] ?? match[2];
  }
}

function* urlSpecifiers(source) {
  URL_RE.lastIndex = 0;
  let match;
  while ((match = URL_RE.exec(source)) !== null) {
    yield match[1];
  }
}

function resolveLocalModule(importer, specifier) {
  const candidate = path.resolve(path.dirname(importer), specifier);
  const extension = path.extname(candidate);
  if (extension) {
    if (!SCRIPT_EXTENSIONS.has(extension)) return null;
    assert(fs.existsSync(candidate), `Missing local module ${repoRelative(candidate)} imported by ${repoRelative(importer)}.`);
    return candidate;
  }

  for (const suffix of ['.js', '.mjs', '.cjs']) {
    const withExtension = `${candidate}${suffix}`;
    if (fs.existsSync(withExtension)) return withExtension;
  }

  for (const fileName of ['index.js', 'index.mjs', 'index.cjs']) {
    const indexFile = path.join(candidate, fileName);
    if (fs.existsSync(indexFile)) return indexFile;
  }

  throw new Error(`Unable to resolve ${specifier} from ${repoRelative(importer)}.`);
}

function assertStandaloneHtml() {
  const source = fs.readFileSync(HTML, 'utf8');
  assert(source.includes('/src/lfea/main.js'), 'lfea.html must load /src/lfea/main.js.');
  assert(!source.includes('/src/main.js'), 'lfea.html must not load the combined application entry.');
  assert(!source.includes('lafea-consumer-root'), 'lfea.html must not contain a LAFEA application root.');
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new TypeError(`${name} requires a repository-relative path.`);
  }
  return value;
}

function repoRelative(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
