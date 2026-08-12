param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$ExpectedHead,
  [string]$ArtifactsRoot = 'artifacts/bm4l-friction-stage2',
  [switch]$SkipNpmCi
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$COMMON = 'f4d49f2a47d970ae0abf913b537193e324556177'
$ZIP_GIT_BLOB = 'df119ae1b8272469b6204036ab1aff21e561dfb8'
$ZIP_SHA256 = '978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9'
$ACCDB_SHA256 = 'e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c'
$ACCDB_BYTES = 5136384
$LOADCASE_GIT_BLOB = 'be62eeb08af26dddcd59146e21188c108c4600dd'
$MISC_GIT_BLOB = 'ef23d224925e4568185a360ecbe1ee62503f15ff'
$PROFILE = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json'
$PROVIDER = 'Microsoft.ACE.OLEDB.12.0'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' is unavailable." }
}
function Invoke-Checked([scriptblock]$Command, [string]$Description) {
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Description failed with exit code $LASTEXITCODE." }
}
function File-Sha256([string]$Path) {
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}
function Git-Blob-Sha1([string]$Path) {
  $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Path))
  $header = [System.Text.Encoding]::UTF8.GetBytes("blob $($bytes.Length)`0")
  $payload = [byte[]]::new($header.Length + $bytes.Length)
  [Array]::Copy($header, 0, $payload, 0, $header.Length)
  [Array]::Copy($bytes, 0, $payload, $header.Length, $bytes.Length)
  $sha1 = [System.Security.Cryptography.SHA1]::Create()
  try { return ([BitConverter]::ToString($sha1.ComputeHash($payload))).Replace('-', '').ToLowerInvariant() }
  finally { $sha1.Dispose() }
}
function Assert-Git-Blob([string]$Path, [string]$Expected, [string]$Label) {
  $actual = Git-Blob-Sha1 $Path
  if ($actual -ne $Expected) { throw "$Label git-blob mismatch: $actual != $Expected" }
}

if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) { throw 'Windows is required for the ACE ACCDB production harness.' }
if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'PowerShell 7+ is required.' }
'git','node','npm' | ForEach-Object { Require-Command $_ }
$repoRoot = (& git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) { throw 'Run from an Advanced_Analysis checkout.' }
Set-Location $repoRoot
$head = (& git rev-parse HEAD).Trim().ToLowerInvariant()
if ($head -ne $ExpectedHead.ToLowerInvariant()) { throw "Exact-head mismatch: $head != $ExpectedHead" }
$dirty = (& git status --porcelain=v1 --untracked-files=all | Out-String).Trim()
if ($dirty) { throw "Qualification requires a clean worktree.`n$dirty" }
$nodeVersion = (& node -p 'process.versions.node').Trim()
if ([int]$nodeVersion.Split('.')[0] -ne 22) { throw "Node 22 is required; found $nodeVersion." }
if (-not $SkipNpmCi) { Invoke-Checked { npm ci } 'npm ci' }

$artifacts = Join-Path $repoRoot $ArtifactsRoot
$sourceDir = Join-Path $artifacts 'source'
New-Item -ItemType Directory -Force -Path $artifacts, $sourceDir | Out-Null

@(
  'src/core/fea-benchmarks/caesar-configuration-authority.js',
  'src/core/fea-benchmarks/caesar-accdb-linear-solve-governed.js',
  'src/core/fea-benchmarks/caesar-accdb-friction-solve.js',
  'scripts/lfea-m047-friction-contract-check.mjs',
  'scripts/lfea-m047-bm4l-friction-benchmark.mjs'
) | ForEach-Object { Invoke-Checked { node --check $_ } "node --check $_" }
Invoke-Checked { node scripts/lfea-caesar-configuration-authority-check.mjs } 'configuration authority check'
Invoke-Checked { node scripts/lfea-m047-friction-contract-check.mjs } 'friction contract check'

$providerKey = "Registry::HKEY_CLASSES_ROOT\$PROVIDER\CLSID"
if (-not (Test-Path -LiteralPath $providerKey)) { throw "$PROVIDER is required; no provider fallback is permitted." }

