$ErrorActionPreference = 'Stop'
$inputPath = 'D:\final app\final app\docs\2.1-5 ADJUST.docx'
$outputPath = 'D:\final app\final app\.tmp\finance_final\adjust_docx\2.1-5 ADJUST.pdf'
if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
}
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($inputPath, $false, $true)
    $doc.ExportAsFixedFormat($outputPath, 17)
    $doc.Close($false)
}
finally {
    $word.Quit()
}
Write-Output $outputPath
