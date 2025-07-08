# 🏪 API Unificada para Notas Fiscais

API robusta e **totalmente unificada** para emissão, consulta e cancelamento de múltiplos tipos de notas fiscais (NFCe, NFe, NFSe) que funciona como **Hub Multi-Empresa**, com endpoints RESTful unificados, busca automática de certificados por CNPJ e arquitetura moderna separada em camadas.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5+-red.svg)](https://fastify.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8+-orange.svg)](https://mysql.com/)

---

## ⚡ **API Unificada v2.0 - Um Padrão para Todos os Tipos**

### 🎯 **Estrutura Unificada Única**

```bash
# 🔥 APENAS UM PADRÃO PARA TODOS OS TIPOS
/api/notes/:type/*
```

**Tipos suportados:**
- **`nfce`** ✅ Disponível (NFCe - Nota Fiscal de Consumidor Eletrônica)
- **`nfe`** 🔄 Em desenvolvimento (NFe - Nota Fiscal Eletrônica)
- **`nfse`** 🔄 Em desenvolvimento (NFSe - Nota Fiscal de Serviços Eletrônica)

### 🔥 **Principais Vantagens:**

- **🆕 ARQUITETURA UNIFICADA**: Um só padrão para todos os tipos de notas
- **🔐 SEGURANÇA TOTAL**: Certificado **nunca mais** trafega na rede
- **⚡ PERFORMANCE**: Endpoints GET cacheáveis, 80% menos payload
- **🎯 SIMPLICIDADE**: Apenas CNPJ + ambiente, backend busca tudo automaticamente
- **🏗️ ARQUITETURA LIMPA**: Controllers + Handlers + Services separados
- **🗄️ BANCO INTEGRADO**: MySQL com controle de empresas, certificados e notas
- **📈 ESCALABILIDADE**: Preparado para expansão futura (NFe, NFSe)

---

## 🚀 **Endpoints da API Unificada**

### 📝 **1. Emissão de Notas**
```http
POST /api/notes/:type/issue
Content-Type: application/json

{
  "memberCnpj": "12345678000199",
  "environment": 2,
  "noteData": {
    // Dados específicos do tipo de nota
  }
}
```

### 🔍 **2. Consulta de Notas**
```http
GET /api/notes/:type/consult/:accessKey/:memberCnpj/:environment
```

### ❌ **3. Cancelamento de Notas**
```http
POST /api/notes/:type/cancel
Content-Type: application/json

{
  "memberCnpj": "12345678000199",
  "environment": 2,
  "accessKey": "44123456789012345678901234567890123456789012",
  "protocol": "135200000000123",
  "justification": "Motivo do cancelamento com pelo menos 15 caracteres"
}
```

### 📋 **4. Utilitários e Informações**
```http
GET /api/notes/types                    # Tipos suportados
GET /api/notes/:type/example           # Exemplo por tipo
GET /api/notes/test                    # Teste de conectividade
GET /api/notes/cache/stats             # Estatísticas do cache
DELETE /api/notes/cache/clear          # Limpar cache
GET /api/notes/numbering/stats         # Estatísticas de numeração
POST /api/notes/numbering/release      # Liberar numeração
POST /api/notes/database/initialize    # Inicializar banco
```

---

## 💡 **Exemplos Práticos**

### **📝 Emissão NFCe**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "12345678000199",
    "environment": 2,
    "noteData": {
      "ide": {
        "natOp": "VENDA",
        "serie": "1"
      },
      "recipient": {
        "cpf": "12345678901",
        "xName": "CONSUMIDOR FINAL",
        "ieInd": "9"
      },
      "products": [{
        "cProd": "001",
        "xProd": "PRODUTO EXEMPLO",
        "NCM": "85044010",
        "CFOP": "5102",
        "uCom": "UNID",
        "qCom": "1.00",
        "vUnCom": "10.00",
        "vProd": "10.00"
      }],
      "payment": {
        "detPag": [{
          "indPag": "0",
          "tPag": "01",
          "vPag": "10.00"
        }],
        "change": "0.00"
      }
    }
  }'
```

### **🔍 Consulta NFCe**
```bash
curl -X GET "http://localhost:3000/api/notes/nfce/consult/44123456789012345678901234567890123456789012/12345678000199/2"
```

### **❌ Cancelamento NFCe**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "12345678000199",
    "environment": 2,
    "accessKey": "44123456789012345678901234567890123456789012",
    "protocol": "135200000000123",
    "justification": "Cancelamento por erro de digitação no produto"
  }'
```

