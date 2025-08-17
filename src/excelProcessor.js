const fs = require('fs-extra');
const path = require('path');
const XLSX = require('xlsx');
const { 
    logger, 
    validateFile, 
    getFilesFromDirectory, 
    showProgress, 
    displayDataFrameInfo,
    cleanPhoneNumber,
    validatePhone,
    calculateStats,
    groupBy,
    sortBy,
    filterData
} = require('./utils');
const { FILE_CONFIG, VALIDATION_CONFIG } = require('../config');

class ExcelProcessor {
    constructor(inputDir) {
        this.inputDir = inputDir;
        this.dataframes = {};
        this.processedData = {};
    }

    async loadAllExcelFiles() {
        logger.info(`Carregando arquivos Excel de: ${this.inputDir}`);
        
        const excelFiles = await getFilesFromDirectory(this.inputDir, ['.xlsx', '.xls']);
        
        if (excelFiles.length === 0) {
            logger.warn('Nenhum arquivo Excel encontrado no diretório de entrada');
            return {};
        }

        const progress = showProgress('Carregando arquivos Excel...', excelFiles.length);
        
        for (let i = 0; i < excelFiles.length; i++) {
            const filePath = excelFiles[i];
            try {
                // Carrega todas as abas do arquivo
                const workbook = XLSX.readFile(filePath);
                
                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (data.length > 0) {
                        // Converte para array de objetos
                        const headers = data[0];
                        const rows = data.slice(1).map(row => {
                            const obj = {};
                            headers.forEach((header, index) => {
                                obj[header] = row[index] || '';
                            });
                            return obj;
                        });
                        
                        const key = `${path.basename(filePath, path.extname(filePath))}_${sheetName}`;
                        this.dataframes[key] = rows;
                        
                        logger.info(`✓ Carregado: ${key} (${rows.length} linhas)`);
                    }
                }
                
                progress.update(i + 1);
            } catch (error) {
                logger.error(`✗ Erro ao carregar ${filePath}:`, error);
                progress.update(i + 1);
            }
        }
        
