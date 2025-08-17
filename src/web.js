const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
const chalk = require('chalk');

const { 
    SERVER_CONFIG, 
    FILE_CONFIG, 
    SECURITY_CONFIG,
    createDirectories 
} = require('../config');
const { logger } = require('./utils');
const ZapChickenProcessor = require('./zapchickenProcessor');
const ZapChickenAI = require('./zapchickenAI');

const app = express();

// Configurações de segurança
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    }
}));
app.use(cors());
app.use(compression());

// Rate limiting - Configuração mais permissiva para desenvolvimento
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // 1000 requisições por 15 minutos (muito mais permissivo)
    message: {
        error: 'Muitas requisições. Tente novamente mais tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Configurações do Express
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Configuração do Multer para upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await createDirectories();
        cb(null, FILE_CONFIG.uploadPath);
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
        console.log('🔍 Verificando arquivo:', file.originalname);
        const ext = path.extname(file.originalname).toLowerCase();
        console.log('📄 Extensão:', ext, 'Permitidas:', FILE_CONFIG.allowedExtensions);
        if (FILE_CONFIG.allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            console.log('❌ Extensão não permitida:', ext);
            cb(new Error('Tipo de arquivo não permitido'), false);
        }
    }
});

// Cache global para manter dados em memória
let globalProcessor = null;
let globalDataLoaded = false;
let globalAI = null;

// Middleware para verificar se os dados estão carregados
const checkDataLoaded = (req, res, next) => {
    if (!globalDataLoaded) {
        return res.status(400).json({
            error: 'Dados não carregados. Processe os dados primeiro.'
        });
    }
    next();
};

// Rotas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Upload de arquivo
app.post('/upload', upload.single('file'), (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.log('❌ Erro do Multer:', err);
        return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    } else if (err) {
        console.log('❌ Erro geral:', err);
        return res.status(400).json({ error: `Erro no upload: ${err.message}` });
    }
    next();
}, async (req, res) => {
    try {
        console.log('📁 Upload recebido:', {
            file: req.file ? req.file.originalname : 'Nenhum arquivo',
            body: req.body,
            headers: req.headers['content-type']
        });

        if (!req.file) {
            console.log('❌ Nenhum arquivo recebido');
            return res.status(400).json({ error: 'Nenhum arquivo selecionado' });
        }

        const fileType = req.body.file_type;
        const filename = req.file.filename;

        console.log('✅ Arquivo processado:', { filename, fileType, size: req.file.size });

        logger.info(`Arquivo ${filename} carregado com sucesso (tipo: ${fileType})`);

        res.json({
            success: true,
            message: `Arquivo ${filename} carregado com sucesso!`,
            filename: filename,
            fileType: fileType
        });

    } catch (error) {
        console.log('❌ Erro no upload:', error);
        logger.error('Erro no upload:', error);
        res.status(500).json({ error: `Erro ao fazer upload: ${error.message}` });
    }
});

// Processamento de dados
app.post('/process', [
    body('dias_inatividade').isInt({ min: 1, max: 365 }).optional(),
    body('ticket_minimo').isFloat({ min: 0 }).optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

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
        logger.error('Erro ao processar dados:', error);
        res.status(500).json({ error: `Erro ao processar dados: ${error.message}` });
    }
});

// Download de arquivo
app.get('/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(FILE_CONFIG.outputPath, filename);

        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        res.download(filePath);

    } catch (error) {
        logger.error('Erro ao baixar arquivo:', error);
        res.status(500).json({ error: `Erro ao baixar arquivo: ${error.message}` });
    }
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

        res.json(available);

    } catch (error) {
        logger.error('Erro ao verificar arquivos:', error);
        res.status(500).json({ error: `Erro ao verificar arquivos: ${error.message}` });
    }
});

