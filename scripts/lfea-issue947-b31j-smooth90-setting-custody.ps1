param(
  [Parameter(Mandatory = $true)]
  [string]$AccdbPath,

  [Parameter(Mandatory = $true)]
  [string]$ZipPath,

  [Parameter(Mandatory = $true)]
  [string]$OutPath
)

$ErrorActionPreference = 'Stop'
$ExpectedSha256 = '85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21'
$StrongSchemaPattern = '(?i)(B31J|SMOOTH|CONFIG|SETTING|OPTION|VERSION|PROGRAM|CAESAR)'
$ValuePattern = '(?i)(B31J|SMOOTH\s*90|SMOOTH[_ -]*90|CAESAR|CONFIGURATION|VERSION|BEND\s+CORRECTION)'
$Smooth90Pattern = '(?i)(SMOOTH.*90|90.*SMOOTH)'
$MaxValueHits = 5000
$MaxCandidateRowsPerTable = 2000

function Get-Sha256Hex {
  param([Parameter(Mandatory = $true)][string]$Path)
  return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash.ToLowerInvariant()
}

function Convert-DatabaseValue {
  param([Parameter(Mandatory = $false)][object]$Value)
  if ($null -eq $Value -or $Value -is [System.DBNull]) { return $null }
  if ($Value -is [System.DateTime]) { return $Value.ToUniversalTime().ToString('o') }
  if ($Value -is [byte[]]) { return [Convert]::ToBase64String($Value) }
  return $Value
}

function Quote-AccessIdentifier {
  param([Parameter(Mandatory = $true)][string]$Value)
  return '[' + $Value.Replace(']', ']]') + ']'
}

function Convert-ToNullableBoolean {
  param([Parameter(Mandatory = $false)][object]$Value)
  if ($null -eq $Value) { return $null }
  if ($Value -is [bool]) { return [bool]$Value }
  if ($Value -is [byte] -or $Value -is [int16] -or $Value -is [int32] -or $Value -is [int64]) {
    $number = [int64]$Value
    if ($number -eq 0) { return $false }
    if ($number -eq 1 -or $number -eq -1) { return $true }
  }
  $text = ([string]$Value).Trim()
  if ($text -match '^(?i:true|yes|on|enabled)$') { return $true }
  if ($text -match '^(?i:false|no|off|disabled)$') { return $false }
  if ($text -eq '0') { return $false }
  if ($text -eq '1' -or $text -eq '-1') { return $true }
  return $null
}

function Read-ZipMembers {
  param([Parameter(Mandatory = $true)][string]$Path)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Path).Path)
  try {
    return @($archive.Entries | Sort-Object FullName | ForEach-Object {
      [ordered]@{
        fullName = $_.FullName
        length = $_.Length
        compressedLength = $_.CompressedLength
      }
    })
  }
  finally {
    $archive.Dispose()
  }
}

function Read-TableRows {
  param(
    [Parameter(Mandatory = $true)][object]$Connection,
    [Parameter(Mandatory = $true)][string]$TableName,
    [Parameter(Mandatory = $true)][string[]]$Columns,
    [Parameter(Mandatory = $true)][bool]$CaptureCandidateRows,
    [Parameter(Mandatory = $true)][System.Collections.Generic.List[object]]$ValueHits,
    [Parameter(Mandatory = $true)][System.Collections.Generic.List[object]]$Smooth90Rows
  )

  $recordset = New-Object -ComObject ADODB.Recordset
  $rowCount = 0
  $candidateRows = [System.Collections.Generic.List[object]]::new()
  try {
    $recordset.Open("SELECT * FROM $(Quote-AccessIdentifier -Value $TableName)", $Connection, 0, 1)
    while (-not $recordset.EOF) {
      $row = [ordered]@{}
      $rowHasStrongValue = $false
      $rowHasSmooth90 = $false
      foreach ($column in $Columns) {
        $value = Convert-DatabaseValue -Value $recordset.Fields.Item($column).Value
        $row[$column] = $value
        if ($null -ne $value) {
          $text = [string]$value
          if ($text -match $ValuePattern) {
            $rowHasStrongValue = $true
            if ($ValueHits.Count -lt $MaxValueHits) {
              $ValueHits.Add([pscustomobject][ordered]@{
                table = $TableName
                column = $column
                rowIndex = $rowCount
                value = $value
              })
            }
          }
          if ($text -match $Smooth90Pattern) { $rowHasSmooth90 = $true }
        }
      }

      if (($CaptureCandidateRows -or $rowHasStrongValue) -and $candidateRows.Count -lt $MaxCandidateRowsPerTable) {
        $candidateRows.Add([pscustomobject]$row)
      }
      if ($rowHasSmooth90) {
        $Smooth90Rows.Add([pscustomobject][ordered]@{
          table = $TableName
          rowIndex = $rowCount
          row = [pscustomobject]$row
        })
      }
      $rowCount += 1
      $recordset.MoveNext()
    }
  }
  finally {
    if ($recordset.State -ne 0) { $recordset.Close() }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($recordset)
  }

  return [ordered]@{
    rowCount = $rowCount
    candidateRows = $candidateRows.ToArray()
  }
}

