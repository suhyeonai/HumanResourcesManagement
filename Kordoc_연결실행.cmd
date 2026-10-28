@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 20 이상을 설치한 뒤 다시 실행해 주세요.
 pause
 exit /b 1
)
if not exist "kordoc-bridge\node_modules\kordoc\package.json" (
 echo Kordoc을 설치합니다. 최초 설치에는 인터넷 연결이 필요합니다.
 set ONNXRUNTIME_NODE_INSTALL=skip
 call npm.cmd install --prefix kordoc-bridge --no-audit --no-fund
 if errorlevel 1 (
  echo 설치하지 못했습니다. 네트워크 연결을 확인해 주세요.
  pause
  exit /b 1
 )
)
echo 아래 주소를 브라우저에서 열어 주세요: http://127.0.0.1:8765
node kordoc-bridge\server.mjs
pause
