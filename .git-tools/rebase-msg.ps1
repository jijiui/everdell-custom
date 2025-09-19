param([string]$msgPath)
if (-not $msgPath) { $msgPath = $args[0] }
$message = 'feat: add cross-turn undo; previous player can undo until next player submits'
Set-Content -Path $msgPath -Value $message -NoNewline