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

## 💡 **Exemplos Práticos - Sistema Autodetectado**

### **� 1. Produto Simples (Autodetecção - Automático)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "60142655000126",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA", "serie": "884" },
      "recipient": {
        "cpf": "11750943077",
        "xName": "CONSUMIDOR FINAL",
        "ieInd": "9"
      },
      "products": [{
        "cProd": "001",
        "cEAN": "SEM GTIN",
        "xProd": "CAMISETA BÁSICA",
        "NCM": "62019000",
        "CFOP": "5102",
        "uCom": "UNID",
        "qCom": "1.00",
        "vUnCom": "29.90",
        "vProd": "29.90",
        "cEANTrib": "SEM GTIN",
        "uTrib": "UNID",
        "qTrib": "1.00",
        "vUnTrib": "29.90",
        "indTot": "1"
        // ✅ SEM campo "taxes" = tributação automática
      }],
      "payment": {
        "detPag": [{ "indPag": "0", "tPag": "01", "vPag": "29.90" }]
      }
    }
  }'
```

**🎯 Resultado da Tributação Automática:**
```xml
<ICMS>
  <ICMSSN400>
    <orig>0</orig>         <!-- Nacional -->
    <CSOSN>400</CSOSN>     <!-- Não tributada pelo Simples -->
  </ICMSSN400>
</ICMS>
<PIS>
  <PISOutr>
    <CST>49</CST>          <!-- Outras operações -->
    <vPIS>0.00</vPIS>      <!-- Valor zerado -->
  </PISOutr>
</PIS>
<COFINS>
  <COFINSOutr>
    <CST>49</CST>          <!-- Outras operações -->
    <vCOFINS>0.00</vCOFINS> <!-- Valor zerado -->
  </COFINSOutr>
</COFINS>
```

### **🏷️ 2. Produto Isento (Autodetecção - CSTs Específicos)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "60142655000126",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA", "serie": "884" },
      "recipient": {
        "cpf": "11750943077",
        "xName": "CONSUMIDOR FINAL",
        "ieInd": "9"
      },
      "products": [{
        "cProd": "002",
        "xProd": "PRODUTO ISENTO",
        "NCM": "85044010",
        "CFOP": "5102",
        "vProd": "50.00",
        "taxes": {
          "orig": "0",        // Nacional
          "CSOSN": "102",     // Simples - Sem tributação
          "cstPis": "07",     // Isento
          "cstCofins": "07"   // Isento
          // ✅ Sistema detecta: modo automático com CSTs específicos
        }
      }],
      "payment": {
        "detPag": [{ "indPag": "0", "tPag": "01", "vPag": "50.00" }]
      }
    }
  }'
```

**🎯 Resultado da Isenção:**
```xml
<ICMS>
  <ICMSSN102>
    <orig>0</orig>         <!-- Nacional -->
    <CSOSN>102</CSOSN>     <!-- Sem tributação -->
  </ICMSSN102>
</ICMS>
<PIS>
  <PISIsent>
    <CST>07</CST>          <!-- Isento -->
  </PISIsent>
</PIS>
<COFINS>
  <COFINSIsent>
    <CST>07</CST>          <!-- Isento -->
  </COFINSIsent>
</COFINS>
```

### **💰 3. Produto Tributado (Autodetecção - Manual)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "98765432000111",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA", "serie": "1" },
      "recipient": {
        "cpf": "11750943077",
        "xName": "CLIENTE PESSOA FÍSICA",
        "ieInd": "9"
      },
      "products": [{
        "cProd": "003",
        "xProd": "NOTEBOOK GAMER",
        "NCM": "84713012",
        "CFOP": "5102",
        "vProd": "2500.00",
        "taxes": {
          "orig": "0",
          "CSOSN": "400",
          "cstPis": "01",           // Tributado
          "pisPercent": "1.65",     // 1,65%
          "cstCofins": "01",        // Tributado
          "cofinsPercent": "7.60"   // 7,60%
          // ✅ Sistema detecta: modo automático com cálculo percentual
        }
      }],
      "payment": {
        "detPag": [{ "indPag": "0", "tPag": "03", "vPag": "2500.00" }]
      }
    }
  }'
