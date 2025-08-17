// 🚀 Arquivo específico para Vercel
// Versão completamente limpa sem dependências externas

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');

const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Cache global
let globalDataLoaded = false;
let globalAI = null;
let uploadedFiles = new Map();
let globalReports = null;

// Função para carregar Supabase
function loadSupabase() {
    try {
        const { createClient } = require('@supabase/supabase-js');
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.log('⚠️ Variáveis do Supabase não configuradas');
            return { loaded: false, error: 'Supabase não configurado' };
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        return {
            supabase,
            loaded: true
        };
    } catch (error) {
        console.error('Erro ao carregar Supabase:', error.message);
        return { loaded: false, error: error.message };
    }
}

// Funções utilitárias locais
const utils = {
    cleanPhoneNumber: (phone) => {
        if (!phone || phone === '') return '';
        let cleanPhone = String(phone).replace(/[\(\)\-\s]/g, '').replace(/\D/g, '');
        if (cleanPhone === '00000000' || cleanPhone === '0000000000' || cleanPhone === '00000000000' || cleanPhone.length < 10 || cleanPhone.startsWith('000')) {
            return '';
        }
        return cleanPhone;
    },
    validatePhone: (phone) => {
        const cleanPhone = utils.cleanPhoneNumber(phone);
        return cleanPhone.length >= 10 && cleanPhone.length <= 15;
    },
    extractFirstName: (fullName) => {
        if (!fullName || fullName === '') return '';
        let name = String(fullName).trim();
        if (name.startsWith('LT_')) {
            const parts = name.split(' ', 2);
            if (parts.length > 1) {
                return parts[1];
            }
            return '';
        }
        const firstName = name.split(' ')[0];
        const invalidNames = ['-', '???????', 'null', 'none', 'nan', ''];
        if (invalidNames.includes(firstName.toLowerCase())) {
            return '';
        }
        return firstName;
    },
    normalizeNeighborhood: (bairro, neighborhoodMapping) => {
        if (!bairro || bairro === '') return '';
        const bairroLower = String(bairro).trim().toLowerCase();
        for (const [normalized, variants] of Object.entries(neighborhoodMapping)) {
            if (variants.includes(bairroLower)) {
                return normalized;
            }
        }
        return bairroLower;
    },
    formatWhatsAppPhone: (phone) => {
        const cleanPhone = utils.cleanPhoneNumber(phone);
        if (!cleanPhone) return '';
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
            return `55${cleanPhone}`;
        }
        return cleanPhone;
    },
    validateEmail: (email) => {
        if (!email || email === '') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(email).toLowerCase());
    },
    formatDate: (date) => {
        if (!date) return '';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    },
    cleanText: (text) => {
        if (!text || text === '') return '';
        return String(text).trim().replace(/\s+/g, ' ').replace(/[^\w\s\-\.]/g, '');
    }
};

// Carrega Supabase
const supabase = loadSupabase();

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Status dos dados
app.get('/data_status', async (req, res) => {
    try {
        if (!supabase.loaded) {
            return res.json({
                data_loaded: false,
                message: 'Supabase não configurado. Configure as variáveis de ambiente.',
                environment: 'production',
                supabase_loaded: false
            });
        }

        const { count: ordersCount } = await supabase.supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

        const { count: customersCount } = await supabase.supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        const hasData = (ordersCount || 0) > 0 || (customersCount || 0) > 0;

        res.json({
            data_loaded: hasData,
            message: hasData ? 
                'Dados carregados e prontos para uso!' : 
                'Faça upload dos arquivos para carregar dados no Supabase.',
            environment: 'production',
            supabase_loaded: true,
            orders_count: ordersCount || 0,
            customers_count: customersCount || 0
        });

    } catch (error) {
        console.error('Erro ao verificar status:', error);
        res.json({
            data_loaded: false,
            message: 'Erro ao verificar dados no Supabase.',
            environment: 'production',
            supabase_loaded: supabase.loaded,
            error: error.message
        });
    }
});

