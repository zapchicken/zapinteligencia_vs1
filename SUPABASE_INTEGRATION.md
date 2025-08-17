# 🚀 Integração Supabase - ZapInteligencia

## 🎯 Visão Geral

Integração do Supabase para transformar o ZapInteligencia em uma aplicação web completa com banco de dados, autenticação e sincronização em tempo real.

## 🏗️ Arquitetura Proposta

### **📊 Estrutura do Banco de Dados**

```sql
-- Tabela de Usuários (extends auth.users do Supabase)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Empresas/Clientes
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Pedidos
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  neighborhood TEXT,
  order_date TIMESTAMP NOT NULL,
  closing_date TIMESTAMP,
  total_amount DECIMAL(10,2) NOT NULL,
  origin TEXT, -- WhatsApp, telefone, etc.
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Itens dos Pedidos
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_category TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  neighborhood TEXT,
  first_order_date TIMESTAMP,
  last_order_date TIMESTAMP,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  average_ticket DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, inactive, vip
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Produtos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  category TEXT,
  price DECIMAL(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Relatórios
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL, -- sales, customers, products, etc.
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Configurações da IA
CREATE TABLE ai_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  gemini_api_key TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **🔐 Políticas de Segurança (RLS)**

```sql
-- Política para usuários verem apenas dados da sua empresa
CREATE POLICY "Users can only see their company data" ON orders
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Política para clientes
CREATE POLICY "Users can only see their company customers" ON customers
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Política para produtos
CREATE POLICY "Users can only see their company products" ON products
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );
```

## 🔄 Fluxo de Dados

### **1. Upload e Processamento**
```
Arquivo Excel/CSV → Processamento → Supabase → Interface Web
```

### **2. Sincronização em Tempo Real**
```
Supabase ←→ Interface Web ←→ Múltiplos Usuários
```

### **3. Análises e Relatórios**
```
Dados Supabase → IA Gemini → Relatórios → Supabase
```

## 🛠️ Implementação Técnica

### **📦 Dependências Necessárias**

```json
{
  "@supabase/supabase-js": "^2.39.0",
  "@supabase/auth-helpers-nextjs": "^0.8.7",
  "next": "^14.0.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0"
}
```

### **🔧 Configuração do Cliente**

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### **📊 Migração de Dados**

```javascript
// scripts/migrate-to-supabase.js
import { supabase } from '../lib/supabase.js'
import { ZapChickenProcessor } from '../src/zapchickenProcessor.js'

async function migrateData() {
  // 1. Processa arquivos existentes
  const processor = new ZapChickenProcessor()
  const data = await processor.processAllFiles()
  
  // 2. Insere no Supabase
  for (const order of data.pedidos) {
    await supabase
      .from('orders')
      .insert({
        customer_name: order.Cliente,
        customer_phone: order.Telefone,
        neighborhood: order.Bairro,
        order_date: order['Data Ab. Ped.'],
        closing_date: order['Data Fechamento'],
        total_amount: order.Total,
        origin: order.Origem
      })
  }
}
```

## 🎨 Interface Web Moderna

### **📱 Páginas Principais**

1. **Dashboard** - Visão geral em tempo real
2. **Upload** - Interface drag & drop moderna
3. **Relatórios** - Gráficos interativos
4. **Clientes** - Gestão de clientes
5. **Produtos** - Catálogo de produtos
6. **Configurações** - Configurações da empresa

### **🔐 Sistema de Autenticação**

```javascript
// hooks/useAuth.js
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    setLoading(false)

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

## 📈 Benefícios da Migração

### **🚀 Performance**
- **Cache inteligente** - Dados em memória
- **Queries otimizadas** - PostgreSQL nativo
- **CDN global** - Supabase Edge Functions

### **🔒 Segurança**
- **Autenticação robusta** - Supabase Auth
- **Row Level Security** - Controle granular
- **Backup automático** - Diário e pontual

### **📱 Experiência do Usuário**
- **Tempo real** - Atualizações instantâneas
- **Offline** - Funciona sem internet
- **Multiplataforma** - Web, mobile, desktop

### **🛠️ Desenvolvimento**
- **API automática** - REST e GraphQL
- **TypeScript** - Tipagem automática
- **Deploy simples** - Vercel + Supabase

## 🔄 Migração Gradual

### **Fase 1: Setup Inicial**
1. Configurar projeto Supabase
2. Criar tabelas e políticas
3. Implementar autenticação básica

### **Fase 2: Migração de Dados**
1. Script de migração dos dados existentes
2. Validação e limpeza
3. Testes de integridade

### **Fase 3: Interface Moderna**
1. Dashboard em tempo real
2. Upload via Supabase Storage
3. Relatórios interativos

### **Fase 4: Funcionalidades Avançadas**
1. IA integrada com dados em tempo real
2. Notificações push
3. API pública para integrações

## 💰 Custos Estimados

### **Supabase (Gratuito até 500MB)**
- **Pro**: $25/mês (8GB, 100GB transfer)
- **Team**: $599/mês (100GB, 2TB transfer)

### **Vercel (Deploy)**
- **Hobby**: Gratuito
- **Pro**: $20/mês

## 🎯 Próximos Passos

1. **Criar projeto Supabase**
2. **Configurar banco de dados**
3. **Implementar autenticação**
4. **Migrar dados existentes**
5. **Desenvolver interface moderna**
6. **Testes e deploy**

---

**Transforme o ZapInteligencia em uma aplicação web moderna e escalável! 🚀**
