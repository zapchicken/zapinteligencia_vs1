// 🚀 Arquivo específico para Vercel
// Versão robusta com tratamento de erros

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Configurações básicas
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Cache global para manter dados em memória
let globalProcessor = null;
let globalDataLoaded = false;
let globalAI = null;

// Função para carregar dependências com tratamento de erro
function loadDependencies() {
    try {
        const multer = require('multer');
        const fs = require('fs-extra');
        const { 
            SERVER_CONFIG, 
            FILE_CONFIG, 
            createDirectories 
        } = require('../config');
        const { logger } = require('../src/utils');
        const ZapChickenProcessor = require('../src/zapchickenProcessor');
        const ZapChickenAI = require('../src/zapchickenAI');
        
        return {
            multer,
            fs,
            SERVER_CONFIG,
            FILE_CONFIG,
            createDirectories,
            logger,
            ZapChickenProcessor,
            ZapChickenAI,
            loaded: true
        };
    } catch (error) {
        console.error('Erro ao carregar dependências:', error.message);
        return { loaded: false, error: error.message };
    }
}

// Carrega dependências
const deps = loadDependencies();

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Status dos dados
app.get('/data_status', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.json({
        data_loaded: globalDataLoaded,
        message: globalDataLoaded ? 
            'Dados carregados e prontos para uso!' : 
            isProduction ? 
                'Faça upload dos arquivos e processe os dados primeiro.' :
                'Dados não carregados. Processe os dados primeiro.',
        environment: isProduction ? 'production' : 'development',
        dependencies_loaded: deps.loaded
    });
});

// Verifica arquivos disponíveis
app.get('/check_files', async (req, res) => {
    try {
        if (!deps.loaded) {
            return res.json([{
                filename: 'error',
                name: 'Erro de Dependências',
                size: '0 KB',
                modified: new Date().toLocaleString('pt-BR'),
                message: 'Dependências não carregadas. Verifique a configuração.'
            }]);
        }

        const files = {
            'novos_clientes_google_contacts.csv': 'Novos Clientes',
            'clientes_inativos.xlsx': 'Clientes Inativos',
            'clientes_alto_ticket.xlsx': 'Alto Ticket',
            'analise_geografica.xlsx': 'Análise Geográfica',
            'produtos_mais_vendidos.xlsx': 'Produtos Mais Vendidos'
        };

        const available = [];

        for (const [filename, name] of Object.entries(files)) {
            const filePath = path.join(deps.FILE_CONFIG.outputPath, filename);
            
            if (await deps.fs.pathExists(filePath)) {
                const stat = await deps.fs.stat(filePath);
                const sizeKb = Math.round(stat.size / 1024 * 10) / 10;
                
                available.push({
                    filename: filename,
                    name: name,
                    size: `${sizeKb} KB`,
                    modified: new Date(stat.mtime).toLocaleString('pt-BR')
                });
            }
        }

        // Se não há arquivos, retorna mensagem informativa
        if (available.length === 0) {
            available.push({
                filename: 'info',
                name: 'Nenhum relatório disponível',
                size: '0 KB',
                modified: new Date().toLocaleString('pt-BR'),
                message: 'Faça upload dos arquivos e processe os dados primeiro'
            });
        }

        res.json(available);

    } catch (error) {
        console.error('Erro ao verificar arquivos:', error);
        res.status(500).json({ error: `Erro ao verificar arquivos: ${error.message}` });
    }
});

