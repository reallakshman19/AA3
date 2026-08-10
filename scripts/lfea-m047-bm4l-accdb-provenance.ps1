# Read-only BM4_L ACCDB custody/provenance manifest.
# The pinned Common commit + ZIP SHA-256 define the authoritative member bytes.
# A conflicting historical ACCDB hash is retained as contradicted evidence, never
# silently substituted. No provider, XML, source-data or configuration fallback is permitted.
param(
  [Parameter(Mandatory = $true)]
  [string]$AccdbPath,

  [Parameter(Mandatory = $true)]
  [string]$ProfilePath,

  [Parameter(Mandatory = $true)]
  [string]$TablesCsv,

  [Parameter(Mandatory = $true)]
  [string]$ExpectedAccdbSha256,

  [Parameter(Mandatory = $false)]
  [string]$DeclaredAccdbSha256 = '',

  [Parameter(Mandatory = $false)]
  [long]$ExpectedAccdbBytes = 5136384,

  [Parameter(Mandatory = $false)]
  [string]$OutPath
)

$ErrorActionPreference = 'Stop'
$ProviderProgId = 'Microsoft.ACE.OLEDB.12.0'
$SourceAuthorityRule = 'PINNED_COMMON_COMMIT_AND_ZIP_SHA256_DEFINE_ACCDB_MEMBER_BYTES'

