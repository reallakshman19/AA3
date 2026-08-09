# Read-only schema inventory for the locked M047 CAESAR ACCDB.
# Emits table/column names and keyword matches only; it does not read benchmark result values.
param(
  [Parameter(Mandatory = $true)]
  [string]$AccdbPath,

  [Parameter(Mandatory = $true)]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

function Get-Sha256LowerHex {
  param([Parameter(Mandatory = $true)][string]$Path)
  $stream = [System.IO.File]::OpenRead($Path)
  $sha256 = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha256.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
  }
  finally {
    $sha256.Dispose()
    $stream.Dispose()
  }
}

$resolvedPath = (Resolve-Path -LiteralPath $AccdbPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutput)
if (-not [string]::IsNullOrWhiteSpace($outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$connection = New-Object -ComObject ADODB.Connection
try {
  $connection.Open("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$resolvedPath;Mode=Read;Persist Security Info=False;")

  $tableNames = [System.Collections.Generic.List[string]]::new()
  $tablesSchema = $connection.OpenSchema(20)
  try {
    while (-not $tablesSchema.EOF) {
      if ([string]$tablesSchema.Fields.Item('TABLE_TYPE').Value -eq 'TABLE') {
        $tableNames.Add([string]$tablesSchema.Fields.Item('TABLE_NAME').Value)
      }
      $tablesSchema.MoveNext()
    }
  }
  finally {
    $tablesSchema.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($tablesSchema)
  }

  $tableSet = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
  foreach ($name in $tableNames) { [void]$tableSet.Add($name) }

  $columnsByTable = @{}
  foreach ($name in $tableNames) {
    $columnsByTable[$name] = [System.Collections.Generic.List[object]]::new()
  }

  $columnsSchema = $connection.OpenSchema(4)
  try {
    while (-not $columnsSchema.EOF) {
      $tableName = [string]$columnsSchema.Fields.Item('TABLE_NAME').Value
      if ($tableSet.Contains($tableName)) {
        $columnName = [string]$columnsSchema.Fields.Item('COLUMN_NAME').Value
        $ordinal = [int]$columnsSchema.Fields.Item('ORDINAL_POSITION').Value
        $dataType = [int]$columnsSchema.Fields.Item('DATA_TYPE').Value
        $columnsByTable[$tableName].Add([pscustomobject][ordered]@{
          ordinal = $ordinal
          name = $columnName
          adoDataType = $dataType
        })
      }
      $columnsSchema.MoveNext()
    }
  }
  finally {
    $columnsSchema.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($columnsSchema)
  }

  $keywords = @('ALPHA','BOURDON','COEFF','CODE','CONFIG','ELASTIC','EXP','LOAD','MATERIAL','MODULUS','TEMP','THERM')
  $tables = @()
  $matches = @()
  foreach ($tableName in @($tableNames | Sort-Object -Unique)) {
    $columns = @($columnsByTable[$tableName] | Sort-Object ordinal, name)
    $tables += [pscustomobject][ordered]@{
      name = $tableName
      columns = @($columns)
    }
    foreach ($column in $columns) {
      $haystack = "$tableName.$($column.name)".ToUpperInvariant()
      $matchedKeywords = @($keywords | Where-Object { $haystack.Contains($_) })
      if ($matchedKeywords.Count -gt 0) {
        $matches += [pscustomobject][ordered]@{
          table = $tableName
          column = $column.name
          keywords = $matchedKeywords
        }
      }
    }
  }

  $file = Get-Item -LiteralPath $resolvedPath
  $record = [ordered]@{
    schema = 'lfea-m047-i017-accdb-authority-inventory/v1'
    issueId = 'M047'
    iterationId = 'M047-I017'
    source = [ordered]@{
      fileName = $file.Name
      byteLength = $file.Length
      sha256 = Get-Sha256LowerHex -Path $resolvedPath
      provider = 'Microsoft.ACE.OLEDB.12.0'
    }
    method = 'ADODB OpenSchema tables+columns; no table data read'
    keywords = $keywords
    tableCount = $tables.Count
    tables = $tables
    keywordMatches = @($matches | Sort-Object table, column)
  }

  $record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resolvedOutput -Encoding utf8
  Write-Host "M047 I017 ACCDB schema inventory: tables=$($record.tableCount), matches=$($record.keywordMatches.Count), sha256=$($record.source.sha256)"
}
finally {
  if ($connection.State -ne 0) { $connection.Close() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($connection)
}