// Upload de arquivo
app.post('/upload', (req, res) => {
    try {
        if (!deps.loaded) {
            return res.status(500).json({ 
                error: 'Dependências não carregadas. Verifique a configuração.' 
            });
        }

        // Configuração do Multer para upload
        const storage = deps.multer.diskStorage({
            destination: async (req, file, cb) => {
                try {
                    await deps.createDirectories();
                    cb(null, deps.FILE_CONFIG.uploadPath);
                } catch (error) {
                    cb(error);
                }
            },
            filename: (req, file, cb) => {
                let filename = file.originalname;
                
                if (req.body.file_type === 'contacts') {
                    filename = 'contacts.csv';
                } else if (req.body.file_type === 'clientes') {
                    filename = 'Lista-Clientes.xlsx';
                } else if (req.body.file_type === 'pedidos') {
                    filename = 'Todos os pedidos.xlsx';
                } else if (req.body.file_type === 'itens') {
                    filename = 'Historico_Itens_Vendidos.xlsx';
                }
                
                cb(null, filename);
            }
        });

        const upload = deps.multer({
            storage: storage,
            limits: {
                fileSize: deps.FILE_CONFIG.maxFileSize
            },
            fileFilter: (req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                if (deps.FILE_CONFIG.allowedExtensions.includes(ext)) {
                    cb(null, true);
                } else {
                    cb(new Error('Tipo de arquivo não permitido'), false);
                }
            }
        });

        upload.single('file')(req, res, (err) => {
            if (err instanceof deps.multer.MulterError) {
                return res.status(400).json({ error: `Erro no upload: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ error: `Erro no upload: ${err.message}` });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'Nenhum arquivo selecionado' });
            }

            const fileType = req.body.file_type;
            const filename = req.file.filename;

            deps.logger.info(`Arquivo ${filename} carregado com sucesso (tipo: ${fileType})`);

            res.json({
                success: true,
                message: `Arquivo ${filename} carregado com sucesso!`,
                filename: filename,
                fileType: fileType
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
        if (!deps.loaded) {
            return res.status(500).json({ 
                error: 'Dependências não carregadas. Verifique a configuração.' 
            });
        }

        const diasInatividade = parseInt(req.body.dias_inatividade) || 30;
        const ticketMinimo = parseFloat(req.body.ticket_minimo) || 50.0;

        // Inicializa processador
        if (!globalProcessor) {
            globalProcessor = new deps.ZapChickenProcessor(deps.FILE_CONFIG.uploadPath, deps.FILE_CONFIG.outputPath);
        }

        globalProcessor.config.diasInatividade = diasInatividade;
        globalProcessor.config.ticketMedioMinimo = ticketMinimo;

        // Carrega e processa os arquivos
        const dataframes = await globalProcessor.loadZapchickenFiles();
        
        if (Object.keys(dataframes).length === 0) {
            return res.status(400).json({
                error: 'Nenhum arquivo da ZapChicken encontrado. Faça upload dos arquivos primeiro.'
            });
        }

        // Salva relatórios
        const savedFiles = await globalProcessor.saveReports();
        
        globalDataLoaded = true;

        res.json({
            success: true,
            message: 'Dados processados com sucesso! Relatórios gerados.',
            filesCount: savedFiles.length,
            files: savedFiles.map(file => path.basename(file))
        });

    } catch (error) {
        console.error('Erro ao processar dados:', error);
        res.status(500).json({ error: `Erro ao processar dados: ${error.message}` });
    }
});

// Configuração Gemini
app.post('/config_gemini', async (req, res) => {
    try {
        if (!deps.loaded) {
            return res.status(500).json({ 
                error: 'Dependências não carregadas. Verifique a configuração.' 
            });
        }

        const { api_key } = req.body;

        if (!api_key || api_key.trim() === '') {
            return res.status(400).json({
                success: false,
                message: '❌ API key não fornecida'
            });
        }

        // Inicializa IA Gemini
        if (!globalProcessor) {
            globalProcessor = new deps.ZapChickenProcessor(deps.FILE_CONFIG.uploadPath, deps.FILE_CONFIG.outputPath);
        }
        
        globalAI = new deps.ZapChickenAI(globalProcessor, api_key.trim());

        // Testa a API
        const status = await globalAI.getApiStatus();

        if (status.includes('✅')) {
            res.json({
                success: true,
                message: '✅ API Gemini configurada e funcionando!'
            });
        } else {
            res.json({
                success: false,
                message: `⚠️ API configurada mas com problema: ${status}`
            });
        }

    } catch (error) {
        console.error('Erro ao configurar Gemini:', error);
        res.status(500).json({
            success: false,
            message: `❌ Erro ao configurar Gemini: ${error.message}`
        });
    }
});

// Status do Gemini
app.get('/gemini_status', async (req, res) => {
    try {
        if (!deps.loaded) {
            return res.json({
                status: 'error',
                message: '❌ Dependências não carregadas'
            });
        }

        if (!globalAI) {
            return res.json({
                status: 'not_configured',
                message: '❌ API Gemini não configurada'
            });
        }

        const status = await globalAI.getApiStatus();
        
        if (status.includes('✅')) {
            res.json({ status: 'working', message: status });
        } else {
            res.json({ status: 'error', message: status });
        }

    } catch (error) {
        console.error('Erro ao verificar status do Gemini:', error);
        res.json({
            status: 'error',
            message: `❌ Erro: ${error.message}`
        });
    }
});

// Chat com IA
app.post('/chat_message', async (req, res) => {
    try {
        if (!deps.loaded) {
            return res.status(500).json({ 
                error: 'Dependências não carregadas. Verifique a configuração.' 
            });
        }

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

        // Processa a pergunta
        const response = await globalAI.processQuestion(message.trim());

        res.json({ response: response });

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