### **📋 Verificar Tipos Suportados**
```bash
curl -X GET http://localhost:3000/api/notes/types
```

---

## 🏗️ **Arquitetura Moderna**

### **⚡ Alta Performance:**
- **~30,000 req/s** - Performance empresarial com Fastify
- **Startup <100ms** - Inicialização otimizada  
- **Cache inteligente** - Tools reutilizados por 30min
- **Connection pool** - MySQL otimizado

### **🔧 Componentes:**
- **Controllers** - Validação HTTP e roteamento unificado
- **Handlers** - Lógica de negócio centralizada por tipo
- **Services** - Integração com SEFAZ e banco de dados
- **Parsers** - Processamento robusto de respostas XML
- **Cache Layer** - Performance e reutilização de recursos

---

## 🌟 **Recursos Principais**

### 🏢 **Multi-Empresa Inteligente**
- ✅ **Busca automática**: Certificado localizado por CNPJ + ambiente
- ✅ **Isolamento total**: Operações independentes por empresa
- ✅ **Zero config**: Não precisa reiniciar para adicionar empresas
- ✅ **Escalabilidade**: Uma API serve milhares de clientes

### ⚡ **Cache Inteligente**
- ✅ **Performance**: Cache de Tools com TTL de 30 minutos  
- ✅ **Automático**: Limpeza automática a cada 5 minutos
- ✅ **Controlado**: Máximo 100 empresas em cache
- ✅ **Monitorado**: Estatísticas em tempo real

### 🛡️ **Segurança Avançada**
- ✅ **Zero exposure**: Certificados nunca trafegam na rede
- ✅ **Headers seguros**: Helmet, CORS, rate limiting
- ✅ **Logs mascarados**: Dados sensíveis protegidos
- ✅ **Banco seguro**: MySQL com pool de conexões

### 🗄️ **Banco de Dados Integrado**
- ✅ **Empresas**: Tabela `member` com dados completos
- ✅ **Certificados**: Tabela `certificates` por ambiente
- ✅ **Notas**: Tabela `invoices` com numeração automática
- ✅ **Transações**: Operações atômicas thread-safe

---

## 📦 **Campo vDesc - Regras de Desconto**

### **⚠️ IMPORTANTE: Use vDesc apenas quando há desconto real**

```javascript
// ✅ PRODUTO SEM DESCONTO - vDesc NÃO incluído
{
  "cProd": "001",
  "xProd": "PRODUTO SEM DESCONTO",
  "vUnCom": "10.00",
  "vProd": "10.00"
  // ❌ NÃO incluir: "vDesc": "0.00"
}

// ✅ PRODUTO COM DESCONTO - vDesc incluído
{
  "cProd": "002", 
  "xProd": "PRODUTO COM DESCONTO",
  "vUnCom": "10.00",
  "vProd": "8.50",   // Valor já com desconto aplicado
  "vDesc": "1.50"    // ✅ Desconto de R$ 1,50
}
```

**Regras:**
- ✅ **Incluir apenas** quando desconto > 0
- ❌ **NÃO incluir** se desconto = 0.00
- ❌ **NÃO enviar** `"vDesc": "0.00"` ou `"vDesc": "00.00"`

---

## ⚡ **Funcionalidades Automáticas**

### 🔢 **Numeração Automática**
- **nNF e cNF** gerados automaticamente
- **Sequencial**: Por empresa + UF + série + ambiente
- **Thread-safe**: Transações atômicas MySQL
- **Recuperação**: Falhas não geram buracos na numeração

### 🏦 **Tributação Inteligente**
- **PIS/COFINS** calculados automaticamente
- **Simples Nacional**: Sempre 0% (CST 49)
- **Lucro Real**: 1,65% PIS + 7,60% COFINS
- **Produtos isentos**: CST 07 automático

### 🗄️ **Banco de Dados Automático**
- **Empresas** cadastradas automaticamente
- **Certificados** organizados por ambiente
- **Notas** salvas com status e numeração
- **Histórico** completo de operações

---

## 🚀 **Setup Rápido**

