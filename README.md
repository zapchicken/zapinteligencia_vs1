# 🚀 ZapInteligencia v2.0

**Business Intelligence Inteligente para ZapChicken**

Sistema avançado de análise de dados para restaurantes e food service, com integração de IA para insights automáticos.

## ✨ Características Principais

- 🤖 **IA Integrada**: Análises inteligentes com Google Gemini AI
- 📊 **Processamento de Dados**: Suporte a Excel e CSV
- 🌐 **Interface Web**: Interface moderna e responsiva
- 📈 **Relatórios Automáticos**: Geração automática de insights
- 🎯 **Análise RFM**: Segmentação avançada de clientes
- 📍 **Análise Geográfica**: Performance por bairro
- 🛍️ **Análise de Produtos**: Top produtos e categorias

## 🛠️ Tecnologias

- **Backend**: Node.js, Express.js
- **IA**: Google Gemini AI
- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap
- **Processamento**: ExcelJS, CSV Parser
- **Segurança**: Helmet, Rate Limiting

## 📋 Pré-requisitos

- Node.js 16+ 
- npm ou yarn
- API Key do Google Gemini (opcional)

## 🚀 Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/zapchicken/zapinteligencia_vs1.git
cd zapinteligencia_vs1
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o ambiente**
```bash
npm run setup
```

4. **Inicie o servidor**
```bash
npm run web
```

5. **Acesse a aplicação**
```
http://localhost:3000
```

## 📁 Estrutura do Projeto

```
ZapInteligencia_vs1/
├── src/
│   ├── index.js          # CLI principal
│   ├── web.js            # Servidor web
│   ├── zapchickenAI.js   # Integração com IA
│   ├── zapchickenProcessor.js # Processamento de dados
│   ├── excelProcessor.js # Processamento Excel
│   ├── leadGenerator.js  # Geração de leads
│   └── utils.js          # Utilitários
├── public/
│   └── index.html        # Interface web
├── config.js             # Configurações
├── package.json          # Dependências
└── README.md            # Documentação
```

## 🎯 Funcionalidades

### 📊 Processamento de Dados
- Upload de arquivos Excel e CSV
- Processamento automático de pedidos, clientes e itens
- Validação e limpeza de dados
- Geração de relatórios estruturados

### 🤖 IA Inteligente
- Análises avançadas com Google Gemini
- Insights automáticos sobre vendas
- Segmentação de clientes
- Recomendações de marketing

### 🌐 Interface Web
- Upload de arquivos via drag & drop
- Visualização de relatórios
- Chat interativo com IA
- Dashboard em tempo real

### 📈 Relatórios Gerados
- **Clientes de Alto Ticket**: Identificação de clientes VIP
- **Análise Geográfica**: Performance por bairro
- **Produtos Mais Vendidos**: Top produtos e categorias
- **Novos Clientes**: Integração com Google Contacts

## 🔧 Comandos Disponíveis

```bash
# Setup inicial
npm run setup

# Interface web
npm run web

# Processamento via CLI
npm run process

# Chat com IA
npm run chat

# Desenvolvimento
npm run dev
```

## 🤖 Configuração da IA

1. **Obtenha uma API Key gratuita**
   - Acesse: https://makersuite.google.com/app/apikey
   - Crie uma nova API key

2. **Configure na aplicação**
   - Acesse a interface web
   - Vá para a aba "Configuração Gemini"
   - Cole sua API key

3. **Teste a conexão**
   - Use o comando "status" no chat
   - Verifique se a IA está funcionando

## 📊 Campos de Dados Suportados

### Pedidos
- Nome do cliente
- Data de faturamento
- Data do pedido
- Bairro
- Valor total
- Origem (WhatsApp, telefone, etc.)

### Produtos
- Nome do produto
- Quantidade
- Valor unitário
- Categoria
- Código do pedido

### Clientes
- Nome completo
- Telefone
- Endereço
- Bairro
- Data de cadastro

## 🎨 Interface

A interface web oferece:
- **Design responsivo** com Bootstrap 5
- **Paleta de cores personalizada** (verde, amarelo, laranja)
- **Upload drag & drop** de arquivos
- **Chat interativo** com IA
- **Visualização de relatórios** em tempo real

## 🔒 Segurança

- **Rate Limiting**: Proteção contra spam
- **Helmet**: Headers de segurança
- **Validação de arquivos**: Verificação de tipos
- **Sanitização de dados**: Limpeza automática

## 📝 Licença

Este projeto é desenvolvido para uso interno da ZapChicken.

## 🤝 Contribuição

Para contribuir com o projeto:
1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Abra um Pull Request

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Abra uma issue no GitHub
- Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido com ❤️ para ZapChicken**
