# Read-only ACCDB schema inventory for qualification diagnostics.
# Emits table names and field names only; no table data are exported.
param(
  [Parameter(Mandatory = $true)]
  [string]$AccdbPath,

  [Parameter(Mandatory = $true)]
  [string]$OutPath
)

$ErrorActionPreference = 'Stop'
$resolvedPath = (Resolve-Path -LiteralPath $AccdbPath).Path
$connection = New-Object -ComObject ADODB.Connection
try {
  $connection.Open("Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$resolvedPath;Mode=Read;Persist Security Info=False;")
  $schema = $connection.OpenSchema(20)
  $tableNames = [System.Collections.Generic.List[string]]::new()
  try {
    while (-not $schema.EOF) {
      if ([string]$schema.Fields.Item('TABLE_TYPE').Value -eq 'TABLE') {
        $name = [string]$schema.Fields.Item('TABLE_NAME').Value
        if ($name -notmatch '^MSys') {
          $tableNames.Add($name)
        }
      }
      $schema.MoveNext()
    }
  }
  finally {
    $schema.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($schema)
  }

  $tables = [System.Collections.Generic.List[object]]::new()
  foreach ($tableName in ($tableNames | Sort-Object -Unique)) {
    if ([string]::IsNullOrWhiteSpace($tableName) -or $tableName.Contains([char]0)) {
      throw 'Invalid ACCDB table name encountered during schema inventory.'
    }
    $quotedTableName = '[' + $tableName.Replace(']', ']]') + ']'
    $recordset = New-Object -ComObject ADODB.Recordset
    try {
      $recordset.Open("SELECT * FROM $quotedTableName WHERE 1=0", $connection, 0, 1)
      $columns = [System.Collections.Generic.List[string]]::new()
      for ($index = 0; $index -lt $recordset.Fields.Count; $index += 1) {
        $columns.Add([string]$recordset.Fields.Item($index).Name)
      }
      $tables.Add([pscustomobject][ordered]@{
        table = $tableName
        columns = $columns.ToArray()
      })
    }
    finally {
      if ($recordset.State -ne 0) { $recordset.Close() }
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($recordset)
    }
  }

  $candidateTokens = @('CASE', 'LOAD', 'STATIC', 'STIFF', 'ELBOW', 'MODUL', 'PRESS', 'CONTROL', 'CONFIG', 'OPTION')
  $candidates = @($tables | Where-Object {
    $haystack = (($_.table, ($_.columns -join ' ')) -join ' ').ToUpperInvariant()
    foreach ($token in $candidateTokens) {
      if ($haystack.Contains($token)) { return $true }
    }
    return $false
  })

  $output = [ordered]@{
    schema = 'caesar-accdb-schema-diagnostics/v1'
    sourceFileName = [System.IO.Path]::GetFileName($resolvedPath)
    tableCount = $tables.Count
    tables = $tables.ToArray()
    candidateTokens = $candidateTokens
    candidates = $candidates
  }
  $directory = Split-Path -Parent $OutPath
  if ($directory) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
  $output | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutPath -Encoding utf8
  Write-Host "Inventoried $($tables.Count) non-system ACCDB table schemas."
  foreach ($candidate in $candidates) {
    Write-Host ("Candidate {0}: {1}" -f $candidate.table, ($candidate.columns -join ', '))
  }
}
finally {
  if ($connection.State -ne 0) { $connection.Close() }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($connection)
}
