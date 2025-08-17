#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const { createDirectories, validateConfig } = require('../config');
const { logger } = require('./utils');
const ExcelProcessor = require('./excelProcessor');
const LeadGenerator = require('./leadGenerator');
const ZapChickenProcessor = require('./zapchickenProcessor');
const ZapChickenAI = require('./zapchickenAI');

const program = new Command();

// Banner do projeto
function showBanner() {
    console.log(chalk.cyan(`
╔══════════════════════════════════════════════════════════════╗
║                    🚀 ZAPINTELIGENCIA 🚀                     ║
║                                                              ║
║    Business Intelligence para ZapChicken - Versão Node.js   ║
║    Automação para Processamento de Planilhas Excel          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `));
}

// Comando principal
program
    .name('zapinteligencia')
    .description('Business Intelligence para ZapChicken - Versão Node.js')
    .version('2.0.0');

// Comando setup
program
    .command('setup')
    .description('Configura o ambiente inicial')
    .option('-g, --gemini-key <key>', 'Chave da API do Gemini')
    .action(async (options) => {
        showBanner();
        
        console.log(chalk.cyan('🔧 CONFIGURANDO AMBIENTE...'));
        
        try {
            // Cria diretórios necessários
            await createDirectories();
            console.log(chalk.green('✓ Diretórios criados com sucesso'));
            
            // Valida configurações
            validateConfig();
            console.log(chalk.green('✓ Configurações validadas'));
            
            // Configura API do Gemini se fornecida
            if (options.geminiKey) {
                console.log(chalk.green('✓ API do Gemini configurada'));
            }
            
            console.log(chalk.green('\n✅ AMBIENTE CONFIGURADO!'));
            console.log(chalk.yellow('📁 Coloque suas planilhas Excel em: ./data/input'));
            console.log(chalk.yellow('📁 Os resultados serão salvos em: ./data/output'));
            console.log(chalk.cyan('\n🎯 PARA ZAPCHICKEN:'));
            console.log(chalk.yellow('1. Coloque os 4 arquivos da ZapChicken em: ./data/input'));
            console.log(chalk.yellow('2. Execute: npm run process'));
            console.log(chalk.yellow('3. Para chat com IA: npm run chat'));
            console.log(chalk.yellow('4. Para interface web: npm run web'));
            
        } catch (error) {
            console.log(chalk.red(`❌ Erro na configuração: ${error.message}`));
            process.exit(1);
        }
    });

