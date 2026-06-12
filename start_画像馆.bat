@echo off
chcp 65001 >nul
title 百度AI代理 + 画像馆

echo ========================================
echo   启动百度AI代理服务器 (端口 8766)
echo ========================================
echo.

:: 启动 Python 代理（后台运行）
start /B python baidu_ai_proxy.py > nul 2>&1

:: 等待代理启动
timeout /t 2 /nobreak >nul

:: 用默认浏览器打开画像馆页面
echo 正在打开画像馆页面...
start "" "avatar.html"

echo.
echo 代理服务器已在后台运行 (端口 8766)
echo 关闭此窗口不会停止代理服务器
echo 如需停止: 在任务管理器中结束 python.exe
echo.
pause
