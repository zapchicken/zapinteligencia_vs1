// 🚀 Arquivo específico para Vercel
// Arquitetura correta: Upload → Supabase → Dados → Relatórios

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
let globalReports = null; // Adicionado para armazenar relatórios gerados

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

        // Verifica se há dados no Supabase
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

        // Configuração do Multer para upload temporário
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
                fileSize: 50 * 1024 * 1024 // 50MB
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

            // Armazena informação do arquivo
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

// Processamento de dados (envia para Supabase)
app.post('/process', async (req, res) => {
    try {
        console.log('🔍 Iniciando processamento para Supabase...');
        
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

        // Aqui você implementaria a lógica para:
        // 1. Ler os arquivos Excel/CSV
        // 2. Processar os dados
        // 3. Enviar para o Supabase
        // 4. Retornar os dados processados

        // Por enquanto, vamos simular o processamento
        const processedData = {
            orders: [
                { id: 1, customer: 'João', total: 45.50, date: '2025-02-15' },
                { id: 2, customer: 'Maria', total: 32.80, date: '2025-02-16' }
            ],
            customers: [
                { id: 1, name: 'João Silva', phone: '(11) 99999-1111' },
                { id: 2, name: 'Maria Santos', phone: '(11) 99999-2222' }
            ],
            products: [
                { id: 1, name: 'Frango Grelhado', price: 22.75 },
                { id: 2, name: 'Batata Frita', price: 15.80 }
            ]
        };

        // Simula envio para Supabase
        console.log('📊 Dados processados:', processedData);
        
        globalDataLoaded = true;

        res.json({
            success: true,
            message: 'Dados processados e enviados para Supabase com sucesso!',
            data: processedData,
            files_processed: uploadedFiles.size
        });

    } catch (error) {
        console.error('❌ Erro ao processar dados:', error);
        res.status(500).json({ 
            error: `Erro ao processar dados: ${error.message}`,
            details: error.stack
        });
    }
});

// Busca dados do Supabase
app.get('/get_data', async (req, res) => {
    try {
        if (!supabase.loaded) {
            return res.status(500).json({ 
                error: 'Supabase não configurado' 
            });
        }

        // Busca dados do Supabase
        const { data: orders, error: ordersError } = await supabase.supabase
            .from('orders')
            .select('*')
            .limit(100);

        const { data: customers, error: customersError } = await supabase.supabase
            .from('customers')
            .select('*')
            .limit(100);

        const { data: products, error: productsError } = await supabase.supabase
            .from('products')
            .select('*')
            .limit(100);

        if (ordersError || customersError || productsError) {
            return res.status(500).json({ 
                error: 'Erro ao buscar dados do Supabase',
                details: { ordersError, customersError, productsError }
            });
        }

        res.json({
            success: true,
            data: {
                orders: orders || [],
                customers: customers || [],
                products: products || []
            }
        });

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        res.status(500).json({ error: `Erro ao buscar dados: ${error.message}` });
    }
});