// Comando process (genérico)
program
    .command('process')
    .description('Processa planilhas Excel e gera lista de leads (modo genérico)')
    .option('-i, --input-dir <dir>', 'Diretório com as planilhas de entrada', './data/input')
    .option('-o, --output-dir <dir>', 'Diretório para salvar os resultados', './data/output')
    .option('-a, --analyze', 'Analisa as planilhas sem processar')
    .option('-m, --merge-strategy <strategy>', 'Estratégia para combinar planilhas', 'union')
    .action(async (options) => {
        showBanner();
        
        const inputPath = path.resolve(options.inputDir);
        const outputPath = path.resolve(options.outputDir);
        
        // Verifica se o diretório de entrada existe
        if (!await fs.pathExists(inputPath)) {
            console.log(chalk.red(`❌ Diretório de entrada não encontrado: ${inputPath}`));
            return;
        }
        
        // Verifica se há arquivos Excel
        const files = await fs.readdir(inputPath);
        const excelFiles = files.filter(file => 
            file.endsWith('.xlsx') || file.endsWith('.xls')
        );
        
        if (excelFiles.length === 0) {
            console.log(chalk.yellow(`⚠️  Nenhum arquivo Excel encontrado em: ${inputPath}`));
            console.log(chalk.yellow('Coloque suas planilhas na pasta "data/input" e tente novamente.'));
            return;
        }
        
        console.log(chalk.green(`📁 Diretório de entrada: ${inputPath}`));
        console.log(chalk.green(`📁 Diretório de saída: ${outputPath}`));
        console.log(chalk.green(`📊 Arquivos Excel encontrados: ${excelFiles.length}`));
        
        try {
            // Inicializa processadores
            const processor = new ExcelProcessor(inputPath);
            const generator = new LeadGenerator(outputPath);
            
            // Carrega todas as planilhas
            console.log(chalk.cyan('\n📥 CARREGANDO PLANILHAS...'));
            const dataframes = await processor.loadAllExcelFiles();
            
            if (Object.keys(dataframes).length === 0) {
                console.log(chalk.red('❌ Nenhuma planilha foi carregada com sucesso!'));
                return;
            }
            
            // Exibe informações dos arquivos carregados
            processor.displayLoadedFiles();
            
            if (options.analyze) {
                console.log(chalk.cyan('\n🔍 ANÁLISE DETALHADA...'));
                processor.analyzeDataframes();
                return;
            }
            
            // Encontra colunas de telefone
            console.log(chalk.cyan('\n📱 PROCURANDO COLUNAS DE TELEFONE...'));
            const phoneColumns = processor.findPhoneColumns();
            
            if (Object.keys(phoneColumns).length === 0) {
                console.log(chalk.yellow('⚠️  Nenhuma coluna de telefone identificada automaticamente!'));
                console.log(chalk.yellow('O processamento continuará, mas pode não gerar resultados válidos.'));
            }
            
            // Limpa dados de telefone
            console.log(chalk.cyan('\n🧹 LIMPANDO DADOS...'));
            const cleanedData = processor.cleanPhoneData(phoneColumns);
            
            // Combina planilhas
            console.log(chalk.cyan(`\n🔗 COMBINANDO PLANILHAS (${options.mergeStrategy})...`));
            const mergedData = processor.mergeDataframes(cleanedData, options.mergeStrategy);
            
            if (mergedData.length === 0) {
                console.log(chalk.red('❌ Nenhum dado válido encontrado após o processamento!'));
                return;
            }
            
            // Padroniza colunas
            console.log(chalk.cyan('\n📋 PADRONIZANDO COLUNAS...'));
            const standardizedData = generator.standardizeColumns(mergedData);
            
            // Cria formato para WhatsApp
            console.log(chalk.cyan('\n📱 CRIANDO FORMATO WHATSAPP...'));
            const whatsappData = generator.createWhatsAppFormat(standardizedData);
            
            if (whatsappData.length === 0) {
                console.log(chalk.red('❌ Nenhum lead válido com telefone encontrado!'));
                return;
            }
            
            // Gera segmentos
            console.log(chalk.cyan('\n📊 GERANDO SEGMENTOS...'));
            const segments = generator.generateSegments(whatsappData, 'cidade');
            
            // Cria relatório
            const report = generator.createSummaryReport(whatsappData, segments);
            
            // Salva resultados
            console.log(chalk.cyan('\n💾 SALVANDO RESULTADOS...'));
            const savedFiles = await generator.saveLeads(whatsappData, "leads_whatsapp", "xlsx", true);
            
            // Exibe resumo
            generator.displayLeadsSummary(whatsappData, report);
            
            console.log(chalk.green(`\n✅ PROCESSAMENTO CONCLUÍDO!`));
            console.log(chalk.green(`📁 Arquivos salvos em: ${outputPath}`));
            console.log(chalk.green(`📊 Total de leads processados: ${whatsappData.length}`));
            
            // Lista arquivos salvos
            console.log(chalk.bold('\n📄 Arquivos gerados:'));
            for (const filePath of savedFiles) {
                console.log(`  📄 ${path.basename(filePath)}`);
            }
            
        } catch (error) {
            console.log(chalk.red(`❌ Erro durante o processamento: ${error.message}`));
            logger.error('Erro no processamento:', error);
        }
    });

