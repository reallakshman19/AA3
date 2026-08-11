param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$ExpectedHead,
  [string]$ArtifactsRoot = 'artifacts/bm4l-local',
  [switch]$SkipNpmCi
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$COMMON = '45d51ea18624f5775805f399110c1738301c0d90'
$ZIP_SHA = '978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9'
$ZIP_BYTES = 582488
$ACCDB_SHA = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8'
$DECLARED_ACCDB_SHA = 'e21b0862851ea2bb6f20d55e4a3a94f501537b618b98dd46afa9f6777ee38d3c'
$ACCDB_BYTES = 5136384
$ACE_URL = 'https://download.microsoft.com/download/3/5/C/35C84C36-661A-44E6-9324-8786B8DBE231/accessdatabaseengine_X64.exe'
$ACE_SHA = '04e96c9f1a1f7d251a88aececf1dc10ff65950392787427c00814a43308003de'
$PROFILE = 'benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json'
$PROG_ID = 'Microsoft.ACE.OLEDB.12.0'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command '$Name' is unavailable." }
}
function Invoke-Checked([scriptblock]$Command, [string]$Description) {
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Description failed with exit code $LASTEXITCODE." }
}
function Assert-MicrosoftSignature([string]$Path, [string]$Label) {
  $sig = Get-AuthenticodeSignature -LiteralPath $Path
  if ($sig.Status -ne 'Valid' -or $sig.SignerCertificate.Subject -notmatch 'Microsoft') {
    throw "$Label Authenticode validation failed: $($sig.Status), $($sig.SignerCertificate.Subject)"
  }
  return $sig
}

if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) { throw 'Windows is required.' }
if ($PSVersionTable.PSVersion.Major -lt 7) { throw "PowerShell 7+ is required; found $($PSVersionTable.PSVersion)." }
'git','node','npm' | ForEach-Object { Require-Command $_ }

$repoRoot = (& git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or -not $repoRoot) { throw 'Run from an Advanced_Analysis git checkout.' }
Set-Location $repoRoot
$head = (& git rev-parse HEAD).Trim().ToLowerInvariant()
if ($head -ne $ExpectedHead.ToLowerInvariant()) { throw "Exact-head mismatch: checkout is $head; expected $ExpectedHead." }
$dirty = (& git status --porcelain=v1 --untracked-files=all | Out-String).Trim()
if ($dirty) { throw "Exact-head qualification requires a clean worktree. Dirty paths:`n$dirty" }

$nodeVersion = (& node -p 'process.versions.node').Trim()
if ([int]($nodeVersion.Split('.')[0]) -ne 22) { throw "Node 22 is required; found $nodeVersion." }

$artifacts = Join-Path $repoRoot $ArtifactsRoot
$providerDir = Join-Path $artifacts 'provider'
$sourceDir = Join-Path $artifacts 'source'
$workDir = Join-Path $artifacts 'work'
New-Item -ItemType Directory -Force -Path $providerDir, $sourceDir, $workDir | Out-Null

if (-not $SkipNpmCi) { Invoke-Checked { npm ci } 'npm ci' }

@(
  'scripts/lfea-bm4l-root-cause-report.mjs',
  'scripts/lfea-m047-bm4l-recovery-proof.mjs',
  'scripts/lfea-m047-bm4l-root-cause-diagnostics.mjs',
  'scripts/lfea-m047-bm4l-common-report-parity.mjs',
  'scripts/lfea-m047-bm4l-tee-stiffness-authority.mjs',
  'scripts/lfea-m047-bm4l-numeric-operator-proof.mjs',
  'scripts/lfea-m047-bm4l-bend-effective-stiffness.mjs',
  'scripts/lfea-accdb-bend-gravity-first-moment.mjs',
  'src/core/fea-benchmarks/qualification-engineering-assessment.js',
  'src/core/fea-benchmarks/caesar-accdb-linear-solve.js'
) | ForEach-Object { Invoke-Checked { node --check $_ } "node --check $_" }
[void][scriptblock]::Create((Get-Content -Raw 'scripts/lfea-m047-bm4l-accdb-provenance.ps1'))
@(
  'scripts/lfea-b3.3-solver-check.mjs',
  'scripts/lfea-b3.4-recovery-check.mjs',
  'scripts/lfea-b3.6-sparse-assembly-check.mjs',
  'scripts/lfea-b3.9-gravity-self-weight-check.mjs'
) | ForEach-Object { Invoke-Checked { node $_ } "node $_" }

