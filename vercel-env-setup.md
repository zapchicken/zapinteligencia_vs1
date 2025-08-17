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

## ✅ Verificação

Após o redeploy, teste:
- ✅ Upload de arquivos
- ✅ Configuração da IA
- ✅ Chat com IA
- ✅ Visualização de relatórios
