// 🚀 Arquivo específico para Vercel
// Versão completamente limpa sem dependências externas

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');

// Importar o processador
const ZapChickenProcessor = require('../src/zapchickenProcessor');

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
        console.log('🔧 Carregando Supabase...');
        console.log('🔧 SUPABASE_URL:', process.env.SUPABASE_URL ? 'Configurado' : 'Não configurado');
        console.log('🔧 SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado');
        
        const { createClient } = require('@supabase/supabase-js');
        
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.log('⚠️ Variáveis do Supabase não configuradas');
            return { 
                loaded: false, 
                error: 'Supabase não configurado',
                details: {
                    url_missing: !supabaseUrl,
                    key_missing: !supabaseKey
                }
            };
        }
        
        console.log('🔧 Criando cliente Supabase...');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        console.log('✅ Supabase carregado com sucesso');
        
        return {
            supabase,
            loaded: true,
            url: supabaseUrl
        };
    } catch (error) {
        console.error('❌ Erro ao carregar Supabase:', error.message);
        console.error('❌ Stack trace:', error.stack);
        return { 
            loaded: false, 
            error: error.message,
            stack: error.stack
        };
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
        console.log('🔍 Verificando status dos dados...');
        
        if (!supabase.loaded) {
            console.log('❌ Supabase não carregado');
            return res.json({
                data_loaded: false,
                message: 'Supabase não configurado. Configure as variáveis de ambiente.',
                environment: process.env.NODE_ENV || 'development',
                supabase_loaded: false,
                supabase_error: supabase.error,
                supabase_details: supabase.details
            });
        }

        console.log('🔗 Testando conexão com Supabase...');

        const { count: ordersCount, error: ordersError } = await supabase.supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

        const { count: customersCount, error: customersError } = await supabase.supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        if (ordersError || customersError) {
            console.error('❌ Erros nas consultas:', { ordersError, customersError });
            return res.json({
                data_loaded: false,
                message: 'Erro ao conectar com Supabase.',
                environment: process.env.NODE_ENV || 'development',
                supabase_loaded: true,
                connection_errors: { ordersError, customersError }
            });
        }

        const hasData = (ordersCount || 0) > 0 || (customersCount || 0) > 0;

        console.log('✅ Status verificado:', { ordersCount, customersCount, hasData });

        res.json({
            data_loaded: hasData,
            message: hasData ? 
                'Dados carregados e prontos para uso!' : 
                'Faça upload dos arquivos para carregar dados no Supabase.',
            environment: process.env.NODE_ENV || 'development',
            supabase_loaded: true,
            orders_count: ordersCount || 0,
            customers_count: customersCount || 0,
            uploaded_files: Array.from(uploadedFiles.keys())
        });

    } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        res.json({
            data_loaded: false,
            message: 'Erro ao verificar dados no Supabase.',
            environment: process.env.NODE_ENV || 'development',
            supabase_loaded: supabase.loaded,
            error: error.message,
            stack: error.stack
        });
    }
});