$installer = Join-Path $providerDir 'accessdatabaseengine_X64.exe'
Invoke-WebRequest -Uri $ACE_URL -OutFile $installer
$installerHash = (Get-FileHash $installer -Algorithm SHA256).Hash.ToLowerInvariant()
if ($installerHash -ne $ACE_SHA) { throw "ACE installer SHA-256 mismatch: $installerHash != $ACE_SHA" }
$installerSig = Assert-MicrosoftSignature $installer 'ACE installer'
[ordered]@{
  schema='bm4l-ace-installer-evidence/v1'; url=$ACE_URL; byteLength=(Get-Item $installer).Length; sha256=$installerHash
  signatureStatus=[string]$installerSig.Status; signerSubject=$installerSig.SignerCertificate.Subject
  signerIssuer=$installerSig.SignerCertificate.Issuer; signerThumbprint=$installerSig.SignerCertificate.Thumbprint
} | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $providerDir 'installer.json')

$progIdKey = "Registry::HKEY_CLASSES_ROOT\$PROG_ID\CLSID"
if (-not (Test-Path $progIdKey)) {
  $process = Start-Process $installer -ArgumentList '/quiet','/norestart' -Wait -PassThru
  if ($process.ExitCode -notin @(0,3010)) { throw "ACE installer exited $($process.ExitCode)." }
  $process.ExitCode | Set-Content (Join-Path $providerDir 'install-exit-code.txt')
}
if (-not (Test-Path $progIdKey)) { throw "$PROG_ID is not registered." }

$zipPath = Join-Path $artifacts 'BM4_L.zip'
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/reallaksh19/Common/$COMMON/LFEA/BM4/BM4_L.zip" -OutFile $zipPath
$zip = Get-Item $zipPath
$zipHash = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($zip.Length -ne [int64]$ZIP_BYTES -or $zipHash -ne $ZIP_SHA) { throw 'Pinned BM4_L.zip custody mismatch.' }
Remove-Item $sourceDir -Force -Recurse -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $sourceDir | Out-Null
Expand-Archive $zipPath -DestinationPath $sourceDir -Force
$members = @(Get-ChildItem $sourceDir -File -Recurse)
if ($members.Count -ne 1 -or $members[0].Name -ne 'BM4_L.ACCDB') { throw 'Pinned ZIP must contain exactly BM4_L.ACCDB.' }
$pristine = $members[0].FullName
$pristineHash = (Get-FileHash $pristine -Algorithm SHA256).Hash.ToLowerInvariant()
if ($members[0].Length -ne [int64]$ACCDB_BYTES -or $pristineHash -ne $ACCDB_SHA) { throw 'Pinned ACCDB custody mismatch.' }

$workAccdb = Join-Path $workDir 'BM4_L.ACCDB'
Copy-Item $pristine $workAccdb -Force
[ordered]@{
  schema='bm4l-source-custody/v3'; authorityRule='PINNED_COMMON_COMMIT_AND_ZIP_SHA256_DEFINE_ACCDB_MEMBER_BYTES'; commonCommit=$COMMON
  zip=[ordered]@{byteLength=$zip.Length; sha256=$zipHash; expectedSha256=$ZIP_SHA; exactMatch=$true}
  accdb=[ordered]@{
    fileName='BM4_L.ACCDB'; byteLength=$members[0].Length; authorizedPinnedMemberSha256=$pristineHash
    declaredConflictingSha256=$DECLARED_ACCDB_SHA; declaredHashMatchesPinnedMember=($pristineHash -eq $DECLARED_ACCDB_SHA)
    declaredHashClassification=if ($pristineHash -eq $DECLARED_ACCDB_SHA) {'CONSISTENT'} else {'CONTRADICTED_BY_PINNED_ARCHIVE_MEMBER'}
    state='PRISTINE_ZIP_MEMBER_BEFORE_PROVIDER_OPEN'
  }
} | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $artifacts 'custody.json')

