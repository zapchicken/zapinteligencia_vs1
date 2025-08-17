const path = require('path');
const { 
    logger, 
    saveDataFrame, 
    formatWhatsAppPhone, 
    createWhatsAppLink,
    groupBy,
    sortBy,
    filterData,
    calculateStats
} = require('./utils');

class LeadGenerator {
    constructor(outputDir) {
        this.outputDir = outputDir;
    }

    filterValidLeads(data, phoneColumns) {
        if (!data || data.length === 0) {
            return data;
        }

        const validLeads = [];
        
        for (const row of data) {
            let hasValidPhone = false;
            
            for (const col of phoneColumns) {
                if (col in row && row[col]) {
                    const cleanPhone = formatWhatsAppPhone(row[col]);
                    if (cleanPhone) {
                        hasValidPhone = true;
                        break;
                    }
                }
            }
            
            if (hasValidPhone) {
                validLeads.push(row);
            }
        }

        logger.info(`Leads válidos: ${validLeads.length} de ${data.length}`);
        return validLeads;
    }

    standardizeColumns(data) {
        if (!data || data.length === 0) {
            return data;
        }

        const columnMapping = {
            'nome': 'nome',
            'name': 'nome',
            'cliente': 'nome',
            'customer': 'nome',
            'telefone': 'telefone',
            'phone': 'telefone',
            'celular': 'telefone',
            'whatsapp': 'telefone',
            'email': 'email',
            'e-mail': 'email',
            'cidade': 'cidade',
            'city': 'cidade',
            'estado': 'estado',
            'state': 'estado',
            'uf': 'estado',
            'endereco': 'endereco',
            'address': 'endereco',
            'empresa': 'empresa',
            'company': 'empresa',
            'observacoes': 'observacoes',
            'notes': 'observacoes',
            'obs': 'observacoes'
        };

        const standardizedData = data.map(row => {
            const newRow = {};
            
            for (const [oldCol, value] of Object.entries(row)) {
                const colLower = oldCol.toLowerCase().trim();
                const newCol = columnMapping[colLower] || oldCol;
                newRow[newCol] = value;
            }
            
            return newRow;
        });

        return standardizedData;
    }

    createWhatsAppFormat(data, phoneColumn = 'telefone') {
        if (!data || data.length === 0) {
            return data;
        }

        const whatsappData = data.map(row => {
            const newRow = { ...row };
            
            // Garante que temos uma coluna de telefone
            let phoneValue = row[phoneColumn];
            
            if (!phoneValue) {
                // Procura por colunas que podem conter telefones
                const phoneCols = Object.keys(row).filter(col => 
                    col.toLowerCase().includes('telefone') || 
                    col.toLowerCase().includes('phone') || 
                    col.toLowerCase().includes('celular') || 
                    col.toLowerCase().includes('whatsapp')
                );
                
                if (phoneCols.length > 0) {
                    phoneValue = row[phoneCols[0]];
                }
            }
            
            // Limpa e formata telefones
            newRow.telefone_whatsapp = formatWhatsAppPhone(phoneValue);
            
            // Cria link do WhatsApp
            newRow.link_whatsapp = createWhatsAppLink(phoneValue);
            
            return newRow;
        });

        // Remove linhas sem telefone válido
        const validData = whatsappData.filter(row => row.telefone_whatsapp);

        return validData;
    }

    generateSegments(data, segmentBy = null) {
        const segments = {};
        
        if (!segmentBy || !data || data.length === 0) {
            segments.todos = data;
            return segments;
        }

        // Verifica se a coluna existe
        if (!data[0] || !(segmentBy in data[0])) {
            segments.todos = data;
            return segments;
        }

        // Agrupa por valores únicos na coluna especificada
        const grouped = groupBy(data, segmentBy);
        
        for (const [value, segmentData] of Object.entries(grouped)) {
            if (value && value !== '') {
                const segmentName = String(value).toLowerCase().replace(/\s+/g, '_');
                segments[segmentName] = segmentData;
            }
        }

        return segments;
    }

    createSummaryReport(data, segments) {
        const report = {
            totalLeads: data ? data.length : 0,
            segments: {},
            mainColumns: data && data.length > 0 ? Object.keys(data[0]) : [],
            validPhones: 0
        };

        // Conta telefones válidos
        if (data) {
            const phoneCols = report.mainColumns.filter(col => 
                col.toLowerCase().includes('telefone') || 
                col.toLowerCase().includes('phone') ||
                col.includes('whatsapp')
            );
            
            for (const row of data) {
                for (const col of phoneCols) {
                    if (row[col] && row[col] !== '') {
                        report.validPhones++;
                        break;
                    }
                }
            }
        }

        // Informações dos segmentos
        for (const [segmentName, segmentData] of Object.entries(segments)) {
            report.segments[segmentName] = {
                quantity: segmentData.length,
                percentage: data && data.length > 0 ? 
                    Math.round((segmentData.length / data.length) * 100 * 100) / 100 : 0
            };
        }

        return report;
    }

