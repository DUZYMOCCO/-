@echo off
chcp 65001 > nul
title スマホゲーム工房 サーバー

echo.
echo ========================================================
echo   スマホゲーム工房 起動スクリプト
echo ========================================================
echo.

cd /d "%~dp0..\.."
python common\tools\serve.py
if errorlevel 1 (
    echo.
    echo [エラー] Pythonが正しく実行できませんでした。
    pause
)
