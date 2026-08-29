@echo off
title ALIHAN QUEST - Local Server
cd /d "%~dp0..\..\projects\alihan-quest\04-development\backend"

if not exist ".venv\Scripts\activate.bat" (
    echo Creating venv...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    pip install -r requirements.txt
    python manage.py migrate
) else (
    call .venv\Scripts\activate.bat
)

echo.
echo Starting Django API on http://0.0.0.0:8000
start "ALIHAN QUEST API" cmd /k "cd /d %CD% && .venv\Scripts\activate.bat && python manage.py runserver 0.0.0.0:8000"

timeout /t 2 /nobreak >nul

echo Starting Telegram Bot polling...
start "ALIHAN QUEST Bot" cmd /k "cd /d %CD% && .venv\Scripts\activate.bat && python manage.py run_bot"

echo.
echo Done. Two windows opened: API + Bot
echo Mini App: serve resume\site and set HTTPS URL in .env
echo Full guide: projects\alihan-quest\06-deployment\LOCAL_SETUP.md
pause
