# 🚀 Configuração Vercel - ZapInteligencia

## 📋 Variáveis de Ambiente Necessárias

No dashboard do Vercel, vá em **Settings > Environment Variables** e adicione:

### 🔑 Supabase
```
SUPABASE_URL=https://ygqwdfnxrldzertjnivh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncXdkZm54cmxkemVydGpuaXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NDI5NTYsImV4cCI6MjA3MTAxODk1Nn0.I6vkeTgujDkNQH2PIKNnicof0Za_XIkb0XJ9uS6boX0
```

### 🤖 Gemini AI
```
GEMINI_API_KEY=AIzaSyAKOtCj0FNyHUy4ZoHR6vPimqIEt6fPWZ0
```

### 🌐 Configurações do App
```
NODE_ENV=production
PORT=3000
```

## 🔄 Redeploy

Após adicionar as variáveis:
1. Vá em **Deployments**
2. Clique em **Redeploy** no último deploy
3. Aguarde o build completar

## 🔍 Diagnóstico de Problemas

### Erro 500 no endpoint `/process`

Se você está recebendo erro 500 no endpoint `/process`, siga estes passos:

1. **Verifique as variáveis de ambiente**:
   - Acesse o dashboard do Vercel
   - Vá em **Settings > Environment Variables**
   - Confirme que `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão configuradas

2. **Execute o diagnóstico**:
   - Acesse: `https://seu-app.vercel.app/diagnostic`
   - Este endpoint mostrará o status completo do sistema

3. **Verifique o status dos dados**:
   - Acesse: `https://seu-app.vercel.app/data_status`
   - Confirme se o Supabase está conectado

4. **Logs detalhados**:
   - No dashboard do Vercel, vá em **Functions**
   - Clique no deploy mais recente
   - Verifique os logs para identificar erros específicos

### Endpoints de Diagnóstico

- **`/diagnostic`** - Diagnóstico completo do sistema
- **`/data_status`** - Status dos dados e conexão Supabase
- **`/check_files`** - Verificar arquivos carregados

## ✅ Verificação

Após o redeploy, teste:
- ✅ Upload de arquivos
- ✅ Configuração da IA
- ✅ Chat com IA
- ✅ Visualização de relatórios

## 🛠️ Solução de Problemas Comuns

### Problema: "Supabase não configurado"
**Solução**: Configure as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` no Vercel

### Problema: "Erro de conexão com Supabase"
**Solução**: 
1. Verifique se as credenciais estão corretas
2. Confirme se o projeto Supabase está ativo
3. Verifique as políticas de segurança (RLS)

### Problema: "Nenhum arquivo carregado"
**Solução**: Faça upload dos arquivos antes de processar os dados

### Problema: Timeout nas requisições
**Solução**: 
1. Verifique o tamanho dos arquivos (máximo 50MB)
2. Confirme se o Supabase está respondendo
3. Verifique a conectividade de rede