        progress.succeed(`Carregados ${Object.keys(this.dataframes).length} arquivos`);
        return this.dataframes;
    }

    displayLoadedFiles() {
        if (Object.keys(this.dataframes).length === 0) {
            console.log('Nenhum arquivo carregado!');
            return;
        }

        console.log('\n📊 Arquivos Excel Carregados:');
        console.log('─'.repeat(80));
        
        for (const [key, data] of Object.entries(this.dataframes)) {
            console.log(`📄 ${key}: ${data.length} linhas, ${data.length > 0 ? Object.keys(data[0]).length : 0} colunas`);
        }
    }

    analyzeDataframes() {
        for (const [key, data] of Object.entries(this.dataframes)) {
            console.log(`\n🔍 Análise: ${key}`);
            displayDataFrameInfo(data, `Estrutura de ${key}`);
            
            // Análise de colunas
            if (data.length > 0) {
                const columns = Object.keys(data[0]);
                console.log('\n📋 Análise de colunas:');
                
                for (const column of columns) {
                    const stats = calculateStats(data, column);
                    if (stats) {
                        console.log(`  • ${column}: ${stats.count} valores, ${stats.unique} únicos`);
                        if (stats.mean !== null) {
                            console.log(`    Média: ${stats.mean.toFixed(2)}, Min: ${stats.min}, Max: ${stats.max}`);
                        }
                    }
                }
            }
        }
    }

    findPhoneColumns() {
        const phoneColumns = {};
        
        for (const [key, data] of Object.entries(this.dataframes)) {
            const potentialPhoneCols = [];
            
            if (data.length === 0) continue;
            
            const columns = Object.keys(data[0]);
            
            for (const col of columns) {
                const colLower = col.toLowerCase();
                
                // Verifica se o nome da coluna sugere telefone
                if (colLower.includes('telefone') || 
                    colLower.includes('phone') || 
                    colLower.includes('celular') || 
                    colLower.includes('whatsapp') || 
                    colLower.includes('contato') ||
                    colLower.includes('fone')) {
                    potentialPhoneCols.push(col);
                } else {
                    // Verifica se a coluna contém dados que parecem telefones
                    const sampleData = data.slice(0, 10).map(row => row[col]).filter(val => val);
                    const phoneCount = sampleData.filter(val => validatePhone(val)).length;
                    
                    if (phoneCount > 0) {
                        potentialPhoneCols.push(col);
                    }
                }
            }
            
            if (potentialPhoneCols.length > 0) {
                phoneColumns[key] = potentialPhoneCols;
            }
        }
        
        return phoneColumns;
    }

    cleanPhoneData(phoneColumns) {
        const cleanedData = {};
        
        const progress = showProgress('Limpando dados de telefone...', Object.keys(phoneColumns).length);
        let current = 0;
        
        for (const [key, cols] of Object.entries(phoneColumns)) {
            const data = this.dataframes[key];
            const cleanedRows = [];
            
            for (const row of data) {
                const cleanedRow = { ...row };
                let hasValidPhone = false;
                
                for (const col of cols) {
                    if (col in cleanedRow) {
                        const cleanPhone = cleanPhoneNumber(cleanedRow[col]);
                        cleanedRow[`${col}_limpo`] = cleanPhone;
                        
                        if (cleanPhone) {
                            hasValidPhone = true;
                        }
                    }
                }
                
                if (hasValidPhone) {
                    cleanedRows.push(cleanedRow);
                }
            }
            
            cleanedData[key] = cleanedRows;
            current++;
            progress.update(current);
        }
        
        progress.succeed('Dados de telefone limpos');
        return cleanedData;
    }

    mergeDataframes(cleanedData, mergeStrategy = 'union') {
        if (Object.keys(cleanedData).length === 0) {
            return [];
        }

        let mergedData = [];
        
        if (mergeStrategy === 'union') {
            // Une todos os DataFrames
            for (const data of Object.values(cleanedData)) {
                mergedData = mergedData.concat(data);
            }
        } else if (mergeStrategy === 'intersection') {
            // Mantém apenas colunas comuns
            const allData = Object.values(cleanedData);
            const commonCols = allData.reduce((common, data) => {
                if (data.length === 0) return common;
                const cols = Object.keys(data[0]);
                return common.filter(col => cols.includes(col));
            }, Object.keys(allData[0][0] || {}));
            
            for (const data of allData) {
                const filteredData = data.map(row => {
                    const filteredRow = {};
                    for (const col of commonCols) {
                        filteredRow[col] = row[col] || '';
                    }
                    return filteredRow;
                });
                mergedData = mergedData.concat(filteredData);
            }
        } else {
            throw new Error(`Estratégia de merge não suportada: ${mergeStrategy}`);
        }
        
        // Remove duplicatas baseado em telefone limpo
        const uniqueData = [];
        const seenPhones = new Set();
        
        for (const row of mergedData) {
            const phoneCols = Object.keys(row).filter(col => col.includes('_limpo'));
            let isDuplicate = false;
            
            for (const phoneCol of phoneCols) {
                const phone = row[phoneCol];
                if (phone && seenPhones.has(phone)) {
                    isDuplicate = true;
                    break;
                }
                if (phone) {
                    seenPhones.add(phone);
                }
            }
            
            if (!isDuplicate) {
                uniqueData.push(row);
            }
        }
        
        return uniqueData;
    }

    generateLeadsReport(finalData) {
        const report = {
            totalLeads: finalData.length,
            columns: finalData.length > 0 ? Object.keys(finalData[0]) : [],
            validPhones: 0,
            invalidPhones: 0
        };
        
        // Conta telefones válidos
        const phoneCols = report.columns.filter(col => 
            col.toLowerCase().includes('telefone') || 
            col.toLowerCase().includes('phone') ||
            col.includes('_limpo')
        );
        
        for (const row of finalData) {
            let hasValidPhone = false;
            for (const col of phoneCols) {
                if (row[col] && validatePhone(row[col])) {
                    hasValidPhone = true;
                    break;
                }
            }
            
            if (hasValidPhone) {
                report.validPhones++;
            } else {
                report.invalidPhones++;
            }
        }
        
        return report;
    }

    // Métodos auxiliares para análise específica
    findColumnByName(data, possibleNames) {
        if (data.length === 0) return null;
        
        const columns = Object.keys(data[0]);
        
        for (const name of possibleNames) {
            const found = columns.find(col => 
                col.toLowerCase().includes(name.toLowerCase())
            );
            if (found) return found;
        }
        
        return null;
    }

    getColumnStats(data, columnName) {
        if (!data || data.length === 0) return null;
        
        const values = data.map(row => row[columnName]).filter(val => val !== null && val !== undefined);
        
        if (values.length === 0) return null;
        
        const numericValues = values.filter(val => !isNaN(parseFloat(val))).map(val => parseFloat(val));
        
        return {
            count: values.length,
            unique: new Set(values).size,
            min: numericValues.length > 0 ? Math.min(...numericValues) : null,
            max: numericValues.length > 0 ? Math.max(...numericValues) : null,
            sum: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) : null,
            mean: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : null
        };
    }
}

module.exports = ExcelProcessor;
