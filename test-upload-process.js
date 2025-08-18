// 🧪 Teste específico para upload e processamento
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'https://zapinteligencia-vs1-ajp5sd642-joaos-projects-63a6991f.vercel.app';

async function testUploadAndProcess() {
    console.log('🔍 Testando upload e processamento...\n');

    try {
        // Teste 1: Verificar se o site está acessível
        console.log('1️⃣ Testando acesso básico...');
        try {
            const response = await axios.get(BASE_URL, { 
                timeout: 10000,
                validateStatus: function (status) {
                    return status < 500;
                }
            });
            console.log('✅ Acesso básico:', response.status);
        } catch (error) {
            console.log('❌ Erro de acesso:', error.response?.status || error.message);
            return;
        }

        // Teste 2: Verificar status dos dados antes
        console.log('\n2️⃣ Verificando status dos dados (antes)...');
        try {
            const response = await axios.get(`${BASE_URL}/data_status`, { timeout: 10000 });
            console.log('✅ Status dos dados:', {
                data_loaded: response.data.data_loaded,
                message: response.data.message,
                orders_count: response.data.orders_count,
                customers_count: response.data.customers_count
            });
        } catch (error) {
            console.log('❌ Erro no status:', error.response?.status || error.message);
        }

        // Teste 3: Testar processamento sem arquivos (deve retornar 400)
        console.log('\n3️⃣ Testando processamento sem arquivos...');
        try {
            const response = await axios.post(`${BASE_URL}/process`, {}, { 
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json'
                },
                validateStatus: function (status) {
                    return status < 500; // Aceita 400 (sem arquivos)
                }
            });
            console.log('✅ Processamento (esperado):', {
                status: response.status,
                error: response.data.error,
                message: response.data.message
            });
        } catch (error) {
            console.log('❌ Erro no processamento:', {
                status: error.response?.status,
                message: error.response?.data?.error || error.message,
                details: error.response?.data?.details
            });
        }

        // Teste 4: Verificar arquivos disponíveis
        console.log('\n4️⃣ Verificando arquivos disponíveis...');
        try {
            const response = await axios.get(`${BASE_URL}/check_files`, { timeout: 10000 });
            console.log('✅ Arquivos disponíveis:', response.data);
        } catch (error) {
            console.log('❌ Erro nos arquivos:', error.response?.status || error.message);
        }

        console.log('\n🎯 Resumo:');
        console.log('- Se o teste 3 retornou 400: OK (sem arquivos)');
        console.log('- Se o teste 3 retornou 500: Problema no processamento');
        console.log('- Se o teste 4 funcionou: Arquivos OK');

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

// Executar teste
testUploadAndProcess();