$clsid = (Get-ItemProperty $progIdKey).'(default)'
$binary = (Get-ItemProperty "Registry::HKEY_CLASSES_ROOT\CLSID\$clsid\InprocServer32").'(default)'
$providerFile = Get-Item $binary
$providerSig = Assert-MicrosoftSignature $providerFile.FullName 'ACE provider'
$beforeHash = (Get-FileHash $workAccdb -Algorithm SHA256).Hash.ToLowerInvariant()
$connection = New-Object -ComObject ADODB.Connection
try {
  $connection.Open("Provider=$PROG_ID;Data Source=$workAccdb;Mode=Read;Persist Security Info=False;")
  $schema = $connection.OpenSchema(20); $tableCount = 0
  try {
    while (-not $schema.EOF) {
      if ([string]$schema.Fields.Item('TABLE_TYPE').Value -eq 'TABLE') { $tableCount += 1 }
      $schema.MoveNext()
    }
  } finally {
    $schema.Close(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($schema)
  }
} finally {
  if ($connection.State -ne 0) { $connection.Close() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($connection)
}
$afterHash = (Get-FileHash $workAccdb -Algorithm SHA256).Hash.ToLowerInvariant()
if ($beforeHash -ne $ACCDB_SHA -or $afterHash -ne $ACCDB_SHA) { throw 'ACCDB bytes changed through provider open.' }
[ordered]@{
  schema='bm4l-accdb-provider-probe/v3'; provider=$PROG_ID; clsid=[string]$clsid; binaryPath=$providerFile.FullName
  binarySha256=(Get-FileHash $providerFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  fileVersion=$providerFile.VersionInfo.FileVersion; productVersion=$providerFile.VersionInfo.ProductVersion
  signatureStatus=[string]$providerSig.Status; signerSubject=$providerSig.SignerCertificate.Subject
  preOpenSha256=$beforeHash; postOpenSha256=$afterHash; pinnedMemberSha256=$ACCDB_SHA
  declaredConflictingSha256=$DECLARED_ACCDB_SHA; providerOpenChangedBytes=($beforeHash -ne $afterHash)
  tableCount=$tableCount; sourceAuthorized=$true
} | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $artifacts 'provider.json')

$tables = @(
  'INPUT_BASIC_ELEMENT_DATA','INPUT_BENDS','INPUT_CONTROL','INPUT_FORCMNT','INPUT_NODAL_COORDINATES',
  'INPUT_OFFSETS','INPUT_REDUCERS','INPUT_RESTRAINTS','INPUT_RIGIDS','INPUT_SIFTEES','INPUT_UNITS',
  'OUTPUT_DISPLACEMENTS','OUTPUT_RESTRAINTS_SUMMARY','OUTPUT_GLOBAL_ELEMENT_FORCES'
) -join ','
& .\scripts\lfea-m047-bm4l-accdb-provenance.ps1 `
  -AccdbPath $workAccdb -ProfilePath ".\$PROFILE" -TablesCsv $tables `
  -ExpectedAccdbSha256 $ACCDB_SHA -DeclaredAccdbSha256 $DECLARED_ACCDB_SHA `
  -ExpectedAccdbBytes ([int64]$ACCDB_BYTES) -OutPath (Join-Path $artifacts 'bm4l-provenance.json')

$actual = Join-Path $artifacts 'bm4l-actual.json'
$report = Join-Path $artifacts 'bm4l-report.json'
Invoke-Checked {
  node scripts/lfea-caesar-accdb-benchmark.mjs `
    --accdb $workAccdb --profile $PROFILE --solve-linear true --solve-cases L2,L3,L4,L5,L6,L14 `
    --actual-out $actual --out $report --summary-out (Join-Path $artifacts 'bm4l-summary.md')
} 'BM4_L six-case production solve'
$actualJson = Get-Content -Raw $actual | ConvertFrom-Json
if ($actualJson.sourceAccdbSha256 -ne $ACCDB_SHA) { throw 'Solver actual package source hash is not the pinned ACCDB.' }

Invoke-Checked { node scripts/lfea-bm4l-root-cause-report.mjs --actual $actual --report $report --out (Join-Path $artifacts 'bm4l-root-cause.json') } 'root cause report'
Invoke-Checked {
  node scripts/lfea-m047-bm4l-root-cause-diagnostics.mjs --actual $actual --report $report `
    --expected-source-sha $ACCDB_SHA --out (Join-Path $artifacts 'bm4l-diagnostics.json')
} 'root cause diagnostics'
$diagnostics = Get-Content -Raw (Join-Path $artifacts 'bm4l-diagnostics.json') | ConvertFrom-Json
if ($null -eq $diagnostics.commonReportParity -or $diagnostics.teeStiffnessAuthority.status -ne 'PASS') { throw 'Required diagnostics authority is absent.' }
Invoke-Checked { node scripts/lfea-m047-bm4l-recovery-proof.mjs --actual $actual --expected-source-sha $ACCDB_SHA --out (Join-Path $artifacts 'bm4l-recovery-proof.json') } 'recovery proof'
Invoke-Checked { node scripts/lfea-m047-bm4l-numeric-operator-proof.mjs --actual $actual --out (Join-Path $artifacts 'bm4l-numeric-operator-proof.json') } 'numeric operator proof'
Invoke-Checked {
  node scripts/lfea-m047-bm4l-bend-effective-stiffness.mjs --actual $actual --report $report `
    --out (Join-Path $artifacts 'bm4l-bend-effective-stiffness.json')
} 'bend effective-stiffness proof'
$bend = Get-Content -Raw (Join-Path $artifacts 'bm4l-bend-effective-stiffness.json') | ConvertFrom-Json
if ($bend.status -ne 'PASS' -or $bend.scope.bendCount -ne 12) { throw '12-bend effective-stiffness evidence did not pass.' }

@('check:lfea-b3.3','check:lfea-b3.4','check:lfea-b3.8','check:lfea-b3.9','check:lfea-b3.22','check:lfea-b3.23','check:core-fea') |
  ForEach-Object { Invoke-Checked { npm run $_ } "npm run $_" }

$reportJson = Get-Content -Raw $report | ConvertFrom-Json
$assessment = $reportJson.engineeringAssessment
if ($null -eq $assessment) { throw 'BM4_L report is missing the engineering assessment.' }
if ($assessment.restraintComponents.status -ne 'PASS') { throw 'BM4_L restraint component gate did not pass.' }
if ($assessment.physicalEquilibrium.status -ne 'PASS') { throw 'BM4_L physical equilibrium gate did not pass.' }
if ($assessment.equilibriumResidualDisposition.status -ne 'PASS') { throw 'BM4_L equilibrium residual comparison disposition did not pass.' }
if ($assessment.linearCaseConditioning.status -ne 'PASS') { throw 'BM4_L linear case conditioning gate did not pass.' }
if ([int]$assessment.literalExternalComponents.counts.failed -ne [int]$reportJson.qualification.totals.failed) {
  throw 'Literal external failure count diverges from the qualification failure count.'
}
$bendGravityPath = Join-Path $artifacts 'bm4l-l2-bend-gravity-first-moment.json'
Invoke-Checked {
  node scripts/lfea-accdb-bend-gravity-first-moment.mjs --actual $actual --case L2 --out $bendGravityPath
} 'bend gravity first-moment audit'
$bendGravity = Get-Content -Raw $bendGravityPath | ConvertFrom-Json
if ($bendGravity.status -ne 'PASS') { throw 'BM4_L bend gravity first-moment ledger did not pass.' }
if ([int]$bendGravity.counts.bendCount -ne [int]$reportJson.model.inventory.bendPointerCount) {
  throw 'Bend gravity evidence does not cover the ACCDB bend inventory.'
}
$caseFailures = [ordered]@{}
foreach ($case in $reportJson.qualification.cases) { $caseFailures[[string]$case.caseId] = [int]$case.comparison.counts.failed }
$receipt = [ordered]@{
  schema='m047-bm4l-local-production-qualification/v1'; status=[string]$reportJson.qualification.status
  exactHead=$head; worktreeCleanAtStart=$true; nodeVersion=$nodeVersion; powershellVersion=[string]$PSVersionTable.PSVersion; profile=$PROFILE
  source=[ordered]@{commonCommit=$COMMON; zipSha256=$zipHash; accdbSha256=$afterHash}
  provider=[ordered]@{
    progId=$PROG_ID; binaryPath=$providerFile.FullName
    binarySha256=(Get-FileHash $providerFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    productVersion=$providerFile.VersionInfo.ProductVersion
  }
  qualification=[ordered]@{caseFailures=$caseFailures; totals=$reportJson.qualification.totals; semanticHash=$reportJson.qualification.semanticHash}
  engineeringAssessment=[ordered]@{
    literalExternalComponents=[ordered]@{status=$assessment.literalExternalComponents.status; counts=$assessment.literalExternalComponents.counts}
    restraintComponents=[ordered]@{status=$assessment.restraintComponents.status; counts=$assessment.restraintComponents.counts}
    equilibriumResidualDisposition=[ordered]@{status=$assessment.equilibriumResidualDisposition.status; counts=$assessment.equilibriumResidualDisposition.counts}
    vectorGroups=[ordered]@{status=$assessment.vectorGroups.status; counts=$assessment.vectorGroups.counts}
    physicalEquilibrium=[ordered]@{status=$assessment.physicalEquilibrium.status; counts=$assessment.physicalEquilibrium.counts}
    linearCaseConditioning=[ordered]@{status=$assessment.linearCaseConditioning.status; counts=$assessment.linearCaseConditioning.counts; operator=$assessment.linearCaseConditioning.operator}
  }
  bendGravityFirstMoment=[ordered]@{status=$bendGravity.status; counts=$bendGravity.counts; totals=$bendGravity.totals}
  artifactsRoot=$ArtifactsRoot
}
$receiptPath = Join-Path $artifacts 'bm4l-local-production-receipt.json'
$receipt | ConvertTo-Json -Depth 12 | Set-Content -Encoding utf8 $receiptPath
Write-Host 'PASS M047 BM4_L local production qualification'
Write-Host "Receipt: $receiptPath"
Write-Host ($receipt | ConvertTo-Json -Depth 12)
