param(
  [int]$Port = 5178,
  [int]$Level = 1,
  [switch]$Watch,
  [int]$CheckSeconds = 30,
  [int]$RefreshMinutes = 0
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$tmpDir = Join-Path $repoRoot "tmp"
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

function Get-RequiredEnv([string]$name) {
  $value = [Environment]::GetEnvironmentVariable($name, "Process")
  if (-not $value) {
    $value = [Environment]::GetEnvironmentVariable($name, "User")
  }
  if (-not $value) {
    throw "$name is required. Set it in the current shell or User environment."
  }
  return $value
}

function Wait-HttpOk([string]$url, [int]$timeoutSeconds = 30) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)
  do {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        return $response
      }
    } catch {
      Start-Sleep -Milliseconds 700
    }
  } while ((Get-Date) -lt $deadline)
  throw "URL did not become ready: $url"
}

function Wait-HttpStable([string]$url, [int]$checks = 2, [int]$gapSeconds = 6, [int]$timeoutSeconds = 30) {
  $response = $null
  for ($i = 0; $i -lt $checks; $i++) {
    $response = Wait-HttpOk $url $timeoutSeconds
    if ($i -lt ($checks - 1)) {
      Start-Sleep -Seconds $gapSeconds
    }
  }
  return $response
}

function Stop-OtherTunnels([int]$port, [int[]]$keepPids = @()) {
  Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -like "cloudflared*" -and
        $_.CommandLine -like "*127.0.0.1:$port*" -and
        -not ($keepPids -contains [int]$_.ProcessId)
    } |
    ForEach-Object {
      try {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
      } catch {
        Write-Warning "Could not stop cloudflared PID $($_.ProcessId): $($_.Exception.Message)"
      }
    }
}

function Start-QuickTunnel([int]$port) {
  $beforePids = @(
    Get-CimInstance Win32_Process |
      Where-Object { $_.Name -like "cloudflared*" -and $_.CommandLine -like "*127.0.0.1:$port*" } |
      ForEach-Object { [int]$_.ProcessId }
  )
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $outLog = Join-Path $tmpDir "cloudflared-auto-$stamp.out.log"
  $errLog = Join-Path $tmpDir "cloudflared-auto-$stamp.err.log"
  $cloudflared = (Get-Command cloudflared.exe).Source
  $process = Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @("tunnel", "--url", "http://127.0.0.1:$port", "--no-autoupdate") `
    -WindowStyle Hidden `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog `
    -PassThru

  $tunnelUrl = $null
  for ($i = 0; $i -lt 80; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Path -LiteralPath $errLog) {
      $matches = Select-String -Path $errLog -Pattern "https://[-a-z0-9]+\.trycloudflare\.com" -AllMatches -ErrorAction SilentlyContinue
      if ($matches) {
        $tunnelUrl = ($matches | Select-Object -Last 1).Matches.Value
        break
      }
    }
    if ($process.HasExited) {
      throw "cloudflared exited before creating a tunnel. See $errLog"
    }
  }
  if (-not $tunnelUrl) {
    throw "cloudflared did not print a tunnel URL. See $errLog"
  }
  $afterPids = @(
    Get-CimInstance Win32_Process |
      Where-Object { $_.Name -like "cloudflared*" -and $_.CommandLine -like "*127.0.0.1:$port*" } |
      ForEach-Object { [int]$_.ProcessId }
  )
  $keepPids = @([int]$process.Id) + @($afterPids | Where-Object { $beforePids -notcontains $_ })
  return [pscustomobject]@{
    Process = $process
    KeepPids = $keepPids
    Url = $tunnelUrl
    OutLog = $outLog
    ErrLog = $errLog
  }
}

function Set-TelegramMenu([string]$token, [string]$publicGameUrl) {
  $playText = -join ([char[]](1048, 1075, 1088, 1072, 1090, 1100))
  $payload = @{
    menu_button = @{
      type = "web_app"
      text = $playText
      web_app = @{ url = $publicGameUrl }
    }
  } | ConvertTo-Json -Depth 6
  $result = Invoke-RestMethod `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $payload `
    -Uri "https://api.telegram.org/bot$token/setChatMenuButton" `
    -TimeoutSec 20
  if (-not $result.ok) {
    throw "setChatMenuButton failed"
  }
}