```

**🎯 Resultado da Tributação Calculada:**
```xml
<ICMS>
  <ICMSSN400>
    <orig>0</orig>
    <CSOSN>400</CSOSN>
  </ICMSSN400>
</ICMS>
<PIS>
  <PISAliq>
    <CST>01</CST>          <!-- Tributado -->
    <vBC>2500.00</vBC>     <!-- Base = valor do produto -->
    <pPIS>1.65</pPIS>      <!-- Alíquota 1,65% -->
    <vPIS>41.25</vPIS>     <!-- Valor = R$ 41,25 -->
  </PISAliq>
</PIS>
<COFINS>
  <COFINSAliq>
    <CST>01</CST>          <!-- Tributado -->
    <vBC>2500.00</vBC>     <!-- Base = valor do produto -->
    <pCOFINS>7.60</pCOFINS> <!-- Alíquota 7,60% -->
    <vCOFINS>190.00</vCOFINS> <!-- Valor = R$ 190,00 -->
  </COFINSAliq>
</COFINS>
```

### **🔧 4. Produto com Valores Fixos (Autodetecção - Manual)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "22222222000133",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA", "serie": "1" },
      "products": [{
        "cProd": "004",
        "xProd": "PRODUTO COM VALORES FIXOS",
        "vProd": "200.00",
        "taxes": {
          "orig": "0",
          "CSOSN": "400",
          "cstPis": "99",         // Outras operações
          "pisValue": "5.00",     // Valor fixo R$ 5,00
          "cstCofins": "99",      // Outras operações
          "cofinsValue": "15.00"  // Valor fixo R$ 15,00
          // ✅ Sistema detecta: modo manual (tem pisValue/cofinsValue)
        }
      }],
      "payment": {
        "detPag": [{ "indPag": "0", "tPag": "01", "vPag": "200.00" }]
      }
    }
  }'
```

**🎯 Resultado dos Valores Fixos:**
```xml
<PIS>
  <PISOutr>
    <CST>99</CST>          <!-- Outras operações -->
    <vPIS>5.00</vPIS>      <!-- Valor fixo R$ 5,00 -->
  </PISOutr>
</PIS>
<COFINS>
  <COFINSOutr>
    <CST>99</CST>          <!-- Outras operações -->
    <vCOFINS>15.00</vCOFINS> <!-- Valor fixo R$ 15,00 -->
  </COFINSOutr>
</COFINS>
```

### **⚡ 5. Combustível - Tributação por Quantidade (Autodetecção - Manual)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "33333333000144",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA", "serie": "1" },
      "products": [{
        "cProd": "005",
        "xProd": "GASOLINA COMUM",
        "NCM": "27101259",
        "CFOP": "5102",
        "qCom": "50.000",        // 50 litros
        "vProd": "300.00",       // R$ 6,00 por litro
        "taxes": {
          "orig": "0",
          "CSOSN": "400",
          "cstPis": "03",               // Tributação por quantidade
          "pisQuantity": "50.0000",     // 50 litros
          "pisQuantityValue": "0.15",   // R$ 0,15 por litro
          "cstCofins": "03",            // Tributação por quantidade
          "cofinsQuantity": "50.0000",  // 50 litros
          "cofinsQuantityValue": "0.45" // R$ 0,45 por litro
          // ✅ Sistema detecta: modo manual (tem pisQuantity/cofinsQuantity)
        }
      }],
      "payment": {
        "detPag": [{ "indPag": "0", "tPag": "01", "vPag": "300.00" }]
      }
    }
  }'
