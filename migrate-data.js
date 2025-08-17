// 🚀 Script de Migração - ZapInteligencia para Supabase
// Este script migra os dados dos arquivos Excel/CSV para o Supabase

import { createClient } from '@supabase/supabase-js'
import pkg from './src/zapchickenProcessor.js'
const { ZapChickenProcessor } = pkg
import utils from './src/utils.js'
const { logger } = utils

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

class DataMigrator {
    constructor() {
        this.supabase = supabase
        this.processor = new ZapChickenProcessor()
    }

    // 🔐 Autenticação
    async authenticate(email, password) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        })
        
        if (error) throw error
        return data
    }

    // 🏢 Criar empresa
    async createCompany(companyData) {
        const { data, error } = await this.supabase
            .from('companies')
            .insert({
                name: companyData.name || 'ZapChicken',
                slug: companyData.slug || 'zapchicken',
                phone: companyData.phone,
                email: companyData.email,
                address: companyData.address,
                neighborhood: companyData.neighborhood,
                city: companyData.city,
                state: companyData.state,
                zip_code: companyData.zip_code,
                gemini_api_key: companyData.gemini_api_key
            })
            .select()
            .single()

        if (error) throw error
        return data
    }

    // 👤 Migrar clientes
    async migrateCustomers(companyId) {
        console.log('📊 Migrando clientes...')
        
        const clientesData = this.processor.processClientes()
        if (!clientesData || clientesData.length === 0) {
            console.log('❌ Nenhum dado de cliente encontrado')
            return []
        }

        const customers = clientesData.map(cliente => ({
            company_id: companyId,
            name: cliente.Nome || cliente['Nome Cliente'] || 'Cliente não identificado',
            phone: cliente.Telefone || cliente.Phone || null,
            email: cliente.Email || null,
            address: cliente.Endereço || cliente.Address || null,
            neighborhood: cliente.Bairro || cliente.Neighborhood || null,
            city: cliente.Cidade || cliente.City || null,
            state: cliente.Estado || cliente.State || null,
            zip_code: cliente['CEP'] || cliente['Zip Code'] || null,
            business_name: cliente['Nome do Negócio'] || cliente['Business Name'] || null,
            business_phone: cliente['Telefone do Negócio'] || cliente['Business Phone'] || null,
            business_email: cliente['Email do Negócio'] || cliente['Business Email'] || null,
            source: 'migration',
            status: 'active'
        }))

        // Inserir em lotes de 100
        const batchSize = 100
        const results = []
        
        for (let i = 0; i < customers.length; i += batchSize) {
            const batch = customers.slice(i, i + batchSize)
            const { data, error } = await this.supabase
                .from('customers')
                .insert(batch)
                .select()

            if (error) {
                console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, error)
                throw error
            }

            results.push(...data)
            console.log(`✅ Lote ${i / batchSize + 1} inserido: ${data.length} clientes`)
        }

        console.log(`✅ Total de clientes migrados: ${results.length}`)
        return results
    }

    // 🛒 Migrar pedidos
    async migrateOrders(companyId) {
        console.log('📊 Migrando pedidos...')
        
        const pedidosData = this.processor.processPedidos()
        if (!pedidosData || pedidosData.length === 0) {
            console.log('❌ Nenhum dado de pedido encontrado')
            return []
        }

        const orders = pedidosData.map(pedido => ({
            company_id: companyId,
            order_code: pedido['Código'] || pedido['Cod. Ped.'] || null,
            customer_name: pedido.Cliente || pedido['Nome Cliente'] || 'Cliente não identificado',
            customer_phone: pedido.Telefone || pedido.Phone || null,
            customer_email: pedido.Email || null,
            customer_address: pedido.Endereço || pedido.Address || null,
            customer_neighborhood: pedido.Bairro || pedido.Neighborhood || null,
            customer_city: pedido.Cidade || pedido.City || null,
            customer_state: pedido.Estado || pedido.State || null,
            customer_zip_code: pedido['CEP'] || pedido['Zip Code'] || null,
            order_date: pedido['Data Ab. Ped.'] || pedido['Data Abertura'] || null,
            closing_date: pedido['Data Fechamento'] || pedido['Data Fec. Ped.'] || null,
            delivery_date: pedido['Data Entrega'] || null,
            subtotal: parseFloat(pedido.Subtotal || 0),
            discount: parseFloat(pedido.Desconto || 0),
            delivery_fee: parseFloat(pedido['Taxa Entrega'] || 0),
            total_amount: parseFloat(pedido.Total || pedido['Valor Total'] || 0),
            origin: pedido.Origem || pedido.Source || 'Não informado',
            order_type: pedido['Tipo Pedido'] || pedido['Order Type'] || 'Delivery',
            payment_method: pedido['Forma Pagamento'] || pedido['Payment Method'] || null,
            status: 'completed',
            table_number: pedido['Núm. Mesa'] || pedido['Table Number'] || null,
            command_number: pedido['Núm. Comanda'] || pedido['Command Number'] || null,
            notes: pedido.Observações || pedido.Notes || null
        }))

        // Inserir em lotes de 100
        const batchSize = 100
        const results = []
        
        for (let i = 0; i < orders.length; i += batchSize) {
            const batch = orders.slice(i, i + batchSize)
            const { data, error } = await this.supabase
                .from('orders')
                .insert(batch)
                .select()

            if (error) {
                console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, error)
                throw error
            }

            results.push(...data)
            console.log(`✅ Lote ${i / batchSize + 1} inserido: ${data.length} pedidos`)
        }

        console.log(`✅ Total de pedidos migrados: ${results.length}`)
        return results
    }

    // 📦 Migrar itens dos pedidos
    async migrateOrderItems(companyId) {
        console.log('📊 Migrando itens dos pedidos...')
        
        const itensData = this.processor.processItens()
        if (!itensData || itensData.length === 0) {
            console.log('❌ Nenhum dado de item encontrado')
            return []
        }

        // Primeiro, buscar todos os pedidos para fazer o mapeamento
        const { data: orders } = await this.supabase
            .from('orders')
            .select('id, order_code, customer_name')
            .eq('company_id', companyId)

        const orderItems = []
        
        for (const item of itensData) {
            // Encontrar o pedido correspondente
            const order = orders.find(o => 
                o.order_code === item['Cod. Ped.'] ||
                o.customer_name === item.Cliente
            )
            
            if (order) {
                orderItems.push({
                    order_id: order.id,
                    company_id: companyId,
                    product_name: item['Nome Prod'] || item['Product Name'] || 'Produto não identificado',
                    product_code: item['Cod. Prod.'] || item['Product Code'] || null,
                    product_category: item['Cat. Prod.'] || item['Product Category'] || null,
                    product_type: item['Tipo Prod.'] || item['Product Type'] || null,
                    quantity: parseInt(item['Qtd.'] || item['Quantity'] || 1),
                    unit_price: parseFloat(item['Valor Un. Item'] || item['Unit Price'] || 0),
                    total_price: parseFloat(item['Valor. Tot. Item'] || item['Total Price'] || 0),
                    original_product_value: parseFloat(item['Valor Prod'] || item['Product Value'] || 0),
                    table_number: item['Núm. Mesa/Com.'] || item['Table Number'] || null,
                    command_number: item['Núm. Comanda'] || item['Command Number'] || null,
                    item_date: item['Data/Hora Item'] || item['Item Date'] || null,
                    order_date: item['Data Ab. Ped.'] || item['Order Date'] || null,
                    closing_date: item['Data Fec. Ped.'] || item['Closing Date'] || null,
                    order_status: item['Stat. Ped.'] || item['Order Status'] || null,
                    notes: item.Observações || item.Notes || null
                })
            }
        }

        // Inserir em lotes de 100
        const batchSize = 100
        const results = []
        
        for (let i = 0; i < orderItems.length; i += batchSize) {
            const batch = orderItems.slice(i, i + batchSize)
            const { data, error } = await this.supabase
                .from('order_items')
                .insert(batch)
                .select()

            if (error) {
                console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, error)
                throw error
            }

            results.push(...data)
            console.log(`✅ Lote ${i / batchSize + 1} inserido: ${data.length} itens`)
        }

        console.log(`✅ Total de itens migrados: ${results.length}`)
        return results
    }

    // 📞 Migrar contatos
    async migrateContacts(companyId) {
        console.log('📊 Migrando contatos...')
        
        const contactsData = this.processor.processContacts()
        if (!contactsData || contactsData.length === 0) {
            console.log('❌ Nenhum dado de contato encontrado')
            return []
        }

        const contacts = contactsData.map(contact => ({
            company_id: companyId,
            name: contact.Name || contact.Nome || 'Contato não identificado',
            phone: contact.Phone || contact.Telefone || null,
            email: contact.Email || null,
            address: contact.Address || contact.Endereço || null,
            neighborhood: contact.Neighborhood || contact.Bairro || null,
            city: contact.City || contact.Cidade || null,
            state: contact.State || contact.Estado || null,
            zip_code: contact['Zip Code'] || contact.CEP || null,
            business_name: contact['Business Name'] || contact['Nome do Negócio'] || null,
            business_phone: contact['Business Phone'] || contact['Telefone do Negócio'] || null,
            business_email: contact['Business Email'] || contact['Email do Negócio'] || null,
            category: contact.Category || contact.Categoria || null,
            tags: contact.Tags ? contact.Tags.split(',').map(tag => tag.trim()) : [],
            source: 'Google Contacts',
            status: 'active',
            notes: contact.Notes || contact.Observações || null
        }))

        // Inserir em lotes de 100
        const batchSize = 100
        const results = []
        
        for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize)
            const { data, error } = await this.supabase
                .from('contacts')
                .insert(batch)
                .select()

            if (error) {
                console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, error)
                throw error
            }

            results.push(...data)
            console.log(`✅ Lote ${i / batchSize + 1} inserido: ${data.length} contatos`)
        }

        console.log(`✅ Total de contatos migrados: ${results.length}`)
        return results
    }

    // 🛍️ Migrar produtos
    async migrateProducts(companyId) {
        console.log('📊 Migrando produtos...')
        
        const itensData = this.processor.processItens()
        if (!itensData || itensData.length === 0) {
            console.log('❌ Nenhum dado de produto encontrado')
            return []
        }

        // Extrair produtos únicos dos itens
        const uniqueProducts = new Map()
        
        for (const item of itensData) {
            const productName = item['Nome Prod'] || item['Product Name']
            const productCategory = item['Cat. Prod.'] || item['Product Category']
            const productType = item['Tipo Prod.'] || item['Product Type']
            
            if (productName && !uniqueProducts.has(productName)) {
                uniqueProducts.set(productName, {
                    company_id: companyId,
                    name: productName,
                    code: item['Cod. Prod.'] || item['Product Code'] || null,
                    category: productCategory,
                    type: productType,
                    price: parseFloat(item['Valor Un. Item'] || item['Unit Price'] || 0),
                    cost: parseFloat(item['Valor Prod'] || item['Product Value'] || 0),
                    active: true,
                    description: null,
                    notes: null
                })
            }
        }

        const products = Array.from(uniqueProducts.values())

        // Inserir em lotes de 100
        const batchSize = 100
        const results = []
        
        for (let i = 0; i < products.length; i += batchSize) {
            const batch = products.slice(i, i + batchSize)
            const { data, error } = await this.supabase
                .from('products')
                .insert(batch)
                .select()

            if (error) {
                console.error(`❌ Erro ao inserir lote ${i / batchSize + 1}:`, error)
                throw error
            }

            results.push(...data)
            console.log(`✅ Lote ${i / batchSize + 1} inserido: ${data.length} produtos`)
        }

        console.log(`✅ Total de produtos migrados: ${results.length}`)
        return results
    }

    // 🔄 Migração completa
    async migrateAll(companyData) {
        try {
            console.log('🚀 Iniciando migração completa...')
            
            // 1. Criar empresa
            console.log('🏢 Criando empresa...')
            const company = await this.createCompany(companyData)
            console.log(`✅ Empresa criada: ${company.name} (ID: ${company.id})`)

            // 2. Migrar dados
            const results = {
                company: company,
                customers: await this.migrateCustomers(company.id),
                orders: await this.migrateOrders(company.id),
                orderItems: await this.migrateOrderItems(company.id),
                contacts: await this.migrateContacts(company.id),
                products: await this.migrateProducts(company.id)
            }

            // 3. Log de processamento
            await this.createProcessingLog(company.id, {
                file_name: 'migration_complete',
                file_type: 'migration',
                processing_type: 'full_migration',
                status: 'completed',
                records_processed: results.customers.length + results.orders.length + results.orderItems.length + results.contacts.length + results.products.length,
                records_success: results.customers.length + results.orders.length + results.orderItems.length + results.contacts.length + results.products.length,
                records_failed: 0
            })

            console.log('🎉 Migração concluída com sucesso!')
            console.log('📊 Resumo:')
            console.log(`  - Clientes: ${results.customers.length}`)
            console.log(`  - Pedidos: ${results.orders.length}`)
            console.log(`  - Itens: ${results.orderItems.length}`)
            console.log(`  - Contatos: ${results.contacts.length}`)
            console.log(`  - Produtos: ${results.products.length}`)

            return results

        } catch (error) {
            console.error('❌ Erro na migração:', error)
            throw error
        }
    }

    // 📝 Criar log de processamento
    async createProcessingLog(companyId, logData) {
        const { error } = await this.supabase
            .from('processing_logs')
            .insert({
                company_id: companyId,
                file_name: logData.file_name,
                file_type: logData.file_type,
                processing_type: logData.processing_type,
                status: logData.status,
                records_processed: logData.records_processed,
                records_success: logData.records_success,
                records_failed: logData.records_failed,
                completed_at: new Date().toISOString()
            })

        if (error) {
            console.error('❌ Erro ao criar log:', error)
        }
    }
}

// 🎯 Exemplo de uso
async function runMigration() {
    console.log('🚀 Iniciando migração...')
    
    const migrator = new DataMigrator()

    try {
        console.log('📋 Verificando arquivos...')
        
        // 2. Dados da empresa
        const companyData = {
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
        }

        console.log('🏢 Dados da empresa configurados')
        console.log('📊 Iniciando migração completa...')

        // 3. Executar migração
        const results = await migrator.migrateAll(companyData)
        
        console.log('🎯 Migração finalizada!')
        console.log('🔗 Acesse o Supabase para ver os dados')

    } catch (error) {
        console.error('❌ Erro:', error)
        process.exit(1)
    }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigration()
}

export default DataMigrator
