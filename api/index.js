// 🚀 Arquivo específico para Vercel
// Versão completa com processamento real

const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');

// Importa as classes necessárias
const { 
    SERVER_CONFIG, 
    FILE_CONFIG, 
    createDirectories 
} = require('../config');
const { logger } = require('../src/utils');
const ZapChickenProcessor = require('../src/zapchickenProcessor');
const ZapChickenAI = require('../src/zapchickenAI');

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

// Configuração do Multer para upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await createDirectories();
            cb(null, FILE_CONFIG.uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Determina o nome do arquivo baseado no tipo
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

const upload = multer({
    storage: storage,
    limits: {
        fileSize: FILE_CONFIG.maxFileSize
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (FILE_CONFIG.allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido'), false);
        }
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Upload de arquivo
app.post('/upload', upload.single('file'), (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    }
    next();
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo selecionado' });
        }

        const fileType = req.body.file_type;
        const filename = req.file.filename;

        logger.info(`Arquivo ${filename} carregado com sucesso (tipo: ${fileType})`);

        res.json({
            success: true,
            message: `Arquivo ${filename} carregado com sucesso!`,
            filename: filename,
            fileType: fileType
        });

    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: `Erro ao fazer upload: ${error.message}` });
    }
});

// Processamento de dados
app.post('/process', async (req, res) => {
    try {
        const diasInatividade = parseInt(req.body.dias_inatividade) || 30;
        const ticketMinimo = parseFloat(req.body.ticket_minimo) || 50.0;

        // Inicializa processador
        if (!globalProcessor) {
            globalProcessor = new ZapChickenProcessor(FILE_CONFIG.uploadPath, FILE_CONFIG.outputPath);
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
        environment: isProduction ? 'production' : 'development'
    });
});

// Verifica arquivos disponíveis
app.get('/check_files', async (req, res) => {
    try {
        const files = {
            'novos_clientes_google_contacts.csv': 'Novos Clientes',
            'clientes_inativos.xlsx': 'Clientes Inativos',
            'clientes_alto_ticket.xlsx': 'Alto Ticket',
            'analise_geografica.xlsx': 'Análise Geográfica',
            'produtos_mais_vendidos.xlsx': 'Produtos Mais Vendidos'
        };

        const available = [];

        for (const [filename, name] of Object.entries(files)) {
            const filePath = path.join(FILE_CONFIG.outputPath, filename);
            
            if (await fs.pathExists(filePath)) {
                const stat = await fs.stat(filePath);
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

        // Inicializa IA Gemini (cria um processador temporário se não existir)
        if (!globalProcessor) {
            globalProcessor = new ZapChickenProcessor(FILE_CONFIG.uploadPath, FILE_CONFIG.outputPath);
        }
        
        globalAI = new ZapChickenAI(globalProcessor, api_key.trim());

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
        const { message } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Mensagem vazia' });
        }

        if (!globalDataLoaded) {
            return res.status(400).json({ 
                error: 'Dados não carregados. Processe os dados primeiro.' 
            });
        }

        // Inicializa IA se não existir
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