function Get-FileSha256 {
  param([Parameter(Mandatory = $true)][string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-TextSha256 {
  param([Parameter(Mandatory = $true)][string]$Text)
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $hasher = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($hasher.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant()
  }
  finally {
    $hasher.Dispose()
  }
}

function Convert-DatabaseValue {
  param([Parameter(Mandatory = $false)][object]$Value)
  if ($null -eq $Value -or $Value -is [System.DBNull]) { return $null }
  if ($Value -is [System.DateTime]) { return $Value.ToUniversalTime().ToString('o') }
  if ($Value -is [byte[]]) { return [Convert]::ToBase64String($Value) }
  return $Value
}

function Convert-CanonicalValueJson {
  param([Parameter(Mandatory = $false)][object]$Value)
  return (Convert-DatabaseValue -Value $Value) | ConvertTo-Json -Compress -Depth 12
}

function Get-ProviderEvidence {
  $progIdPath = "Registry::HKEY_CLASSES_ROOT\$ProviderProgId\CLSID"
  if (-not (Test-Path -LiteralPath $progIdPath)) {
    throw "Required provider registration $ProviderProgId was not found. No fallback is permitted."
  }
  $clsid = (Get-ItemProperty -LiteralPath $progIdPath).'(default)'
  if ([string]::IsNullOrWhiteSpace([string]$clsid)) {
    throw "Provider $ProviderProgId has no registered CLSID."
  }
  $serverPath = "Registry::HKEY_CLASSES_ROOT\CLSID\$clsid\InprocServer32"
  if (-not (Test-Path -LiteralPath $serverPath)) {
    throw "Provider $ProviderProgId CLSID $clsid has no InprocServer32 registration."
  }
  $binary = (Get-ItemProperty -LiteralPath $serverPath).'(default)'
  if ([string]::IsNullOrWhiteSpace([string]$binary) -or -not (Test-Path -LiteralPath $binary)) {
    throw "Provider $ProviderProgId binary is not available at registered path $binary."
  }
  $file = Get-Item -LiteralPath $binary
  $signature = Get-AuthenticodeSignature -LiteralPath $file.FullName
  if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft') {
    throw "Provider binary Authenticode validation failed: $($signature.Status), $($signature.SignerCertificate.Subject)"
  }
  return [ordered]@{
    progId = $ProviderProgId
    clsid = [string]$clsid
    binaryPath = $file.FullName
    binarySha256 = Get-FileSha256 -Path $file.FullName
    fileVersion = $file.VersionInfo.FileVersion
    productVersion = $file.VersionInfo.ProductVersion
    productName = $file.VersionInfo.ProductName
    signatureStatus = [string]$signature.Status
    signerSubject = $signature.SignerCertificate.Subject
    signerThumbprint = $signature.SignerCertificate.Thumbprint
  }
}

function Read-TableEvidence {
  param(
    [Parameter(Mandatory = $true)][object]$Connection,
    [Parameter(Mandatory = $true)][string]$TableName
  )
  if ($TableName -notmatch '^[A-Z0-9_]+$') { throw "Unsafe ACCDB table name $TableName." }

  $recordset = New-Object -ComObject ADODB.Recordset
  try {
    $recordset.Open("SELECT * FROM [$TableName]", $Connection, 0, 1)
    $columns = [System.Collections.Generic.List[object]]::new()
    $fieldValues = [ordered]@{}
    for ($index = 0; $index -lt $recordset.Fields.Count; $index += 1) {
      $field = $recordset.Fields.Item($index)
      $name = [string]$field.Name
      $columns.Add([ordered]@{
        ordinal = $index
        name = $name
        adoType = [int]$field.Type
        definedSize = [int]$field.DefinedSize
        precision = [int]$field.Precision
        numericScale = [int]$field.NumericScale
        attributes = [int]$field.Attributes
      })
      $fieldValues[$name] = [System.Collections.Generic.List[string]]::new()
    }

    $rowStrings = [System.Collections.Generic.List[string]]::new()
    $rowCount = 0
    while (-not $recordset.EOF) {
      $row = [ordered]@{}
      foreach ($column in $columns) {
        $name = [string]$column.name
        $value = Convert-DatabaseValue -Value $recordset.Fields.Item($name).Value
        $row[$name] = $value
        $fieldValues[$name].Add((Convert-CanonicalValueJson -Value $value))
      }
      $rowStrings.Add(($row | ConvertTo-Json -Compress -Depth 12))
      $rowCount += 1
      $recordset.MoveNext()
    }

    $rowStrings.Sort([System.StringComparer]::Ordinal)
    $fieldHashes = [ordered]@{}
    foreach ($column in $columns) {
      $name = [string]$column.name
      $values = $fieldValues[$name]
      $values.Sort([System.StringComparer]::Ordinal)
      $fieldHashes[$name] = Get-TextSha256 -Text ([string]::Join("`n", $values))
    }
    $schemaJson = $columns | ConvertTo-Json -Compress -Depth 12
    $tablePayload = $schemaJson + "`n" + [string]::Join("`n", $rowStrings)
    return [ordered]@{
      name = $TableName
      rowCount = $rowCount
      schemaSha256 = Get-TextSha256 -Text $schemaJson
      tableSha256 = Get-TextSha256 -Text $tablePayload
      columns = $columns.ToArray()
      fieldValueMultisetSha256 = $fieldHashes
    }
  }
  finally {
    if ($recordset.State -ne 0) { $recordset.Close() }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($recordset)
  }
}

function SolverFieldManifest {
  return @(
    [ordered]@{ table='INPUT_NODAL_COORDINATES'; fields=@('FROM_NODE_X','FROM_NODE_Y','FROM_NODE_Z','TO_NODE_X','TO_NODE_Y','TO_NODE_Z'); solverMeaning='global node coordinates'; sourceStorageUnit='mm'; solverUnit='m'; conversion='value * 0.001'; authority='ACCDB' },
    [ordered]@{ table='INPUT_BASIC_ELEMENT_DATA'; fields=@('DIAMETER','WALL_THICK'); solverMeaning='pipe OD and wall'; sourceStorageUnit='mm'; solverUnit='m'; conversion='value * 0.001'; authority='ACCDB' },
    [ordered]@{ table='INPUT_BENDS'; fields=@('RADIUS'); solverMeaning='bend centreline radius'; sourceStorageUnit='mm'; solverUnit='m'; conversion='value * 0.001'; authority='ACCDB' },
    [ordered]@{ table='INPUT_BASIC_ELEMENT_DATA'; fields=@('PRESSURE1','PRESSURE2','PRESSURE3','PRESSURE4','PRESSURE5','PRESSURE6','PRESSURE7','PRESSURE8','PRESSURE9','HYDRO_PRESSURE'); solverMeaning='pressure'; sourceStorageUnit='kPa'; solverUnit='Pa'; conversion='value * 1000'; authority='ACCDB' },
    [ordered]@{ table='INPUT_BASIC_ELEMENT_DATA'; fields=@('MODULUS','HOT_MOD1'); solverMeaning='elastic modulus custody'; sourceStorageUnit='kPa'; solverUnit='Pa'; conversion='value * 1000'; authority='ACCDB' },
    [ordered]@{ table='INPUT_BASIC_ELEMENT_DATA'; fields=@('PIPE_DENSITY','FLUID_DENSITY','INSUL_DENSITY'); solverMeaning='mass density'; sourceStorageUnit='kg/cm^3'; solverUnit='kg/m^3'; conversion='value * 1000000'; authority='ACCDB' },
    [ordered]@{ table='INPUT_BASIC_ELEMENT_DATA'; fields=@('TEMP_EXP_C1'); solverMeaning='operating temperature T1'; sourceStorageUnit='C'; solverUnit='K'; conversion='value + 273.15'; authority='ACCDB' },
    [ordered]@{ table='INPUT_RESTRAINTS'; fields=@('NODE_NUM','RES_TYPEID','XCOSINE','YCOSINE','ZCOSINE'); solverMeaning='restraint node/type/direction'; sourceStorageUnit='dimensionless'; solverUnit='dimensionless'; conversion='identity'; authority='ACCDB plus governed directionality setting' }
  )
}

$resolvedAccdb = (Resolve-Path -LiteralPath $AccdbPath).Path
$resolvedProfile = (Resolve-Path -LiteralPath $ProfilePath).Path
$file = Get-Item -LiteralPath $resolvedAccdb
$accdbSha = Get-FileSha256 -Path $resolvedAccdb
$expected = $ExpectedAccdbSha256.ToLowerInvariant()
$declared = $DeclaredAccdbSha256.ToLowerInvariant()
if ($accdbSha -ne $expected) {
  throw "BM4_L ACCDB SHA-256 mismatch against pinned ZIP member: expected $expected, found $accdbSha."
}
if ($file.Length -ne $ExpectedAccdbBytes) {
  throw "BM4_L ACCDB byte-length mismatch: expected $ExpectedAccdbBytes, found $($file.Length)."
}

$profileText = [System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes($resolvedProfile))
$profile = $profileText | ConvertFrom-Json -Depth 64
if ($profile.benchmarkId -ne 'BM4_L') { throw 'Profile benchmarkId must be BM4_L.' }

$requestedTables = $TablesCsv.Split(',') |
  ForEach-Object { $_.Trim().ToUpperInvariant() } |
  Where-Object { $_ -ne '' } |
  Sort-Object -Unique
if ($requestedTables.Count -eq 0) { throw 'At least one ACCDB table is required.' }

$providerEvidence = Get-ProviderEvidence
$connection = New-Object -ComObject ADODB.Connection
try {
  $connection.Open("Provider=$ProviderProgId;Data Source=$resolvedAccdb;Mode=Read;Persist Security Info=False;")
  $schema = $connection.OpenSchema(20)
  $available = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  try {
    while (-not $schema.EOF) {
      if ([string]$schema.Fields.Item('TABLE_TYPE').Value -eq 'TABLE') {
        [void]$available.Add([string]$schema.Fields.Item('TABLE_NAME').Value)
      }
      $schema.MoveNext()
    }
  }
  finally {
    $schema.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($schema)
  }
  $missing = @($requestedTables | Where-Object { -not $available.Contains($_) })
  if ($missing.Count -gt 0) { throw "ACCDB is missing required tables: $($missing -join ', ')" }

  $tables = [System.Collections.Generic.List[object]]::new()
  foreach ($tableName in $requestedTables) {
    $tables.Add((Read-TableEvidence -Connection $connection -TableName $tableName))
  }

  $configuration = $profile.configurationAuthority
  $manifest = [ordered]@{
    schema = 'lfea-bm4l-accdb-provenance/v2'
    classificationRule = 'No fallback. Missing source authority remains [GUESSED] or BLOCKED.'
    source = [ordered]@{
      authorityRule = $SourceAuthorityRule
      path = $resolvedAccdb
      fileName = $file.Name
      byteLength = $file.Length
      sha256 = $accdbSha
      authorizedSha256 = $expected
      expectedByteLength = $ExpectedAccdbBytes
      declaredConflictingSha256 = if ([string]::IsNullOrWhiteSpace($declared)) { $null } else { $declared }
      declaredHashMatchesAuthorized = if ([string]::IsNullOrWhiteSpace($declared)) { $null } else { $declared -eq $expected }
      declaredHashClassification = if ([string]::IsNullOrWhiteSpace($declared)) { 'NOT_DECLARED' } elseif ($declared -eq $expected) { 'CONSISTENT' } else { 'CONTRADICTED_BY_PINNED_ARCHIVE_MEMBER' }
    }
    extraction = [ordered]@{
      provider = $providerEvidence
      powershellVersion = $PSVersionTable.PSVersion.ToString()
      os = [System.Environment]::OSVersion.VersionString
      processArchitecture = [System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString()
      mode = 'READ_ONLY_NO_FALLBACK'
    }
    profile = [ordered]@{
      path = $resolvedProfile
      sha256 = Get-FileSha256 -Path $resolvedProfile
      profileId = $profile.profileId
      caesarVersion = $configuration.caesarVersion
      precedence = $configuration.precedence
    }
    tables = $tables.ToArray()
    solverFieldManifest = SolverFieldManifest
    externalAuthority = [ordered]@{
      installationTemperature = $profile.installationTemperature
      individualFileSettings = $configuration.layers.individualFile
      loadCaseSettings = $configuration.layers.loadCase
      modelInputSettings = $configuration.layers.modelInput
      overallGlobalDefaults = $configuration.layers.overallGlobalDefault
      unresolvedSettings = $configuration.unresolvedSettings
      thermalExpansion = [ordered]@{
        value = $profile.linearSolve.thermalExpansion.coefficientPerKelvin
        authorityStatus = $profile.linearSolve.thermalExpansion.authorityStatus
        source = $profile.linearSolve.thermalExpansion.source
        classification = if ([string]$profile.linearSolve.thermalExpansion.source -match '^\[GUESSED\]') { '[GUESSED]' } else { 'SOURCE_DECLARED' }
      }
      restraintRepresentation = $profile.linearSolve.restraintRepresentation
      b31jSmooth90FlexibilityCorrection = $profile.linearSolve.b31jSmooth90FlexibilityCorrection
      bendPressureStiffening = $profile.linearSolve.bendPressureStiffening
      bourdonPressureEffects = $profile.linearSolve.bourdonPressureEffects
    }
  }

  $json = $manifest | ConvertTo-Json -Depth 64
  if ([string]::IsNullOrWhiteSpace($OutPath)) {
    $json
  }
  else {
    $resolvedOut = [System.IO.Path]::GetFullPath($OutPath)
    $directory = [System.IO.Path]::GetDirectoryName($resolvedOut)
    if (-not [string]::IsNullOrWhiteSpace($directory)) { [System.IO.Directory]::CreateDirectory($directory) | Out-Null }
    [System.IO.File]::WriteAllText($resolvedOut, $json + [System.Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    Write-Output $resolvedOut
  }
}
finally {
  if ($connection.State -ne 0) { $connection.Close() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($connection)
}
