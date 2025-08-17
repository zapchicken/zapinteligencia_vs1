@echo off
title ZapInteligencia - Business Intelligence
color 0A

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🚀 ZAPINTELIGENCIA 🚀                     ║
echo ║                                                              ║
echo ║    Business Intelligence para ZapChicken - Versão Node.js   ║
echo ║    Automação para Processamento de Planilhas Excel          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 🔧 Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    echo 📥 Baixe e instale o Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado!
echo.

echo 📦 Verificando dependências...
if not exist "node_modules" (
    echo 📥 Instalando dependências...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências!
        pause
        exit /b 1
    )
    echo ✅ Dependências instaladas!
) else (
    echo ✅ Dependências já instaladas!
)

echo.
echo 🎯 Escolha uma opção:
echo.
echo 1️⃣  Setup inicial (primeira vez)
echo 2️⃣  Processar dados ZapChicken
echo 3️⃣  Chat com IA
echo 4️⃣  Interface Web
echo 5️⃣  Processamento genérico
echo 6️⃣  Análise de dados
echo 0️⃣  Sair
echo.

set /p choice="Digite sua escolha (0-6): "

if "%choice%"=="1" goto setup
if "%choice%"=="2" goto zapchicken
if "%choice%"=="3" goto chat
if "%choice%"=="4" goto web
if "%choice%"=="5" goto process
if "%choice%"=="6" goto analyze
if "%choice%"=="0" goto exit
goto invalid

:setup
echo.
echo 🔧 Executando setup inicial...
npm run setup
goto end

:zapchicken
echo.
echo 🍗 Processando dados ZapChicken...
npm run zapchicken
goto end

:chat
echo.
echo 🤖 Iniciando chat com IA...
npm run chat
goto end

:web
echo.
echo 🌐 Iniciando interface web...
echo 📱 Acesse: http://localhost:3000
echo 🔄 Pressione Ctrl+C para parar
npm run web
goto end

:process
echo.
echo 📊 Processamento genérico...
npm run process
goto end

:analyze
echo.
echo 🔍 Análise de dados...
npm run analyze
goto end

:invalid
echo.
echo ❌ Opção inválida! Digite um número de 0 a 6.
echo.
pause
goto menu

:end
echo.
echo ✅ Operação concluída!
echo.
pause

:exit
echo.
echo 👋 Até logo!
echo.
pause