// Comando zapchicken
program
    .command('zapchicken')
    .description('Processa dados específicos da ZapChicken com Business Intelligence')
    .option('-i, --input-dir <dir>', 'Diretório com as planilhas de entrada', './data/input')
    .option('-o, --output-dir <dir>', 'Diretório para salvar os resultados', './data/output')
    .option('-d, --dias-inatividade <dias>', 'Dias para considerar cliente inativo', '30')
    .option('-t, --ticket-minimo <valor>', 'Ticket médio mínimo para análise', '50')
    .action(async (options) => {
        showBanner();
        
        const inputPath = path.resolve(options.inputDir);
        const outputPath = path.resolve(options.outputDir);
        const diasInatividade = parseInt(options.diasInatividade);
        const ticketMinimo = parseFloat(options.ticketMinimo);
        
        // Verifica se o diretório de entrada existe
        if (!await fs.pathExists(inputPath)) {
            console.log(chalk.red(`❌ Diretório de entrada não encontrado: ${inputPath}`));
            return;
        }
        
        console.log(chalk.green(`📁 Diretório de entrada: ${inputPath}`));
        console.log(chalk.green(`📁 Diretório de saída: ${outputPath}`));
        console.log(chalk.green(`⚙️  Dias de inatividade: ${diasInatividade}`));
        console.log(chalk.green(`💰 Ticket médio mínimo: R$ ${ticketMinimo.toFixed(2)}`));
        
        try {
            // Inicializa processador da ZapChicken
            const processor = new ZapChickenProcessor(inputPath, outputPath);
            
            // Configura parâmetros
            processor.config.diasInatividade = diasInatividade;
            processor.config.ticketMedioMinimo = ticketMinimo;
            
            // Carrega arquivos da ZapChicken
            console.log(chalk.cyan('\n📥 CARREGANDO ARQUIVOS ZAPCHICKEN...'));
            const dataframes = await processor.loadZapchickenFiles();
            
            if (Object.keys(dataframes).length === 0) {
                console.log(chalk.red('❌ Nenhum arquivo da ZapChicken foi carregado!'));
                console.log(chalk.yellow('Certifique-se de que os arquivos estão na pasta de entrada:'));
                console.log(chalk.yellow('• contacts.csv (Google Contacts)'));
                console.log(chalk.yellow('• Lista-Clientes*.xls*'));
                console.log(chalk.yellow('• Todos os pedidos*.xls*'));
                console.log(chalk.yellow('• Historico_Itens_Vendidos*.xls*'));
                return;
            }
            
            // Exibe arquivos carregados
            console.log(chalk.green(`\n✅ ${Object.keys(dataframes).length} arquivos carregados com sucesso!`));
            
            // Processa dados
            console.log(chalk.cyan('\n🔍 PROCESSANDO DADOS...'));
            
            // 1. Novos clientes
            console.log(chalk.bold('\n1️⃣  Analisando novos clientes...'));
            const novosClientes = processor.findNewClients();
            if (novosClientes.length > 0) {
                console.log(chalk.green(`✓ ${novosClientes.length} novos clientes encontrados`));
            } else {
                console.log(chalk.yellow('ℹ️  Nenhum novo cliente encontrado'));
            }
            
            // 2. Clientes inativos
            console.log(chalk.bold('\n2️⃣  Analisando clientes inativos...'));
            const inativos = processor.analyzeInactiveClients();
            if (inativos.length > 0) {
                console.log(chalk.red(`⚠️  ${inativos.length} clientes inativos há mais de ${diasInatividade} dias`));
            } else {
                console.log(chalk.green('✓ Nenhum cliente inativo encontrado'));
            }
            
            // 3. Clientes alto ticket
            console.log(chalk.bold('\n3️⃣  Analisando ticket médio...'));
            const altoTicket = processor.analyzeTicketMedio();
            if (altoTicket.length > 0) {
                console.log(chalk.blue(`💎 ${altoTicket.length} clientes com ticket médio > R$ ${ticketMinimo.toFixed(2)}`));
            } else {
                console.log(chalk.yellow('ℹ️  Nenhum cliente com alto ticket encontrado'));
            }
            
            // 4. Análise geográfica
            console.log(chalk.bold('\n4️⃣  Analisando dados geográficos...'));
            const geoData = processor.analyzeGeographicData();
            if (geoData) {
                console.log(chalk.green(`✓ ${geoData.bairros_analise.length} bairros analisados`));
            } else {
                console.log(chalk.yellow('ℹ️  Dados geográficos insuficientes'));
            }
            
            // 5. Preferências
            console.log(chalk.bold('\n5️⃣  Analisando preferências...'));
            const preferences = processor.analyzePreferences();
            if (preferences) {
                console.log(chalk.green(`✓ ${preferences.produtos_mais_vendidos.length} produtos analisados`));
            } else {
                console.log(chalk.yellow('ℹ️  Dados de preferências insuficientes'));
            }
            
            // 6. Sugestões de IA
            console.log(chalk.bold('\n6️⃣  Gerando sugestões de IA...'));
            const suggestions = processor.generateAISuggestions();
            
            // Exibe sugestões
            console.log(chalk.cyan('\n🤖 SUGESTÕES DE IA:'));
            for (const [category, items] of Object.entries(suggestions)) {
                if (items.length > 0) {
                    console.log(chalk.bold(`\n${category.toUpperCase()}:`));
                    for (const item of items) {
                        console.log(`  • ${item}`);
                    }
                }
            }
            
            // 7. Salva relatórios
            console.log(chalk.cyan('\n💾 SALVANDO RELATÓRIOS...'));
            const savedFiles = await processor.saveReports();
            
            console.log(chalk.green(`\n✅ PROCESSAMENTO ZAPCHICKEN CONCLUÍDO!`));
            console.log(chalk.green(`📁 ${savedFiles.length} relatórios salvos em: ${outputPath}`));
            
            // Lista arquivos salvos
            console.log(chalk.bold('\n📄 Relatórios gerados:'));
            for (const filePath of savedFiles) {
                console.log(`  📄 ${path.basename(filePath)}`);
            }
            
            // Sugere próximo passo
            console.log(chalk.cyan(`\n🎯 PRÓXIMO PASSO:`));
            console.log(chalk.yellow('Execute: npm run chat'));
            console.log(chalk.yellow('Para usar o assistente de IA e fazer perguntas sobre seus dados!'));
            
        } catch (error) {
            console.log(chalk.red(`❌ Erro durante o processamento: ${error.message}`));
            logger.error('Erro no processamento ZapChicken:', error);
        }
    });

