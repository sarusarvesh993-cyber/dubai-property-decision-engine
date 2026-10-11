# Dubai Property Decision Engine - 1-Click GitHub & Vercel Deploy Script
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Deploying Dubai Renter Agent & Copilot to GitHub & Vercel" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Check Git Status
git status

# 2. Stage all updated files
Write-Host "`nStaging unified agent, components, evaluation suites, and docs..." -ForegroundColor Yellow
git add .

# 3. Commit
Write-Host "`nCommitting changes to main branch..." -ForegroundColor Yellow
git commit -m "feat: deploy unified Dubai Renter Agent & Copilot with 100% evaluation suite"

# 4. Push to GitHub (Triggers Vercel Automatic Live Deployment)
Write-Host "`nPushing to GitHub origin main (Triggers Vercel Build)..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCCESS! Pushed to GitHub main." -ForegroundColor Green
    Write-Host "Vercel has automatically started building your live deployment." -ForegroundColor Green
    Write-Host "Live URL: https://dubai-property-decision-engine.vercel.app/" -ForegroundColor Cyan
    Start-Process "https://dubai-property-decision-engine.vercel.app/"
} else {
    Write-Host "`nGit push encountered an issue. You can also deploy directly via Vercel CLI by running:" -ForegroundColor Red
    Write-Host "  npx vercel --prod" -ForegroundColor Yellow
}