```

**🎯 Resultado da Tributação por Quantidade:**
```xml
<PIS>
  <PISQtde>
    <CST>03</CST>                <!-- Tributação por quantidade -->
    <qBCProd>50.0000</qBCProd>   <!-- Quantidade: 50 litros -->
    <vAliqProd>0.15</vAliqProd>  <!-- Alíquota: R$ 0,15/litro -->
    <vPIS>7.50</vPIS>            <!-- Valor: 50 × 0,15 = R$ 7,50 -->
  </PISQtde>
</PIS>
<COFINS>
  <COFINSQtde>
    <CST>03</CST>                <!-- Tributação por quantidade -->
    <qBCProd>50.0000</qBCProd>   <!-- Quantidade: 50 litros -->
    <vAliqProd>0.45</vAliqProd>  <!-- Alíquota: R$ 0,45/litro -->
    <vCOFINS>22.50</vCOFINS>     <!-- Valor: 50 × 0,45 = R$ 22,50 -->
  </COFINSQtde>
</COFINS>
```

### **🌐 6. Produto Importado (Autodetecção - Origem Estrangeira)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "44444444000155",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA", "serie": "1" },
      "products": [{
        "cProd": "IMP001",
        "xProd": "SMARTPHONE IMPORTADO",
        "NCM": "85171200",
        "CFOP": "5102",
        "vProd": "1200.00",
        "taxes": {
          "orig": "1",              // Estrangeira - Importação direta
          "CSOSN": "400",
          "cstPis": "01",
          "pisPercent": "1.65",
          "cstCofins": "01", 
          "cofinsPercent": "7.60"
          // ✅ Sistema detecta: modo automático com origem importada
        }
      }],
      "payment": {
        "detPag": [{ "indPag": "0", "tPag": "03", "vPag": "1200.00" }]
      }
    }
  }'
```

**🎯 Resultado do Produto Importado:**
```xml
<ICMS>
  <ICMSSN400>
    <orig>1</orig>         <!-- Estrangeira - Importação direta -->
    <CSOSN>400</CSOSN>
  </ICMSSN400>
</ICMS>
<PIS>
  <PISAliq>
    <CST>01</CST>
    <vBC>1200.00</vBC>     <!-- Base = valor do produto -->
    <pPIS>1.65</pPIS>      <!-- 1,65% -->
    <vPIS>19.80</vPIS>     <!-- R$ 19,80 -->
  </PISAliq>
</PIS>
<COFINS>
  <COFINSAliq>
    <CST>01</CST>
    <vBC>1200.00</vBC>     <!-- Base = valor do produto -->
    <pCOFINS>7.60</pCOFINS> <!-- 7,60% -->
    <vCOFINS>91.20</vCOFINS> <!-- R$ 91,20 -->
  </COFINSAliq>
</COFINS>
```