$zip = Join-Path $artifacts 'BM4_L.zip'
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/reallaksh19/Common/$COMMON/LFEA/BM4/BM4_L.zip" -OutFile $zip
if ((File-Sha256 $zip) -ne $ZIP_SHA256) { throw 'Pinned BM4_L.zip SHA-256 mismatch.' }
Assert-Git-Blob $zip $ZIP_GIT_BLOB 'BM4_L.zip'
Remove-Item $sourceDir -Force -Recurse -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $sourceDir | Out-Null
Expand-Archive $zip -DestinationPath $sourceDir -Force
$members = @(Get-ChildItem $sourceDir -File -Recurse)
if ($members.Count -ne 1 -or $members[0].Name -ne 'BM4_L.ACCDB') { throw 'Pinned ZIP must contain exactly BM4_L.ACCDB.' }
$accdb = $members[0].FullName
if ($members[0].Length -ne [int64]$ACCDB_BYTES) { throw "ACCDB byte count mismatch: $($members[0].Length)." }
if ((File-Sha256 $accdb) -ne $ACCDB_SHA256) { throw 'Pinned BM4_L.ACCDB SHA-256 mismatch.' }

$tables = @(
  'INPUT_BASIC_ELEMENT_DATA','INPUT_BENDS','INPUT_CONTROL','INPUT_FORCMNT','INPUT_NODAL_COORDINATES',
  'INPUT_OFFSETS','INPUT_REDUCERS','INPUT_RESTRAINTS','INPUT_RIGIDS','INPUT_SIFTEES','INPUT_UNITS',
  'OUTPUT_DISPLACEMENTS','OUTPUT_RESTRAINTS_SUMMARY','OUTPUT_GLOBAL_ELEMENT_FORCES'
) -join ','
$rawExport = Join-Path $artifacts 'bm4l-raw-export.json'
& .\scripts\lfea-caesar-accdb-export.ps1 -AccdbPath $accdb -TablesCsv $tables |
  Set-Content -LiteralPath $rawExport -Encoding utf8
if ($LASTEXITCODE -ne 0) { throw 'ACCDB read-only export failed.' }
$exportObject = Get-Content -Raw $rawExport | ConvertFrom-Json -Depth 100
if ($exportObject.source.sha256 -ne $ACCDB_SHA256) { throw 'Raw export is not bound to the pinned ACCDB SHA-256.' }

$loadCaseReport = Join-Path $artifacts 'Loadcasereport_BM4_L.txt'
$miscReport = Join-Path $artifacts 'Miscdata_BM4_L.txt'
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/reallaksh19/Common/$COMMON/LFEA/BM4/Loadcasereport_BM4_L.txt" -OutFile $loadCaseReport
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/reallaksh19/Common/$COMMON/LFEA/BM4/Miscdata_BM4_L.txt" -OutFile $miscReport
Assert-Git-Blob $loadCaseReport $LOADCASE_GIT_BLOB 'Loadcasereport_BM4_L.txt'
Assert-Git-Blob $miscReport $MISC_GIT_BLOB 'Miscdata_BM4_L.txt'

$manifest = [ordered]@{
  schema='lfea-m047-bm4l-stage2-source-custody/v1'
  code=[ordered]@{head=$head; cleanWorktree=$true}
  commonCommit=$COMMON
  zip=[ordered]@{url="https://github.com/reallaksh19/Common/blob/$COMMON/LFEA/BM4/BM4_L.zip"; gitBlob=$ZIP_GIT_BLOB; byteLength=(Get-Item $zip).Length; sha256=(File-Sha256 $zip)}
  accdb=[ordered]@{fileName='BM4_L.ACCDB'; byteLength=(Get-Item $accdb).Length; sha256=(File-Sha256 $accdb)}
  loadCaseReport=[ordered]@{gitBlob=$LOADCASE_GIT_BLOB; byteLength=(Get-Item $loadCaseReport).Length; sha256=(File-Sha256 $loadCaseReport)}
  miscReport=[ordered]@{gitBlob=$MISC_GIT_BLOB; byteLength=(Get-Item $miscReport).Length; sha256=(File-Sha256 $miscReport)}
  profile=[ordered]@{path=$PROFILE; byteLength=(Get-Item $PROFILE).Length; sha256=(File-Sha256 $PROFILE)}
  provider=$PROVIDER
}
$manifest | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $artifacts 'source-custody.json') -Encoding utf8

