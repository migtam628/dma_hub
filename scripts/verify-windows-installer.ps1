# Verify unsigned Windows preview artifacts before distribution.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$InstallerPath,
  [Parameter(Mandatory = $true)]
  [string]$ExpectedVersion
)
$ErrorActionPreference = "Stop"
$file = Get-Item -LiteralPath $InstallerPath -ErrorAction Stop
if ($file.PSIsContainer) { throw "Expected an installer file, not a folder." }
if ($file.Name -notmatch '^DMA\.Hub_.*-setup\.exe$') {
  throw "Unexpected installer filename: $($file.Name)"
}
if (-not $file.Name.Contains("_" + $ExpectedVersion + "_")) {
  throw ("Installer version does not match {0}: {1}" -f $ExpectedVersion, $file.Name)
}
if ($file.Length -lt 102400) { throw "Installer file is unexpectedly small." }
$stream = [System.IO.File]::OpenRead($file.FullName)
try {
  if ($stream.ReadByte() -ne 77 -or $stream.ReadByte() -ne 90) {
    throw "Installer is not a Windows PE executable (missing MZ header)."
  }
}
finally { $stream.Dispose() }
$signature = Get-AuthenticodeSignature -LiteralPath $file.FullName
if ($signature.Status -eq 'Valid') {
  Write-Warning "Unexpected signed installer in unsigned alpha workflow. Review release metadata."
}
elseif ($signature.Status -ne 'NotSigned') {
  throw "Unexpected or invalid signature status: $($signature.Status)"
}
else {
  Write-Warning "UNSIGNED ALPHA: Windows may show an unknown-publisher warning."
}
$hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
if ($hash -notmatch '^[a-f0-9]{64}$') { throw "Invalid SHA-256 output." }
Write-Host "Local installer verified: $($file.Name) | size=$($file.Length) | SHA256=$hash"
