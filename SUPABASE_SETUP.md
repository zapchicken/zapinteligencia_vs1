# 🚀 Guia Completo - Configuração Supabase

## 📋 Pré-requisitos

- Conta no Supabase (gratuita)
- Node.js instalado
- Arquivos da ZapChicken prontos

## 🎯 Passo 1: Criar Projeto Supabase

### 1.1 Acessar Supabase
- Vá para [supabase.com](https://supabase.com)
- Faça login ou crie uma conta
- Clique em "New Project"

### 1.2 Configurar Projeto
```
Nome do Projeto: zapinteligencia
Database Password: [senha forte]
Region: São Paulo (sa-east-1)
```

### 1.3 Aguardar Setup
- ⏱️ Aguarde ~2 minutos para o projeto ser criado
- ✅ Status: "Project is ready"

## 🔧 Passo 2: Configurar Banco de Dados

### 2.1 Acessar SQL Editor
- No dashboard do Supabase, vá em "SQL Editor"
- Clique em "New Query"

### 2.2 Executar Schema
- Copie todo o conteúdo do arquivo `supabase-schema.sql`
- Cole no SQL Editor
- Clique em "Run" (ou Ctrl+Enter)

### 2.3 Verificar Tabelas
- Vá em "Table Editor"
- Confirme que as tabelas foram criadas:
  - ✅ `users`
  - ✅ `companies`
  - ✅ `customers`
  - ✅ `orders`
  - ✅ `order_items`
  - ✅ `contacts`
  - ✅ `products`
  - ✅ `reports`
  - ✅ `ai_configs`
  - ✅ `saved_analyses`
  - ✅ `processing_logs`

## 🔐 Passo 3: Configurar Autenticação

### 3.1 Configurar Auth
- Vá em "Authentication" > "Settings"
- Configure:
  ```
  Site URL: http://localhost:3000
  Redirect URLs: http://localhost:3000/auth/callback
  ```

### 3.2 Criar Usuário Admin
- Vá em "Authentication" > "Users"
- Clique em "Add User"
- Preencha:
  ```
  Email: admin@zapchicken.com
  Password: [senha forte]
  ```

## 🔑 Passo 4: Obter Credenciais

### 4.1 API Keys
- Vá em "Settings" > "API"
- Copie:
  ```
  Project URL: https://[project-id].supabase.co
  anon public: [sua-chave-anon]
  service_role: [sua-chave-service] (manter segura!)
  ```

### 4.2 Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[sua-chave-anon]
SUPABASE_SERVICE_KEY=[sua-chave-service]

# Gemini (já configurado)
GEMINI_API_KEY=AIzaSyAKOtCj0FNyHUy4ZoHR6vPimqIEt6fPWZ0
```

## 📦 Passo 5: Instalar Dependências

```bash
npm install @supabase/supabase-js
```

## 🚀 Passo 6: Executar Migração

### 6.1 Preparar Script
- Certifique-se que os arquivos estão na pasta `uploads/`
- Verifique se o `.env` está configurado

### 6.2 Executar Migração
```bash
node migrate-data.js
```

### 6.3 Verificar Resultados
- Vá em "Table Editor" no Supabase
- Confirme que os dados foram inseridos:
  - 📊 ~9.860 clientes
  - 🛒 ~2.351 pedidos
  - 📦 ~8.514 itens
  - 📞 ~5.424 contatos

## 🎨 Passo 7: Interface Web (Opcional)

### 7.1 Configurar Next.js
```bash
npx create-next-app@latest zapinteligencia-web --typescript --tailwind --app
cd zapinteligencia-web
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 7.2 Configurar Supabase Client
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## 🔍 Passo 8: Testar Conexão

### 8.1 Teste Básico
```javascript
// test-connection.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

async function testConnection() {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('❌ Erro:', error)
  } else {
    console.log('✅ Conexão OK:', data)
  }
}

testConnection()
```

## 📊 Passo 9: Verificar Dados

### 9.1 Dashboard Supabase
- Vá em "Table Editor"
- Clique em qualquer tabela
- Verifique os dados migrados

### 9.2 Queries de Teste
```sql
-- Contar registros
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM order_items;

-- Ver primeiros registros
SELECT * FROM customers LIMIT 5;
SELECT * FROM orders LIMIT 5;
```

## 🎯 Próximos Passos

### Opcional: Interface Web Moderna
1. **Dashboard em tempo real**
2. **Upload via drag & drop**
3. **Relatórios interativos**
4. **Análises com IA**

### Opcional: Deploy
1. **Vercel** (gratuito)
2. **Netlify** (gratuito)
3. **Railway** (gratuito)

## 🆘 Troubleshooting

### Erro de Conexão
```bash
# Verificar variáveis de ambiente
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

### Erro de RLS
```sql
-- Desabilitar RLS temporariamente para testes
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
```

### Erro de Migração
```bash
# Verificar logs
tail -f logs/migration.log
```

## 📞 Suporte

- **Documentação**: [supabase.com/docs](https://supabase.com/docs)
- **Discord**: [discord.gg/supabase](https://discord.gg/supabase)
- **GitHub**: [github.com/supabase/supabase](https://github.com/supabase/supabase)

---

**🎉 Parabéns! Seu Supabase está configurado e pronto para uso!**