$config = Join-Path $artifacts 'resolved-configuration.json'
$actual = Join-Path $artifacts 'bm4l-friction-actual.json'
$report = Join-Path $artifacts 'bm4l-friction-report.json'
$summary = Join-Path $artifacts 'bm4l-friction-summary.md'
Invoke-Checked {
  node scripts/lfea-m047-bm4l-friction-benchmark.mjs `
    --raw-export $rawExport --profile $PROFILE --config-out $config `
    --actual-out $actual --report-out $report --summary-out $summary
} 'BM4_L Stage 2 friction qualification'

$actualJson = Get-Content -Raw $actual | ConvertFrom-Json -Depth 100
$reportJson = Get-Content -Raw $report | ConvertFrom-Json -Depth 100
if ($actualJson.sourceAccdbSha256 -ne $ACCDB_SHA256) { throw 'Actual result source hash mismatch.' }
if ($reportJson.nonlinearGate.status -ne 'PASS') { throw 'Nonlinear friction gate failed.' }
if ($reportJson.nonlinearGate.l15AlgebraicStatus -ne 'PASS') { throw 'L15 algebraic gate failed.' }
foreach ($caseId in @('L13','L7','L1')) {
  if ($actualJson.mechanics.repeatedRuns.$caseId.status -ne 'PASS') { throw "$caseId repeated-run determinism failed." }
}

$controlIds = @('L2','L3','L4','L5','L6','L14')
$controlRows = @($reportJson.qualification.cases | Where-Object { $controlIds -contains $_.caseId } | ForEach-Object { $_.comparison.rows })
$controlExternal = @($controlRows | Where-Object { $_.status -in @('PASS','FAIL') -and $_.quantity -in @(
  'DISPLACEMENT','ROTATION','FORCE','MOMENT','GLOBAL_END_FORCE_FROM','GLOBAL_END_FORCE_TO','GLOBAL_END_MOMENT_FROM','GLOBAL_END_MOMENT_TO'
) })
$controlFailures = @($controlExternal | Where-Object status -eq 'FAIL')
$controlRestraintFailures = @($controlFailures | Where-Object { $_.entityKind -eq 'NODE' -and $_.quantity -in @('FORCE','MOMENT') })
if ($controlFailures.Count -ne 46) { throw "Frozen non-friction control regression changed: expected 46 literal external failures, found $($controlFailures.Count)." }
if ($controlRestraintFailures.Count -ne 0) { throw "Frozen non-friction restraint regression changed: found $($controlRestraintFailures.Count) failures." }

$receipt = [ordered]@{
  schema='lfea-m047-bm4l-stage2-production-receipt/v1'
  head=$head
  nodeVersion=$nodeVersion
  sourceAccdbSha256=$ACCDB_SHA256
  command='pwsh ./scripts/lfea-m047-bm4l-friction-production.ps1 -ExpectedHead <HEAD>'
  reportStatus=$reportJson.status
  nonlinearGate=$reportJson.nonlinearGate.status
  nonFrictionLiteralExternalFailures=$controlFailures.Count
  nonFrictionRestraintFailures=$controlRestraintFailures.Count
  artifacts=[ordered]@{
    sourceCustodySha256=File-Sha256 (Join-Path $artifacts 'source-custody.json')
    rawExportSha256=File-Sha256 $rawExport
    resolvedConfigurationSha256=File-Sha256 $config
    actualSha256=File-Sha256 $actual
    reportSha256=File-Sha256 $report
    summarySha256=File-Sha256 $summary
  }
}
$receipt | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $artifacts 'production-receipt.json') -Encoding utf8
Write-Output "M047 BM4_L friction Stage 2 production run complete: $($reportJson.status)"
