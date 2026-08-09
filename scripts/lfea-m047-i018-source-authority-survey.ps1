param(
  [Parameter(Mandatory = $true)][string]$ArchiveRoot,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'

function Get-Sha256LowerHex {
  param([Parameter(Mandatory = $true)][string]$Path)
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-RelativePathSafe {
  param([string]$Root, [string]$Path)
  return [System.IO.Path]::GetRelativePath([System.IO.Path]::GetFullPath($Root), [System.IO.Path]::GetFullPath($Path)).Replace('\\','/')
}

$root = (Resolve-Path -LiteralPath $ArchiveRoot).Path
$out = [System.IO.Path]::GetFullPath($OutputPath)
$outDir = [System.IO.Path]::GetDirectoryName($out)
if ($outDir) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$textExtensions = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
foreach ($extension in @('.txt','.out','.lis','.lst','.err','.log','.rep','.rpt','.csv','.ini','.cfg','.inp','.dat','.md')) {
  [void]$textExtensions.Add($extension)
}

$terms = @('alpha','thermal expansion','expansion coefficient','exp. coeff','a106','grade b','material 106','pipe properties')
$files = @()
$matches = @()

foreach ($file in @(Get-ChildItem -LiteralPath $root -Recurse -File | Sort-Object FullName)) {
  $relative = Get-RelativePathSafe -Root $root -Path $file.FullName
  $record = [ordered]@{
    path = $relative
    extension = $file.Extension
    byteLength = $file.Length
    sha256 = Get-Sha256LowerHex -Path $file.FullName
    textSurveyed = $false
  }

  if ($textExtensions.Contains($file.Extension) -and $file.Length -le 20MB) {
    $record.textSurveyed = $true
    $lineNumber = 0
    foreach ($line in @(Get-Content -LiteralPath $file.FullName -ErrorAction Stop)) {
      $lineNumber += 1
      $lower = [string]$line
      $lower = $lower.ToLowerInvariant()
      $hitTerms = @($terms | Where-Object { $lower.Contains($_) })
      if ($hitTerms.Count -gt 0) {
        $snippet = ([string]$line).Trim()
        if ($snippet.Length -gt 240) { $snippet = $snippet.Substring(0, 240) }
        $matches += [pscustomobject][ordered]@{
          path = $relative
          line = $lineNumber
          terms = $hitTerms
          snippet = $snippet
        }
      }
    }
  }

  $files += [pscustomobject]$record
}

$accdb = @($files | Where-Object { $_.extension -ieq '.accdb' })
$candidateReports = @($files | Where-Object {
  $_.textSurveyed -and (
    $_.path -match '(?i)(error|check|report|input|material|alpha|thermal)' -or
    @($matches | Where-Object { $_.path -eq $_.path }).Count -gt 0
  )
})

$result = [ordered]@{
  schema = 'lfea-m047-i018-source-authority-survey/v1'
  issueId = 'M047'
  iterationId = 'M047-I018'
  archiveRoot = $root
  fileCount = $files.Count
  files = $files
  accdbFileCount = $accdb.Count
  accdbFiles = $accdb
  searchedTerms = $terms
  textMatchCount = $matches.Count
  textMatches = @($matches | Sort-Object path, line)
  conclusion = if ($matches.Count -gt 0) {
    'ARCHIVE_CONTAINS_TEXT_AUTHORITY_CANDIDATES_REQUIRING_REVIEW'
  } else {
    'NO_CAESAR_GENERATED_ALPHA_OR_MATERIAL_TEXT_AUTHORITY_FOUND_IN_PINNED_ARCHIVE'
  }
}

$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $out -Encoding utf8
Write-Host "M047 I018 source survey: files=$($files.Count), accdb=$($accdb.Count), textMatches=$($matches.Count), conclusion=$($result.conclusion)"
