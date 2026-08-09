param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

# Official Microsoft Download Center authority for Office Deployment Tool.
# Download Center id 49117 reported version 16.0.20131.20090 on 2026-08-09.
$odtDetailsUri = 'https://www.microsoft.com/en-us/download/details.aspx?id=49117'
$odtUri = 'https://download.microsoft.com/download/6c1eeb25-cf8b-41d9-8d0d-cc1dbc032140/officedeploymenttool_20131-20090.exe'
$odtExpectedFileName = 'officedeploymenttool_20131-20090.exe'
$odtExpectedVersion = '16.0.20131.20090'

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = Split-Path -Parent $resolvedOutput
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

$odtRoot = Join-Path $env:RUNNER_TEMP 'm047-odt'
if (Test-Path -LiteralPath $odtRoot) {
    Remove-Item -LiteralPath $odtRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $odtRoot -Force | Out-Null

$odtBootstrap = Join-Path $odtRoot $odtExpectedFileName
Invoke-WebRequest -UseBasicParsing -Uri $odtUri -OutFile $odtBootstrap
$odtBootstrapSha256 = (Get-FileHash -LiteralPath $odtBootstrap -Algorithm SHA256).Hash.ToLowerInvariant()
$bootstrapSignature = Get-AuthenticodeSignature -FilePath $odtBootstrap
if ($bootstrapSignature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
    throw "Office Deployment Tool Authenticode signature is $($bootstrapSignature.Status), expected Valid."
}
$bootstrapSubject = [string]$bootstrapSignature.SignerCertificate.Subject
if ($bootstrapSubject -notmatch '(^|,\s*)O=Microsoft Corporation(,|$)') {
    throw "Office Deployment Tool signer is not Microsoft Corporation: $bootstrapSubject"
}

$extract = Start-Process -FilePath $odtBootstrap -ArgumentList @('/quiet', "/extract:$odtRoot") -Wait -PassThru
if ($extract.ExitCode -ne 0) {
    throw "Office Deployment Tool extraction failed with exit code $($extract.ExitCode)."
}
$setup = Join-Path $odtRoot 'setup.exe'
if (-not (Test-Path -LiteralPath $setup)) {
    throw 'Office Deployment Tool extraction did not produce setup.exe.'
}
$setupVersion = (Get-Item -LiteralPath $setup).VersionInfo.FileVersion
if (-not $setupVersion.StartsWith($odtExpectedVersion, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Extracted ODT setup.exe version $setupVersion does not match expected $odtExpectedVersion."
}
$setupSignature = Get-AuthenticodeSignature -FilePath $setup
if ($setupSignature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
    throw "Extracted ODT setup.exe Authenticode signature is $($setupSignature.Status), expected Valid."
}
$setupSubject = [string]$setupSignature.SignerCertificate.Subject
if ($setupSubject -notmatch '(^|,\s*)O=Microsoft Corporation(,|$)') {
    throw "Extracted ODT setup.exe signer is not Microsoft Corporation: $setupSubject"
}

$configuration = Join-Path $odtRoot 'access-runtime.xml'
@'
<Configuration>
  <Add OfficeClientEdition="64" Channel="Current">
    <Product ID="AccessRuntimeRetail">
      <Language ID="en-us" />
    </Product>
  </Add>
  <Updates Enabled="FALSE" />
  <Display Level="None" AcceptEULA="TRUE" />
</Configuration>
'@ | Set-Content -LiteralPath $configuration -Encoding ascii

$install = Start-Process -FilePath $setup -ArgumentList @('/configure', $configuration) -Wait -PassThru
if ($install.ExitCode -ne 0) {
    throw "Microsoft 365 Access Runtime deployment failed with exit code $($install.ExitCode)."
}

[ordered]@{
    schema = 'lfea-m047-ace-provisioning/v1'
    deploymentAuthority = 'MICROSOFT_OFFICE_DEPLOYMENT_TOOL'
    accessRuntimeProductId = 'AccessRuntimeRetail'
    architecture = 'x64'
    channel = 'Current'
    language = 'en-us'
    odtDetailsUri = $odtDetailsUri
    odtDownloadUri = $odtUri
    odtExpectedVersion = $odtExpectedVersion
    odtBootstrapSha256 = $odtBootstrapSha256
    odtBootstrapSigner = $bootstrapSubject
    odtBootstrapSignerThumbprint = $bootstrapSignature.SignerCertificate.Thumbprint
    odtSetupVersion = $setupVersion
    odtSetupSigner = $setupSubject
    odtSetupSignerThumbprint = $setupSignature.SignerCertificate.Thumbprint
    deploymentExitCode = $install.ExitCode
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $resolvedOutput -Encoding utf8

Write-Output "lfea-m047-provision-ace: PASS ODT $setupVersion; AccessRuntimeRetail deployment exit $($install.ExitCode)."