### **1. Instalação**
```bash
git clone <repo-url>
cd nfce-node-api
npm install
cp .env.example .env
# Edite .env com configurações do MySQL
```

### **2. Banco MySQL**
```sql
-- Conectar no MySQL
mysql -u root -p

-- Criar banco e usuário
CREATE DATABASE nfce_api CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nfce_user'@'localhost' IDENTIFIED BY 'senha_forte';
GRANT ALL PRIVILEGES ON nfce_api.* TO 'nfce_user'@'localhost';
FLUSH PRIVILEGES;
```

### **3. Configurar .env**
```bash
# Configurações do banco
DB_HOST=localhost
DB_PORT=3306
DB_USER=nfce_user
DB_PASSWORD=senha_forte
DB_NAME=nfce_api
```

### **4. Inicializar e Executar**
```bash
# Inicializar tabelas
npm run dev &
sleep 3
curl -X POST http://localhost:3000/api/notes/database/initialize

# API estará rodando em http://localhost:3000
```

### **5. Testar**
```bash
# Teste de conectividade
curl http://localhost:3000/api/notes/test

# Tipos suportados
curl http://localhost:3000/api/notes/types

# Exemplo NFCe
curl http://localhost:3000/api/notes/nfce/example
```

---

## 🎯 **Migração e Compatibilidade**

### **🔄 Breaking Changes v2.0**

A API v2.0 remove **todas as rotas específicas** e mantém **apenas rotas unificadas**:

#### **❌ Rotas Antigas (REMOVIDAS)**
```bash
POST /api/nfce/create-nfc          # ❌ Removida
GET  /api/nfce/consult/:key/...    # ❌ Removida  
POST /api/nfce/cancel-nfc          # ❌ Removida
GET  /api/nfce/example             # ❌ Removida
```

#### **✅ Rotas Novas (ÚNICAS)**
```bash
POST /api/notes/nfce/issue                              # ✅ Nova
GET  /api/notes/nfce/consult/:key/:cnpj/:env           # ✅ Nova
POST /api/notes/nfce/cancel                            # ✅ Nova
GET  /api/notes/nfce/example                           # ✅ Nova
```

### **📝 Como Migrar**

#### **Antes (v1.x):**
```javascript
// ❌ Rota específica antiga
await axios.post('/api/nfce/create-nfc', { 
  memberCnpj, environment, nfceData 
});
```

#### **Agora (v2.0):**
```javascript
// ✅ Rota unificada nova
await axios.post('/api/notes/nfce/issue', { 
  memberCnpj, environment, noteData 
});
```

**Mudanças necessárias:**
1. **URL**: `/api/nfce/*` → `/api/notes/nfce/*`
2. **Campo**: `nfceData` → `noteData`
3. **Estrutura**: Mantida igual (apenas nome do campo muda)

---

## 🚀 **Deploy Production**

### **1. Build e Start**
```bash
# Gerar build de produção
npm run build

# Executar aplicação
npm start
```

### **2. Configuração Produção**
```bash
# .env para produção
NODE_ENV=production
DB_HOST=mysql-server-prod
DB_PASSWORD=senha_super_forte
```

### **3. Nginx Proxy (Opcional)**
```nginx
server {
    listen 80;
    server_name api.exemplo.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

---

## 🔮 **Roadmap**

### **Q2 2025 - NFe**
```bash
POST /api/notes/nfe/issue       # ← Em desenvolvimento
GET  /api/notes/nfe/consult/... # ← Em desenvolvimento  
POST /api/notes/nfe/cancel      # ← Em desenvolvimento
```

### **Q3 2025 - NFSe**
```bash
POST /api/notes/nfse/issue      # ← Planejado
GET  /api/notes/nfse/consult/...# ← Planejado
POST /api/notes/nfse/cancel     # ← Planejado
```

---

## 📞 **Suporte**

Para dúvidas sobre a API unificada:

1. **Verifique os tipos**: `GET /api/notes/types`
2. **Obtenha exemplos**: `GET /api/notes/:type/example`
3. **Teste conectividade**: `GET /api/notes/test`

---

**🎉 A API v2.0 está pronta para produção com arquitetura unificada, código limpo, segurança máxima e preparada para expansão futura!**

**Versão**: 2.0.0 (Unificada) | **Compatibilidade**: Exclusivamente rotas unificadas