function Resolve-Smooth90Disposition {
  param([Parameter(Mandatory = $true)][object[]]$Rows)
  $resolved = [System.Collections.Generic.List[object]]::new()
  foreach ($entry in $Rows) {
    $row = $entry.row
    $properties = @($row.PSObject.Properties)
    $nameProperties = @($properties | Where-Object {
      $null -ne $_.Value -and ([string]$_.Value -match $Smooth90Pattern -or $_.Name -match $Smooth90Pattern)
    })
    if ($nameProperties.Count -eq 0) { continue }

    foreach ($property in $properties) {
      $boolean = Convert-ToNullableBoolean -Value $property.Value
      if ($null -ne $boolean) {
        $resolved.Add([pscustomobject][ordered]@{
          table = $entry.table
          rowIndex = $entry.rowIndex
          settingEvidence = @($nameProperties | ForEach-Object { [ordered]@{ field = $_.Name; value = $_.Value } })
          booleanField = $property.Name
          booleanValue = $boolean
          rawBooleanValue = $property.Value
        })
      }
    }
  }

  $values = @($resolved | ForEach-Object { $_.booleanValue } | Sort-Object -Unique)
  if ($values.Count -eq 1) {
    return [ordered]@{
      classification = $(if ([bool]$values[0]) { 'SOURCE_SETTING_TRUE' } else { 'SOURCE_SETTING_FALSE' })
      resolvedValue = [bool]$values[0]
      evidence = $resolved.ToArray()
    }
  }
  if ($values.Count -gt 1) {
    return [ordered]@{
      classification = 'SOURCE_SETTING_CONFLICTING_EXPLICIT_VALUES'
      resolvedValue = $null
      evidence = $resolved.ToArray()
    }
  }
  return [ordered]@{
    classification = 'SOURCE_SETTING_NOT_EXPORTED'
    resolvedValue = $null
    evidence = @()
  }
}

$resolvedAccdb = (Resolve-Path -LiteralPath $AccdbPath).Path
$resolvedZip = (Resolve-Path -LiteralPath $ZipPath).Path
$actualSha = Get-Sha256Hex -Path $resolvedAccdb
if ($actualSha -ne $ExpectedSha256) { throw "ACCDB SHA-256 mismatch: $actualSha" }
$zipMembers = Read-ZipMembers -Path $resolvedZip