// Visualiza conteúdo do arquivo
app.get('/view_file/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(FILE_CONFIG.outputPath, filename);

        if (!await fs.pathExists(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        let data;
        const ext = path.extname(filename).toLowerCase();

        if (ext === '.csv') {
            const csv = require('csv-parser');
            data = [];
            
            await new Promise((resolve, reject) => {
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (row) => data.push(row))
                    .on('end', resolve)
                    .on('error', reject);
            });
        } else if (ext === '.xlsx' || ext === '.xls') {
            const XLSX = require('xlsx');
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(worksheet);
        } else {
            return res.status(400).json({ error: 'Tipo de arquivo não suportado' });
        }

        // Converte para HTML com formatação
        const htmlTable = convertToHTMLTable(data.slice(0, 50));

        const fileInfo = {
            total_rows: data.length,
            total_columns: data.length > 0 ? Object.keys(data[0]).length : 0,
            columns: data.length > 0 ? Object.keys(data[0]) : [],
            preview_rows: Math.min(50, data.length)
        };

        res.json({
            html: htmlTable,
            info: fileInfo,
            filename: filename
        });

    } catch (error) {
        logger.error('Erro ao visualizar arquivo:', error);
        res.status(500).json({ error: `Erro ao ler arquivo: ${error.message}` });
    }
});

// Chat com IA
app.post('/chat_message', checkDataLoaded, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Mensagem vazia' });
        }

        // Inicializa IA se não existir
        if (!globalAI) {
            globalAI = new ZapChickenAI(globalProcessor);
        }

        // Processa a pergunta
        const response = await globalAI.processQuestion(message.trim());

        res.json({ response: response });

    } catch (error) {
        logger.error('Erro no chat:', error);
        res.status(500).json({ error: `Erro no chat: ${error.message}` });
    }
});

// Status dos dados
app.get('/data_status', (req, res) => {
    res.json({
        data_loaded: globalDataLoaded,
        message: globalDataLoaded ? 
            'Dados carregados e prontos para uso!' : 
            'Dados não carregados. Processe os dados primeiro.'
    });
});

// Limpa cache
app.post('/clear_cache', (req, res) => {
    globalProcessor = null;
    globalDataLoaded = false;
    globalAI = null;
    
    res.json({ message: 'Cache limpo com sucesso!' });
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
            // Cria um processador temporário apenas para testar a API
            const { ZapChickenProcessor } = require('./zapchickenProcessor');
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
        logger.error('Erro ao configurar Gemini:', error);
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
        logger.error('Erro ao verificar status do Gemini:', error);
        res.json({
            status: 'error',
            message: `❌ Erro: ${error.message}`
        });
    }
});

// Função para converter dados para HTML
function convertToHTMLTable(data) {
    if (!data || data.length === 0) {
        return '<p>Nenhum dado disponível</p>';
    }

    const headers = Object.keys(data[0]);
    
    let html = '<table class="table table-striped table-sm" id="data-table">';
    
    // Cabeçalho
    html += '<thead><tr>';
    for (const header of headers) {
        html += `<th>${header}</th>`;
    }
    html += '</tr></thead>';
    
    // Corpo
    html += '<tbody>';
    for (const row of data) {
        html += '<tr>';
        for (const header of headers) {
            const value = row[header] || '';
            html += `<td>${value}</td>`;
        }
        html += '</tr>';
    }
    html += '</tbody>';
    
    html += '</table>';
    
    return html;
}

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    logger.error('Erro não tratado:', error);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: error.message
    });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicia o servidor apenas em desenvolvimento
const PORT = process.env.PORT || SERVER_CONFIG.port;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                    🚀 ZAPINTELIGENCIA 🚀                     ║
║                                                              ║
║    Business Intelligence para ZapChicken - Versão Node.js   ║
║    Servidor Web iniciado com sucesso!                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `));
        
        console.log(chalk.green(`🌐 Servidor rodando em: http://localhost:${PORT}`));
        console.log(chalk.yellow('📱 Acesse a interface web para começar'));
        console.log(chalk.yellow('🔄 Pressione Ctrl+C para parar o servidor'));
        
        logger.info(`Servidor web iniciado na porta ${PORT}`);
    });
}

// Tratamento de encerramento gracioso
process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Encerrando servidor...'));
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n🛑 Encerrando servidor...'));
    process.exit(0);
});

module.exports = app;
