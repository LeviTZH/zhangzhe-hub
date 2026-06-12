@echo off
chcp 65001 >nul
title 张哲电台 - 音乐搜索服务

echo.
echo   🎵 张哲电台 - 正在启动音乐服务...
echo   ════════════════════════════════

REM 检查 Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo   ❌ 未找到 Python，请先安装 Python 3
    pause
    exit /b 1
)

REM 启动 Python 音乐服务器（后台运行）
start "" /B "D:/python3.11.4/python.exe" "%~dp0music_server.py" >nul 2>&1

REM 等待服务器就绪
echo   ⏳ 等待服务就绪...
:waitloop
timeout /t 1 /nobreak >nul
curl -s http://localhost:8765/api/ping >nul 2>nul
if %errorlevel% neq 0 goto waitloop

echo   ✅ 服务已就绪！
echo   📻 正在打开电台页面...
echo   ════════════════════════════════

REM 打开电台页面
start "" "%~dp0radio.html"

echo   🎧 电台已启动，享受音乐吧～
echo.
exit
