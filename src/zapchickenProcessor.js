const fs = require('fs-extra');
const path = require('path');
const XLSX = require('xlsx');
const moment = require('moment');
const { 
    logger, 
    cleanPhoneNumber, 
    extractFirstName, 
    normalizeNeighborhood,
    formatWhatsAppPhone,
    saveDataFrame,
    showProgress,
    groupBy,
    sortBy,
    filterData,
    calculateStats,
    formatCurrency,
    formatDate,
    daysDifference
} = require('./utils');
const { PROCESSING_CONFIG, NEIGHBORHOOD_MAPPING } = require('../config');

class ZapChickenProcessor {
    constructor(inputDir, outputDir) {
        this.inputDir = inputDir;
        this.outputDir = outputDir;
        this.dataframes = {};
        this.processedData = {};
        
        // Configurações padrão (configuráveis)
        this.config = {
            diasInatividade: PROCESSING_CONFIG.defaultInactiveDays,
            ticketMedioMinimo: PROCESSING_CONFIG.defaultMinTicket,
            periodoAnaliseMeses: PROCESSING_CONFIG.analysisPeriodMonths,
            raioEntregaKm: PROCESSING_CONFIG.deliveryRadiusKm,
            frequenciaAltaDias: PROCESSING_CONFIG.highFrequencyDays,
            frequenciaModeradaDias: PROCESSING_CONFIG.moderateFrequencyDays,
            frequenciaBaixaDias: PROCESSING_CONFIG.lowFrequencyDays
        };
    }

    async loadZapchickenFiles() {
        logger.info('📥 CARREGANDO ARQUIVOS ZAPCHICKEN...');
        
        // Procura pelos arquivos específicos
        const filesFound = {};
        
        // 1. Contacts (Google Contacts)
        const contactsFiles = await this.findFilesByPattern(['*contacts*.csv', '*contacts*.xls*']);
        if (contactsFiles.length > 0) {
            filesFound.contacts = contactsFiles[0];
        }
        
        // 2. Lista Clientes
        const clientesFiles = await this.findFilesByPattern(['*Lista-Clientes*.xls*']);
        if (clientesFiles.length > 0) {
            filesFound.clientes = clientesFiles[0];
        }
        
        // 3. Todos os Pedidos
        const pedidosFiles = await this.findFilesByPattern(['*Todos os pedidos*.xls*']);
        if (pedidosFiles.length > 0) {
            filesFound.pedidos = pedidosFiles[0];
        }
        
        // 4. Histórico Itens
        const itensFiles = await this.findFilesByPattern(['*Historico_Itens_Vendidos*.xls*']);
        if (itensFiles.length > 0) {
            filesFound.itens = itensFiles[0];
        }
        
        // Verifica se os arquivos foram encontrados corretamente
        console.log('Arquivos encontrados:');
        for (const [fileType, filePath] of Object.entries(filesFound)) {
            console.log(`  ${fileType}: ${path.basename(filePath)}`);
        }
        
        // Carrega os arquivos
        const progress = showProgress('Carregando arquivos...', Object.keys(filesFound).length);
        let current = 0;
        
        for (const [fileType, filePath] of Object.entries(filesFound)) {
            try {
                let data;
                
                if (fileType === 'contacts') {
                    data = await this.loadCSVFile(filePath);
                } else {
                    data = await this.loadExcelFile(filePath);
                }
                
                this.dataframes[fileType] = data;
                console.log(`✓ ${fileType}: ${path.basename(filePath)} (${data.length} linhas)`);
                
            } catch (error) {
                console.log(`✗ Erro ao carregar ${fileType}: ${error.message}`);
            }
            
            current++;
            progress.update(current);
        }
        
        progress.succeed('Arquivos carregados');
        return this.dataframes;
    }

