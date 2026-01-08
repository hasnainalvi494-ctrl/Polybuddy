# PolyBuddy GitHub Setup Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PolyBuddy GitHub Repository Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check git status
Write-Host "Checking git status..." -ForegroundColor Yellow
git status
Write-Host ""

# Get GitHub username
Write-Host "========================================" -ForegroundColor Cyan
$username = Read-Host "Enter your GitHub username"

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host "Error: Username cannot be empty" -ForegroundColor Red
    exit 1
}

# Get repository name (default: polybuddy)
Write-Host ""
$repoName = Read-Host "Enter repository name (press Enter for 'polybuddy')"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "polybuddy"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repository Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Username: $username" -ForegroundColor Green
Write-Host "Repository: $repoName" -ForegroundColor Green
Write-Host "URL: https://github.com/$username/$repoName.git" -ForegroundColor Green
Write-Host ""

# Confirm
$confirm = Read-Host "Is this correct? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Setup cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Create the repository on GitHub:" -ForegroundColor Yellow
Write-Host "   - Go to: https://github.com/new" -ForegroundColor White
Write-Host "   - Repository name: $repoName" -ForegroundColor White
Write-Host "   - Choose Public or Private" -ForegroundColor White
Write-Host "   - DO NOT initialize with README, .gitignore, or license" -ForegroundColor Red
Write-Host "   - Click 'Create repository'" -ForegroundColor White
Write-Host ""

$created = Read-Host "Have you created the repository on GitHub? (y/n)"
if ($created -ne "y" -and $created -ne "Y") {
    Write-Host ""
    Write-Host "Please create the repository first, then run this script again" -ForegroundColor Yellow
    Write-Host "Opening GitHub in your browser..." -ForegroundColor Yellow
    Start-Process "https://github.com/new"
    exit 0
}

Write-Host ""
Write-Host "2. Updating git remote..." -ForegroundColor Yellow

# Update remote URL
$remoteUrl = "https://github.com/$username/$repoName.git"
git remote set-url origin $remoteUrl

Write-Host "   Remote updated to: $remoteUrl" -ForegroundColor Green
Write-Host ""

Write-Host "3. Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Your repository is now on GitHub:" -ForegroundColor Green
    Write-Host "https://github.com/$username/$repoName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "- View your repository: https://github.com/$username/$repoName" -ForegroundColor White
    Write-Host "- Add collaborators (Settings > Collaborators)" -ForegroundColor White
    Write-Host "- Set up GitHub Actions for CI/CD" -ForegroundColor White
    Write-Host "- Add repository description and topics" -ForegroundColor White
    Write-Host ""
    
    # Open repository in browser
    $openBrowser = Read-Host "Open repository in browser? (y/n)"
    if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
        Start-Process "https://github.com/$username/$repoName"
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "Push Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Repository doesn't exist - create it at https://github.com/new" -ForegroundColor White
    Write-Host "2. Authentication failed - you may need to:" -ForegroundColor White
    Write-Host "   - Set up a Personal Access Token" -ForegroundColor White
    Write-Host "   - Configure Git Credential Manager" -ForegroundColor White
    Write-Host "   - Use SSH instead of HTTPS" -ForegroundColor White
    Write-Host ""
    Write-Host "For help with authentication:" -ForegroundColor Yellow
    Write-Host "https://docs.github.com/en/authentication" -ForegroundColor Cyan
    Write-Host ""
}


