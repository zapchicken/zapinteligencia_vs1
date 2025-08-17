const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');

// Logger simples sem Winston para compatibilidade com Vercel
const logger = {
    info: (message, ...args) => {
        console.log(`[INFO] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[ERROR] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        console.warn(`[WARN] ${message}`, ...args);
    },
    debug: (message, ...args) => {
        console.log(`[DEBUG] ${message}`, ...args);
    }
};

// Função para limpar número de telefone
const cleanPhoneNumber = (phone) => {
    if (!phone || phone === '') return '';
    
    // Remove caracteres especiais
    let cleanPhone = String(phone)
        .replace(/[\(\)\-\s]/g, '')
        .replace(/\D/g, '');
    
    // Verifica se é válido (não é 00000000, 0000000000, etc.)
    if (cleanPhone === '00000000' || 
        cleanPhone === '0000000000' || 
        cleanPhone === '00000000000' ||
        cleanPhone.length < 10 ||
        cleanPhone.startsWith('000')) {
        return '';
    }
    
    return cleanPhone;
};

// Função para validar telefone
const validatePhone = (phone) => {
    const cleanPhone = cleanPhoneNumber(phone);
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

// Função para extrair primeiro nome
const extractFirstName = (fullName) => {
    if (!fullName || fullName === '') return '';
    
    // Remove caracteres especiais e espaços extras
    let name = String(fullName).trim();
    
    // Se começa com LT_XX, extrai o nome após o espaço
    if (name.startsWith('LT_')) {
        const parts = name.split(' ', 2);
        if (parts.length > 1) {
            return parts[1];
        }
        return '';
    }
    
    // Extrai primeiro nome
    const firstName = name.split(' ')[0];
    
    // Filtra nomes inválidos
    const invalidNames = ['-', '???????', 'null', 'none', 'nan', ''];
    if (invalidNames.includes(firstName.toLowerCase())) {
        return '';
    }
    
    return firstName;
};

// Função para normalizar bairro
const normalizeNeighborhood = (bairro, neighborhoodMapping) => {
    if (!bairro || bairro === '') return '';
    
    const bairroLower = String(bairro).trim().toLowerCase();
    
    // Procura por correspondências no mapeamento
    for (const [normalized, variants] of Object.entries(neighborhoodMapping)) {
        if (variants.includes(bairroLower)) {
            return normalized;
        }
    }
    
    return bairroLower;
};

// Função para formatar telefone para WhatsApp
const formatWhatsAppPhone = (phone) => {
    const cleanPhone = cleanPhoneNumber(phone);
    
    if (!cleanPhone) return '';
    
    // Adiciona código do país se necessário
    let whatsappPhone = cleanPhone;
    if (whatsappPhone.startsWith('0')) {
        whatsappPhone = '55' + whatsappPhone.substring(1);
    } else if (!whatsappPhone.startsWith('55') && whatsappPhone.length === 11) {
        whatsappPhone = '55' + whatsappPhone;
    }
    
    // Verifica se tem tamanho válido
    if (whatsappPhone.length >= 12 && whatsappPhone.length <= 15) {
        return whatsappPhone;
    }
    
    return '';
};

// Função para criar link do WhatsApp
const createWhatsAppLink = (phone) => {
    const whatsappPhone = formatWhatsAppPhone(phone);
    return whatsappPhone ? `https://wa.me/${whatsappPhone}` : '';
};

// Função para salvar DataFrame
const saveDataFrame = async (data, outputDir, filename, format = 'xlsx') => {
    try {
        const filePath = path.join(outputDir, `${filename}.${format}`);
        
        if (format === 'csv') {
            const csvContent = convertToCSV(data);
            await fs.writeFile(filePath, csvContent, 'utf8');
        } else if (format === 'xlsx') {
            const XLSX = require('xlsx');
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            XLSX.writeFile(workbook, filePath);
        }
        
        logger.info(`Arquivo salvo: ${filePath}`);
        return filePath;
    } catch (error) {
        logger.error(`Erro ao salvar arquivo ${filename}.${format}:`, error);
        throw error;
    }
};

// Função para converter dados para CSV
const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            // Escapa vírgulas e aspas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
};

// Função para mostrar progresso
const showProgress = (message, total) => {
    const ora = require('ora');
    const spinner = ora(message).start();
    
    return {
        update: (current) => {
            const percent = Math.round((current / total) * 100);
            spinner.text = `${message} ${current}/${total} (${percent}%)`;
        },
        succeed: (text) => spinner.succeed(text),
        fail: (text) => spinner.fail(text),
        stop: () => spinner.stop()
    };
};

// Função para exibir informações do DataFrame
const displayDataFrameInfo = (data, title = 'DataFrame Info') => {
    console.log(chalk.cyan(`\n📊 ${title}`));
    console.log(chalk.green(`• Total de linhas: ${data.length}`));
    console.log(chalk.green(`• Total de colunas: ${data.length > 0 ? Object.keys(data[0]).length : 0}`));
    
    if (data.length > 0) {
        console.log(chalk.magenta(`• Colunas: ${Object.keys(data[0]).join(', ')}`));
        
        // Mostra primeiras linhas
        console.log(chalk.yellow('\n📋 Primeiras 3 linhas:'));
        console.table(data.slice(0, 3));
    }
};

// Função para criar tabela no console
const createTable = (data, title) => {
    const Table = require('cli-table3');
    const table = new Table({
        head: Object.keys(data[0] || {}),
        colWidths: Object.keys(data[0] || {}).map(() => 20)
    });
    
    data.forEach(row => {
        table.push(Object.values(row));
    });
    
    console.log(chalk.cyan(`\n📊 ${title}`));
    console.log(table.toString());
};

// Função para validar arquivo
const validateFile = (filePath, allowedExtensions) => {
    const ext = path.extname(filePath).toLowerCase();
    return allowedExtensions.includes(ext);
};

// Função para obter arquivos do diretório
const getFilesFromDirectory = async (dirPath, extensions) => {
    try {
        const files = await fs.readdir(dirPath);
        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return extensions.includes(ext);
        }).map(file => path.join(dirPath, file));
    } catch (error) {
        logger.error(`Erro ao ler diretório ${dirPath}:`, error);
        return [];
    }
};

