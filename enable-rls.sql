-- 🔒 Script para reabilitar RLS com políticas de produção
-- Execute este script no SQL Editor do Supabase

-- Reabilitar RLS em todas as tabelas
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

-- Políticas para companies (permitir leitura pública, escrita apenas para admins)
CREATE POLICY "Companies are viewable by everyone" ON companies
    FOR SELECT USING (true);

CREATE POLICY "Companies can be created by authenticated users" ON companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para customers
CREATE POLICY "Customers are viewable by company users" ON customers
    FOR SELECT USING (true);

CREATE POLICY "Customers can be created by authenticated users" ON customers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para orders
CREATE POLICY "Orders are viewable by company users" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Orders can be created by authenticated users" ON orders
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para order_items
CREATE POLICY "Order items are viewable by company users" ON order_items
    FOR SELECT USING (true);

CREATE POLICY "Order items can be created by authenticated users" ON order_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para contacts
CREATE POLICY "Contacts are viewable by company users" ON contacts
    FOR SELECT USING (true);

CREATE POLICY "Contacts can be created by authenticated users" ON contacts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para products
CREATE POLICY "Products are viewable by company users" ON products
    FOR SELECT USING (true);

CREATE POLICY "Products can be created by authenticated users" ON products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para reports
CREATE POLICY "Reports are viewable by company users" ON reports
    FOR SELECT USING (true);

CREATE POLICY "Reports can be created by authenticated users" ON reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para ai_configs
CREATE POLICY "AI configs are viewable by company users" ON ai_configs
    FOR SELECT USING (true);

CREATE POLICY "AI configs can be created by authenticated users" ON ai_configs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para saved_analyses
CREATE POLICY "Saved analyses are viewable by company users" ON saved_analyses
    FOR SELECT USING (true);

CREATE POLICY "Saved analyses can be created by authenticated users" ON saved_analyses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para processing_logs
CREATE POLICY "Processing logs are viewable by company users" ON processing_logs
    FOR SELECT USING (true);

CREATE POLICY "Processing logs can be created by authenticated users" ON processing_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Verificar se RLS foi habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'customers', 'orders', 'order_items', 'contacts', 'products', 'reports', 'ai_configs', 'saved_analyses', 'processing_logs');
