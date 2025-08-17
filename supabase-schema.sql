-- 🚀 Schema Completo Supabase - ZapInteligencia
-- Baseado nos arquivos: contacts.csv, clientes.xlsx, pedidos.xlsx, itens.xlsx

-- ========================================
-- 🔐 CONFIGURAÇÃO INICIAL
-- ========================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 👥 TABELA DE USUÁRIOS
-- ========================================

CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  company_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 🏢 TABELA DE EMPRESAS
-- ========================================

CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  settings JSONB DEFAULT '{}',
  gemini_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign key na tabela users
ALTER TABLE users ADD CONSTRAINT fk_users_company 
  FOREIGN KEY (company_id) REFERENCES companies(id);

-- ========================================
-- 👤 TABELA DE CLIENTES (baseada em Lista-Clientes.xlsx)
-- ========================================

CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  
  -- Endereço
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Dados do negócio
  business_name TEXT,
  business_phone TEXT,
  business_email TEXT,
  
  -- Histórico
  first_order_date TIMESTAMP WITH TIME ZONE,
  last_order_date TIMESTAMP WITH TIME ZONE,
  total_orders INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  average_ticket DECIMAL(10,2) DEFAULT 0,
  
  -- Status e segmentação
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vip', 'new')),
  rfm_score TEXT, -- R, F, M scores
  segment TEXT, -- VIP, Regular, Inativo, etc.
  
  -- Metadados
  source TEXT, -- Como foi cadastrado
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 🛒 TABELA DE PEDIDOS (baseada em Todos os pedidos.xlsx)
-- ========================================

CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Código do pedido
  order_code TEXT,
  
  -- Cliente
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  customer_neighborhood TEXT,
  customer_city TEXT,
  customer_state TEXT,
  customer_zip_code TEXT,
  
  -- Datas
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  closing_date TIMESTAMP WITH TIME ZONE,
  delivery_date TIMESTAMP WITH TIME ZONE,
  
  -- Valores
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Origem e tipo
  origin TEXT, -- WhatsApp, telefone, aplicativo, etc.
  order_type TEXT, -- Delivery, retirada, mesa
  payment_method TEXT,
  
  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled')),
  
  -- Mesa/Comanda
  table_number TEXT,
  command_number TEXT,
  
  -- Observações
  notes TEXT,
  internal_notes TEXT,
  
  -- Metadados
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 📦 TABELA DE ITENS DOS PEDIDOS (baseada em Historico_Itens_Vendidos.xlsx)
-- ========================================

CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Produto
  product_name TEXT NOT NULL,
  product_code TEXT,
  product_category TEXT,
  product_type TEXT,
  
  -- Quantidade e valores
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Produto original (se aplicável)
  original_product_value DECIMAL(10,2),
  
  -- Mesa/Comanda
  table_number TEXT,
  command_number TEXT,
  
  -- Datas
  item_date TIMESTAMP WITH TIME ZONE,
  order_date TIMESTAMP WITH TIME ZONE,
  closing_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  order_status TEXT,
  
  -- Observações
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 📞 TABELA DE CONTATOS (baseada em contacts.csv)
-- ========================================

CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  
  -- Endereço
  address TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Dados do negócio
  business_name TEXT,
  business_phone TEXT,
  business_email TEXT,
  
  -- Categorização
  category TEXT,
  tags TEXT[],
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  
  -- Metadados
  source TEXT, -- Google Contacts, manual, etc.
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 🛍️ TABELA DE PRODUTOS
-- ========================================

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  code TEXT,
  category TEXT,
  type TEXT,
  
  -- Preços
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  -- Metadados
  description TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 📊 TABELA DE RELATÓRIOS
-- ========================================

CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  -- Dados do relatório
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- sales, customers, products, geographic, etc.
  description TEXT,
  
  -- Dados e filtros
  data JSONB NOT NULL,
  filters JSONB DEFAULT '{}',
  parameters JSONB DEFAULT '{}',
  
  -- Configurações
  is_public BOOLEAN DEFAULT false,
  is_scheduled BOOLEAN DEFAULT false,
  schedule_config JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 🤖 TABELA DE CONFIGURAÇÕES DA IA
-- ========================================

CREATE TABLE ai_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Configurações da API
  gemini_api_key TEXT,
  openai_api_key TEXT,
  
  -- Configurações de análise
  analysis_settings JSONB DEFAULT '{}',
  prompt_templates JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 📈 TABELA DE ANÁLISES SALVAS
-- ========================================

CREATE TABLE saved_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  -- Dados da análise
  name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  -- Metadados
  analysis_type TEXT, -- sales, customers, products, etc.
  data_snapshot JSONB,
  
  -- Configurações
  is_favorite BOOLEAN DEFAULT false,
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 🔄 TABELA DE LOGS DE PROCESSAMENTO
-- ========================================