function Get-TelegramMenuUrl([string]$token) {
  try {
    $result = Invoke-RestMethod `
      -Method Post `
      -ContentType "application/json; charset=utf-8" `
      -Body "{}" `
      -Uri "https://api.telegram.org/bot$token/getChatMenuButton" `
      -TimeoutSec 20
    return $result.result.web_app.url
  } catch {
    return $null
  }
}

function Start-TelegramStack {
  $token = Get-RequiredEnv "TELEGRAM_BOT_TOKEN"

  Push-Location $repoRoot
  try {
    docker compose up -d --build game | Out-Null
    Wait-HttpOk "http://127.0.0.1:$Port/?health=telegram-dev" 45 | Out-Null

    $tunnel = $null
    $publicGameUrl = $null
    $lastTunnelError = $null
    for ($attempt = 1; $attempt -le 5; $attempt++) {
      $tunnel = Start-QuickTunnel $Port
      $cacheBust = [int][double]::Parse((Get-Date -UFormat %s))
      $publicGameUrl = "$($tunnel.Url)/?level=$Level&r=auto-$cacheBust"
      try {
        Wait-HttpStable $publicGameUrl 2 8 75 | Out-Null
        break
      } catch {
        $lastTunnelError = $_.Exception.Message
        Write-Warning "Tunnel attempt $attempt is not healthy yet: $lastTunnelError"
        foreach ($keepPid in $tunnel.KeepPids) {
          try {
            Stop-Process -Id $keepPid -Force -ErrorAction SilentlyContinue
          } catch {
          }
        }
        $tunnel = $null
        $publicGameUrl = $null
        Start-Sleep -Seconds 2
      }
    }

    if (-not $tunnel -or -not $publicGameUrl) {
      throw "Could not create a healthy cloudflared tunnel after 5 attempts. Last error: $lastTunnelError"
    }

    Set-TelegramMenu $token $publicGameUrl
    Stop-OtherTunnels $Port $tunnel.KeepPids
    [Environment]::SetEnvironmentVariable("PUBLIC_GAME_URL", $publicGameUrl, "User")
    $env:TELEGRAM_BOT_TOKEN = $token
    $env:PUBLIC_GAME_URL = $publicGameUrl
    docker compose --profile telegram up -d --build --force-recreate telegram-bot | Out-Null

    return [pscustomobject]@{
      PublicGameUrl = $publicGameUrl
      TunnelPid = $tunnel.Process.Id
      TunnelLog = $tunnel.ErrLog
    }
  } finally {
    Pop-Location
  }
}

$current = $null
$token = Get-RequiredEnv "TELEGRAM_BOT_TOKEN"
if ($Watch -and $RefreshMinutes -eq 0) {
  $existingUrl = Get-TelegramMenuUrl $token
  if ($existingUrl) {
    try {
      Wait-HttpStable $existingUrl 2 6 15 | Out-Null
      $current = [pscustomobject]@{
        PublicGameUrl = $existingUrl
        TunnelPid = $null
        TunnelLog = $null
      }
      Write-Host "Using existing healthy Telegram game URL: $($current.PublicGameUrl)"
    } catch {
      Write-Warning "Existing Telegram URL is not healthy, refreshing: $($_.Exception.Message)"
    }
  }
}

if (-not $current) {
  $current = Start-TelegramStack
  Write-Host "Telegram game URL: $($current.PublicGameUrl)"
  Write-Host "cloudflared PID: $($current.TunnelPid)"
}

if ($Watch) {
  Write-Host "Watch mode enabled. Checking every $CheckSeconds seconds."
  if ($RefreshMinutes -gt 0) {
    Write-Host "Timed refresh enabled. Refreshing every $RefreshMinutes minutes."
  }
  $lastRefresh = Get-Date
  while ($true) {
    Start-Sleep -Seconds $CheckSeconds
    try {
      if ($RefreshMinutes -gt 0 -and ((Get-Date) - $lastRefresh).TotalMinutes -ge $RefreshMinutes) {
        Write-Host "Timed refresh interval reached, refreshing Telegram link."
        $current = Start-TelegramStack
        $lastRefresh = Get-Date
        Write-Host "Telegram game URL: $($current.PublicGameUrl)"
        Write-Host "cloudflared PID: $($current.TunnelPid)"
        continue
      }
      Wait-HttpOk $current.PublicGameUrl 10 | Out-Null
    } catch {
      Write-Warning "Current tunnel is not healthy, refreshing Telegram link: $($_.Exception.Message)"
      $current = Start-TelegramStack
      $lastRefresh = Get-Date
      Write-Host "Telegram game URL: $($current.PublicGameUrl)"
      Write-Host "cloudflared PID: $($current.TunnelPid)"
    }
  }
}
