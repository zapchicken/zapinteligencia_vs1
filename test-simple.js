// 🧪 Teste simples para verificar configuração do Vercel
const axios = require('axios');

const BASE_URL = 'https://zapinteligencia-vs1-ajp5sd642-joaos-projects-63a6991f.vercel.app';

async function testSimple() {
    console.log('🔍 Teste Simples - Verificando configuração...\n');

    // Teste 1: Verificar se a URL está acessível
    console.log('1️⃣ Testando URL base...');
    try {
        const response = await axios.get(BASE_URL, { 
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500; // Aceita qualquer status < 500
            }
        });
        console.log('✅ Resposta recebida:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.keys(response.headers)
        });
    } catch (error) {
        console.log('❌ Erro na URL base:', {
            message: error.message,
            code: error.code,
            status: error.response?.status
        });
    }

    // Teste 2: Verificar se é um problema de CORS
    console.log('\n2️⃣ Testando com headers diferentes...');
    try {
        const response = await axios.get(BASE_URL, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive'
            },
            validateStatus: function (status) {
                return status < 500;
            }
        });
        console.log('✅ Resposta com headers customizados:', {
            status: response.status,
            statusText: response.statusText
        });
    } catch (error) {
        console.log('❌ Erro com headers customizados:', {
            message: error.message,
            status: error.response?.status
        });
    }

    // Teste 3: Verificar se o problema é específico do endpoint
    console.log('\n3️⃣ Testando endpoint específico...');
    try {
        const response = await axios.get(`${BASE_URL}/diagnostic`, {
            timeout: 10000,
            validateStatus: function (status) {
                return status < 500;
            }
        });
        console.log('✅ Endpoint /diagnostic:', {
            status: response.status,
            statusText: response.statusText
        });
    } catch (error) {
        console.log('❌ Erro no endpoint /diagnostic:', {
            message: error.message,
            status: error.response?.status
        });
    }

    // Teste 4: Verificar se é um problema de DNS
    console.log('\n4️⃣ Verificando DNS...');
    try {
        const dns = require('dns').promises;
        const url = new URL(BASE_URL);
        const addresses = await dns.resolve4(url.hostname);
        console.log('✅ DNS resolvido:', {
            hostname: url.hostname,
            addresses: addresses
        });
    } catch (error) {
        console.log('❌ Erro DNS:', error.message);
    }

    // Teste 5: Verificar se é um problema de conectividade
    console.log('\n5️⃣ Testando conectividade...');
    try {
        const net = require('net');
        const url = new URL(BASE_URL);
        
        const socket = new net.Socket();
        const connectPromise = new Promise((resolve, reject) => {
            socket.setTimeout(5000);
            socket.on('connect', () => {
                console.log('✅ Conectividade OK:', {
                    host: url.hostname,
                    port: url.port || 443
                });
                socket.destroy();
                resolve();
            });
            socket.on('timeout', () => {
                console.log('❌ Timeout na conexão');
                socket.destroy();
                reject(new Error('Timeout'));
            });
            socket.on('error', (err) => {
                console.log('❌ Erro de conectividade:', err.message);
                reject(err);
            });
        });

        socket.connect(url.port || 443, url.hostname);
        await connectPromise;
    } catch (error) {
        console.log('❌ Erro de conectividade:', error.message);
    }

    console.log('\n📋 Resumo do diagnóstico:');
    console.log('- Se todos os testes falharam com 401: Problema de configuração do Vercel');
    console.log('- Se DNS falhou: Problema de rede');
    console.log('- Se conectividade falhou: Problema de firewall/proxy');
    console.log('- Se alguns endpoints funcionam: Problema específico do endpoint');
}

// Executar teste
testSimple();