    async findFilesByPattern(patterns) {
        const files = [];
        
        try {
            const allFiles = await fs.readdir(this.inputDir);
            
            for (const file of allFiles) {
                const filePath = path.join(this.inputDir, file);
                const stat = await fs.stat(filePath);
                
                if (stat.isFile()) {
                    for (const pattern of patterns) {
                        if (this.matchesPattern(file, pattern)) {
                            files.push(filePath);
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`Erro ao procurar arquivos: ${error.message}`);
        }
        
        return files;
    }

    matchesPattern(filename, pattern) {
        const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        const regex = new RegExp(regexPattern, 'i');
        return regex.test(filename);
    }

    async loadCSVFile(filePath) {
        const csv = require('csv-parser');
        const results = [];
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', () => resolve(results))
                .on('error', reject);
        });
    }

    async loadExcelFile(filePath) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (data.length === 0) return [];
        
        // Converte para array de objetos
        const headers = data[0];
        return data.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });
    }

    processContacts() {
        if (!this.dataframes.contacts) {
            return [];
        }
        
        const data = [...this.dataframes.contacts];
        
        // Encontra coluna de nome
        let nomeCol = null;
        for (const col of ['First Name', 'Nome', 'nome', 'Name', 'name']) {
            if (data.length > 0 && col in data[0]) {
                nomeCol = col;
                break;
            }
        }
        
        if (!nomeCol) {
            console.log(`Colunas disponíveis no arquivo de contatos: ${data.length > 0 ? Object.keys(data[0]) : []}`);
            return [];
        }
        
        // Encontra coluna de telefone
        let telefoneCol = null;
        for (const col of ['Phone 1 - Value', 'Telefone', 'telefone', 'Phone', 'phone', 'Fone', 'fone']) {
            if (data.length > 0 && col in data[0]) {
                telefoneCol = col;
                break;
            }
        }
        
        if (!telefoneCol) {
            console.log('❌ Nenhuma coluna de telefone encontrada no arquivo de contatos');
            return [];
        }
        
        // Renomeia colunas para facilitar o processamento
        const processedData = data.map(row => ({
            nome: row[nomeCol],
            telefone: row[telefoneCol],
            telefone_limpo: cleanPhoneNumber(row[telefoneCol]),
            recebe_propaganda: row[nomeCol] && row[nomeCol].startsWith('LT_')
        }));
        
        // Remove telefones inválidos
        return processedData.filter(row => row.telefone_limpo !== '');
    }

    processClientes() {
        if (!this.dataframes.clientes) {
            return [];
        }
        
        const data = [...this.dataframes.clientes];
        
        // Encontra coluna de telefone
        let telefoneCol = null;
        for (const col of ['Fone Principal', 'Telefone', 'telefone', 'Fone', 'fone', 'Celular', 'celular', 'Phone', 'phone']) {
            if (data.length > 0 && col in data[0]) {
                telefoneCol = col;
                break;
            }
        }
        
        if (!telefoneCol) {
            console.log(`Colunas disponíveis no arquivo de clientes: ${data.length > 0 ? Object.keys(data[0]) : []}`);
            return [];
        }
        
        // Encontra coluna de nome
        const nomeCol = data.length > 0 && 'Nome' in data[0] ? 'Nome' : null;
        const bairroCol = data.length > 0 && 'Bairro' in data[0] ? 'Bairro' : null;
        
        const processedData = data.map(row => ({
            ...row,
            telefone_limpo: cleanPhoneNumber(row[telefoneCol]),
            primeiro_nome: nomeCol ? extractFirstName(row[nomeCol]) : '',
            bairro_normalizado: bairroCol ? normalizeNeighborhood(row[bairroCol], NEIGHBORHOOD_MAPPING) : ''
        }));
        
        // Remove telefones inválidos
        return processedData.filter(row => row.telefone_limpo !== '');
    }

    processPedidos() {
        if (!this.dataframes.pedidos) {
            return [];
        }
        
        const data = [...this.dataframes.pedidos];
        
        // Encontra coluna de telefone
        let telefoneCol = null;
        for (const col of ['Telefone', 'telefone', 'Fone', 'fone', 'Celular', 'celular', 'Phone', 'phone']) {
            if (data.length > 0 && col in data[0]) {
                telefoneCol = col;
                break;
            }
        }
        
        if (!telefoneCol) {
            console.log(`Colunas disponíveis no arquivo de pedidos: ${data.length > 0 ? Object.keys(data[0]) : []}`);
            return [];
        }
        
        // Encontra outras colunas importantes
        const dataFechamentoCol = data.length > 0 && 'Data Fechamento' in data[0] ? 'Data Fechamento' : null;
        const totalCol = data.length > 0 && 'Total' in data[0] ? 'Total' : null;
        const valorEntregaCol = data.length > 0 && 'Valor Entrega' in data[0] ? 'Valor Entrega' : null;
        const bairroCol = data.length > 0 && 'Bairro' in data[0] ? 'Bairro' : null;
        const clienteCol = data.length > 0 && 'Cliente' in data[0] ? 'Cliente' : null;
        const codigoCol = data.length > 0 && 'Código' in data[0] ? 'Código' : null;
        
        const processedData = data.map(row => {
            const processedRow = {
                ...row,
                telefone_limpo: cleanPhoneNumber(row[telefoneCol])
            };
            
            // Converte data de fechamento
            if (dataFechamentoCol && row[dataFechamentoCol]) {
                try {
                    processedRow['Data Fechamento'] = moment(row[dataFechamentoCol], 'DD/MM/YYYY').toDate();
                } catch (error) {
                    processedRow['Data Fechamento'] = null;
                }
            }
            
            // Normaliza bairro
            if (bairroCol && row[bairroCol]) {
                processedRow.bairro_normalizado = normalizeNeighborhood(row[bairroCol], NEIGHBORHOOD_MAPPING);
            }
            
            // Calcula valor total
            const total = totalCol ? parseFloat(row[totalCol]) || 0 : 0;
            const valorEntrega = valorEntregaCol ? parseFloat(row[valorEntregaCol]) || 0 : 0;
            processedRow.valor_total = total + valorEntrega;
            
            return processedRow;
        });
        
        // Remove pedidos sem telefone (mesa/comanda)
        return processedData.filter(row => row.telefone_limpo !== '');
    }

    processItens() {
        if (!this.dataframes.itens) {
            return [];
        }
        
        const data = [...this.dataframes.itens];
        
        // Encontra coluna de data
        const dataFecCol = data.length > 0 && 'Data Fec. Ped.' in data[0] ? 'Data Fec. Ped.' : null;
        
        const processedData = data.map(row => {
            const processedRow = { ...row };
            
            // Converte data de fechamento
            if (dataFecCol && row[dataFecCol]) {
                try {
                    processedRow['Data Fec. Ped.'] = moment(row[dataFecCol], 'DD/MM/YYYY').toDate();
                } catch (error) {
                    processedRow['Data Fec. Ped.'] = null;
                }
            }
            
            return processedRow;
        });
        
        return processedData;
    }

    findNewClients() {
        const contactsData = this.processContacts();
        const clientesData = this.processClientes();
        
        if (contactsData.length === 0 || clientesData.length === 0) {
            return [];
        }
        
        // Filtra clientes com telefones válidos
        const clientesValidos = clientesData.filter(cliente => 
            cliente.telefone_limpo && 
            cliente.telefone_limpo !== '0000000000' &&
            cliente.telefone_limpo.length >= 10
        );
        
        // Encontra clientes que não estão nos contatos
        const clientesTelefones = new Set(clientesValidos.map(c => c.telefone_limpo));
        const contactsTelefones = new Set(contactsData.map(c => c.telefone_limpo));
        
        const novosTelefones = new Set([...clientesTelefones].filter(x => !contactsTelefones.has(x)));
        
        // Filtra clientes novos
        const novosClientes = clientesValidos.filter(cliente => 
            novosTelefones.has(cliente.telefone_limpo)
        );
        
        // Filtra nomes válidos
        const clientesFiltrados = novosClientes.filter(cliente => 
            cliente.primeiro_nome && 
            cliente.primeiro_nome !== '-' && 
            cliente.primeiro_nome !== '???????' &&
            cliente.primeiro_nome !== ''
        );
        
        // Formata para importar no Google Contacts
        return clientesFiltrados.map(cliente => ({
            nome: `LT_01 ${cliente.primeiro_nome}`,
            telefone: cliente.telefone_limpo
        }));
    }

    analyzeInactiveClients(diasInatividade = null) {
        const dias = diasInatividade || this.config.diasInatividade;
        const pedidosData = this.processPedidos();
        
        if (pedidosData.length === 0) {
            return [];
        }
        
        // Data limite
        const dataLimite = moment().subtract(dias, 'days').toDate();
        
        // Último pedido por cliente
        const ultimoPedidoPorCliente = {};
        
        for (const pedido of pedidosData) {
            const telefone = pedido.telefone_limpo;
            const dataFechamento = pedido['Data Fechamento'];
            
            if (telefone && dataFechamento) {
                if (!ultimoPedidoPorCliente[telefone] || 
                    dataFechamento > ultimoPedidoPorCliente[telefone].ultimo_pedido) {
                    ultimoPedidoPorCliente[telefone] = {
                        telefone_limpo: telefone,
                        ultimo_pedido: dataFechamento
                    };
                }
            }
        }
        
        // Clientes inativos
        const inativos = Object.values(ultimoPedidoPorCliente)
            .filter(cliente => cliente.ultimo_pedido < dataLimite)
            .map(cliente => ({
                ...cliente,
                dias_inativo: daysDifference(cliente.ultimo_pedido, new Date())
            }));
        
        // Adiciona informações do cliente
        const clientesData = this.processClientes();
        const clientesMap = new Map();
        
        for (const cliente of clientesData) {
            clientesMap.set(cliente.telefone_limpo, cliente);
        }
        
        return inativos.map(inativo => {
            const cliente = clientesMap.get(inativo.telefone_limpo);
            return {
                ...inativo,
                primeiro_nome: cliente ? cliente.primeiro_nome : '',
                bairro_normalizado: cliente ? cliente.bairro_normalizado : '',
                qtd_pedidos: cliente ? cliente['Qtd. Pedidos'] : 0
            };
        });
    }

    analyzeTicketMedio(valorMinimo = null) {
        const valor = valorMinimo || this.config.ticketMedioMinimo;
        const pedidosData = this.processPedidos();
        
        if (pedidosData.length === 0) {
            return [];
        }
        
        // Calcula ticket médio por cliente
        const ticketPorCliente = {};
        
        for (const pedido of pedidosData) {
            const telefone = pedido.telefone_limpo;
            const valorTotal = pedido.valor_total;
            const dataFechamento = pedido['Data Fechamento'];
            
            if (telefone && valorTotal) {
                if (!ticketPorCliente[telefone]) {
                    ticketPorCliente[telefone] = {
                        telefone_limpo: telefone,
                        valores: [],
                        ultimo_pedido: dataFechamento
                    };
                }
                
                ticketPorCliente[telefone].valores.push(valorTotal);
                
                if (dataFechamento > ticketPorCliente[telefone].ultimo_pedido) {
                    ticketPorCliente[telefone].ultimo_pedido = dataFechamento;
                }
            }
        }
        
        // Calcula estatísticas
        const clientesAltoTicket = Object.values(ticketPorCliente)
            .map(cliente => {
                const valores = cliente.valores;
                const ticketMedio = valores.reduce((a, b) => a + b, 0) / valores.length;
                const valorTotal = valores.reduce((a, b) => a + b, 0);
                
                return {
                    telefone_limpo: cliente.telefone_limpo,
                    ticket_medio: ticketMedio,
                    valor_total: valorTotal,
                    qtd_pedidos: valores.length,
                    ultimo_pedido: cliente.ultimo_pedido
                };
            })
            .filter(cliente => cliente.ticket_medio >= valor);
        
        // Adiciona informações do cliente
        const clientesData = this.processClientes();
        const clientesMap = new Map();
        
        for (const cliente of clientesData) {
            clientesMap.set(cliente.telefone_limpo, cliente);
        }
        
        return clientesAltoTicket.map(cliente => {
            const clienteInfo = clientesMap.get(cliente.telefone_limpo);
            return {
                ...cliente,
                primeiro_nome: clienteInfo ? clienteInfo.primeiro_nome : '',
                bairro_normalizado: clienteInfo ? clienteInfo.bairro_normalizado : ''
            };
        });
    }

    analyzeGeographicData() {
        const pedidosData = this.processPedidos();
        
        if (pedidosData.length === 0) {
            return null;
        }
        
        // Agrupa por bairro
        const bairrosAnalise = {};
        
        for (const pedido of pedidosData) {
            const bairro = pedido.bairro_normalizado;
            const valorTotal = pedido.valor_total;
            const telefone = pedido.telefone_limpo;
            
            if (bairro) {
                if (!bairrosAnalise[bairro]) {
                    bairrosAnalise[bairro] = {
                        bairro: bairro,
                        valores: [],
                        telefones: new Set()
                    };
                }
                
                bairrosAnalise[bairro].valores.push(valorTotal);
                if (telefone) {
                    bairrosAnalise[bairro].telefones.add(telefone);
                }
            }
        }
        
        // Calcula estatísticas
        const bairrosStats = Object.values(bairrosAnalise).map(bairro => {
            const valores = bairro.valores;
            const valorTotal = valores.reduce((a, b) => a + b, 0);
            const ticketMedio = valorTotal / valores.length;
            
            return {
                bairro: bairro.bairro,
                valor_total: valorTotal,
                ticket_medio: ticketMedio,
                qtd_pedidos: valores.length,
                clientes_unicos: bairro.telefones.size
            };
        });
        
        // Top bairros
        const topBairrosValor = sortBy(bairrosStats, 'valor_total', 'desc').slice(0, 10);
        const topBairrosPedidos = sortBy(bairrosStats, 'qtd_pedidos', 'desc').slice(0, 10);
        
        return {
            bairros_analise: bairrosStats,
            top_bairros_valor: topBairrosValor,
            top_bairros_pedidos: topBairrosPedidos
        };
    }

    analyzePreferences() {
        const pedidosData = this.processPedidos();
        const itensData = this.processItens();
        
        if (pedidosData.length === 0 || itensData.length === 0) {
            return null;
        }
        
        // Verifica quais colunas existem no arquivo de itens
        console.log(`Colunas disponíveis no arquivo de itens: ${itensData.length > 0 ? Object.keys(itensData[0]) : []}`);
        
        // Mapeia as colunas corretas
        const codPedCol = itensData.length > 0 && 'Cod. Ped.' in itensData[0] ? 'Cod. Ped.' : null;
        const nomeProdCol = itensData.length > 0 && 'Nome Prod' in itensData[0] ? 'Nome Prod' : null;
        const catProdCol = itensData.length > 0 && 'Cat. Prod.' in itensData[0] ? 'Cat. Prod.' : null;
        const qtdCol = itensData.length > 0 && 'Qtd.' in itensData[0] ? 'Qtd.' : null;
        
        // Tenta diferentes variações da coluna de valor
        let valorCol = null;
        for (const col of ['Valor Tot. Item', 'Valor. Tot. Item', 'Valor Tot Item', 'Valor Total Item', 'Valor']) {
            if (itensData.length > 0 && col in itensData[0]) {
                valorCol = col;
                break;
            }
        }
        
        if (!codPedCol || !nomeProdCol || !catProdCol || !qtdCol || !valorCol) {
            console.log('Colunas insuficientes encontradas');
            return null;
        }
        
        // Conecta pedidos com itens
        const pedidosItens = [];
        
        for (const pedido of pedidosData) {
            const codigo = pedido['Código'];
            if (!codigo) continue;
            
            const itensDoPedido = itensData.filter(item => item[codPedCol] === codigo);
            
            for (const item of itensDoPedido) {
                pedidosItens.push({
                    telefone_limpo: pedido.telefone_limpo,
                    codigo_pedido: codigo,
                    nome_produto: item[nomeProdCol],
                    categoria: item[catProdCol],
                    quantidade: parseFloat(item[qtdCol]) || 1,
                    valor: parseFloat(item[valorCol]) || 0
                });
            }
        }
        
        if (pedidosItens.length === 0) {
            return null;
        }
        
        // Preferências por categoria
        const preferenciasCategoria = {};
        
        for (const item of pedidosItens) {
            const telefone = item.telefone_limpo;
            const categoria = item.categoria;
            
            if (!preferenciasCategoria[telefone]) {
                preferenciasCategoria[telefone] = {};
            }
            
            if (!preferenciasCategoria[telefone][categoria]) {
                preferenciasCategoria[telefone][categoria] = {
                    quantidade: 0,
                    valor: 0
                };
            }
            
            preferenciasCategoria[telefone][categoria].quantidade += item.quantidade;
            preferenciasCategoria[telefone][categoria].valor += item.valor;
        }
        
        // Top categorias por cliente
        const topCategorias = [];
        
        for (const [telefone, categorias] of Object.entries(preferenciasCategoria)) {
            const categoriasArray = Object.entries(categorias)
                .map(([categoria, dados]) => ({
                    telefone_limpo: telefone,
                    categoria: categoria,
                    quantidade: dados.quantidade,
                    valor: dados.valor
                }))
                .sort((a, b) => b.quantidade - a.quantidade)
                .slice(0, 3);
            
            topCategorias.push(...categoriasArray);
        }
        
        // Produtos mais vendidos
        const produtosVendidos = {};
        
        for (const item of pedidosItens) {
            const produto = item.nome_produto;
            
            if (!produtosVendidos[produto]) {
                produtosVendidos[produto] = {
                    quantidade: 0,
                    valor: 0
                };
            }
            
            produtosVendidos[produto].quantidade += item.quantidade;
            produtosVendidos[produto].valor += item.valor;
        }
        
        const produtosMaisVendidos = Object.entries(produtosVendidos)
            .map(([produto, dados]) => ({
                nome_produto: produto,
                quantidade: dados.quantidade,
                valor: dados.valor
            }))
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 20);
        
        return {
            preferencias_categoria: Object.values(preferenciasCategoria),
            top_categorias: topCategorias,
            produtos_mais_vendidos: produtosMaisVendidos
        };
    }

    generateAISuggestions() {
        const suggestions = {
            reativacao: [],
            campanhas_geograficas: [],
            ofertas_personalizadas: [],
            melhorias_gerais: []
        };
        
        // Análise de clientes inativos
        const inativos = this.analyzeInactiveClients();
        if (inativos.length > 0) {
            const totalInativos = inativos.length;
            if (totalInativos > 50) {
                suggestions.reativacao.push(
                    `⚠️ ${totalInativos} clientes inativos há mais de ${this.config.diasInatividade} dias. ` +
                    `Sugestão: Campanha de reativação com desconto de 20%`
                );
            }
        }
        
        // Análise geográfica
        const geoData = this.analyzeGeographicData();
        if (geoData) {
            const topBairros = geoData.top_bairros_pedidos.slice(0, 3);
            for (const bairro of topBairros) {
                suggestions.campanhas_geograficas.push(
                    `📍 ${bairro.bairro}: ${bairro.qtd_pedidos} pedidos. ` +
                    `Sugestão: Campanha Meta direcionada para este bairro`
                );
            }
        }
        
        // Análise de ticket médio
        const altoTicket = this.analyzeTicketMedio();
        if (altoTicket.length > 0) {
            suggestions.ofertas_personalizadas.push(
                `💎 ${altoTicket.length} clientes com ticket médio > R$ ${this.config.ticketMedioMinimo}. ` +
                `Sugestão: Ofertas premium exclusivas`
            );
        }
        
        // Análise de preferências
        const preferences = this.analyzePreferences();
        if (preferences) {
            suggestions.melhorias_gerais.push(
                `🔥 Produtos mais vendidos identificados. ` +
                `Sugestão: Promover combos com estes itens`
            );
        }
        
        return suggestions;
    }

    async saveReports() {
        const savedFiles = [];
        
        try {
            // 1. Novos clientes para Google Contacts
            const novosClientes = this.findNewClients();
            if (novosClientes.length > 0) {
                const filePath = await saveDataFrame(novosClientes, this.outputDir, 'novos_clientes_google_contacts', 'csv');
                savedFiles.push(filePath);
            }
            
            // 2. Clientes inativos
            const inativos = this.analyzeInactiveClients();
            if (inativos.length > 0) {
                const filePath = await saveDataFrame(inativos, this.outputDir, 'clientes_inativos', 'xlsx');
                savedFiles.push(filePath);
            }
            
            // 3. Clientes alto ticket
            const altoTicket = this.analyzeTicketMedio();
            if (altoTicket.length > 0) {
                const filePath = await saveDataFrame(altoTicket, this.outputDir, 'clientes_alto_ticket', 'xlsx');
                savedFiles.push(filePath);
            }
            
            // 4. Análise geográfica
            const geoData = this.analyzeGeographicData();
            if (geoData) {
                const filePath = await saveDataFrame(geoData.bairros_analise, this.outputDir, 'analise_geografica', 'xlsx');
                savedFiles.push(filePath);
            }
            
            // 5. Preferências
            const preferences = this.analyzePreferences();
            if (preferences) {
                const filePath = await saveDataFrame(preferences.produtos_mais_vendidos, this.outputDir, 'produtos_mais_vendidos', 'xlsx');
                savedFiles.push(filePath);
            }
            
            return savedFiles;
        } catch (error) {
            logger.error('Erro ao salvar relatórios:', error);
            throw error;
        }
    }
}

module.exports = ZapChickenProcessor;