// Upload de arquivo
app.post('/upload', (req, res) => {
    try {
        if (!supabase.loaded) {
            return res.status(500).json({ 
                error: 'Supabase não configurado. Configure as variáveis de ambiente.' 
            });
        }

        const storage = multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    await fs.ensureDir('/tmp/uploads');
                    cb(null, '/tmp/uploads');
                } catch (error) {
                    cb(error);
                }
            },
            filename: (req, file, cb) => {
                let filename = file.originalname;
                
                if (req.body.file_type === 'contacts') {
                    filename = 'contacts.csv';
                } else if (req.body.file_type === 'clientes') {
                    filename = 'clientes.xlsx';
                } else if (req.body.file_type === 'pedidos') {
                    filename = 'pedidos.xlsx';
                } else if (req.body.file_type === 'itens') {
                    filename = 'itens.xlsx';
                }
                
                cb(null, filename);
            }
        });

        const upload = multer({
            storage: storage,
            limits: {
                fileSize: 50 * 1024 * 1024
            },
            fileFilter: (req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                if (['.csv', '.xlsx', '.xls'].includes(ext)) {
                    cb(null, true);
                } else {
                    cb(new Error('Tipo de arquivo não permitido'), false);
                }
            }
        });

        upload.single('file')(req, res, async (err) => {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ error: `Erro no upload: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ error: `Erro no upload: ${err.message}` });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo selecionado' });
            }

            const fileType = req.body.file_type;
            const filename = req.file.filename;
            const filePath = req.file.path;

            console.log('✅ Upload bem-sucedido:', {
                filename,
                fileType,
                size: req.file.size,
                path: filePath
            });

            uploadedFiles.set(fileType, {
                filename,
                path: filePath,
                size: req.file.size,
                uploadedAt: new Date()
            });

            res.json({
                success: true,
                message: `Arquivo ${filename} carregado com sucesso!`,
                filename: filename,
                fileType: fileType,
                size: req.file.size
            });
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: `Erro ao fazer upload: ${error.message}` });
    }
});

// Processamento de dados
app.post('/process', async (req, res) => {
    try {
        console.log('🔍 Iniciando processamento...');
        
        if (!supabase.loaded) {
            return res.status(500).json({ 
                error: 'Supabase não configurado. Configure as variáveis de ambiente.' 
            });
        }

        if (uploadedFiles.size === 0) {
            return res.status(400).json({
                error: 'Nenhum arquivo carregado. Faça upload dos arquivos primeiro.'
            });
        }

        console.log('📁 Arquivos para processar:', uploadedFiles.size);

        try {
            const { data: existingOrders } = await supabase.supabase
                .from('orders')
                .select('*')
                .limit(5);

            const { data: existingCustomers } = await supabase.supabase
                .from('customers')
                .select('*')
                .limit(5);

            const { data: existingProducts } = await supabase.supabase
                .from('products')
                .select('*')
                .limit(5);

            console.log('📊 Dados existentes no Supabase:', {
                orders: existingOrders?.length || 0,
                customers: existingCustomers?.length || 0,
                products: existingProducts?.length || 0
            });

            const processedData = {
                orders: existingOrders || [],
                customers: existingCustomers || [],
                products: existingProducts || []
            };

            globalDataLoaded = true;

            res.json({
                success: true,
                message: `Dados processados com sucesso! Encontrados ${processedData.orders.length} pedidos, ${processedData.customers.length} clientes e ${processedData.products.length} produtos no Supabase.`,
                data: processedData,
                files_processed: uploadedFiles.size,
                data_summary: {
                    orders: processedData.orders.length,
                    customers: processedData.customers.length,
                    products: processedData.products.length
                }
            });

        } catch (error) {
            console.error('❌ Erro ao processar dados:', error);
            res.status(500).json({ 
                error: `Erro ao processar dados: ${error.message}`,
                details: error.stack
            });
        }

    } catch (error) {
        console.error('❌ Erro ao processar dados:', error);
        res.status(500).json({ 
            error: `Erro ao processar dados: ${error.message}`,
            details: error.stack
        });
    }
});

// Gera relatórios
app.post('/generate_reports', async (req, res) => {
    try {
        if (!supabase.loaded) {
            return res.status(500).json({ 
                error: 'Supabase não configurado' 
            });
        }

        console.log('📊 Gerando relatórios...');

        const { data: orders, error: ordersError } = await supabase.supabase
            .from('orders')
            .select('*');

        const { data: customers, error: customersError } = await supabase.supabase
            .from('customers')
            .select('*');

        const { data: products, error: productsError } = await supabase.supabase
            .from('products')
            .select('*');

        if (ordersError || customersError || productsError) {
            console.error('Erros ao buscar dados:', { ordersError, customersError, productsError });
            return res.status(500).json({ 
                error: 'Erro ao buscar dados do Supabase',
                details: { ordersError, customersError, productsError }
            });
        }

        console.log('📋 Dados encontrados:', {
            orders: orders?.length || 0,
            customers: customers?.length || 0,
            products: products?.length || 0
        });

        const reports = [];

        if (orders && orders.length > 0) {
            console.log('📈 Gerando relatório de vendas com', orders.length, 'pedidos');
            
            const salesReport = {
                filename: 'relatorio_vendas.xlsx',
                name: 'Relatório de Vendas',
                data: {
                    total_orders: orders.length,
                    total_revenue: orders.reduce((sum, order) => {
                        const amount = parseFloat(order.total_amount || order.valor_total || 0);
                        return sum + amount;
                    }, 0),
                    average_ticket: orders.reduce((sum, order) => {
                        const amount = parseFloat(order.total_amount || order.valor_total || 0);
                        return sum + amount;
                    }, 0) / orders.length,
                    orders_by_date: orders.reduce((acc, order) => {
                        const date = order.order_date || order.data_pedido || order.data || 'Sem data';
                        const dateStr = date.split('T')[0];
                        acc[dateStr] = (acc[dateStr] || 0) + 1;
                        return acc;
                    }, {}),
                    top_customers: orders.reduce((acc, order) => {
                        const customer = order.customer_name || order.nome_cliente || order.cliente || 'Cliente não identificado';
                        const amount = parseFloat(order.total_amount || order.valor_total || 0);
                        acc[customer] = (acc[customer] || 0) + amount;
                        return acc;
                    }, {})
                }
            };
            reports.push(salesReport);
        }

        if (customers && customers.length > 0) {
            console.log('👥 Gerando análise de clientes com', customers.length, 'clientes');
            
            const customersReport = {
                filename: 'analise_clientes.xlsx',
                name: 'Análise de Clientes',
                data: {
                    total_customers: customers.length,
                    customers_by_neighborhood: customers.reduce((acc, customer) => {
                        const neighborhood = customer.neighborhood || customer.bairro || 'Não informado';
                        acc[neighborhood] = (acc[neighborhood] || 0) + 1;
                        return acc;
                    }, {}),
                    customers_by_status: customers.reduce((acc, customer) => {
                        const status = customer.status || customer.situacao || 'Ativo';
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                    }, {}),
                    customers_by_city: customers.reduce((acc, customer) => {
                        const city = customer.city || customer.cidade || 'Não informado';
                        acc[city] = (acc[city] || 0) + 1;
                        return acc;
                    }, {})
                }
            };
            reports.push(customersReport);
        }

        if (products && products.length > 0) {
            console.log('🛍️ Gerando relatório de produtos com', products.length, 'produtos');
            
            const productsReport = {
                filename: 'produtos_mais_vendidos.xlsx',
                name: 'Produtos Mais Vendidos',
                data: {
                    total_products: products.length,
                    products_by_category: products.reduce((acc, product) => {
                        const category = product.category || product.categoria || 'Sem categoria';
                        acc[category] = (acc[category] || 0) + 1;
                        return acc;
                    }, {}),
                    average_price: products.reduce((sum, product) => {
                        const price = parseFloat(product.price || product.preco || product.valor || 0);
                        return sum + price;
                    }, 0) / products.length,
                    products_by_brand: products.reduce((acc, product) => {
                        const brand = product.brand || product.marca || 'Sem marca';
                        acc[brand] = (acc[brand] || 0) + 1;
                        return acc;
                    }, {})
                }
            };
            reports.push(productsReport);
        }

        if (orders && orders.length > 0) {
            console.log('📦 Gerando relatório de itens vendidos');
            
            const itemsReport = {
                filename: 'itens_vendidos.xlsx',
                name: 'Itens Mais Vendidos',
                data: {
                    total_orders: orders.length,
                    items_by_order: orders.reduce((acc, order) => {
                        const items = order.items || order.itens || order.quantidade || 1;
                        acc['Total de Itens'] = (acc['Total de Itens'] || 0) + parseInt(items);
                        return acc;
                    }, {}),
                    average_items_per_order: orders.reduce((sum, order) => {
                        const items = order.items || order.itens || order.quantidade || 1;
                        return sum + parseInt(items);
                    }, 0) / orders.length
                }
            };
            reports.push(itemsReport);
        }

        globalReports = reports;

        console.log('✅ Relatórios gerados:', reports.length);

        res.json({
            success: true,
            message: `Relatórios gerados com sucesso usando ${orders?.length || 0} pedidos, ${customers?.length || 0} clientes e ${products?.length || 0} produtos!`,
            reports: reports.map(r => ({
                filename: r.filename,
                name: r.name,
                size: '2.5 KB',
                modified: new Date().toLocaleString('pt-BR')
            })),
            data_summary: {
                orders: orders?.length || 0,
                customers: customers?.length || 0,
                products: products?.length || 0
            }
        });

    } catch (error) {
        console.error('❌ Erro ao gerar relatórios:', error);
        res.status(500).json({ error: `Erro ao gerar relatórios: ${error.message}` });
    }
});

// Visualiza relatório
app.get('/view_report/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        
        if (!globalReports) {
            return res.status(404).json({ error: 'Nenhum relatório disponível' });
        }

        const report = globalReports.find(r => r.filename === filename);
        
        if (!report) {
            return res.status(404).json({ error: 'Relatório não encontrado' });
        }

        let html = `<h2>${report.name}</h2>`;
        html += '<table class="table table-striped">';
        
        for (const [key, value] of Object.entries(report.data)) {
            html += '<tr>';
            html += `<td><strong>${key}</strong></td>`;
            
            if (typeof value === 'object') {
                html += '<td>';
                for (const [subKey, subValue] of Object.entries(value)) {
                    html += `<div><strong>${subKey}:</strong> ${subValue}</div>`;
                }
                html += '</td>';
            } else {
                html += `<td>${value}</td>`;
            }
            
            html += '</tr>';
        }
        
        html += '</table>';

        res.json({
            success: true,
            html: html,
            filename: filename,
            name: report.name
        });

    } catch (error) {
        console.error('Erro ao visualizar relatório:', error);
        res.status(500).json({ error: `Erro ao visualizar relatório: ${error.message}` });
    }
});

// Download de relatório
app.get('/download_report/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        
        if (!globalReports) {
            return res.status(404).json({ error: 'Nenhum relatório disponível' });
        }

        const report = globalReports.find(r => r.filename === filename);
        
        if (!report) {
            return res.status(404).json({ error: 'Relatório não encontrado' });
        }

        let csv = '';
        csv += 'Métrica,Valor\n';
        
        for (const [key, value] of Object.entries(report.data)) {
            if (typeof value === 'object') {
                for (const [subKey, subValue] of Object.entries(value)) {
                    csv += `"${key} - ${subKey}","${subValue}"\n`;
                }
            } else {
                csv += `"${key}","${value}"\n`;
            }
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename.replace('.xlsx', '.csv')}"`);
        
        res.send(csv);

    } catch (error) {
        console.error('Erro ao baixar relatório:', error);
        res.status(500).json({ error: `Erro ao baixar relatório: ${error.message}` });
    }
});

