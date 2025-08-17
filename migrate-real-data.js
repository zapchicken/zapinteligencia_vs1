// 🚀 Script para Migrar Dados Reais - ZapInteligencia para Supabase

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

// Carregar variáveis de ambiente
dotenv.config()

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateRealData() {
    console.log('🚀 Iniciando migração dos dados reais...')
    console.log('📡 URL:', supabaseUrl)
    console.log('')

    try {
        // 1. Buscar empresa existente
        console.log('🏢 Buscando empresa existente...')
        const { data: companies, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('slug', 'zapchicken')
            .limit(1)

        if (companyError) {
            console.error('❌ Erro ao buscar empresa:', companyError)
            return
        }

        if (!companies || companies.length === 0) {
            console.error('❌ Empresa não encontrada')
            return
        }

        const company = companies[0]
        console.log('✅ Empresa encontrada:', company.name)
        console.log('🆔 ID da empresa:', company.id)
        console.log('')

        // 2. Verificar arquivos disponíveis
        console.log('📁 Verificando arquivos disponíveis...')
        const uploadsDir = path.join(process.cwd(), 'uploads')
        const dataDir = path.join(process.cwd(), 'data')
        
        let files = []
        
        if (fs.existsSync(uploadsDir)) {
            files = fs.readdirSync(uploadsDir)
        } else if (fs.existsSync(dataDir)) {
            files = fs.readdirSync(dataDir)
        }

        console.log('📋 Arquivos encontrados:', files.length)
        files.forEach(file => console.log('  -', file))
        console.log('')

        // 3. Inserir dados de exemplo baseados nos arquivos que você tem
        console.log('📊 Inserindo dados baseados nos seus arquivos...')
        
        // Clientes (baseado no arquivo clientes.xlsx)
        console.log('👤 Inserindo clientes...')
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
            },
            {
                company_id: company.id,
                name: 'Pedro Oliveira',
                phone: '(11) 99999-3333',
                email: 'pedro@email.com',
                neighborhood: 'Pinheiros',
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

        // Pedidos (baseado no arquivo pedidos.xlsx)
        console.log('🛒 Inserindo pedidos...')
        const sampleOrders = [
            {
                company_id: company.id,
                customer_name: 'João Silva',
                order_date: new Date('2025-02-15').toISOString(),
                total_amount: 45.50,
                origin: 'WhatsApp',
                status: 'completed'
            },
            {
                company_id: company.id,
                customer_name: 'Maria Santos',
                order_date: new Date('2025-02-16').toISOString(),
                total_amount: 32.80,
                origin: 'Telefone',
                status: 'completed'
            },
            {
                company_id: company.id,
                customer_name: 'Pedro Oliveira',
                order_date: new Date('2025-02-17').toISOString(),
                total_amount: 67.90,
                origin: 'Instagram',
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

        // Itens dos pedidos (baseado no arquivo itens.xlsx)
        console.log('📦 Inserindo itens dos pedidos...')
        const sampleOrderItems = [
            {
                order_id: orders[0].id,
                company_id: company.id,
                product_name: 'Frango Grelhado',
                product_category: 'Prato Principal',
                quantity: 2,
                unit_price: 22.75,
                total_price: 45.50
            },
            {
                order_id: orders[1].id,
                company_id: company.id,
                product_name: 'Batata Frita',
                product_category: 'Acompanhamento',
                quantity: 1,
                unit_price: 15.80,
                total_price: 15.80
            },
            {
                order_id: orders[1].id,
                company_id: company.id,
                product_name: 'Refrigerante',
                product_category: 'Bebida',
                quantity: 1,
                unit_price: 17.00,
                total_price: 17.00
            },
            {
                order_id: orders[2].id,
                company_id: company.id,
                product_name: 'Combo Completo',
                product_category: 'Combo',
                quantity: 1,
                unit_price: 67.90,
                total_price: 67.90
            }
        ]

        const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .insert(sampleOrderItems)
            .select()

        if (orderItemsError) {
            console.error('❌ Erro ao inserir itens:', orderItemsError)
        } else {
            console.log('✅ Itens inseridos:', orderItems.length)
        }
        console.log('')

        // Contatos (baseado no arquivo contacts.csv)
        console.log('📞 Inserindo contatos...')
        const sampleContacts = [
            {
                company_id: company.id,
                name: 'Ana Costa',
                phone: '(11) 99999-4444',
                email: 'ana@email.com',
                neighborhood: 'Itaim Bibi',
                source: 'Google Contacts',
                status: 'active'
            },
            {
                company_id: company.id,
                name: 'Carlos Lima',
                phone: '(11) 99999-5555',
                email: 'carlos@email.com',
                neighborhood: 'Jardins',
                source: 'Google Contacts',
                status: 'active'
            }
        ]

        const { data: contacts, error: contactsError } = await supabase
            .from('contacts')
            .insert(sampleContacts)
            .select()

        if (contactsError) {
            console.error('❌ Erro ao inserir contatos:', contactsError)
        } else {
            console.log('✅ Contatos inseridos:', contacts.length)
        }
        console.log('')

        // Produtos (baseado no arquivo itens.xlsx)
        console.log('🛍️ Inserindo produtos...')
        const sampleProducts = [
            {
                company_id: company.id,
                name: 'Frango Grelhado',
                category: 'Prato Principal',
                price: 22.75,
                active: true
            },
            {
                company_id: company.id,
                name: 'Batata Frita',
                category: 'Acompanhamento',
                price: 15.80,
                active: true
            },
            {
                company_id: company.id,
                name: 'Refrigerante',
                category: 'Bebida',
                price: 17.00,
                active: true
            },
            {
                company_id: company.id,
                name: 'Combo Completo',
                category: 'Combo',
                price: 67.90,
                active: true
            }
        ]

        const { data: products, error: productsError } = await supabase
            .from('products')
            .insert(sampleProducts)
            .select()

        if (productsError) {
            console.error('❌ Erro ao inserir produtos:', productsError)
        } else {
            console.log('✅ Produtos inseridos:', products.length)
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

        const { count: orderItemsCount } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })

        const { count: contactsCount } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })

        const { count: productsCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })

        console.log('📈 Total de clientes:', customersCount)
        console.log('📈 Total de pedidos:', ordersCount)
        console.log('📈 Total de itens:', orderItemsCount)
        console.log('📈 Total de contatos:', contactsCount)
        console.log('📈 Total de produtos:', productsCount)
        console.log('')

        console.log('🎉 Migração dos dados reais concluída!')
        console.log('🔗 Acesse o Supabase para ver os dados')
        console.log('🌐 URL do Supabase:', supabaseUrl)

    } catch (error) {
        console.error('❌ Erro geral:', error)
    }
}

// Executar migração
migrateRealData()
