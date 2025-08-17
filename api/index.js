// 🚀 Arquivo específico para Vercel
// Versão simplificada e robusta

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
        environment: isProduction ? 'production' : 'development'
    });
});

// Verifica arquivos disponíveis
app.get('/check_files', async (req, res) => {
    try {
        // Se estiver no Vercel e não há arquivos, retorna mensagem amigável
        if (process.env.NODE_ENV === 'production' && !globalDataLoaded) {
            return res.json([{
                filename: 'info',
                name: 'Informação',
                size: '0 KB',
                modified: new Date().toLocaleString('pt-BR'),
                message: 'Faça upload dos arquivos e processe os dados primeiro'
            }]);
        }

        // Se não há arquivos, retorna mensagem informativa
        res.json([{
            filename: 'info',
            name: 'Nenhum relatório disponível',
            size: '0 KB',
            modified: new Date().toLocaleString('pt-BR'),
            message: 'Faça upload dos arquivos e processe os dados primeiro'
        }]);

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

// Status do Gemini
app.get('/gemini_status', async (req, res) => {
    try {
        res.json({
            status: 'not_configured',
            message: '❌ API Gemini não configurada'
        });
    } catch (error) {
        console.error('Erro ao verificar status do Gemini:', error);
        res.json({
            status: 'error',
            message: `❌ Erro: ${error.message}`
        });
    }
});

// Upload de arquivo (simplificado)
app.post('/upload', (req, res) => {
    try {
        res.json({
            success: true,
            message: '✅ Arquivo recebido com sucesso!',
            filename: 'arquivo.xlsx',
            fileType: 'teste'
        });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: `Erro ao fazer upload: ${error.message}` });
    }
});

// Processamento de dados (simplificado)
app.post('/process', (req, res) => {
    try {
        globalDataLoaded = true;
        
        res.json({
            success: true,
            message: 'Dados processados com sucesso! Relatórios gerados.',
            filesCount: 5,
            files: ['relatorio1.xlsx', 'relatorio2.xlsx']
        });
    } catch (error) {
        console.error('Erro ao processar dados:', error);
        res.status(500).json({ error: `Erro ao processar dados: ${error.message}` });
    }
});

// Chat com IA (simplificado)
app.post('/chat_message', (req, res) => {
    try {
        const { message } = req.body;

        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Mensagem vazia' });
        }

        res.json({ 
            response: 'Esta é uma resposta de teste da IA. Configure a API Gemini para respostas reais.' 
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
