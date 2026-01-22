# Skill Manager - Scan Script
# Auto scan Skills and Rules, generate manifest.json

$root = Split-Path $PSScriptRoot -Parent
$skillsDir = Join-Path $root ".agent\skills"
$rulesDir = Join-Path $root ".gemini\rules"
$outputFile = Join-Path $PSScriptRoot "manifest.json"

$manifest = @{
    lastUpdated = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    skills      = @()
    rules       = @()
}

# Scan Skills
if (Test-Path $skillsDir) {
    Get-ChildItem $skillsDir -Directory | ForEach-Object {
        $skillPath = Join-Path $_.FullName "SKILL.md"
        if (Test-Path $skillPath) {
            $content = Get-Content $skillPath -Raw -Encoding UTF8
            if ($content -match '(?s)^---\r?\n(.+?)\r?\n---') {
                $yaml = $Matches[1]
                $name = if ($yaml -match 'name:\s*(.+)') { $Matches[1].Trim() } else { $_.Name }
                $desc = if ($yaml -match 'description:\s*(.+)') { $Matches[1].Trim() } else { "" }
                
                $manifest.skills += @{
                    id          = $_.Name
                    name        = $name
                    description = $desc
                    path        = ".agent/skills/$($_.Name)"
                }
            }
        }
    }
}

# Scan Rules
if (Test-Path $rulesDir) {
    Get-ChildItem $rulesDir -Filter "*.md" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw -Encoding UTF8
        $name = if ($content -match '^#\s+(.+)') { $Matches[1].Trim() } else { $_.BaseName }
        $desc = if ($content -match '(?m)^[^#\r\n].{10,}') { 
            $Matches[0].Trim().Substring(0, [Math]::Min(80, $Matches[0].Length)) 
        }
        else { "" }
        
        $manifest.rules += @{
            id          = $_.BaseName
            name        = $name
            description = $desc
            path        = ".gemini/rules/$($_.Name)"
        }
    }
}

# Output JSON
$manifest | ConvertTo-Json -Depth 4 | Set-Content $outputFile -Encoding UTF8

Write-Host "[OK] Scan completed!" -ForegroundColor Green
Write-Host "   Skills: $($manifest.skills.Count)"
Write-Host "   Rules:  $($manifest.rules.Count)"
Write-Host "   Output: $outputFile"
