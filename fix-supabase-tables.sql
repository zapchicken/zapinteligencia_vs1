-- 🔧 Script para corrigir as tabelas do Supabase
-- Execute este script no SQL Editor do Supabase

-- ========================================
-- 🗑️ LIMPAR DADOS EXISTENTES (OPCIONAL)
-- ========================================

-- Descomente as linhas abaixo se quiser limpar os dados existentes
-- DELETE FROM order_items;
-- DELETE FROM orders;
-- DELETE FROM customers;
-- DELETE FROM contacts;
-- DELETE FROM products;

-- ========================================
-- 🔧 CORRIGIR TABELA CONTACTS
-- ========================================

-- Adicionar coluna telefone_limpo se não existir
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS telefone_limpo TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS recebe_propaganda BOOLEAN DEFAULT false;

-- Criar índice único para telefone_limpo
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_telefone_limpo ON contacts(telefone_limpo) WHERE telefone_limpo IS NOT NULL;

-- ========================================
-- 🔧 CORRIGIR TABELA CUSTOMERS
-- ========================================

-- Adicionar colunas necessárias
ALTER TABLE customers ADD COLUMN IF NOT EXISTS telefone_limpo TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS primeiro_nome TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bairro_normalizado TEXT;

-- Criar índice único para telefone_limpo
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_telefone_limpo ON customers(telefone_limpo) WHERE telefone_limpo IS NOT NULL;

-- ========================================
-- 🔧 CORRIGIR TABELA ORDERS
-- ========================================

-- Adicionar colunas necessárias
ALTER TABLE orders ADD COLUMN IF NOT EXISTS telefone_limpo TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "Data Fechamento" TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS valor_total DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS bairro_normalizado TEXT;

-- ========================================
-- 🔧 CORRIGIR TABELA PRODUCTS
-- ========================================

-- Adicionar colunas necessárias
ALTER TABLE products ADD COLUMN IF NOT EXISTS "Data Fec. Ped." TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantidade INTEGER DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS valor_unitario DECIMAL(10,2);

-- ========================================
-- 🔧 CRIAR TABELA ORDER_ITEMS (se não existir)
-- ========================================

CREATE TABLE IF NOT EXISTS order_items (
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
-- 🔧 DESABILITAR RLS TEMPORARIAMENTE
-- ========================================

-- Desabilitar RLS para permitir inserção de dados
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 🔧 CRIAR FUNÇÃO PARA LIMPEZA DE TELEFONE
-- ========================================

CREATE OR REPLACE FUNCTION clean_phone_number(phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone IS NULL OR phone = '' THEN
        RETURN '';
    END IF;
    
    -- Remove caracteres especiais
    phone := regexp_replace(phone, '[\(\)\-\s]', '', 'g');
    -- Remove tudo que não for número
    phone := regexp_replace(phone, '\D', '', 'g');
    
    -- Validações
    IF phone = '00000000' OR phone = '0000000000' OR phone = '00000000000' OR 
       length(phone) < 10 OR phone LIKE '000%' THEN
        RETURN '';
    END IF;
    
    RETURN phone;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 🔧 CRIAR FUNÇÃO PARA EXTRAIR PRIMEIRO NOME
-- ========================================

CREATE OR REPLACE FUNCTION extract_first_name(full_name TEXT)
RETURNS TEXT AS $$
BEGIN
    IF full_name IS NULL OR full_name = '' THEN
        RETURN '';
    END IF;
    
    full_name := trim(full_name);
    
    -- Se começa com LT_, extrai a segunda parte
    IF full_name LIKE 'LT_%' THEN
        full_name := regexp_replace(full_name, '^LT_\s*', '');
        RETURN split_part(full_name, ' ', 1);
    END IF;
    
    -- Extrai primeiro nome
    RETURN split_part(full_name, ' ', 1);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ✅ COMENTÁRIOS FINAIS
-- ========================================

COMMENT ON FUNCTION clean_phone_number IS 'Função para limpar e validar números de telefone';
COMMENT ON FUNCTION extract_first_name IS 'Função para extrair primeiro nome de nome completo';

-- Tabelas corrigidas! 🚀
-- Agora você pode fazer upload dos arquivos novamente
