@echo off
echo Launching Schoolnet Visit Portal locally...
start cmd /c "timeout /t 2 >nul && start http://127.0.0.1:5188"
npm run dev