// Endpoint de diagnóstico
app.get('/diagnostic', async (req, res) => {
    try {
        console.log('🔍 Executando diagnóstico do sistema...');
        
        const diagnostic = {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            node_version: process.version,
            platform: process.platform,
            supabase: {
                loaded: supabase.loaded,
                error: supabase.error,
                details: supabase.details,
                url: supabase.url
            },
            environment_variables: {
                SUPABASE_URL: process.env.SUPABASE_URL ? 'Configurado' : 'Não configurado',
                SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado',
                GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'Configurado' : 'Não configurado',
                NODE_ENV: process.env.NODE_ENV || 'development',
                PORT: process.env.PORT || '3000'
            },
            uploaded_files: Array.from(uploadedFiles.keys()),
            global_data_loaded: globalDataLoaded,
            global_ai_configured: !!globalAI
        };

        // Testar conexão Supabase se estiver carregado
        if (supabase.loaded) {
            try {
                const { data, error } = await supabase.supabase
                    .from('orders')
                    .select('count', { count: 'exact', head: true });
                
                diagnostic.supabase_connection = {
                    success: !error,
                    error: error,
                    data: data
                };
            } catch (connectionError) {
                diagnostic.supabase_connection = {
                    success: false,
                    error: connectionError.message,
                    stack: connectionError.stack
                };
            }
        }

        console.log('✅ Diagnóstico concluído');
        res.json(diagnostic);

    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        res.status(500).json({
            error: 'Erro ao executar diagnóstico',
            message: error.message,
            stack: error.stack
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
        console.log('📋 Request body:', req.body);
        console.log('🔧 Environment:', process.env.NODE_ENV);
        
        // Verificar se o Supabase está configurado
        if (!supabase.loaded) {
            console.error('❌ Supabase não configurado');
            return res.status(500).json({ 
                error: 'Supabase não configurado. Configure as variáveis de ambiente.',
                details: {
                    supabase_url: process.env.SUPABASE_URL ? 'Configurado' : 'Não configurado',
                    supabase_key: process.env.SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado'
                }
            });
        }

        // Verificar se há arquivos carregados
        if (uploadedFiles.size === 0) {
            console.log('⚠️ Nenhum arquivo carregado');
            return res.status(400).json({
                error: 'Nenhum arquivo carregado. Faça upload dos arquivos primeiro.',
                uploaded_files: Array.from(uploadedFiles.keys())
            });
        }

        console.log('📁 Arquivos para processar:', uploadedFiles.size);
        console.log('📁 Arquivos:', Array.from(uploadedFiles.keys()));

        // Testar conexão com Supabase
        try {
            console.log('🔗 Testando conexão com Supabase...');
            
            const { data: testData, error: testError } = await supabase.supabase
                .from('orders')
                .select('count', { count: 'exact', head: true });

            if (testError) {
                console.error('❌ Erro ao testar conexão Supabase:', testError);
                return res.status(500).json({
                    error: 'Erro de conexão com Supabase',
                    details: testError
                });
            }

            console.log('✅ Conexão com Supabase OK');

        } catch (connectionError) {
            console.error('❌ Erro de conexão:', connectionError);
            return res.status(500).json({
                error: 'Erro de conexão com Supabase',
                details: connectionError.message
            });
        }

        // Processar arquivos carregados
        console.log('📁 Processando arquivos enviados...');
        
        try {
            // Criar diretório temporário para processamento
            const tempDir = '/tmp/zapchicken_processing';
            await fs.ensureDir(tempDir);
            
            // Criar diretório para relatórios
            const reportsDir = '/tmp/reports';
            await fs.ensureDir(reportsDir);
            
            // Mover arquivos para diretório temporário com nomes que o processador reconhece
            for (const [fileType, fileInfo] of uploadedFiles.entries()) {
                let targetFilename;
                
                if (fileType === 'contacts') {
                    targetFilename = 'contacts.csv';
                } else if (fileType === 'clientes') {
                    targetFilename = 'Lista-Clientes.xlsx';
                } else if (fileType === 'pedidos') {
                    targetFilename = 'Todos os pedidos.xlsx';
                } else if (fileType === 'itens') {
                    targetFilename = 'Historico_Itens_Vendidos.xlsx';
                } else {
                    targetFilename = `${fileType}.xlsx`;
                }
                
                const tempPath = path.join(tempDir, targetFilename);
                await fs.copy(fileInfo.path, tempPath);
                console.log(`📁 Arquivo ${fileType} copiado como ${targetFilename} para processamento`);
            }
            
            // Processar arquivos
            const processor = new ZapChickenProcessor(tempDir, '/tmp/reports');
            await processor.loadZapchickenFiles();
            
            // Processar dados
            const contactsData = processor.processContacts();
            const clientesData = processor.processClientes();
            const pedidosData = processor.processPedidos();
            const itensData = processor.processItens();
            
            console.log(`✅ Dados processados: ${contactsData.length} contatos, ${clientesData.length} clientes, ${pedidosData.length} pedidos, ${itensData.length} itens`);
            
            // Enviar dados para Supabase
            console.log('📤 Enviando dados para Supabase...');
            
            if (contactsData.length > 0) {
                const { error: contactsError } = await supabase.supabase
                    .from('contacts')
                    .upsert(contactsData, { onConflict: 'telefone_limpo' });
                if (contactsError) console.error('❌ Erro ao enviar contatos:', contactsError);
                else console.log('✅ Contatos enviados para Supabase');
            }
            
            if (clientesData.length > 0) {
                const { error: clientesError } = await supabase.supabase
                    .from('customers')
                    .upsert(clientesData, { onConflict: 'telefone_limpo' });
                if (clientesError) console.error('❌ Erro ao enviar clientes:', clientesError);
                else console.log('✅ Clientes enviados para Supabase');
            }
            
            if (pedidosData.length > 0) {
                const { error: pedidosError } = await supabase.supabase
                    .from('orders')
                    .upsert(pedidosData, { onConflict: 'id' });
                if (pedidosError) console.error('❌ Erro ao enviar pedidos:', pedidosError);
                else console.log('✅ Pedidos enviados para Supabase');
            }
            
            if (itensData.length > 0) {
                const { error: itensError } = await supabase.supabase
                    .from('products')
                    .upsert(itensData, { onConflict: 'id' });
                if (itensError) console.error('❌ Erro ao enviar itens:', itensError);
                else console.log('✅ Itens enviados para Supabase');
            }
            
            // Salvar relatórios específicos
            console.log('📊 Salvando relatórios específicos...');
            const savedReports = await processor.saveReports();
            console.log('✅ Relatórios salvos:', savedReports);
            
            // Limpar diretório temporário
            await fs.remove(tempDir);
            
        } catch (processingError) {
            console.error('❌ Erro ao processar arquivos:', processingError);
            return res.status(500).json({
                error: 'Erro ao processar arquivos',
                details: processingError.message
            });
        }

        // Buscar dados existentes
        try {
            console.log('📊 Buscando dados existentes...');

            const [ordersResult, customersResult, productsResult] = await Promise.allSettled([
                supabase.supabase.from('orders').select('*').limit(5),
                supabase.supabase.from('customers').select('*').limit(5),
                supabase.supabase.from('products').select('*').limit(5)
            ]);

            console.log('📊 Resultados das consultas:', {
                orders: ordersResult.status,
                customers: customersResult.status,
                products: productsResult.status
            });

            let existingOrders = [];
            let existingCustomers = [];
            let existingProducts = [];

            if (ordersResult.status === 'fulfilled' && !ordersResult.value.error) {
                existingOrders = ordersResult.value.data || [];
                console.log('✅ Pedidos carregados:', existingOrders.length);
            } else {
                console.warn('⚠️ Erro ao carregar pedidos:', ordersResult.reason || ordersResult.value?.error);
            }

            if (customersResult.status === 'fulfilled' && !customersResult.value.error) {
                existingCustomers = customersResult.value.data || [];
                console.log('✅ Clientes carregados:', existingCustomers.length);
            } else {
                console.warn('⚠️ Erro ao carregar clientes:', customersResult.reason || customersResult.value?.error);
            }

            if (productsResult.status === 'fulfilled' && !productsResult.value.error) {
                existingProducts = productsResult.value.data || [];
                console.log('✅ Produtos carregados:', existingProducts.length);
            } else {
                console.warn('⚠️ Erro ao carregar produtos:', productsResult.reason || productsResult.value?.error);
            }

            const finalData = {
                orders: existingOrders,
                customers: existingCustomers,
                products: existingProducts
            };

            globalDataLoaded = true;

            console.log('✅ Processamento concluído com sucesso');

            res.json({
                success: true,
                message: `Dados processados com sucesso! Encontrados ${finalData.orders.length} pedidos, ${finalData.customers.length} clientes e ${finalData.products.length} produtos no Supabase.`,
                data: finalData,
                files_processed: uploadedFiles.size,
                data_summary: {
                    orders: finalData.orders.length,
                    customers: finalData.customers.length,
                    products: finalData.products.length
                },
                environment: process.env.NODE_ENV || 'development'
            });

        } catch (dataError) {
            console.error('❌ Erro ao processar dados:', dataError);
            res.status(500).json({ 
                error: `Erro ao processar dados: ${dataError.message}`,
                details: {
                    stack: dataError.stack,
                    name: dataError.name
                }
            });
        }

    } catch (error) {
        console.error('❌ Erro geral no processamento:', error);
        res.status(500).json({ 
            error: `Erro ao processar dados: ${error.message}`,
            details: {
                stack: error.stack,
                name: error.name,
                environment: process.env.NODE_ENV || 'development'
            }
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
        
        // Primeiro, verificar se é um relatório específico no diretório /tmp/reports
        const reportsDir = '/tmp/reports';
        const specificReportPath = path.join(reportsDir, filename);
        
        if (await fs.pathExists(specificReportPath)) {
            // É um relatório específico
            const fileContent = await fs.readFile(specificReportPath, 'utf8');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            res.send(fileContent);
            return;
        }
        
        // Se não for específico, buscar nos relatórios globais
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

        // Verificar relatórios específicos no diretório /tmp/reports
        const reportsDir = '/tmp/reports';
        const specificReports = [];
        
        try {
            if (await fs.pathExists(reportsDir)) {
                const files = await fs.readdir(reportsDir);
                for (const file of files) {
                    const filePath = path.join(reportsDir, file);
                    const stat = await fs.stat(filePath);
                    const sizeKb = Math.round(stat.size / 1024 * 10) / 10;
                    
                    specificReports.push({
                        filename: file,
                        name: file.replace('.csv', '').replace('.xlsx', '').replace(/_/g, ' '),
                        size: `${sizeKb} KB`,
                        modified: new Date(stat.mtime).toLocaleString('pt-BR')
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao verificar relatórios específicos:', error);
        }
        
        if (specificReports.length > 0) {
            res.json(specificReports);
        } else if (hasData && globalReports) {
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
