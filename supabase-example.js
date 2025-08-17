// 🚀 Exemplo de Implementação Supabase - ZapInteligencia
// Este arquivo mostra como integrar o Supabase ao projeto atual

import { createClient } from '@supabase/supabase-js'

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// 🏗️ Classe para integração com Supabase
class ZapInteligenciaSupabase {
    constructor() {
        this.supabase = supabase
    }

    // 🔐 Autenticação
    async signUp(email, password, fullName) {
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        })
        
        if (error) throw error
        return data
    }

    async signIn(email, password) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        })
        
        if (error) throw error
        return data
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut()
        if (error) throw error
    }

    // 📊 Migração de Dados
    async migrateOrders(pedidosData, companyId) {
        const orders = pedidosData.map(pedido => ({
            company_id: companyId,
            customer_name: pedido.Cliente || 'Cliente não identificado',
            customer_phone: pedido.Telefone || null,
            customer_address: pedido.Endereço || null,
            neighborhood: pedido.Bairro || null,
            order_date: pedido['Data Ab. Ped.'] || null,
            closing_date: pedido['Data Fechamento'] || null,
            total_amount: parseFloat(pedido.Total || 0),
            origin: pedido.Origem || 'Não informado',
            status: 'completed'
        }))

        const { data, error } = await this.supabase
            .from('orders')
            .insert(orders)
            .select()

        if (error) throw error
        return data
    }

    async migrateOrderItems(itensData, companyId) {
        // Primeiro, busca todos os pedidos da empresa
        const { data: orders } = await this.supabase
            .from('orders')
            .select('id, customer_name')
            .eq('company_id', companyId)

        const orderItems = []
        
        for (const item of itensData) {
            // Encontra o pedido correspondente
            const order = orders.find(o => 
                o.customer_name === item.Cliente || 
                item['Cod. Ped.'] === o.id
            )
            
            if (order) {
                orderItems.push({
                    order_id: order.id,
                    product_name: item['Nome Prod'] || 'Produto não identificado',
                    product_category: item['Cat. Prod.'] || null,
                    quantity: parseInt(item['Qtd.'] || 1),
                    unit_price: parseFloat(item['Valor Un. Item'] || 0),
                    total_price: parseFloat(item['Valor. Tot. Item'] || 0)
                })
            }
        }

        const { data, error } = await this.supabase
            .from('order_items')
            .insert(orderItems)
            .select()

        if (error) throw error
        return data
    }

    // 📈 Relatórios em Tempo Real
    async getSalesReport(companyId, startDate, endDate) {
        const { data, error } = await this.supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    product_name,
                    quantity,
                    total_price
                )
            `)
            .eq('company_id', companyId)
            .gte('order_date', startDate)
            .lte('order_date', endDate)
            .order('order_date', { ascending: false })

        if (error) throw error
        return data
    }

    async getCustomerAnalysis(companyId) {
        const { data, error } = await this.supabase
            .rpc('get_customer_analysis', { company_id: companyId })

        if (error) throw error
        return data
    }

    async getTopProducts(companyId, limit = 10) {
        const { data, error } = await this.supabase
            .from('order_items')
            .select(`
                product_name,
                product_category,
                quantity,
                total_price,
                orders!inner(company_id)
            `)
            .eq('orders.company_id', companyId)
            .order('quantity', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data
    }

    // 🤖 IA com Dados em Tempo Real
    async getAIAnalysis(companyId, question) {
        // Busca dados atualizados
        const salesData = await this.getSalesReport(companyId, 
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 dias
            new Date()
        )
        
        const customerData = await this.getCustomerAnalysis(companyId)
        const productData = await this.getTopProducts(companyId)

        // Prepara dados para a IA
        const analysisData = {
            sales: salesData,
            customers: customerData,
            products: productData,
            summary: {
                totalOrders: salesData.length,
                totalRevenue: salesData.reduce((sum, order) => sum + order.total_amount, 0),
                uniqueCustomers: new Set(salesData.map(o => o.customer_name)).size,
                topProducts: productData.slice(0, 5)
            }
        }

        // Chama a IA (integração com Gemini)
        return await this.callGeminiAI(question, analysisData)
    }

    // 🔄 Sincronização em Tempo Real
    subscribeToChanges(companyId, callback) {
        return this.supabase
            .channel('orders_changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'orders',
                    filter: `company_id=eq.${companyId}`
                }, 
                callback
            )
            .subscribe()
    }

    // 📊 Dashboard em Tempo Real
    async getDashboardData(companyId) {
        const [
            recentOrders,
            topCustomers,
            topProducts,
            salesChart
        ] = await Promise.all([
            this.getRecentOrders(companyId),
            this.getTopCustomers(companyId),
            this.getTopProducts(companyId),
            this.getSalesChart(companyId)
        ])

        return {
            recentOrders,
            topCustomers,
            topProducts,
            salesChart
        }
    }

    async getRecentOrders(companyId, limit = 10) {
        const { data, error } = await this.supabase
            .from('orders')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data
    }

    async getTopCustomers(companyId, limit = 10) {
        const { data, error } = await this.supabase
            .rpc('get_top_customers', { 
                company_id: companyId, 
                limit_count: limit 
            })

        if (error) throw error
        return data
    }

    async getSalesChart(companyId, days = 30) {
        const { data, error } = await this.supabase
            .rpc('get_sales_chart', { 
                company_id: companyId, 
                days_count: days 
            })

        if (error) throw error
        return data
    }
}

// 🎯 Exemplo de Uso
async function exemploUso() {
    const zapSupabase = new ZapInteligenciaSupabase()

    try {
        // 1. Login
        await zapSupabase.signIn('admin@zapchicken.com', 'senha123')

        // 2. Migrar dados existentes
        const companyId = 'uuid-da-empresa'
        const pedidosData = [] // Dados dos arquivos Excel
        const itensData = [] // Dados dos itens

        await zapSupabase.migrateOrders(pedidosData, companyId)
        await zapSupabase.migrateOrderItems(itensData, companyId)

        // 3. Dashboard em tempo real
        const dashboard = await zapSupabase.getDashboardData(companyId)
        console.log('Dashboard:', dashboard)

        // 4. Análise com IA
        const analysis = await zapSupabase.getAIAnalysis(
            companyId, 
            'Quais são os clientes mais fiéis?'
        )
        console.log('Análise IA:', analysis)

        // 5. Sincronização em tempo real
        zapSupabase.subscribeToChanges(companyId, (payload) => {
            console.log('Mudança detectada:', payload)
            // Atualizar interface em tempo real
        })

    } catch (error) {
        console.error('Erro:', error)
    }
}

export default ZapInteligenciaSupabase
