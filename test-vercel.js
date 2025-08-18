// 🧪 Script de teste para verificar o endpoint /process
const axios = require('axios');

const BASE_URL = 'https://zapinteligencia-vs1-ajp5sd642-joaos-projects-63a6991f.vercel.app';

async function testEndpoints() {
    console.log('🧪 Iniciando testes dos endpoints...\n');

    try {
        // Teste 0: Verificar se o site está acessível
        console.log('0️⃣ Testando acesso básico...');
        try {
            const basicResponse = await axios.get(BASE_URL, { timeout: 10000 });
            console.log('✅ Site acessível:', basicResponse.status);
        } catch (basicError) {
            console.log('❌ Erro de acesso básico:', {
                status: basicError.response?.status,
                message: basicError.message
            });
            return;
        }

        // Teste 1: Endpoint de diagnóstico
        console.log('\n1️⃣ Testando endpoint /diagnostic...');
        try {
            const diagnosticResponse = await axios.get(`${BASE_URL}/diagnostic`, { timeout: 10000 });
            console.log('✅ Diagnóstico:', {
                environment: diagnosticResponse.data.environment,
                supabase_loaded: diagnosticResponse.data.supabase.loaded,
                supabase_error: diagnosticResponse.data.supabase.error,
                env_vars: diagnosticResponse.data.environment_variables
            });
        } catch (diagnosticError) {
            console.log('❌ Erro no diagnóstico:', {
                status: diagnosticError.response?.status,
                message: diagnosticError.message,
                data: diagnosticError.response?.data
            });
        }

        // Teste 2: Status dos dados
        console.log('\n2️⃣ Testando endpoint /data_status...');
        try {
            const statusResponse = await axios.get(`${BASE_URL}/data_status`, { timeout: 10000 });
            console.log('✅ Status dos dados:', {
                data_loaded: statusResponse.data.data_loaded,
                message: statusResponse.data.message,
                supabase_loaded: statusResponse.data.supabase_loaded,
                orders_count: statusResponse.data.orders_count,
                customers_count: statusResponse.data.customers_count
            });
        } catch (statusError) {
            console.log('❌ Erro no status:', {
                status: statusError.response?.status,
                message: statusError.message,
                data: statusError.response?.data
            });
        }

        // Teste 3: Verificar arquivos
        console.log('\n3️⃣ Testando endpoint /check_files...');
        try {
            const filesResponse = await axios.get(`${BASE_URL}/check_files`, { timeout: 10000 });
            console.log('✅ Arquivos disponíveis:', filesResponse.data);
        } catch (filesError) {
            console.log('❌ Erro nos arquivos:', {
                status: filesError.response?.status,
                message: filesError.message,
                data: filesError.response?.data
            });
        }

        // Teste 4: Processamento (deve falhar se não há arquivos)
        console.log('\n4️⃣ Testando endpoint /process...');
        try {
            const processResponse = await axios.post(`${BASE_URL}/process`, {}, { timeout: 15000 });
            console.log('✅ Processamento:', processResponse.data);
        } catch (processError) {
            console.log('⚠️ Processamento (esperado):', {
                status: processError.response?.status,
                error: processError.response?.data?.error,
                details: processError.response?.data?.details
            });
        }

        console.log('\n🎉 Todos os testes concluídos!');

    } catch (error) {
        console.error('❌ Erro geral nos testes:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
    }
}

// Executar testes
testEndpoints();