CREATE TABLE processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  -- Dados do processamento
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  processing_type TEXT NOT NULL, -- upload, migration, analysis, etc.
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Resultados
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  -- Erros
  error_message TEXT,
  error_details JSONB,
  
  -- Metadados
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER
);

-- ========================================
-- 🎯 ÍNDICES PARA PERFORMANCE
-- ========================================

-- Índices para customers
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_neighborhood ON customers(neighborhood);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_last_order_date ON customers(last_order_date);

-- Índices para orders
CREATE INDEX idx_orders_company_id ON orders(company_id);
CREATE INDEX idx_orders_customer_name ON orders(customer_name);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_closing_date ON orders(closing_date);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_origin ON orders(origin);
CREATE INDEX idx_orders_total_amount ON orders(total_amount);

-- Índices para order_items
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_company_id ON order_items(company_id);
CREATE INDEX idx_order_items_product_name ON order_items(product_name);
CREATE INDEX idx_order_items_product_category ON order_items(product_category);
CREATE INDEX idx_order_items_item_date ON order_items(item_date);

-- Índices para contacts
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_status ON contacts(status);

-- Índices para products
CREATE INDEX idx_products_company_id ON products(company_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);

-- ========================================
-- 🔐 POLÍTICAS DE SEGURANÇA (RLS)
-- ========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs ENABLE ROW LEVEL SECURITY;

-- Política para companies (usuários só veem sua própria empresa)
CREATE POLICY "Users can only see their own company" ON companies
  FOR ALL USING (id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para customers
CREATE POLICY "Users can only see their company customers" ON customers
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para orders
CREATE POLICY "Users can only see their company orders" ON orders
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para order_items
CREATE POLICY "Users can only see their company order items" ON order_items
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para contacts
CREATE POLICY "Users can only see their company contacts" ON contacts
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para products
CREATE POLICY "Users can only see their company products" ON products
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para reports
CREATE POLICY "Users can only see their company reports" ON reports
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para ai_configs
CREATE POLICY "Users can only see their company AI configs" ON ai_configs
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para saved_analyses
CREATE POLICY "Users can only see their company saved analyses" ON saved_analyses
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Política para processing_logs
CREATE POLICY "Users can only see their company processing logs" ON processing_logs
  FOR ALL USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- ========================================
-- 🔄 FUNÇÕES ÚTEIS
-- ========================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_configs_updated_at BEFORE UPDATE ON ai_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 📊 FUNÇÕES DE ANÁLISE
-- ========================================

-- Função para análise de clientes
CREATE OR REPLACE FUNCTION get_customer_analysis(company_uuid UUID)
RETURNS TABLE (
  customer_name TEXT,
  total_orders INTEGER,
  total_spent DECIMAL,
  average_ticket DECIMAL,
  last_order_date TIMESTAMP WITH TIME ZONE,
  days_since_last_order INTEGER,
  rfm_score TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name,
    c.total_orders,
    c.total_spent,
    c.average_ticket,
    c.last_order_date,
    EXTRACT(DAY FROM (NOW() - c.last_order_date))::INTEGER as days_since_last_order,
    c.rfm_score
  FROM customers c
  WHERE c.company_id = company_uuid
  ORDER BY c.total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para top clientes
CREATE OR REPLACE FUNCTION get_top_customers(company_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  customer_name TEXT,
  total_orders INTEGER,
  total_spent DECIMAL,
  average_ticket DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name,
    c.total_orders,
    c.total_spent,
    c.average_ticket
  FROM customers c
  WHERE c.company_id = company_uuid
  ORDER BY c.total_spent DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Função para gráfico de vendas
CREATE OR REPLACE FUNCTION get_sales_chart(company_uuid UUID, days_count INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total_orders INTEGER,
  total_revenue DECIMAL,
  unique_customers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(o.order_date) as date,
    COUNT(*) as total_orders,
    SUM(o.total_amount) as total_revenue,
    COUNT(DISTINCT o.customer_name) as unique_customers
  FROM orders o
  WHERE o.company_id = company_uuid
    AND o.order_date >= NOW() - INTERVAL '1 day' * days_count
  GROUP BY DATE(o.order_date)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ✅ COMENTÁRIOS FINAIS
-- ========================================

COMMENT ON TABLE customers IS 'Base de clientes da empresa com análise RFM';
COMMENT ON TABLE orders IS 'Histórico completo de pedidos';
COMMENT ON TABLE order_items IS 'Itens detalhados de cada pedido';
COMMENT ON TABLE contacts IS 'Contatos do Google Contacts e outros';
COMMENT ON TABLE products IS 'Catálogo de produtos da empresa';
COMMENT ON TABLE reports IS 'Relatórios salvos e compartilhados';
COMMENT ON TABLE ai_configs IS 'Configurações da IA (Gemini, OpenAI)';
COMMENT ON TABLE saved_analyses IS 'Análises salvas pelos usuários';
COMMENT ON TABLE processing_logs IS 'Logs de processamento de arquivos';

-- Schema completo criado! 🚀
