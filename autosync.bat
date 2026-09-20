@echo off
title Walkie-Talkie Auto Git Sync
color 0A
cd /d "%~dp0"

echo ======================================================
echo    TACTICAL WALKIE-TALKIE AUTO-SYNC WATCHER STARTED
echo ======================================================
echo Monitoring folder for any edits... (Keep this window open)
echo.

:LOOP
:: Check if there are any modified, untracked, or deleted files
git status --porcelain > "%temp%\git_status_check.txt"

for %%I in ("%temp%\git_status_check.txt") do (
    if %%~zI gtr 0 (
        echo.
        echo [!] Change detected at %TIME%
        echo [*] Staging files...
        git add .
        
        echo [*] Committing changes...
        git commit -m "auto-sync: %DATE% %TIME%"
        
        echo [*] Pushing to GitHub...
        git push origin main
        
        if %ERRORLEVEL% equ 0 (
            echo [+] Successfully pushed to GitHub! Render will auto-deploy.
        ) else (
            echo [-] Push failed. Check your network or git credentials.
        )
        echo.
        echo Monitoring for next changes...
    )
)

:: Wait 3 seconds before checking again
timeout /t 3 /nobreak >nul
goto LOOP