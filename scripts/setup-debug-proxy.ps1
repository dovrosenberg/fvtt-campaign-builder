# Setup Windows portproxy for Edge remote debugging from WSL2
# Run this script once as Administrator on each new machine

# Check if running as admin
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "This script must be run as Administrator"
    exit 1
}

Write-Host "Setting up portproxy for Edge remote debugging..."

# Remove any existing rule first
netsh interface portproxy delete v4tov4 listenport=9222 listenaddress=0.0.0.0 2>$null

# Add portproxy rule (persists across reboots)
# Edge listens on IPv6 [::1], so connect to ::1 not 127.0.0.1
netsh interface portproxy add v4tov6 `
    listenport=9222 `
    listenaddress=0.0.0.0 `
    connectport=9222 `
    connectaddress=::1

# Add firewall rule (persists across reboots)
$ruleName = "Edge Remote Debug"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "Firewall rule already exists, updating..."
    Remove-NetFirewallRule -DisplayName $ruleName
}

New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 9222 `
    -Action Allow

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To use:"
Write-Host "1. Launch Edge with remote debugging:"
Write-Host "   & 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --user-data-dir='C:\temp\foundry-edge'"
Write-Host "2. Navigate to Foundry and log in"
Write-Host "3. Run Puppeteer agent from WSL2"
Write-Host ""
Write-Host "To verify the portproxy rule:"
Write-Host "   netsh interface portproxy show all"
Write-Host ""
Write-Host "To remove the rules later:"
Write-Host "   netsh interface portproxy delete v4tov6 listenport=9222 listenaddress=0.0.0.0"
Write-Host "   Remove-NetFirewallRule -DisplayName 'Edge Remote Debug'"
