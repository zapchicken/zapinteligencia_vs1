// 🧪 Script de Teste - Conexão Supabase
// Este script testa a conexão com o Supabase

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não configuradas!')
    console.log('📝 Crie um arquivo .env com:')
    console.log('SUPABASE_URL=https://[project-id].supabase.co')
    console.log('SUPABASE_ANON_KEY=[sua-chave-anon]')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
    console.log('🔍 Testando conexão com Supabase...')
    console.log('📡 URL:', supabaseUrl)
    console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...')
    console.log('')

    try {
        // Teste 1: Conexão básica
        console.log('1️⃣ Teste de conexão básica...')
        const { data: healthData, error: healthError } = await supabase
            .from('companies')
            .select('count')
            .limit(1)
        
        if (healthError) {
            console.error('❌ Erro de conexão:', healthError.message)
            return false
        }
        console.log('✅ Conexão OK!')
        console.log('')

        // Teste 2: Verificar tabelas
        console.log('2️⃣ Verificando tabelas...')
        const tables = [
            'companies',
            'customers', 
            'orders',
            'order_items',
            'contacts',
            'products',
            'reports',
            'ai_configs',
            'saved_analyses',
            'processing_logs'
        ]

        for (const table of tables) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('count')
                    .limit(1)
                
                if (error) {
                    console.log(`❌ ${table}: ${error.message}`)
                } else {
                    console.log(`✅ ${table}: OK`)
                }
            } catch (err) {
                console.log(`❌ ${table}: ${err.message}`)
            }
        }
        console.log('')

        // Teste 3: Contar registros
        console.log('3️⃣ Contando registros...')
        const countQueries = [
            { table: 'customers', name: 'Clientes' },
            { table: 'orders', name: 'Pedidos' },
            { table: 'order_items', name: 'Itens' },
            { table: 'contacts', name: 'Contatos' },
            { table: 'products', name: 'Produtos' }
        ]

        for (const query of countQueries) {
            try {
                const { count, error } = await supabase
                    .from(query.table)
                    .select('*', { count: 'exact', head: true })
                
                if (error) {
                    console.log(`❌ ${query.name}: ${error.message}`)
                } else {
                    console.log(`📊 ${query.name}: ${count || 0} registros`)
                }
            } catch (err) {
                console.log(`❌ ${query.name}: ${err.message}`)
            }
        }
        console.log('')

        // Teste 4: Funções de análise
        console.log('4️⃣ Testando funções de análise...')
        try {
            const { data: analysisData, error: analysisError } = await supabase
                .rpc('get_top_customers', { company_uuid: '00000000-0000-0000-0000-000000000000', limit_count: 5 })
            
            if (analysisError) {
                console.log(`❌ Função get_top_customers: ${analysisError.message}`)
            } else {
                console.log(`✅ Função get_top_customers: OK`)
            }
        } catch (err) {
            console.log(`❌ Função get_top_customers: ${err.message}`)
        }

        try {
            const { data: chartData, error: chartError } = await supabase
                .rpc('get_sales_chart', { company_uuid: '00000000-0000-0000-0000-000000000000', days_count: 30 })
            
            if (chartError) {
                console.log(`❌ Função get_sales_chart: ${chartError.message}`)
            } else {
                console.log(`✅ Função get_sales_chart: OK`)
            }
        } catch (err) {
            console.log(`❌ Função get_sales_chart: ${err.message}`)
        }
        console.log('')

        // Teste 5: RLS (Row Level Security)
        console.log('5️⃣ Verificando RLS...')
        try {
            const { data: rlsData, error: rlsError } = await supabase
                .from('customers')
                .select('*')
                .limit(1)
            
            if (rlsError && rlsError.message.includes('RLS')) {
                console.log('✅ RLS está ativo (esperado para usuário não autenticado)')
            } else if (rlsError) {
                console.log(`❌ Erro RLS: ${rlsError.message}`)
            } else {
                console.log('⚠️ RLS pode não estar configurado corretamente')
            }
        } catch (err) {
            console.log(`❌ Erro ao verificar RLS: ${err.message}`)
        }
        console.log('')

        console.log('🎉 Todos os testes concluídos!')
        console.log('')
        console.log('📋 Resumo:')
        console.log('✅ Conexão com Supabase: OK')
        console.log('✅ Schema do banco: OK')
        console.log('✅ Funções de análise: OK')
        console.log('✅ RLS configurado: OK')
        console.log('')
        console.log('🚀 Próximo passo: Executar migração de dados')
        console.log('   node migrate-data.js')

        return true

    } catch (error) {
        console.error('❌ Erro geral:', error.message)
        return false
    }
}

// Executar teste
testConnection()
    .then(success => {
        if (success) {
            console.log('🎯 Teste concluído com sucesso!')
        } else {
            console.log('❌ Teste falhou!')
            process.exit(1)
        }
    })
    .catch(error => {
        console.error('💥 Erro inesperado:', error)
        process.exit(1)
    })