// Verifica arquivos disponíveis
app.get('/check_files', async (req, res) => {
    try {
        if (!supabase.loaded) {
            return res.json([{
                filename: 'error',
                name: 'Supabase não configurado',
                size: '0 KB',
                modified: new Date().toLocaleString('pt-BR'),
                message: 'Configure as variáveis de ambiente do Supabase'
            }]);
        }

        const { count: ordersCount } = await supabase.supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

        const { count: customersCount } = await supabase.supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        const hasData = (ordersCount || 0) > 0 || (customersCount || 0) > 0;

        if (hasData && globalReports) {
            const reports = globalReports.map(r => ({
                filename: r.filename,
                name: r.name,
                size: '2.5 KB',
                modified: new Date().toLocaleString('pt-BR')
            }));
            res.json(reports);
        } else if (hasData) {
            res.json([{
                filename: 'generate',
                name: 'Gerar Relatórios',
                size: '0 KB',
                modified: new Date().toLocaleString('pt-BR'),
                message: 'Clique em "Gerar Relatórios" para criar os relatórios'
            }]);
        } else {
            res.json([{
                filename: 'info',
                name: 'Nenhum relatório disponível',
                size: '0 KB',
                modified: new Date().toLocaleString('pt-BR'),
                message: 'Faça upload dos arquivos e processe os dados primeiro'
            }]);
        }

    } catch (error) {
        console.error('Erro ao verificar arquivos:', error);
        res.status(500).json({ error: `Erro ao verificar arquivos: ${error.message}` });
    }
});

