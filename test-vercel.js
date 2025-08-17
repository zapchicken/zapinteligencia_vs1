// 🧪 Script para testar se a aplicação está funcionando

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

console.log('🔍 Testando configuração...')
console.log('')

// Verificar variáveis de ambiente
console.log('📋 Variáveis de ambiente:')
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado')
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado')
console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Configurado' : '❌ Não configurado')
console.log('NODE_ENV:', process.env.NODE_ENV || 'development')
console.log('')

// Testar conexão com Supabase
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('🔗 Testando conexão com Supabase...')
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
    
    supabase
        .from('companies')
        .select('count')
        .limit(1)
        .then(({ data, error }) => {
            if (error) {
                console.log('❌ Erro Supabase:', error.message)
            } else {
                console.log('✅ Supabase conectado!')
            }
        })
        .catch(err => {
            console.log('❌ Erro de conexão:', err.message)
        })
} else {
    console.log('❌ Variáveis do Supabase não configuradas')
}

console.log('')
console.log('🎯 Para verificar a aplicação:')
console.log('1. Acesse a URL do Vercel')
console.log('2. Verifique se aparece a interface')
console.log('3. Teste o upload de arquivos')
console.log('4. Configure a IA Gemini')