    async saveLeads(data, filename = 'leads_whatsapp', format = 'xlsx', includeSegments = true) {
        const savedFiles = [];

        try {
            // Salva arquivo principal
            const mainFile = await saveDataFrame(data, this.outputDir, filename, format);
            savedFiles.push(mainFile);

            if (includeSegments && data && data.length > 0) {
                // Cria segmentos por cidade se existir
                if (data[0] && 'cidade' in data[0]) {
                    const segments = this.generateSegments(data, 'cidade');
                    
                    for (const [segmentName, segmentData] of Object.entries(segments)) {
                        if (segmentData.length > 0) {
                            const segmentFile = await saveDataFrame(
                                segmentData, 
                                this.outputDir, 
                                `${filename}_${segmentName}`, 
                                format
                            );
                            savedFiles.push(segmentFile);
                        }
                    }
                }
            }

            return savedFiles;
        } catch (error) {
            logger.error('Erro ao salvar leads:', error);
            throw error;
        }
    }

    displayLeadsSummary(data, report) {
        console.log('\n📊 RESUMO DOS LEADS');
        console.log('─'.repeat(50));

        // Tabela principal
        console.log('\n📋 Estatísticas Gerais:');
        console.log(`• Total de Leads: ${report.totalLeads}`);
        console.log(`• Telefones Válidos: ${report.validPhones}`);
        console.log(`• Colunas: ${report.mainColumns.length}`);

        // Tabela de segmentos
        if (Object.keys(report.segments).length > 0) {
            console.log('\n📊 Segmentos:');
            console.log('─'.repeat(40));
            
            for (const [segmentName, segmentInfo] of Object.entries(report.segments)) {
                console.log(`• ${segmentName}: ${segmentInfo.quantity} (${segmentInfo.percentage}%)`);
            }
        }

        // Mostra primeiras linhas
        if (data && data.length > 0) {
            console.log('\n📋 Primeiras 5 linhas dos leads:');
            
            const displayCols = ['nome', 'telefone', 'cidade', 'link_whatsapp'];
            const availableCols = displayCols.filter(col => col in data[0]);
            
            if (availableCols.length > 0) {
                const previewData = data.slice(0, 5).map(row => {
                    const previewRow = {};
                    for (const col of availableCols) {
                        previewRow[col] = row[col] || '';
                    }
                    return previewRow;
                });
                
                console.table(previewData);
            } else {
                console.table(data.slice(0, 5));
            }
        }
    }

    // Métodos auxiliares para análise específica
    analyzeByColumn(data, columnName) {
        if (!data || data.length === 0) {
            return null;
        }

        const stats = calculateStats(data, columnName);
        if (!stats) {
            return null;
        }

        // Agrupa por valores únicos
        const grouped = groupBy(data, columnName);
        const topValues = Object.entries(grouped)
            .map(([value, items]) => ({ value, count: items.length }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            stats,
            topValues,
            uniqueValues: stats.unique
        };
    }

    createSegmentAnalysis(data, segmentColumn) {
        if (!data || data.length === 0) {
            return null;
        }

        const segments = this.generateSegments(data, segmentColumn);
        const analysis = {};

        for (const [segmentName, segmentData] of Object.entries(segments)) {
            analysis[segmentName] = {
                count: segmentData.length,
                percentage: Math.round((segmentData.length / data.length) * 100 * 100) / 100,
                data: segmentData
            };
        }

        return analysis;
    }

    generateWhatsAppLinks(data, phoneColumn = 'telefone') {
        if (!data || data.length === 0) {
            return data;
        }

        return data.map(row => {
            const newRow = { ...row };
            const phone = row[phoneColumn];
            
            if (phone) {
                newRow.telefone_whatsapp = formatWhatsAppPhone(phone);
                newRow.link_whatsapp = createWhatsAppLink(phone);
            }
            
            return newRow;
        });
    }

    filterByCriteria(data, criteria) {
        if (!data || data.length === 0) {
            return data;
        }

        return filterData(data, row => {
            for (const [column, condition] of Object.entries(criteria)) {
                if (column in row) {
                    const value = row[column];
                    
                    if (typeof condition === 'function') {
                        if (!condition(value)) return false;
                    } else if (typeof condition === 'object') {
                        if (condition.min !== undefined && value < condition.min) return false;
                        if (condition.max !== undefined && value > condition.max) return false;
                        if (condition.equals !== undefined && value !== condition.equals) return false;
                        if (condition.contains !== undefined && !String(value).includes(condition.contains)) return false;
                    } else {
                        if (value !== condition) return false;
                    }
                } else {
                    return false;
                }
            }
            return true;
        });
    }
}

module.exports = LeadGenerator;
