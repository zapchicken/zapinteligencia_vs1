# 🚀 Guia Rápido - ZapInteligencia

> **Comece a usar em 5 minutos!**

## ⚡ Início Rápido

### 1️⃣ **Instalação (2 minutos)**
```bash
# 1. Instale as dependências
npm install

# 2. Configure o ambiente
npm run setup

# 3. Coloque seus arquivos na pasta data/input/
```

### 2️⃣ **Processamento (1 minuto)**
```bash
# Execute o processamento
npm run zapchicken
```

### 3️⃣ **Interface Web (1 minuto)**
```bash
# Inicie o servidor web
npm run web

# Acesse: http://localhost:3000
```

## 📁 Arquivos Necessários

Coloque estes 4 arquivos na pasta `data/input/`:

1. **`contacts.csv`** - Contatos do Google
2. **`Lista-Clientes.xlsx`** - Base de clientes  
3. **`Todos os pedidos.xlsx`** - Histórico de vendas
4. **`Historico_Itens_Vendidos.xlsx`** - Detalhamento de produtos

## 🎯 Comandos Principais

| Comando | Descrição |
|---------|-----------|
| `npm run setup` | Configuração inicial |
| `npm run zapchicken` | Processa dados ZapChicken |
| `npm run web` | Interface web |
| `npm run chat` | Chat com IA |
| `npm run process` | Processamento genérico |

## 📊 Relatórios Gerados

Após o processamento, você terá 5 relatórios em `data/output/`:

1. **`novos_clientes_google_contacts.csv`** - Clientes para adicionar no Google
2. **`clientes_inativos.xlsx`** - Clientes sem pedidos recentes
3. **`clientes_alto_ticket.xlsx`** - Clientes com alto valor médio
4. **`analise_geografica.xlsx`** - Performance por bairro
5. **`produtos_mais_vendidos.xlsx`** - Ranking de produtos

## 🤖 Chat com IA

### Perguntas Exemplo:
- "Quem comprou em 12 de julho?"
- "Quantos clientes inativos temos?"
- "Quais os produtos mais vendidos?"
- "Sugira campanhas de reativação"

### Configurar IA (Opcional):
1. Acesse: https://makersuite.google.com/app/apikey
2. Crie uma API key gratuita
3. Configure na interface web

## 🌐 Interface Web

### Funcionalidades:
- **Upload** dos 4 arquivos
- **Configuração** de parâmetros
- **Visualização** dos relatórios
- **Chat** com IA
- **Download** dos arquivos

### Acesso:
```
http://localhost:3000
```

## ⚙️ Configurações

### Parâmetros Padrão:
- **Dias inatividade**: 30 dias
- **Ticket mínimo**: R$ 50,00
- **Período análise**: 6 meses

### Personalizar:
Edite o arquivo `config.js` ou use a interface web.

## 🆘 Problemas Comuns

### ❌ "Nenhum arquivo encontrado"
- Verifique se os arquivos estão em `data/input/`
- Confirme os nomes dos arquivos

### ❌ "Erro ao processar"
- Verifique se os arquivos não estão corrompidos
- Confirme se as colunas necessárias existem

### ❌ "API não funciona"
- Confirme se a API key está correta
- Teste a conexão com "Status"

## 📞 Suporte

- **Documentação completa**: README.md
- **Logs**: `logs/app.log`
- **Configurações**: `config.js`

---

**🍗 ZapInteligencia** - Transformando dados em insights! 🚀
