-- 🔓 Script para desabilitar RLS temporariamente
-- Execute este script no SQL Editor do Supabase

-- Desabilitar RLS em todas as tabelas
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE saved_analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE processing_logs DISABLE ROW LEVEL SECURITY;

-- Verificar se RLS foi desabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'customers', 'orders', 'order_items', 'contacts', 'products', 'reports', 'ai_configs', 'saved_analyses', 'processing_logs');
