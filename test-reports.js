// 🧪 Teste específico para geração de relatórios
const axios = require('axios');

const BASE_URL = 'https://zapinteligencia-vs1-ajp5sd642-joaos-projects-63a6991f.vercel.app';

async function testReports() {
    console.log('📊 Testando geração de relatórios...\n');

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

        // Teste 2: Verificar status dos dados
        console.log('\n2️⃣ Verificando status dos dados...');
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

        // Teste 3: Verificar arquivos disponíveis
        console.log('\n3️⃣ Verificando arquivos disponíveis...');
        try {
            const response = await axios.get(`${BASE_URL}/check_files`, { timeout: 10000 });
            console.log('✅ Arquivos disponíveis:', response.data);
        } catch (error) {
            console.log('❌ Erro nos arquivos:', error.response?.status || error.message);
        }

        // Teste 4: Gerar relatórios
        console.log('\n4️⃣ Testando geração de relatórios...');
        try {
            const response = await axios.post(`${BASE_URL}/generate_reports`, {}, { 
                timeout: 15000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('✅ Relatórios gerados:', {
                success: response.data.success,
                message: response.data.message,
                reports_count: response.data.reports?.length || 0,
                reports: response.data.reports?.map(r => r.name) || []
            });
        } catch (error) {
            console.log('❌ Erro na geração:', {
                status: error.response?.status,
                message: error.response?.data?.error || error.message
            });
        }

        // Teste 5: Verificar relatório específico
        console.log('\n5️⃣ Testando visualização de relatório...');
        try {
            const response = await axios.get(`${BASE_URL}/view_report/relatorio_vendas.xlsx`, { timeout: 10000 });
            console.log('✅ Relatório visualizado:', {
                success: response.data.success,
                filename: response.data.filename,
                name: response.data.name,
                html_length: response.data.html?.length || 0
            });
        } catch (error) {
            console.log('❌ Erro na visualização:', {
                status: error.response?.status,
                message: error.response?.data?.error || error.message
            });
        }

        console.log('\n🎯 Resumo:');
        console.log('- Se o teste 4 falhou: Problema na geração de relatórios');
        console.log('- Se o teste 5 falhou: Problema na visualização');
        console.log('- Se ambos funcionaram: Relatórios estão OK');

    } catch (error) {
        console.error('❌ Erro geral:', error.message);
    }
}

// Executar teste
testReports();
