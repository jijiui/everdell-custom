param([string]$todoPath)
if (-not $todoPath) { $todoPath = $args[0] }
$content = Get-Content -Raw -Path $todoPath
$lines = $content -split "`r?`n"
$modified = $false
for ($i=0; $i -lt $lines.Length; $i++) {
  if (-not $modified -and ($lines[$i] -match '^[#;]') -eq $false -and ($lines[$i] -match '^\s*pick\b')) {
    $lines[$i] = $lines[$i] -replace '^\s*pick\b', 'reword'
    $modified = $true
  }
}
$nl = [Environment]::NewLine
[IO.File]::WriteAllText($todoPath, ($lines -join $nl))