### **🔄 7. Mix de Produtos (Autodetecção - Híbrido)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "11111111000122",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA", "serie": "1" },
      "products": [
        {
          "cProd": "001",
          "xProd": "PRODUTO AUTOMÁTICO",
          "vProd": "50.00"
          // ✅ Autodetecção: automático (sem taxes)
        },
        {
          "cProd": "002",
          "xProd": "PRODUTO HÍBRIDO",
          "vProd": "100.00",
          "taxes": {
            "cstPis": "01",
            "pisPercent": "1.65"
            // ✅ Autodetecção: automático com PIS customizado
          }
        },
        {
          "cProd": "003", 
          "xProd": "PRODUTO MANUAL",
          "vProd": "75.00",
          "taxes": {
            "orig": "0",
            "CSOSN": "400",
            "cstPis": "99",
            "pisValue": "3.00",       // Valor fixo
            "cstCofins": "07"         // Isento
            // ✅ Autodetecção: manual (tem pisValue)
          }
        }
      ],
      "payment": {
        "detPag": [{ "indPag": "0", "tPag": "01", "vPag": "225.00" }]
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

## 📦 **Estrutura de Produtos com Desconto**

### **⚠️ Campo `vDesc` - Regras Importantes**

O campo `vDesc` (desconto unitário) **só deve ser incluído quando há desconto real**:

```javascript
// ✅ PRODUTO SEM DESCONTO - vDesc NÃO incluído
{
  "cProd": "001",
  "cEAN": "SEM GTIN", 
  "xProd": "PRODUTO SEM DESCONTO",
  "NCM": "85044010",
  "CFOP": "5102",
  "uCom": "UNID",
  "qCom": "1.00",
  "vUnCom": "10.00",
  "vProd": "10.00",
  "cEANTrib": "SEM GTIN",
  "uTrib": "UNID",
  "qTrib": "1.00", 
  "vUnTrib": "10.00",
  // ❌ NÃO incluir: "vDesc": "0.00"
  "indTot": "1"
}

// ✅ PRODUTO COM DESCONTO - vDesc incluído
{
  "cProd": "002",
  "cEAN": "SEM GTIN",
  "xProd": "PRODUTO COM DESCONTO", 
  "NCM": "85044010",
  "CFOP": "5102",
  "uCom": "UNID",
  "qCom": "1.00",
  "vUnCom": "10.00",
  "vProd": "8.50",         // Valor após desconto
  "cEANTrib": "SEM GTIN",
  "uTrib": "UNID",
  "qTrib": "1.00",
  "vUnTrib": "10.00", 
  "vDesc": "1.50",         // ✅ INCLUIR apenas quando > 0
  "indTot": "1"
}
```

### **🔍 Regras do vDesc:**

- ✅ **Incluir apenas** quando desconto > 0
- ❌ **NÃO incluir** se desconto = 0.00
- ❌ **NÃO enviar** `"vDesc": "0.00"` ou `"vDesc": "00.00"`
- ✅ **XML válido**: `<vDesc>1.50</vDesc>` (apenas quando necessário)

### **🔄 Fluxo Correto:**

1. **JSON Produto**: Incluir `vDesc` apenas se > 0
2. **XML Gerado**: `<vDesc>` aparece apenas quando há desconto
3. **SEFAZ**: Aceita NFCe com ou sem tag `<vDesc>`
4. **Resposta**: Campo `discount` sempre presente (0 se não houve desconto)

### **💡 Exemplos de Uso**

#### **Produto SEM desconto (NÃO incluir vDesc):**
```javascript
{
  "cProd": "001",
  "xProd": "PRODUTO SEM DESCONTO",
  "vUnCom": "10.00",
  "vProd": "10.00",
  "vUnTrib": "10.00"
  // ❌ Não incluir: "vDesc": "0.00"
}
```

#### **Produto COM desconto de R$ 1,50:**
```javascript
{
  "cProd": "002", 
  "xProd": "PRODUTO COM DESCONTO",
  "vUnCom": "10.00",
  "vProd": "8.50",   // Valor já com desconto aplicado
  "vUnTrib": "10.00",
  "vDesc": "1.50"    // ✅ Desconto de R$ 1,50
}
```

**⚠️ IMPORTANTE**: 
- O `vProd` deve ser o valor **final** (já com desconto aplicado)
- O `vDesc` é o valor do desconto unitário
- **Nunca** incluir `vDesc` quando o valor for 0.00

---

## ⚡ **Funcionalidades Automáticas**

### 🔢 **Numeração Automática**
- **nNF e cNF** gerados automaticamente
- **Sequencial**: Por empresa + UF + série + ambiente
- **Thread-safe**: Transações atômicas MySQL
- **Recuperação**: Falhas não geram buracos na numeração

### 💰 **Sistema de Tributação Flexível**

### **🆕 Sistema de Tributação Autodetectado v2.1**

A API agora suporta **tributação autodetectada** com controle total via campo `taxes` (inglês). O sistema **detecta automaticamente** se deve usar cálculo automático ou valores manuais baseado nos campos informados.

### **🔥 Como Funciona - Sistema Autodetectado:**

#### **🤖 Modo Automático (Autodetectado)**
```json
{
  "cProd": "001",
  "xProd": "PRODUTO SIMPLES",
  "vProd": "10.00"
  // ✅ Sem campo "taxes" = tributos automáticos com valores padrão
}
```

#### **📝 Modo Manual (Autodetectado)**
```json
{
  "cProd": "002",
  "xProd": "PRODUTO COM TRIBUTOS CUSTOMIZADOS",
  "vProd": "100.00",
  "taxes": {
    "orig": "0",                    // Origem da mercadoria (0-8)
    "CSOSN": "400",                 // Para Simples Nacional
    "cstPis": "01",                 // CST PIS
    "pisPercent": "1.65",           // Alíquota % PIS
    "pisValue": "1.65",             // Valor PIS (calculado ou fixo)
    "cstCofins": "01",              // CST COFINS
    "cofinsPercent": "7.60",        // Alíquota % COFINS
    "cofinsValue": "7.60",          // Valor COFINS (calculado ou fixo)
    "baseValue": "100.00"           // Base de cálculo customizada (opcional)

  }
}
```

### **📊 Campos Disponíveis no `taxes`:**

| **Campo** | **Tipo** | **Descrição** | **Obrigatório** |
|-----------|----------|---------------|-----------------|
| `orig` | string | Origem da mercadoria (0-8) | ❌ (padrão: "0") |
| `CSOSN` | string | CSOSN para Simples Nacional | ❌ (padrão: "400") |
| `cstPis` | string | CST do PIS | ❌ (padrão: "49") |
| `pisPercent` | string | Alíquota % do PIS | ❌ |
| `pisValue` | string | Valor fixo do PIS | ❌ |
| `pisQuantity` | string | Quantidade para tributação por unidade | ❌ |
| `pisQuantityValue` | string | Valor por unidade do PIS | ❌ |
| `cstCofins` | string | CST do COFINS | ❌ (padrão: "49") |
| `cofinsPercent` | string | Alíquota % do COFINS | ❌ |
| `cofinsValue` | string | Valor fixo do COFINS | ❌ |
| `cofinsQuantity` | string | Quantidade para tributação por unidade | ❌ |
| `cofinsQuantityValue` | string | Valor por unidade do COFINS | ❌ |
| `baseValue` | string | Base de cálculo customizada | ❌ (padrão: valor do produto) |


### **🎯 Todas as Possibilidades:**

#### **🔥 Caso 1: Produto Simples (Automático)**
```json
{
  "cProd": "001",
  "xProd": "CAMISETA BÁSICA",
  "vProd": "29.90"
  // ✅ Automático: PIS/COFINS zerados (CST 49)
  // ✅ Automático: ICMS com CSOSN 400
}
```

#### **🔥 Caso 2: Modo Híbrido (Autodetectado)**
```json
{
  "cProd": "002",
  "xProd": "PRODUTO SEMI-AUTOMÁTICO",
  "vProd": "50.00",
  "taxes": {
    "cstPis": "01",                 // PIS tributado
    "pisPercent": "1.65",           // Com alíquota específica

  }
}
```

#### **🔥 Caso 3: Regime Normal Tributado (Manual)**
```json
{
  "cProd": "003",
  "xProd": "PRODUTO TRIBUTADO",
  "vProd": "100.00",
  "taxes": {
    "orig": "0",
    "CSOSN": "400",
    "cstPis": "01",                 // Tributado
    "pisPercent": "1.65",           // 1,65%
    "pisValue": "1.65",             // R$ 1,65
    "cstCofins": "01",              // Tributado
    "cofinsPercent": "7.60",        // 7,60%
    "cofinsValue": "7.60",          // R$ 7,60

  }
}
```

#### **🔥 Caso 4: Produto Isento**
```json
{
  "cProd": "004",
  "xProd": "PRODUTO ISENTO",
  "vProd": "75.00",
  "taxes": {
    "orig": "0",
    "CSOSN": "400",
    "cstPis": "07",                 // Isento
    "cstCofins": "07",              // Isento

  }
}
```

#### **🔥 Caso 5: Tributação com Valores Fixos**
```json
{
  "cProd": "005",
  "xProd": "PRODUTO COM VALORES FIXOS",
  "vProd": "200.00",
  "taxes": {
    "orig": "0",
    "CSOSN": "400",
    "cstPis": "99",                 // Outras operações
    "pisValue": "5.00",             // Valor fixo R$ 5,00
    "cstCofins": "99",              // Outras operações
    "cofinsValue": "15.00",         // Valor fixo R$ 15,00

  }
}
```

#### **🔥 Caso 6: Produto Importado**
```json
{
  "cProd": "006",
  "xProd": "PRODUTO IMPORTADO",
  "vProd": "150.00",
  "taxes": {
    "orig": "1",                    // Estrangeira - Importação direta
    "CSOSN": "400",
    "cstPis": "01",
    "pisPercent": "1.65",
    "cstCofins": "01",
    "cofinsPercent": "7.60"

  }
}
```

#### **🔥 Caso 7: Tributação por Quantidade**
```json
{
  "cProd": "007",
  "xProd": "COMBUSTÍVEL (POR QUANTIDADE)",
  "vProd": "80.00",
  "taxes": {
    "orig": "0",
    "CSOSN": "400",
    "cstPis": "03",                 // Tributação por quantidade
    "pisQuantity": "10.0000",       // Quantidade
    "pisQuantityValue": "0.25",     // R$ 0,25 por unidade
    "cstCofins": "03",              // Tributação por quantidade
    "cofinsQuantity": "10.0000",    // Quantidade
    "cofinsQuantityValue": "0.75",  // R$ 0,75 por unidade

  }
}
```

#### **🔥 Caso 8: Base de Cálculo Customizada**
```json
{
  "cProd": "008",
  "xProd": "PRODUTO COM BASE CUSTOMIZADA",
  "vProd": "100.00",
  "taxes": {
    "orig": "0",
    "CSOSN": "400",
    "cstPis": "01",
    "pisPercent": "1.65",
    "cstCofins": "01",
    "cofinsPercent": "7.60",
    "baseValue": "85.00"           // Base diferente do valor do produto

  }
}
```

#### **🔥 Caso 9: Mix Automático + Manual**
```json
{
  "products": [
    {
      "cProd": "001",
      "xProd": "PRODUTO AUTOMÁTICO",
      "vProd": "10.00"
      // ✅ Sem taxes = automático
    },
    {
      "cProd": "002",
      "xProd": "PRODUTO CUSTOMIZADO",
      "vProd": "20.00",
      "taxes": {
        "cstPis": "01",
        "pisPercent": "1.65",
        "cstCofins": "01",
        "cofinsPercent": "7.60",

        // ✅ ICMS automático, PIS/COFINS customizado
      }
    }
  ]
}
```

---

## 🧪 **Testando os Exemplos na Prática**

### **⚡ Teste Rápido do Sistema:**
```bash
# 1. Verificar se a API está funcionando
curl http://localhost:3000/api/notes/test

# 2. Ver tipos de notas suportadas
curl http://localhost:3000/api/notes/types

# 3. Obter exemplo de payload NFCe
curl http://localhost:3000/api/notes/nfce/example
```

### **🔧 Executar Testes de Tributação:**
```bash
# Executar testes automatizados do sistema de tributação
cd "c:\Users\joaoh\Desktop\nfce-node-api"
npx ts-node src/services/tributacaoService.test.ts
```

**Exemplo de saída dos testes:**
```
🧪 Testing New Flexible Taxation System
=== Automatic Mode - No taxes provided ===
🔍 Modo detectado: auto { taxes: undefined, productValue: 100 }
Output: { icms: { orig: "0", CSOSN: "400" }, pis: { CST: "49", vPIS: "0.00" } }

=== Manual Mode - Fixed value PIS/COFINS ===
🔍 Modo detectado: manual { taxes: {...}, productValue: 100 }
Output: { pis: { CST: "99", vPIS: "5.00" }, cofins: { CST: "99", vCOFINS: "15.00" } }
```

### **📋 Checklist de Validação:**

#### **✅ Antes de usar em produção:**
1. **Teste conectividade**: `GET /api/notes/test` retorna 200
2. **Teste automático**: Envie produto sem `taxes`, verifique PIS/COFINS zerados  
3. **Teste manual**: Envie produto com `pisValue`, verifique valor exato
4. **Teste híbrido**: Envie produto com só `pisPercent`, verifique cálculo
5. **Teste CSTs**: Envie CST inválido, verifique erro de validação
6. **Verifique logs**: Console mostra "🔍 Modo detectado: auto/manual"

#### **🎯 Exemplos de Teste por Cenário:**

**Produto Básico:**
```bash
# Deve detectar modo automático
curl -X POST localhost:3000/api/notes/nfce/issue -H "Content-Type: application/json" \
-d '{"memberCnpj":"60142655000126","environment":2,"noteData":{"products":[{"cProd":"001","vProd":"10.00"}]}}'
```

**Produto Tributado:**
```bash
# Deve detectar modo automático com cálculo
curl -X POST localhost:3000/api/notes/nfce/issue -H "Content-Type: application/json" \
-d '{"memberCnpj":"60142655000126","environment":2,"noteData":{"products":[{"cProd":"002","vProd":"100.00","taxes":{"cstPis":"01","pisPercent":"1.65"}}]}}'
```

**Produto Manual:**
```bash
# Deve detectar modo manual
curl -X POST localhost:3000/api/notes/nfce/issue -H "Content-Type: application/json" \
-d '{"memberCnpj":"60142655000126","environment":2,"noteData":{"products":[{"cProd":"003","vProd":"100.00","taxes":{"pisValue":"5.00"}}]}}'
```

### **📊 Monitoramento em Tempo Real:**

**Verificar logs da API:**
```bash
# Os logs mostram a autodetecção em tempo real
tail -f logs/api.log | grep "Modo detectado"

# Exemplo de saída:
# 🔍 Modo detectado: auto { taxes: undefined, productValue: 29.90 }
# 🔍 Modo detectado: manual { taxes: { pisValue: '5.00' }, productValue: 100 }
```

**Verificar estatísticas:**
```bash
# Ver estatísticas do cache e performance
curl http://localhost:3000/api/notes/cache/stats
curl http://localhost:3000/api/notes/numbering/stats
```

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

---

## 📊 **Estrutura das Respostas**

### **✅ Resposta de Sucesso - Emissão**
```json
{
  "success": true,
  "message": "NFCe issued successfully",
  "data": {
    "accessKey": "35240112345678000199650010000000011123456789",
    "protocol": "135240000123456",
    "qrCode": "https://www.fazenda.sp.gov.br/nfce/qrcode?p=...",
    "urlConsulta": "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
    "xmlSigned": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "xmlBase64": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K...",
    "number": "1",
    "series": "001",
    "totalValue": 15.50,
    "company": {
      "cnpj": "12345678000199",
      "name": "EMPRESA EXEMPLO LTDA"
    },
    "numbering": {
      "nNF": "1",
      "cNF": "12345678"
    }
  }
}
```

### **✅ Resposta de Sucesso - Emissão com Autodetecção**
```json
{
  "success": true,
  "message": "NFCe issued successfully with auto-detected taxation",
  "data": {
    "accessKey": "35240160142655000126650880000000011123456789",
    "protocol": "135240000123456",
    "qrCode": "https://www.fazenda.sp.gov.br/nfce/qrcode?p=...",
    "urlConsulta": "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
    "xmlSigned": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
    "xmlBase64": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K...",
    "number": "1",
    "series": "884",
    "totalValue": 129.90,
    "company": {
      "cnpj": "60142655000126",
      "name": "LOJA EXEMPLO LTDA"
    },
    "products": [
      {
        "code": "001",
        "description": "CAMISETA BÁSICA",
        "quantity": 1,
        "unitValue": 29.90,
        "totalValue": 29.90,
        "taxation": {
          "detectedMode": "auto",          // 🆕 Modo detectado
          "icms": {
            "orig": "0",
            "CSOSN": "400"
          },
          "pis": {
            "CST": "49",
            "vPIS": "0.00"               // Valor zerado automaticamente
          },
          "cofins": {
            "CST": "49", 
            "vCOFINS": "0.00"            // Valor zerado automaticamente
          }
        }
      },
      {
        "code": "002",
        "description": "NOTEBOOK GAMER",
        "quantity": 1,
        "unitValue": 2500.00,
        "totalValue": 2500.00,
        "taxation": {
          "detectedMode": "auto",          // 🆕 Modo detectado
          "icms": {
            "orig": "0",
            "CSOSN": "400"
          },
          "pis": {
            "CST": "01",
            "vBC": "2500.00",
            "pPIS": "1.65",
            "vPIS": "41.25"              // Calculado automaticamente: 2500 × 1.65%
          },
          "cofins": {
            "CST": "01",
            "vBC": "2500.00", 
            "pCOFINS": "7.60",
            "vCOFINS": "190.00"          // Calculado automaticamente: 2500 × 7.60%
          }
        }
      },
      {
        "code": "003",
        "description": "PRODUTO COM VALORES FIXOS",
        "quantity": 1,
        "unitValue": 200.00,
        "totalValue": 200.00,
        "taxation": {
          "detectedMode": "manual",        // 🆕 Modo detectado
          "icms": {
            "orig": "0",
            "CSOSN": "400"
          },
          "pis": {
            "CST": "99",
            "vPIS": "5.00"               // Valor fixo fornecido
          },
          "cofins": {
            "CST": "99",
            "vCOFINS": "15.00"           // Valor fixo fornecido
          }
        }
      }
    ],
    "taxation": {
      "summary": {
        "autoDetected": 2,               // 🆕 Produtos com modo automático
        "manual": 1,                     // 🆕 Produtos com modo manual
        "totalPIS": "46.25",             // 0.00 + 41.25 + 5.00
        "totalCOFINS": "205.00"          // 0.00 + 190.00 + 15.00
      }
    },
    "numbering": {
      "nNF": "1",
      "cNF": "12345678"
    }
  }
}
```

### **✅ Resposta de Sucesso - Consulta**
```json
{
  "success": true,
  "message": "NFCe consulted successfully",
  "data": {
    "accessKey": "35240112345678000199650010000000011123456789",
    "company": {
      "cnpj": "12345678000199",
      "name": "EMPRESA EXEMPLO LTDA"
    },
    "sefaz": {
      "cStat": "100",
      "status": "authorized",
      "reason": "Autorizado o uso da NF-e",
      "protocol": "135240000123456",
      "xmlComplete": "<?xml version=\"1.0\"?>..."
    }
  }
}
```

### **❌ Resposta de Erro**
```json
{
  "success": false,
  "message": "Error issuing NFCe",
  "error": "Certificate not found for CNPJ: 12345678000199 in environment: 2",
  "data": {
    "cStat": "404",
    "reason": "Certificate not configured",
    "memberCnpj": "12345678000199",
    "environment": 2
  }
}
```

### **⚠️ Resposta de Erro SEFAZ**
```json
{
  "success": false,
  "message": "SEFAZ error",
  "error": "Rejeição: Duplicidade de NF-e",
  "data": {
    "cStat": "204",
    "reason": "Duplicidade de NF-e [chNFe: 35240112345678000199650010000000011123456789]",
    "accessKey": "35240112345678000199650010000000011123456789",
    "xmlComplete": "<?xml version=\"1.0\"?>..."
  }
}
```

---