// Comando chat
program
    .command('chat')
    .description('Inicia o chat com IA para análise dos dados da ZapChicken')
    .option('-i, --input-dir <dir>', 'Diretório com as planilhas de entrada', './data/input')
    .option('-o, --output-dir <dir>', 'Diretório para salvar os resultados', './data/output')
    .action(async (options) => {
        showBanner();
        
        const inputPath = path.resolve(options.inputDir);
        const outputPath = path.resolve(options.outputDir);
        
        console.log(chalk.cyan('🤖 INICIANDO ZAPCHICKEN AI...'));
        
        try {
            // Inicializa processador
            const processor = new ZapChickenProcessor(inputPath, outputPath);
            
            // Carrega dados
            console.log(chalk.bold('\n📥 Carregando dados...'));
            const dataframes = await processor.loadZapchickenFiles();
            
            if (Object.keys(dataframes).length === 0) {
                console.log(chalk.red('❌ Nenhum arquivo da ZapChicken encontrado!'));
                console.log(chalk.yellow('Execute primeiro: npm run zapchicken'));
                return;
            }
            
            // Inicializa IA
            const ai = new ZapChickenAI(processor);
            
            // Inicia chat
            await startChat(ai);
            
        } catch (error) {
            console.log(chalk.red(`❌ Erro ao iniciar chat: ${error.message}`));
            logger.error('Erro no chat:', error);
        }
    });

// Comando analyze
program
    .command('analyze')
    .description('Analisa as planilhas sem processar')
    .option('-i, --input-dir <dir>', 'Diretório com as planilhas de entrada', './data/input')
    .action(async (options) => {
        showBanner();
        
        const inputPath = path.resolve(options.inputDir);
        
        if (!await fs.pathExists(inputPath)) {
            console.log(chalk.red(`❌ Diretório de entrada não encontrado: ${inputPath}`));
            return;
        }
        
        try {
            const processor = new ExcelProcessor(inputPath);
            
            console.log(chalk.cyan('\n📥 CARREGANDO PLANILHAS...'));
            const dataframes = await processor.loadAllExcelFiles();
            
            if (Object.keys(dataframes).length === 0) {
                console.log(chalk.red('❌ Nenhuma planilha foi carregada!'));
                return;
            }
            
            processor.displayLoadedFiles();
            processor.analyzeDataframes();
            
        } catch (error) {
            console.log(chalk.red(`❌ Erro durante a análise: ${error.message}`));
            logger.error('Erro na análise:', error);
        }
    });

// Função para iniciar chat interativo
async function startChat(ai) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    // Banner do chat
    console.log(chalk.cyan(`
╭──────────────────────────────────────────────────────────────────╮
│ 🤖 ZAPCHICKEN AI - ASSISTENTE INTELIGENTE                      │
│ Digite suas perguntas sobre vendas, clientes, campanhas...     │
│ Digite 'sair' para sair ou 'ajuda' para ver comandos disponíveis │
╰──────────────────────────────────────────────────────────────────╯
    `));
    
    // Status da API
    const apiStatus = await ai.getApiStatus();
    if (apiStatus.includes('✅')) {
        console.log(chalk.green(apiStatus));
    } else {
        console.log(chalk.yellow(apiStatus));
        console.log(chalk.yellow('💡 Usando modo básico - configure a API para análises avançadas'));
    }
    
    console.log();
    
    const askQuestion = () => {
        rl.question('Você: ', async (question) => {
            const trimmedQuestion = question.trim();
            
            if (!trimmedQuestion) {
                askQuestion();
                return;
            }
            
            if (trimmedQuestion.toLowerCase() === 'sair') {
                console.log(chalk.green('👋 Até logo!'));
                rl.close();
                return;
            }
            
            if (trimmedQuestion.toLowerCase() === 'ajuda') {
                console.log(ai.showHelp());
                askQuestion();
                return;
            }
            
            // Processa a pergunta
            console.log(chalk.cyan('\nAI:'));
            try {
                const response = await ai.processQuestion(trimmedQuestion);
                console.log(response);
            } catch (error) {
                console.log(chalk.red(`❌ Erro: ${error.message}`));
            }
            
            console.log();
            askQuestion();
        });
    };
    
    askQuestion();
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
    console.log(chalk.red('❌ Erro não tratado:'), reason);
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.log(chalk.red('❌ Exceção não capturada:'), error.message);
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

// Executa o programa
program.parse();