// Função para calcular estatísticas
const calculateStats = (data, column) => {
    if (!data || data.length === 0) return null;
    
    const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
    
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
};

// Função para agrupar dados
const groupBy = (data, key) => {
    return data.reduce((groups, item) => {
        const group = item[key];
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(item);
        return groups;
    }, {});
};

// Função para ordenar dados
const sortBy = (data, key, order = 'asc') => {
    return [...data].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (order === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
};

// Função para filtrar dados
const filterData = (data, predicate) => {
    return data.filter(predicate);
};

// Função para formatar moeda
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Função para formatar data
const formatDate = (date, format = 'DD/MM/YYYY') => {
    return moment(date).format(format);
};

// Função para calcular diferença em dias
const daysDifference = (date1, date2) => {
    return moment(date2).diff(moment(date1), 'days');
};

// Função para verificar se data está no período
const isDateInPeriod = (date, startDate, endDate) => {
    const momentDate = moment(date);
    return momentDate.isBetween(moment(startDate), moment(endDate), 'day', '[]');
};

module.exports = {
    logger,
    cleanPhoneNumber,
    validatePhone,
    extractFirstName,
    normalizeNeighborhood,
    formatWhatsAppPhone,
    createWhatsAppLink,
    saveDataFrame,
    convertToCSV,
    showProgress,
    displayDataFrameInfo,
    createTable,
    validateFile,
    getFilesFromDirectory,
    calculateStats,
    groupBy,
    sortBy,
    filterData,
    formatCurrency,
    formatDate,
    daysDifference,
    isDateInPeriod
};
