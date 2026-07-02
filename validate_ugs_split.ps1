$ugsDir = "ts_documents\Data Analysis\Data Centralization\UGS"
$files = @("domain_context.txt","architecture_context.txt","implementation_context.txt","cybersecurity_context.txt","gantt_context.txt")

Write-Host "=== FILE SIZE VALIDATION ===" -ForegroundColor Cyan
foreach ($f in $files) {
    $path = Join-Path $ugsDir $f
    $content = Get-Content $path -Raw -Encoding UTF8
    Write-Host ("  {0} : {1} chars" -f $f, $content.Length)
}

Write-Host ""
Write-Host "=== ORIGINAL FILE SIZE ===" -ForegroundColor Cyan
$origPath = "ts_context_files\Data Analysis\Data Centralization\UGS\UGS_context.txt"
$origContent = Get-Content $origPath -Raw -Encoding UTF8
Write-Host ("  UGS_context.txt : {0} chars" -f $origContent.Length)

Write-Host ""
Write-Host "=== COMBINED LAYERED CHARS ===" -ForegroundColor Cyan
$combined = ""
foreach ($f in $files) {
    $path = Join-Path $ugsDir $f
    $combined += (Get-Content $path -Raw -Encoding UTF8)
}
Write-Host ("  Combined layered : {0} chars" -f $combined.Length)

Write-Host ""
Write-Host "=== KEY CONCEPT COVERAGE ===" -ForegroundColor Cyan
$keywords = @("OPC UA","Modbus","HX","M1 ","M2 ","M3","M4","M5","FIFO","RBAC","FAT","commissioning","draw.io","buyer","exclusion","boilerplate")
$allPresent = $true
foreach ($kw in $keywords) {
    $inOrig = ($origContent.ToLower().Contains($kw.ToLower()))
    $inCombined = ($combined.ToLower().Contains($kw.ToLower()))
    if ($inOrig -and -not $inCombined) {
        Write-Host ("  MISSING in layered: '{0}'" -f $kw) -ForegroundColor Red
        $allPresent = $false
    }
}
if ($allPresent) {
    Write-Host "  All key concepts covered in layered files." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== CHECKING FOR DUPLICATION ===" -ForegroundColor Cyan
$contentMap = @{}
foreach ($f in $files) {
    $path = Join-Path $ugsDir $f
    $lines = Get-Content $path -Encoding UTF8
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ($trimmed.Length -gt 50) {
            if ($contentMap.ContainsKey($trimmed)) {
                Write-Host ("  DUPLICATE LINE found in {0} and {1}:" -f $f, $contentMap[$trimmed]) -ForegroundColor Yellow
                Write-Host ("    '{0}'" -f $trimmed.Substring(0, [Math]::Min(80, $trimmed.Length)))
            } else {
                $contentMap[$trimmed] = $f
            }
        }
    }
}
Write-Host "  Duplication check complete."
Write-Host ""
Write-Host "=== VALIDATION COMPLETE ===" -ForegroundColor Green
