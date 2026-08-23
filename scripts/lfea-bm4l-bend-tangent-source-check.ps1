param(
  [Parameter(Mandatory = $true)]
  [string]$AccdbPath,
  [string]$TablesOut = 'artifacts/s1-bm4l-accdb-tables.json'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$ExpectedSha256 = '64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8'
$ExpectedBytes = [int64]5136384
$ProviderProgId = 'Microsoft.ACE.OLEDB.12.0'
$RequiredTables = @(
  'INPUT_BASIC_ELEMENT_DATA',
  'INPUT_BENDS',
  'INPUT_CONTROL',
  'INPUT_FORCMNT',
  'INPUT_NODAL_COORDINATES',
  'INPUT_OFFSETS',
  'INPUT_REDUCERS',
  'INPUT_RESTRAINTS',
  'INPUT_RIGIDS',
  'INPUT_SIFTEES',
  'INPUT_UNITS'
)

function Convert-DatabaseValue {
  param([Parameter(Mandatory = $false)][object]$Value)
  if ($null -eq $Value -or $Value -is [System.DBNull]) { return $null }
  if ($Value -is [System.DateTime]) { return $Value.ToUniversalTime().ToString('o') }
  if ($Value -is [byte[]]) { return [Convert]::ToBase64String($Value) }
  return $Value
}

function Read-TableRows {
  param(
    [Parameter(Mandatory = $true)][object]$Connection,
    [Parameter(Mandatory = $true)][string]$TableName
  )
  if ($TableName -notmatch '^[A-Z0-9_]+$') { throw "Unsafe ACCDB table name $TableName." }
  $recordset = New-Object -ComObject ADODB.Recordset
  try {
    $recordset.Open("SELECT * FROM [$TableName]", $Connection, 0, 1)
    $rows = [System.Collections.Generic.List[object]]::new()
    while (-not $recordset.EOF) {
      $row = [ordered]@{}
      for ($index = 0; $index -lt $recordset.Fields.Count; $index += 1) {
        $field = $recordset.Fields.Item($index)
        $row[[string]$field.Name] = Convert-DatabaseValue -Value $field.Value
      }
      $rows.Add([pscustomobject]$row)
      $recordset.MoveNext()
    }
    return @($rows.ToArray())
  }
  finally {
    if ($recordset.State -ne 0) { $recordset.Close() }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($recordset)
  }
}

if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
  throw 'BM4_L ACCDB source qualification requires Windows and the authenticated ACE provider path.'
}

$resolvedAccdb = (Resolve-Path -LiteralPath $AccdbPath).Path
$file = Get-Item -LiteralPath $resolvedAccdb
$sha256 = (Get-FileHash -LiteralPath $resolvedAccdb -Algorithm SHA256).Hash.ToLowerInvariant()
if ($file.Length -ne $ExpectedBytes) {
  throw "BM4_L ACCDB byte-length mismatch: expected $ExpectedBytes, found $($file.Length)."
}
if ($sha256 -ne $ExpectedSha256) {
  throw "BM4_L ACCDB SHA-256 mismatch: expected $ExpectedSha256, found $sha256."
}

$progIdKey = "Registry::HKEY_CLASSES_ROOT\$ProviderProgId\CLSID"
if (-not (Test-Path -LiteralPath $progIdKey)) {
  throw "Required provider $ProviderProgId is unavailable. No XML or alternate database fallback is permitted."
}
$clsid = (Get-ItemProperty -LiteralPath $progIdKey).'(default)'
$providerPath = (Get-ItemProperty -LiteralPath "Registry::HKEY_CLASSES_ROOT\CLSID\$clsid\InprocServer32").'(default)'
$signature = Get-AuthenticodeSignature -LiteralPath $providerPath
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft') {
  throw "ACE provider Authenticode validation failed: $($signature.Status), $($signature.SignerCertificate.Subject)"
}

$connection = New-Object -ComObject ADODB.Connection
try {
  $connection.Open("Provider=$ProviderProgId;Data Source=$resolvedAccdb;Mode=Read;Persist Security Info=False;")
  $tables = [ordered]@{}
  foreach ($tableName in $RequiredTables) {
    $tables[$tableName] = [ordered]@{ rows = @(Read-TableRows -Connection $connection -TableName $tableName) }
  }
}
finally {
  if ($connection.State -ne 0) { $connection.Close() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($connection)
}

$outDir = Split-Path -Parent $TablesOut
if ($outDir) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
$tables | ConvertTo-Json -Depth 32 | Set-Content -LiteralPath $TablesOut -Encoding utf8

& node scripts/lfea-bm4l-bend-tangent-source-check.mjs --tables $TablesOut
if ($LASTEXITCODE -ne 0) { throw "BM4_L bend tangent source check failed with exit code $LASTEXITCODE." }

[ordered]@{
  schema = 'lfea-bm4l-s1-bend-tangent-source-evidence/v1'
  status = 'PASS'
  accdb = [ordered]@{ byteLength = $file.Length; sha256 = $sha256 }
  provider = [ordered]@{
    progId = $ProviderProgId
    clsid = [string]$clsid
    binarySha256 = (Get-FileHash -LiteralPath $providerPath -Algorithm SHA256).Hash.ToLowerInvariant()
    signatureStatus = [string]$signature.Status
    signerSubject = $signature.SignerCertificate.Subject
  }
  tablesOut = $TablesOut
} | ConvertTo-Json -Depth 8