$connection = New-Object -ComObject ADODB.Connection
try {
  $connection.Open("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$resolvedAccdb;Mode=Read;Persist Security Info=False;")

  $connectionProperties = [System.Collections.Generic.List[object]]::new()
  foreach ($property in $connection.Properties) {
    $value = Convert-DatabaseValue -Value $property.Value
    if ([string]$property.Name -match $StrongSchemaPattern -or ($null -ne $value -and [string]$value -match $ValuePattern)) {
      $connectionProperties.Add([pscustomobject][ordered]@{
        name = [string]$property.Name
        value = $value
      })
    }
  }

  $tableSchema = $connection.OpenSchema(20)
  $tableNames = [System.Collections.Generic.List[string]]::new()
  try {
    while (-not $tableSchema.EOF) {
      $tableType = [string]$tableSchema.Fields.Item('TABLE_TYPE').Value
      $tableName = [string]$tableSchema.Fields.Item('TABLE_NAME').Value
      if ($tableType -eq 'TABLE' -and $tableName -notmatch '^(?i:MSYS)') { $tableNames.Add($tableName) }
      $tableSchema.MoveNext()
    }
  }
  finally {
    $tableSchema.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($tableSchema)
  }

  $schema = [System.Collections.Generic.List[object]]::new()
  $valueHits = [System.Collections.Generic.List[object]]::new()
  $smooth90Rows = [System.Collections.Generic.List[object]]::new()
  $candidateTableRows = [ordered]@{}

  foreach ($tableName in @($tableNames.ToArray() | Sort-Object)) {
    $recordset = New-Object -ComObject ADODB.Recordset
    $columns = [System.Collections.Generic.List[string]]::new()
    try {
      $recordset.Open("SELECT * FROM $(Quote-AccessIdentifier -Value $tableName) WHERE 1=0", $connection, 0, 1)
      for ($index = 0; $index -lt $recordset.Fields.Count; $index += 1) {
        $columns.Add([string]$recordset.Fields.Item($index).Name)
      }
    }
    finally {
      if ($recordset.State -ne 0) { $recordset.Close() }
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($recordset)
    }

    $columnArray = $columns.ToArray()
    $schemaStrong = $tableName -match $StrongSchemaPattern -or @($columnArray | Where-Object { $_ -match $StrongSchemaPattern }).Count -gt 0
    $scan = Read-TableRows -Connection $connection -TableName $tableName -Columns $columnArray `
      -CaptureCandidateRows $schemaStrong -ValueHits $valueHits -Smooth90Rows $smooth90Rows
    $schema.Add([pscustomobject][ordered]@{
      table = $tableName
      columns = $columnArray
      rowCount = $scan.rowCount
      strongSchemaMatch = $schemaStrong
    })
    if ($scan.candidateRows.Count -gt 0) { $candidateTableRows[$tableName] = $scan.candidateRows }
  }

  $disposition = Resolve-Smooth90Disposition -Rows $smooth90Rows.ToArray()
  $versionEvidence = @($valueHits.ToArray() | Where-Object {
    $_.column -match '(?i)(VERSION|PROGRAM|CAESAR)' -or [string]$_.value -match '(?i)(CAESAR|VERSION)'
  })

  $output = [ordered]@{
    schema = 'lfea-issue947-b31j-smooth90-setting-custody/v1'
    issue = 947
    sourceAccdbSha256 = $actualSha
    sourceZip = [ordered]@{
      path = $resolvedZip
      members = $zipMembers
      memberCount = $zipMembers.Count
    }
    purpose = 'SOURCE_CUSTODY_ONLY_NO_BENCHMARK_RESIDUAL_OR_MECHANICS_INFERENCE'
    scanVocabulary = [ordered]@{
      strongSchemaPattern = $StrongSchemaPattern
      valuePattern = $ValuePattern
      smooth90Pattern = $Smooth90Pattern
    }
    connectionPropertyMatches = $connectionProperties.ToArray()
    userTableSchema = $schema.ToArray()
    matchingValues = $valueHits.ToArray()
    candidateTableRows = $candidateTableRows
    smooth90Rows = $smooth90Rows.ToArray()
    versionEvidence = $versionEvidence
    settingDisposition = $disposition
    classification = $disposition.classification
    falsificationRule = 'Do not infer the setting from BM4_NL residual agreement. SOURCE_SETTING_TRUE/FALSE requires an explicit ACCDB row/property naming the smooth-90 setting and an unambiguous boolean value; otherwise classify SOURCE_SETTING_NOT_EXPORTED.'
  }

  $parent = Split-Path -Parent $OutPath
  if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  $output | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $OutPath -Encoding utf8
  $output | ConvertTo-Json -Depth 8
  Write-Host "Issue 947 B31J smooth-90 source custody: $($output.classification)"
}
finally {
  if ($connection.State -ne 0) { $connection.Close() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($connection)
}
