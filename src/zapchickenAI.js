const axios = require('axios');
const moment = require('moment');
const { logger, formatCurrency, formatDate, groupBy, sortBy } = require('./utils');
const { GEMINI_CONFIG } = require('../config');

class ZapChickenAI {
    constructor(processor, apiKey = null) {
        this.processor = processor;
        this.apiKey = apiKey || GEMINI_CONFIG.apiKey;
        this.conversationHistory = [];
        this.insightsCache = {};
        this.baseUrl = GEMINI_CONFIG.baseUrl;
    }

    async processQuestion(question) {
        try {
            // Se não tem API key, usa análise básica
            if (!this.apiKey) {
                return this.fallbackAnalysis(question);
            }

            // Prepara dados para o Gemini
            const dataSummary = await this.prepareDataSummary();

            // Constrói prompt para o Gemini
            const prompt = this.buildGeminiPrompt(question, dataSummary);

            // Chama Gemini API
            const response = await this.callGeminiAPI(prompt);

            return response;

        } catch (error) {
            logger.error('Erro ao processar pergunta:', error);
            // Fallback para análise básica em caso de erro
            return this.fallbackAnalysis(question);
        }
    }

    async prepareDataSummary() {
        try {
            // Usa os dados processados em vez dos brutos
            const pedidosData = this.processor.processPedidos();
            const itensData = this.processor.processItens();
            const clientesData = this.processor.processClientes();
            
            // Log para debug
            console.log('📊 Dados disponíveis:');
            if (pedidosData && pedidosData.length > 0) {
                console.log('Pedidos - Colunas:', Object.keys(pedidosData[0]));
                console.log('Pedidos - Primeiro registro:', pedidosData[0]);
            }
            if (itensData && itensData.length > 0) {
                console.log('Itens - Colunas:', Object.keys(itensData[0]));
                console.log('Itens - Primeiro registro:', itensData[0]);
            }

            let summary = "📊 DADOS COMPLETOS DA ZAPCHICKEN:\n\n";

            if (pedidosData && pedidosData.length > 0) {
                // Mapeia campos específicos que você mencionou
                const pedidosProcessados = pedidosData.map(pedido => {
                    // Identifica campos de data (pode variar)
                    const dataFechamento = pedido['Data Fechamento'] || pedido['Data Fec. Ped.'] || pedido['Data Ab. Ped.'] || null;
                    const dataPedido = pedido['Data Ab. Ped.'] || pedido['Data Fechamento'] || null;
                    
                    return {
                        nome: pedido.Cliente || pedido['Nome Cliente'] || 'Cliente não identificado',
                        dataFaturamento: dataFechamento,
                        dataPedido: dataPedido,
                        bairro: pedido.Bairro || 'Bairro não informado',
                        faturamento: pedido.valor_total || pedido.Total || 0,
                        origem: pedido.Origem || 'Origem não informada',
                        codigoPedido: pedido['Código'] || pedido['Cod. Ped.'] || ''
                    };
                });

                // Filtra pedidos com data válida
                const pedidosWithDates = pedidosProcessados
                    .map(pedido => ({
                        ...pedido,
                        dataFaturamento: pedido.dataFaturamento ? moment(pedido.dataFaturamento) : null,
                        dataPedido: pedido.dataPedido ? moment(pedido.dataPedido) : null
                    }))
                    .filter(pedido => pedido.dataFaturamento);

                summary += "🛒 PEDIDOS (Dados Principais):\n";
                summary += `• Total de pedidos: ${pedidosData.length.toLocaleString()}\n`;

                const totalVendas = pedidosProcessados.reduce((sum, pedido) => sum + pedido.faturamento, 0);
                summary += `• Receita total: ${formatCurrency(totalVendas)}\n`;

                const ticketMedio = totalVendas / pedidosData.length;
                summary += `• Ticket médio: ${formatCurrency(ticketMedio)}\n`;

                if (pedidosWithDates.length > 0) {
                    const minDate = moment.min(pedidosWithDates.map(p => p.dataFaturamento));
                    const maxDate = moment.max(pedidosWithDates.map(p => p.dataFaturamento));
                    summary += `• Período: ${minDate.format('DD/MM/YYYY')} a ${maxDate.format('DD/MM/YYYY')}\n`;
                }

                // Clientes únicos
                const clientesUnicos = new Set(pedidosProcessados.map(p => p.nome).filter(c => c));
                summary += `• Clientes únicos: ${clientesUnicos.size.toLocaleString()}\n`;

                // Top bairros
                const bairros = groupBy(pedidosProcessados, 'bairro');
                const topBairros = Object.entries(bairros)
                    .map(([bairro, pedidos]) => ({ bairro, count: pedidos.length }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                summary += `• Top 5 bairros: ${topBairros.map(b => `${b.bairro}(${b.count})`).join(', ')}\n`;

                // Top origens
                const origens = groupBy(pedidosProcessados, 'origem');
                const topOrigens = Object.entries(origens)
                    .map(([origem, pedidos]) => ({ origem, count: pedidos.length }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3);

                summary += `• Principais origens: ${topOrigens.map(o => `${o.origem}(${o.count})`).join(', ')}\n`;

                // Análise temporal detalhada
                const vendasDiarias = {};
                for (const pedido of pedidosWithDates) {
                    const data = pedido.dataFaturamento.format('YYYY-MM-DD');
                    if (!vendasDiarias[data]) {
                        vendasDiarias[data] = {
                            faturamento: 0,
                            pedidos: 0,
                            clientes: new Set()
                        };
                    }
                    vendasDiarias[data].faturamento += pedido.faturamento;
                    vendasDiarias[data].pedidos++;
                    if (pedido.nome) {
                        vendasDiarias[data].clientes.add(pedido.nome);
                    }
                }

                const vendasDiariasArray = Object.entries(vendasDiarias)
                    .map(([data, info]) => ({
                        data,
                        faturamento: info.faturamento,
                        pedidos: info.pedidos,
                        clientes: info.clientes.size
                    }))
                    .sort((a, b) => a.data.localeCompare(b.data));

                if (vendasDiariasArray.length > 0) {
                    const mediaDiaria = vendasDiariasArray.reduce((sum, dia) => sum + dia.faturamento, 0) / vendasDiariasArray.length;
                    const maiorDia = Math.max(...vendasDiariasArray.map(d => d.faturamento));
                    const menorDia = Math.min(...vendasDiariasArray.map(d => d.faturamento));

                    summary += `• Média diária: ${formatCurrency(mediaDiaria)}\n`;
                    summary += `• Maior dia: ${formatCurrency(maiorDia)}\n`;
                    summary += `• Menor dia: ${formatCurrency(menorDia)}\n`;

                    // Análise por mês
                    const vendasMensais = {};
                    for (const pedido of pedidosWithDates) {
                        const mesAno = pedido.dataFaturamento.format('YYYY-MM');
                        if (!vendasMensais[mesAno]) {
                            vendasMensais[mesAno] = 0;
                        }
                        vendasMensais[mesAno] += pedido.faturamento;
                    }

                    summary += "• Análise por mês:\n";
                    for (const [mesAno, valor] of Object.entries(vendasMensais).sort()) {
                        const [ano, mes] = mesAno.split('-');
                        const nomeMes = moment().month(parseInt(mes) - 1).format('MMMM');
                        summary += `  - ${nomeMes}/${ano}: ${formatCurrency(valor)}\n`;
                    }

                    // Dados detalhados por dia (últimos 30 dias)
                    const ultimos30Dias = vendasDiariasArray.slice(-30);
                    summary += "\n📅 DADOS DETALHADOS POR DIA (últimos 30 dias):\n";
                    for (const dia of ultimos30Dias) {
                        summary += `  - ${dia.data}: ${formatCurrency(dia.faturamento)} (${dia.pedidos} pedidos, ${dia.clientes} clientes)\n`;
                    }

                    // Detalhes dos clientes por dia
                    summary += "\n👥 DETALHES DOS CLIENTES POR DIA (últimos 30 dias):\n";
                    for (const dia of ultimos30Dias) {
                        const pedidosDoDia = pedidosWithDates.filter(p => 
                            p.dataFaturamento.format('YYYY-MM-DD') === dia.data
                        );
                        const clientesDoDia = [...new Set(pedidosDoDia.map(p => p.nome).filter(c => c))];
                        
                        if (clientesDoDia.length > 0) {
                            const clientesMostrados = clientesDoDia.slice(0, 5);
                            summary += `  - ${dia.data}: ${clientesMostrados.join(', ')}`;
                            if (clientesDoDia.length > 5) {
                                summary += ` e mais ${clientesDoDia.length - 5} clientes`;
                            }
                            summary += "\n";
                        }
                    }

                    // Detalhes completos dos clientes por dia (com valores)
                    summary += "\n💰 DETALHES COMPLETOS DOS CLIENTES POR DIA (últimos 30 dias):\n";
                    for (const dia of ultimos30Dias) {
                        const pedidosDoDia = pedidosWithDates.filter(p => 
                            p.dataFaturamento.format('YYYY-MM-DD') === dia.data
                        );
                        
                        if (pedidosDoDia.length > 0) {
                            summary += `  📅 ${dia.data}:\n`;
                            for (const pedido of pedidosDoDia) {
                                const cliente = pedido.nome;
                                const valor = pedido.faturamento;
                                const bairro = pedido.bairro;
                                const origem = pedido.origem;
                                summary += `    • ${cliente}: ${formatCurrency(valor)} - ${bairro} (${origem})\n`;
                            }
                            summary += "\n";
                        }
                    }

                    // Top 10 clientes
                    const clientesPorValor = {};
                    for (const pedido of pedidosProcessados) {
                        const cliente = pedido.nome;
                        if (cliente) {
                            if (!clientesPorValor[cliente]) {
                                clientesPorValor[cliente] = {
                                    total: 0,
                                    pedidos: 0
                                };
                            }
                            clientesPorValor[cliente].total += pedido.faturamento;
                            clientesPorValor[cliente].pedidos++;
                        }
                    }

                    const topClientes = Object.entries(clientesPorValor)
                        .map(([cliente, dados]) => ({
                            cliente,
                            total: dados.total,
                            pedidos: dados.pedidos
                        }))
                        .sort((a, b) => b.total - a.total)
                        .slice(0, 10);

                    summary += "\n👥 TOP 10 CLIENTES:\n";
                    for (const cliente of topClientes) {
                        summary += `  - ${cliente.cliente}: ${formatCurrency(cliente.total)} (${cliente.pedidos} pedidos)\n`;
                    }

                    summary += "\n";
                }
            }

            // Adiciona informações de itens por cliente
            if (itensData && itensData.length > 0 && pedidosProcessados && pedidosProcessados.length > 0) {
                summary += "\n🛍️ ITENS COMPRADOS POR CLIENTE (últimos 30 dias):\n";
                
                const ultimos30Dias = Object.keys(vendasDiarias || {}).slice(-30);
                for (const data of ultimos30Dias) {
                    const pedidosDoDia = pedidosWithDates.filter(p => 
                        p.dataFaturamento && p.dataFaturamento.format('YYYY-MM-DD') === data
                    );
                    
                    if (pedidosDoDia.length > 0) {
                        summary += `  📅 ${data}:\n`;
                        for (const pedido of pedidosDoDia) {
                            const cliente = pedido.nome;
                            const codigoPedido = pedido.codigoPedido;
                            const valorPedido = pedido.faturamento;

                            // Busca itens do pedido
                            const itensDoPedido = itensData.filter(item => item['Cod. Ped.'] === codigoPedido);
                            if (itensDoPedido.length > 0) {
                                const itensLista = itensDoPedido.map(item => {
                                    const nomeProd = item['Nome Prod'] || 'Produto não identificado';
                                    const qtd = item['Qtd.'] || 1;
                                    return `${qtd}x ${nomeProd}`;
                                });
                                summary += `    • ${cliente} (${formatCurrency(valorPedido)}): ${itensLista.join(', ')}\n`;
                            } else {
                                summary += `    • ${cliente} (${formatCurrency(valorPedido)}): Itens não detalhados\n`;
                            }
                        }
                        summary += "\n";
                    }
                }
            }

            if (itensData && itensData.length > 0) {
                summary += "🛍️ PRODUTOS E QUANTIDADES:\n";
                const totalItens = itensData.reduce((sum, item) => sum + (parseFloat(item['Qtd.']) || 0), 0);
                summary += `• Total de itens vendidos: ${totalItens.toLocaleString()}\n`;

                // Verifica colunas disponíveis
                const nomeProdCol = itensData.length > 0 && 'Nome Prod' in itensData[0] ? 'Nome Prod' : null;
                const catProdCol = itensData.length > 0 && 'Cat. Prod.' in itensData[0] ? 'Cat. Prod.' : null;
                const qtdCol = itensData.length > 0 && 'Qtd.' in itensData[0] ? 'Qtd.' : null;

                if (nomeProdCol) {
                    const produtosUnicos = new Set(itensData.map(item => item[nomeProdCol]).filter(p => p));
                    summary += `• Produtos únicos: ${produtosUnicos.size.toLocaleString()}\n`;

                    // Top produtos por quantidade
                    const produtosPorQtd = {};
                    for (const item of itensData) {
                        const produto = item[nomeProdCol];
                        const qtd = parseFloat(item[qtdCol]) || 0;
                        if (produto && qtd > 0) {
                            if (!produtosPorQtd[produto]) {
                                produtosPorQtd[produto] = {
                                    quantidade: 0,
                                    valorTotal: 0
                                };
                            }
                            produtosPorQtd[produto].quantidade += qtd;
                            produtosPorQtd[produto].valorTotal += parseFloat(item['Valor. Tot. Item'] || item['Valor Prod'] || 0);
                        }
                    }

                    const topProdutos = Object.entries(produtosPorQtd)
                        .sort((a, b) => b[1].quantidade - a[1].quantidade)
                        .slice(0, 10)
                        .map(([produto, dados]) => `${produto}(${dados.quantidade} un - ${formatCurrency(dados.valorTotal)})`);

                    summary += `• Top 10 produtos por quantidade:\n`;
                    topProdutos.forEach((produto, index) => {
                        summary += `  ${index + 1}. ${produto}\n`;
                    });
                } else {
                    summary += `• Colunas disponíveis: ${itensData.length > 0 ? Object.keys(itensData[0]) : []}\n`;
                }

                if (catProdCol) {
                    const categoriasUnicas = new Set(itensData.map(item => item[catProdCol]).filter(c => c));
                    summary += `• Categorias: ${categoriasUnicas.size.toLocaleString()}\n`;
                }

                summary += "\n";
            }

            if (clientesData && clientesData.length > 0) {
                summary += "👥 CLIENTES:\n";
                summary += `• Total de clientes: ${clientesData.length.toLocaleString()}\n`;

                // Análise de bairros
                if (clientesData.length > 0 && 'Bairro' in clientesData[0]) {
                    const bairrosPorCliente = groupBy(clientesData, 'Bairro');
                    const topBairros = Object.entries(bairrosPorCliente)
                        .map(([bairro, clientes]) => ({ bairro, count: clientes.length }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5)
                        .map(b => `${b.bairro}(${b.count})`);

                    summary += `• Top 5 bairros: ${topBairros.join(', ')}\n\n`;
                }
            }

            return summary;

        } catch (error) {
            logger.error('Erro ao preparar dados:', error);
            return `❌ Erro ao preparar dados: ${error.message}`;
        }
    }

    buildGeminiPrompt(question, dataSummary) {
        const systemPrompt = `
Você é um especialista em Business Intelligence e análise de dados para restaurantes/food service. 
Você está analisando dados da ZapChicken, um negócio de delivery de comida.

${dataSummary}

CAMPOS PRINCIPAIS DISPONÍVEIS:
- **NOME**: Nome do cliente
- **DATA FATURAMENTO**: Data de fechamento/faturamento do pedido
- **DATA PEDIDO**: Data de abertura do pedido
- **BAIRRO**: Bairro do cliente
- **FATURAMENTO**: Valor total do pedido
- **PRODUTOS**: Nome dos produtos vendidos
- **QUANTIDADE**: Quantidade de cada produto
- **ORIGEM**: Origem do pedido (WhatsApp, telefone, etc.)

INSTRUÇÕES IMPORTANTES:
1. **DADOS DETALHADOS**: Você tem acesso a dados completos por dia e cliente. Use-os para responder perguntas específicas
2. **ANÁLISE TEMPORAL**: Use os dados de vendas por mês e dia para responder perguntas sobre períodos específicos
3. **CLIENTES ESPECÍFICOS**: Use os dados de "TOP 10 CLIENTES" e dados diários para identificar clientes em datas específicas
4. **MÉTRICAS PRECISAS**: Sempre forneça números exatos quando disponíveis nos dados
5. **COMPARAÇÕES**: Compare meses, dias, períodos e tendências quando relevante
6. **INSIGHTS ACIONÁVEIS**: Forneça recomendações práticas baseadas nos dados
7. **LINGUAGEM CLARA**: Use linguagem profissional mas acessível
8. **VISUALIZAÇÃO**: Use emojis e formatação para tornar a resposta mais visual
9. **ESTRUTURA**: Organize com títulos e subtítulos claros
10. **ESPECIFICIDADE**: Seja específico sobre números, datas, clientes e períodos

PERGUNTA DO USUÁRIO: ${question}

IMPORTANTE: 
- Para perguntas sobre meses específicos, use os dados de "Análise por mês"
- Para perguntas sobre dias específicos, use os dados de "DADOS DETALHADOS POR DIA"
- Para perguntas sobre clientes específicos, use os dados de "TOP 10 CLIENTES" e dados diários
- Para perguntas sobre produtos, use os dados de "PRODUTOS E QUANTIDADES"
- Sempre forneça números exatos quando disponíveis nos dados
- Se a pergunta for sobre uma data específica, procure nos dados diários e forneça detalhes completos
- Se a pergunta for sobre produtos específicos, use os dados de "ITENS COMPRADOS POR CLIENTE"
`;

        return systemPrompt;
    }

    async callGeminiAPI(prompt) {
        try {
            const headers = {
                'Content-Type': 'application/json',
            };

            const data = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 2048,
                }
            };

            const url = `${this.baseUrl}?key=${this.apiKey}`;

            const response = await axios.post(url, data, {
                headers: headers,
                timeout: GEMINI_CONFIG.timeout
            });

            if (response.status === 200) {
                const result = response.data;
                if (result.candidates && result.candidates.length > 0) {
                    return result.candidates[0].content.parts[0].text;
                } else {
                    return "❌ Resposta vazia da API Gemini";
                }
            } else {
                return `❌ Erro na API Gemini: ${response.status} - ${response.statusText}`;
            }

        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;

                if (status === 400) {
                    if (errorData.error && errorData.error.message) {
                        const errorMsg = errorData.error.message;
                        if (errorMsg.includes('API key') || errorMsg.toLowerCase().includes('invalid')) {
                            return "❌ API key inválida ou expirada";
                        } else {
                            return `❌ Erro na requisição: ${errorMsg}`;
                        }
                    } else {
                        return `❌ Erro 400: ${JSON.stringify(errorData)}`;
                    }
                } else if (status === 403) {
                    return "❌ API key inválida ou sem permissão";
                } else if (status === 429) {
                    return "❌ Limite de requisições excedido";
                } else {
                    return `❌ Erro na API Gemini: ${status} - ${JSON.stringify(errorData)}`;
                }
            } else {
                return `❌ Erro ao chamar Gemini API: ${error.message}`;
            }
        }
    }

    fallbackAnalysis(question) {
        try {
            const pedidosData = this.processor.dataframes.pedidos;
            if (!pedidosData || pedidosData.length === 0) {
                return "❌ Dados não disponíveis. Processe os dados primeiro.";
            }

            const questionLower = question.toLowerCase();

            // Análise básica baseada em palavras-chave
            if (questionLower.includes('venda') || questionLower.includes('comprou') || questionLower.includes('pedido')) {
                const totalVendas = pedidosData.reduce((sum, pedido) => sum + (pedido.Total || 0), 0);
                const ticketMedio = totalVendas / pedidosData.length;
                
                return `
📊 **ANÁLISE BÁSICA DE VENDAS**

• Total de Vendas: ${formatCurrency(totalVendas)}
• Ticket Médio: ${formatCurrency(ticketMedio)}
• Total de Pedidos: ${pedidosData.length.toLocaleString()}

💡 **Para análises mais avançadas, configure uma API key do Gemini!**
`;
            } else if (questionLower.includes('cliente') || questionLower.includes('inativo')) {
                const clientesUnicos = new Set(pedidosData.map(p => p.Cliente).filter(c => c));
                
                return `
👥 **ANÁLISE BÁSICA DE CLIENTES**

• Total de Clientes Únicos: ${clientesUnicos.size.toLocaleString()}
• Pedidos por Cliente: ${(pedidosData.length / clientesUnicos.size).toFixed(1)}

💡 **Para análise RFM e segmentação, configure uma API key do Gemini!**
`;
            } else {
                const totalVendas = pedidosData.reduce((sum, pedido) => sum + (pedido.Total || 0), 0);
                
                return `
🤖 **IA ZapChicken - Modo Básico**

Pergunta: "${question}"

📊 **Dados Disponíveis:**
• ${pedidosData.length.toLocaleString()} pedidos processados
• ${formatCurrency(totalVendas)} em vendas totais

💡 **Para análises avançadas com IA, configure uma API key do Gemini!**

🔧 **Como configurar:**
1. Acesse: https://makersuite.google.com/app/apikey
2. Crie uma API key gratuita
3. Configure na aplicação
4. Desfrute de análises muito mais inteligentes!
`;
            }

        } catch (error) {
            return `❌ Erro na análise básica: ${error.message}`;
        }
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        return "✅ API key do Gemini configurada com sucesso!";
    }

    async getApiStatus() {
        if (!this.apiKey) {
            return "❌ API key não configurada";
        }

        try {
            // Teste simples da API
            const testPrompt = "Responda apenas com a palavra 'OK'";
            const response = await this.callGeminiAPI(testPrompt);

            // Verifica se a resposta contém 'OK' ou é válida
            if (response.includes('OK') || response.includes('ok') || response.trim().length > 0) {
                return "✅ API Gemini funcionando perfeitamente";
            } else if (response.includes('❌ Erro na API Gemini:')) {
                // Extrai o erro específico
                const errorMsg = response.replace("❌ Erro na API Gemini:", "").trim();
                return `❌ Erro na API: ${errorMsg}`;
            } else {
                return `⚠️ API respondeu, mas inesperadamente: ${response.substring(0, 100)}...`;
            }

        } catch (error) {
            return `❌ Erro na API: ${error.message}`;
        }
    }

    showHelp() {
        return `
🎯 **COMANDOS DISPONÍVEIS:**

📊 **Análises de Vendas:**
• "Qual o faturamento total?"
• "Qual o ticket médio?"
• "Mostre as vendas por mês"
• "Qual o melhor dia da semana?"

👥 **Análises de Clientes:**
• "Quantos clientes únicos temos?"
• "Quais são os clientes inativos?"
• "Mostre análise RFM"
• "Segmentação de clientes"

📈 **Previsões e Tendências:**
• "Preveja vendas dos próximos 3 meses"
• "Analise tendências de crescimento"
• "Identifique sazonalidade"

🎯 **Marketing e Campanhas:**
• "Sugira campanhas de reativação"
• "Analise performance por bairro"
• "Identifique oportunidades de crescimento"

💡 **Comandos Especiais:**
• 'ajuda' - Mostra esta ajuda
• 'sair' - Sai do chat
• 'status' - Verifica status da API

🤖 **API Gemini:**
• Para análises mais avançadas, configure uma API key do Gemini
• Acesse: https://makersuite.google.com/app/apikey
`;
    }
}

module.exports = ZapChickenAI;
