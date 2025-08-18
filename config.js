require('dotenv').config();
const path = require('path');
const fs = require('fs-extra');

// Configurações do Supabase
const SUPABASE_CONFIG = {
    url: process.env.SUPABASE_URL || 'https://ygqwdfnxrldzertjnivh.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncXdkZm54cmxkemVydGpuaXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDI5NTYsImV4cCI6MjA3MTAxODk1Nn0.I6vkeTgujDkNQH2PIKNnicof0Za_XIkb0XJ9uS6boX0'
};

// Configurações da API Gemini
const GEMINI_CONFIG = {
    apiKey: process.env.GEMINI_API_KEY || '',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    timeout: 30000
};

// Configurações do servidor
const SERVER_CONFIG = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    sessionSecret: process.env.SESSION_SECRET || 'zapinteligencia_secret_key_2024'
};

// Configurações de processamento
const PROCESSING_CONFIG = {
    defaultInactiveDays: parseInt(process.env.DEFAULT_INACTIVE_DAYS) || 30,
    defaultMinTicket: parseFloat(process.env.DEFAULT_MIN_TICKET) || 50.0,
    analysisPeriodMonths: parseInt(process.env.ANALYSIS_PERIOD_MONTHS) || 6,
    deliveryRadiusKm: parseInt(process.env.DELIVERY_RADIUS_KM) || 17,
    highFrequencyDays: 7,
    moderateFrequencyDays: 15,
    lowFrequencyDays: 30
};

// Configurações de arquivos
const FILE_CONFIG = {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
    uploadPath: process.env.UPLOAD_PATH || './data/input',
    outputPath: process.env.OUTPUT_PATH || './data/output',
    allowedExtensions: ['.csv', '.xlsx', '.xls'],
    defaultEncoding: 'utf-8'
};

// Configurações de logging
const LOG_CONFIG = {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || '/tmp/app.log', // Usar /tmp no Vercel
    format: '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
};

// Configurações de segurança
const SECURITY_CONFIG = {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutos
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
};

// Configurações de validação
const VALIDATION_CONFIG = {
    minPhoneLength: 10,
    maxPhoneLength: 15,
    minNameLength: 2,
    maxNameLength: 100
};

// Configurações de normalização de bairros
const NEIGHBORHOOD_MAPPING = {
    'fontanella': ['fontanela', 'fontanella', 'fortanella', 'fontanela'],
    'jardim dona luiza': ['jardim dona luiza', 'jardim d. luiza', 'dona luiza'],
    'nova jaguariuna': ['nova jaguariúna', 'nova jaguariuna'],
    'centro': ['centro', 'centro da cidade'],
    'zambom': ['zambom', 'jardim zambom'],
    'capotuna': ['capotuna', 'capotuna'],
    'triunfo': ['triunfo', 'jardim triunfo'],
    'nassif': ['nassif', 'nucleo res. dr. joao a nassif'],
    'capela de santo antonio': ['capela de santo antonio', 'capela santo antonio'],
    'chácara primavera': ['chácara primavera', 'chacara primavera', 'primavera'],
    'jardim europa': ['jardim europa', 'europa'],
    'jardim mauá ii': ['jardim mauá ii', 'jardim maua ii', 'mauá ii'],
    'jardim santa cruz': ['jardim santa cruz', 'santa cruz'],
    'roseira de cima': ['roseira de cima', 'roseira'],
    'tamboré': ['tamboré', 'tambore'],
    'nova jaguariúna': ['nova jaguariúna', 'nova jaguariuna']
};

// Função para criar diretórios necessários
const createDirectories = async () => {
    const dirs = [
        FILE_CONFIG.uploadPath,
        FILE_CONFIG.outputPath,
        path.dirname(LOG_CONFIG.file)
    ];
    
    for (const dir of dirs) {
        await fs.ensureDir(dir);
    }
};

// Função para validar configurações
const validateConfig = () => {
    const errors = [];
    
    if (!SUPABASE_CONFIG.url) {
        errors.push('SUPABASE_URL não configurada');
    }
    
    if (!SUPABASE_CONFIG.anonKey) {
        errors.push('SUPABASE_ANON_KEY não configurada');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configurações inválidas: ${errors.join(', ')}`);
    }
};

module.exports = {
    SUPABASE_CONFIG,
    GEMINI_CONFIG,
    SERVER_CONFIG,
    PROCESSING_CONFIG,
    FILE_CONFIG,
    LOG_CONFIG,
    SECURITY_CONFIG,
    VALIDATION_CONFIG,
    NEIGHBORHOOD_MAPPING,
    createDirectories,
    validateConfig
};
