@echo off
echo Closing open Chrome windows to apply new settings...
taskkill /F /IM chrome.exe /T >nul 2>&1

echo Launching Portal with JHPMS Sync Enabled...
start "" "chrome.exe" --disable-web-security --user-data-dir="%LOCALAPPDATA%\Google\Chrome\User Data\DevSession" "e:\OneDrive - Schoolnet India Limited\Documents\Vijay_Try_Dec-25\Vijay-field visit\index.html" "https://jhpms.schoolnetindia.com"

echo Done! You can now use the 'Sync' button in the portal.
pause