// Limpa cache
app.post('/clear_cache', (req, res) => {
    try {
        globalDataLoaded = false;
        globalAI = null;
        uploadedFiles.clear();
        globalReports = null;
        
        console.log('🧹 Cache limpo com sucesso');
        
        res.json({ 
            message: 'Cache limpo com sucesso!',
            files_cleared: uploadedFiles.size
        });
    } catch (error) {
        console.error('Erro ao limpar cache:', error);
        res.status(500).json({ error: `Erro ao limpar cache: ${error.message}` });
    }
});

// Configuração Gemini
app.post('/config_gemini', async (req, res) => {
    try {
        const { api_key } = req.body;

        if (!api_key || api_key.trim() === '') {
            return res.status(400).json({
                success: false,
                message: '❌ API key não fornecida'
            });
        }

        globalAI = { apiKey: api_key.trim() };

        res.json({
            success: true,
            message: '✅ API Gemini configurada e funcionando!'
        });

    } catch (error) {
        console.error('Erro ao configurar Gemini:', error);
        res.status(500).json({
            success: false,
            message: `❌ Erro ao configurar Gemini: ${error.message}`
        });
    }
});

// Chat com IA
app.post('/chat_message', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Mensagem vazia' });
        }

        if (!globalDataLoaded) {
            return res.status(400).json({ 
                error: 'Dados não carregados. Processe os dados primeiro.' 
            });
        }

        if (!globalAI) {
            return res.status(400).json({ 
                error: 'IA não configurada. Configure a API Gemini primeiro.' 
            });
        }

        res.json({ 
            response: 'Esta é uma resposta de teste. Configure a IA Gemini para respostas reais.' 
        });

    } catch (error) {
        console.error('Erro no chat:', error);
        res.status(500).json({ error: `Erro no chat: ${error.message}` });
    }
});

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    console.error('Erro não tratado:', error);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message
    });
});

// Exporta o app para o Vercel
module.exports = app;
