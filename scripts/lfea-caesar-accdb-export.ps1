# Read-only CAESAR II ACCDB extractor.
# Inputs: an ACCDB path and an explicit comma-separated table allowlist.
# Output: one JSON document on stdout; missing ACE provider/tables raise errors with no fallback.
param(
  [Parameter(Mandatory = $true)]
  [string]$AccdbPath,

  [Parameter(Mandatory = $true)]
  [string]$TablesCsv
)

$ErrorActionPreference = 'Stop'

function Convert-DatabaseValue {
  param(
    [Parameter(Mandatory = $false)]
    [object]$Value
  )

  if ($null -eq $Value -or $Value -is [System.DBNull]) {
    return $null
  }
  if ($Value -is [System.DateTime]) {
    return $Value.ToUniversalTime().ToString('o')
  }
  if ($Value -is [byte[]]) {
    return [Convert]::ToBase64String($Value)
  }
  return $Value
}

function Read-DatabaseTable {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Connection,

    [Parameter(Mandatory = $true)]
    [string]$TableName
  )

  if ($TableName -notmatch '^[A-Z0-9_]+$') {
    throw "Unsafe ACCDB table name: $TableName"
  }

  $recordset = New-Object -ComObject ADODB.Recordset
  try {
    $recordset.Open("SELECT * FROM [$TableName]", $Connection, 0, 1)
    $columns = [System.Collections.Generic.List[string]]::new()
    for ($index = 0; $index -lt $recordset.Fields.Count; $index += 1) {
      $columns.Add([string]$recordset.Fields.Item($index).Name)
    }

    $rows = [System.Collections.Generic.List[object]]::new()
    while (-not $recordset.EOF) {
      $row = [ordered]@{}
      foreach ($column in $columns) {
        $row[$column] = Convert-DatabaseValue -Value $recordset.Fields.Item($column).Value
      }
      $rows.Add([pscustomobject]$row)
      $recordset.MoveNext()
    }

    return [ordered]@{
      columns = $columns.ToArray()
      rows = $rows.ToArray()
    }
  }
  finally {
    if ($recordset.State -ne 0) {
      $recordset.Close()
    }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($recordset)
  }
}

$resolvedPath = (Resolve-Path -LiteralPath $AccdbPath).Path
$requestedTables = $TablesCsv.Split(',') |
  ForEach-Object { $_.Trim().ToUpperInvariant() } |
  Where-Object { $_ -ne '' } |
  Sort-Object -Unique

if ($requestedTables.Count -eq 0) {
  throw 'At least one ACCDB table must be requested.'
}

$connection = New-Object -ComObject ADODB.Connection
try {
  $connection.Open("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$resolvedPath;Mode=Read;Persist Security Info=False;")
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
  if ($missing.Count -gt 0) {
    throw "ACCDB is missing required tables: $($missing -join ', ')"
  }

  $tables = [ordered]@{}
  foreach ($tableName in $requestedTables) {
    $tables[$tableName] = Read-DatabaseTable -Connection $connection -TableName $tableName
  }

  $file = Get-Item -LiteralPath $resolvedPath
  $export = [ordered]@{
    schema = 'caesar-accdb-raw-export/v1'
    source = [ordered]@{
      path = $resolvedPath
      fileName = $file.Name
      byteLength = $file.Length
      lastWriteTimeUtc = $file.LastWriteTimeUtc.ToString('o')
      sha256 = (Get-FileHash -LiteralPath $resolvedPath -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    provider = 'Microsoft.ACE.OLEDB.12.0'
    tables = $tables
  }

  $export | ConvertTo-Json -Depth 12 -Compress
}
finally {
  if ($connection.State -ne 0) {
    $connection.Close()
  }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($connection)
}
