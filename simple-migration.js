// 🚀 Script de Migração Simples - ZapInteligencia para Supabase

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function simpleMigration() {
    console.log('🚀 Iniciando migração simples...')
    console.log('📡 URL:', supabaseUrl)
    console.log('')

    try {
        // 1. Criar empresa
        console.log('🏢 Criando empresa...')
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .insert({
                name: 'ZapChicken',
                slug: 'zapchicken',
                phone: '(11) 99999-9999',
                email: 'contato@zapchicken.com',
                address: 'Rua das Galinhas, 123',
                neighborhood: 'Centro',
                city: 'São Paulo',
                state: 'SP',
                zip_code: '01234-567',
                gemini_api_key: process.env.GEMINI_API_KEY
            })
            .select()
            .single()

        if (companyError) {
            console.error('❌ Erro ao criar empresa:', companyError)
            return
        }

        console.log('✅ Empresa criada:', company.name)
        console.log('🆔 ID da empresa:', company.id)
        console.log('')

        // 2. Inserir alguns clientes de exemplo
        console.log('👤 Inserindo clientes de exemplo...')
        const sampleCustomers = [
            {
                company_id: company.id,
                name: 'João Silva',
                phone: '(11) 99999-1111',
                email: 'joao@email.com',
                neighborhood: 'Centro',
                status: 'active',
                source: 'migration'
            },
            {
                company_id: company.id,
                name: 'Maria Santos',
                phone: '(11) 99999-2222',
                email: 'maria@email.com',
                neighborhood: 'Vila Madalena',
                status: 'active',
                source: 'migration'
            }
        ]

        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .insert(sampleCustomers)
            .select()

        if (customersError) {
            console.error('❌ Erro ao inserir clientes:', customersError)
        } else {
            console.log('✅ Clientes inseridos:', customers.length)
        }
        console.log('')

        // 3. Inserir alguns pedidos de exemplo
        console.log('🛒 Inserindo pedidos de exemplo...')
        const sampleOrders = [
            {
                company_id: company.id,
                customer_name: 'João Silva',
                order_date: new Date().toISOString(),
                total_amount: 45.50,
                origin: 'WhatsApp',
                status: 'completed'
            },
            {
                company_id: company.id,
                customer_name: 'Maria Santos',
                order_date: new Date().toISOString(),
                total_amount: 32.80,
                origin: 'Telefone',
                status: 'completed'
            }
        ]

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .insert(sampleOrders)
            .select()

        if (ordersError) {
            console.error('❌ Erro ao inserir pedidos:', ordersError)
        } else {
            console.log('✅ Pedidos inseridos:', orders.length)
        }
        console.log('')

        // 4. Verificar dados inseridos
        console.log('📊 Verificando dados inseridos...')
        const { count: customersCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })

        const { count: ordersCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })

        console.log('📈 Total de clientes:', customersCount)
        console.log('📈 Total de pedidos:', ordersCount)
        console.log('')

        console.log('🎉 Migração simples concluída!')
        console.log('🔗 Acesse o Supabase para ver os dados')

    } catch (error) {
        console.error('❌ Erro geral:', error)
    }
}

// Executar migração
simpleMigration()