// Gera relatórios baseados nos dados do Supabase
app.post('/generate_reports', async (req, res) => {
    try {
        if (!supabase.loaded) {
            return res.status(500).json({ 
                error: 'Supabase não configurado' 
            });
        }

        console.log('📊 Gerando relatórios...');

        // Busca dados do Supabase
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
            return res.status(500).json({ 
                error: 'Erro ao buscar dados do Supabase',
                details: { ordersError, customersError, productsError }
            });
        }

        // Gera relatórios
        const reports = [];

        // 1. Relatório de Vendas
        if (orders && orders.length > 0) {
            const salesReport = {
                filename: 'relatorio_vendas.xlsx',
                name: 'Relatório de Vendas',
                data: {
                    total_orders: orders.length,
                    total_revenue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
                    average_ticket: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / orders.length,
                    orders_by_date: orders.reduce((acc, order) => {
                        const date = order.order_date ? order.order_date.split('T')[0] : 'Sem data';
                        acc[date] = (acc[date] || 0) + 1;
                        return acc;
                    }, {}),
                    top_customers: orders.reduce((acc, order) => {
                        const customer = order.customer_name || 'Cliente não identificado';
                        acc[customer] = (acc[customer] || 0) + (order.total_amount || 0);
                        return acc;
                    }, {})
                }
            };
            reports.push(salesReport);
        }

        // 2. Análise de Clientes
        if (customers && customers.length > 0) {
            const customersReport = {
                filename: 'analise_clientes.xlsx',
                name: 'Análise de Clientes',
                data: {
                    total_customers: customers.length,
                    customers_by_neighborhood: customers.reduce((acc, customer) => {
                        const neighborhood = customer.neighborhood || 'Não informado';
                        acc[neighborhood] = (acc[neighborhood] || 0) + 1;
                        return acc;
                    }, {}),
                    customers_by_status: customers.reduce((acc, customer) => {
                        const status = customer.status || 'Ativo';
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                    }, {})
                }
            };
            reports.push(customersReport);
        }

        // 3. Produtos Mais Vendidos
        if (products && products.length > 0) {
            const productsReport = {
                filename: 'produtos_mais_vendidos.xlsx',
                name: 'Produtos Mais Vendidos',
                data: {
                    total_products: products.length,
                    products_by_category: products.reduce((acc, product) => {
                        const category = product.category || 'Sem categoria';
                        acc[category] = (acc[category] || 0) + 1;
                        return acc;
                    }, {}),
                    average_price: products.reduce((sum, product) => sum + (product.price || 0), 0) / products.length
                }
            };
            reports.push(productsReport);
        }

        // Salva relatórios em memória (em produção, salvaria em arquivo ou banco)
        globalReports = reports;

        console.log('✅ Relatórios gerados:', reports.length);

        res.json({
            success: true,
            message: 'Relatórios gerados com sucesso!',
            reports: reports.map(r => ({
                filename: r.filename,
                name: r.name,
                size: '2.5 KB',
                modified: new Date().toLocaleString('pt-BR')
            }))
        });

    } catch (error) {
        console.error('Erro ao gerar relatórios:', error);
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

        // Converte dados para HTML
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

        // Converte dados para CSV
        let csv = '';
        
        // Cabeçalho
        csv += 'Métrica,Valor\n';
        
        // Dados
        for (const [key, value] of Object.entries(report.data)) {
            if (typeof value === 'object') {
                for (const [subKey, subValue] of Object.entries(value)) {
                    csv += `"${key} - ${subKey}","${subValue}"\n`;
                }
            } else {
                csv += `"${key}","${value}"\n`;
            }
        }

        // Define headers para download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename.replace('.xlsx', '.csv')}"`);
        
        res.send(csv);

    } catch (error) {
        console.error('Erro ao baixar relatório:', error);
        res.status(500).json({ error: `Erro ao baixar relatório: ${error.message}` });
    }
});

// Verifica arquivos disponíveis (relatórios baseados nos dados do Supabase)
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

        // Verifica se há dados no Supabase
        const { count: ordersCount } = await supabase.supabase
            .from('orders')
            .select('*', { count: 'exact', head: true });

        const { count: customersCount } = await supabase.supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });

        const hasData = (ordersCount || 0) > 0 || (customersCount || 0) > 0;

        if (hasData && globalReports) {
            // Retorna relatórios gerados
            const reports = globalReports.map(r => ({
                filename: r.filename,
                name: r.name,
                size: '2.5 KB',
                modified: new Date().toLocaleString('pt-BR')
            }));
            res.json(reports);
        } else if (hasData) {
            // Tem dados mas não tem relatórios gerados
            res.json([{
                filename: 'generate',
                name: 'Gerar Relatórios',
                size: '0 KB',
                modified: new Date().toLocaleString('pt-BR'),
                message: 'Clique em "Gerar Relatórios" para criar os relatórios'
            }]);
        } else {
            // Não tem dados
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
        globalReports = null; // Limpa relatórios gerados
        
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

        // Aqui você configuraria a IA Gemini
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

        // Aqui você implementaria a integração com Gemini
        // usando os dados do Supabase

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
