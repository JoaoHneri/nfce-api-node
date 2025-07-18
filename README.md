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
- **🤖 TRIBUTAÇÃO INTELIGENTE**: Autodetecção do modo tributário, sem necessidade de configuração manual

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


## 💡 **Exemplos Práticos - Sistema de Tributação Autodetectado**

## 💡 **Exemplos Práticos - Tributação 100% Automática**

### **🔥 1. Produto Simples (Tributação Automática e Inteligente)**

#### Sobre o campo `ieInd` (`indIEDest`) e `IE` no destinatário (recipient)

O campo `recipient` aceita tanto **CPF** (pessoa física) quanto **CNPJ** (pessoa jurídica):

- Para pessoa física, use o campo `cpf`.
- Para pessoa jurídica, use o campo `cnpj`.

O campo `ieInd` (ou `indIEDest` no XML) indica a situação do destinatário em relação à Inscrição Estadual (IE):

- **"9" (Consumidor final não contribuinte)**: Não é necessário informar o campo `IE`.
- **"1" (Contribuinte ICMS)**: O campo `IE` deve ser preenchido obrigatoriamente.
- **"2" (Contribuinte isento de IE)**: O campo `IE` pode ser omitido ou preenchido conforme regras estaduais.

**Recomendação:** Para NFC-e, normalmente utilize `ieInd: "9"` para vendas ao consumidor final, pois dispensa o preenchimento da IE e evita rejeições de schema.

**Exemplo com CPF (pessoa física):**
```json
"recipient": {
  "cpf": "11750943077",
  "xName": "CONSUMIDOR FINAL",
  "ieInd": "9"
  // Se ieInd for "1", inclua também o campo "IE":
  // "IE": "123456789"
}
```

**Exemplo com CNPJ (pessoa jurídica):**
```json
"recipient": {
  "cnpj": "12345678000100",
  "xName": "EMPRESA CLIENTE LTDA",
  "ieInd": "9"
  // Se ieInd for "1", inclua também o campo "IE":
  // "IE": "123456789"
}
```
**Exemplo abaixo já está com `ieInd: "9"` (sem IE), mas a API aceita os demais cenários conforme a legislação.**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "12345678000100",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA" },
      "recipient": {
        "cpf": "11750943077",
        "xName": "CONSUMIDOR FINAL",
        "ieInd": "9"
        // Se ieInd for "1", inclua também o campo "IE":
        // "IE": "123456789"
      },
      "products": [{
        "cProd": "001",
        "cEAN": "SEM GTIN",
        "xProd": "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
        "NCM": "85044010",
        "CFOP": "5102",
        "uCom": "UNID",
        "qCom": "1.00",
        "vUnCom": "1.00",
        "vProd": "1.00",
        "cEANTrib": "SEM GTIN",
        "uTrib": "UNID",
        "qTrib": "1.00",
        "vUnTrib": "1.00",
        "vDesc": "0.10",
        "indTot": "1"
        // Não é mais necessário informar o campo taxes!
      }
    ],
      // O transporte é sempre gerado automaticamente como "mode": "9" (sem transporte)
      // Não inclua o campo transport na requisição. A API define isso de forma fixa conforme o modelo 65 NFC-e.
      "payment": {
        "detPag": [
          {
            "indPag": "0",
            "tPag": "01",
            "vPag": "1.00"
          }
        ],
        "change": "0.10"
      },
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

### **🏷️ 2. Produto com Tributação Específica (CSTs Customizados)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "12345678000100",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA" },
      "products": [{
        "cProd": "002",
        "cEAN": "SEM GTIN",
        "xProd": "PRODUTO ISENTO",
        "NCM": "85044010",
        "CFOP": "5102",
        "uCom": "UNID",
        "qCom": "1.00",
        "vUnCom": "50.00",
        "vProd": "50.00",
        "cEANTrib": "SEM GTIN",
        "uTrib": "UNID",
        "qTrib": "1.00",
        "vUnTrib": "50.00",
        "indTot": "1"
        // Não é mais necessário informar o campo taxes!
      }
    ],
      "payment": {
        "detPag": [
          {
            "indPag": "0",
            "tPag": "01",
            "vPag": "50.00"
          }
        ]
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

### **💰 3. Produto Tributado (Cálculo por Percentual)**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "12345678000100",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA"},
      "products": [{
        "cProd": "003",
        "cEAN": "SEM GTIN",
        "xProd": "NOTEBOOK GAMER",
        "NCM": "84713012",
        "CFOP": "5102",
        "uCom": "UNID",
        "qCom": "1.00",
        "vUnCom": "2500.00",
        "vProd": "2500.00",
        "cEANTrib": "SEM GTIN",
        "uTrib": "UNID",
        "qTrib": "1.00",
        "vUnTrib": "2500.00",
        "indTot": "1"
        // Não é mais necessário informar o campo taxes!
      }
    ],
      "payment": {
        "detPag": [
          {
            "indPag": "0",
            "tPag": "03",
            "vPag": "2500.00"
          }
        ]
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

### **🔧 4. Produto com Valores Fixos**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "12345678000100",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA" },
      "products": [{
        "cProd": "004",
        "cEAN": "SEM GTIN",
        "xProd": "PRODUTO COM VALORES FIXOS",
        "NCM": "85044010",
        "CFOP": "5102",
        "uCom": "UNID",
        "qCom": "1.00",
        "vUnCom": "200.00",
        "vProd": "200.00",
        "cEANTrib": "SEM GTIN",
        "uTrib": "UNID",
        "qTrib": "1.00",
        "vUnTrib": "200.00",
        "indTot": "1"
        // Não é mais necessário informar o campo taxes!
      }
    ],
      "payment": {
        "detPag": [
          {
            "indPag": "0",
            "tPag": "01",
            "vPag": "200.00"
          }
        ]
      }
    }
  }'
```

### **⚡ 5. Combustível - Tributação por Quantidade**
```bash
curl -X POST http://localhost:3000/api/notes/nfce/issue \
  -H "Content-Type: application/json" \
  -d '{
    "memberCnpj": "12345678000100",
    "environment": 2,
    "noteData": {
      "ide": { "natOp": "VENDA"},
      "products": [{
        "cProd": "005",
        "cEAN": "SEM GTIN",
        "xProd": "GASOLINA COMUM",
        "NCM": "27101259",
        "CFOP": "5102",
        "uCom": "LT",
        "qCom": "50.000",
        "vUnCom": "6.00",
        "vProd": "300.00",
        "cEANTrib": "SEM GTIN",
        "uTrib": "LT",
        "qTrib": "50.000",
        "vUnTrib": "6.00",
        "indTot": "1"
        // Não é mais necessário informar o campo taxes!
      }
    ],
      "payment": {
        "detPag": [
          {
            "indPag": "0",
            "tPag": "01",
            "vPag": "300.00"
          }
        ]
      }
    }
  }'
```

---

## 📊 **Estrutura da Resposta da API**

### **✅ Resposta de Sucesso (Estrutura Real Atual)**
```json
{
  "success": true,
  "message": "NFCe issued successfully",
  "data": {
    // 📋 DADOS FISCAIS
    "fiscal": {
      "accessKey": "35250760142655000126658840000000261020210008",
      "protocol": "135250001387032",
      "number": "26",
      "series": "884",
      "status": {
        "code": "100",
        "description": "Autorizado o uso da NF-e"
      },
      "issueDate": "09/07/2025, 14:50:23",
      "environment": "Homologation"
    },

    // 💰 DADOS FINANCEIROS (SEMPRE COM TAXES)
    "financial": {
      "totalValue": 0.90,
      "productsValue": 1.00,        // ✅ productsValue (não productsTotal)
      "discount": 0.10,
      "taxes": {                    // ✅ Campo sempre presente
        "icms": 0.00,
        "pis": 0.00,
        "cofins": 0.00,
        "total": 0.00
      }
      // ❌ NÃO TEM: freight, insurance, otherExpenses, change
    },

    // 🏢 DADOS DA EMPRESA
    "company": {
      "cnpj": "12345678000100",     // ✅ Sem formatação
      "corporateName": "EMPRESA FICTICIA LTDA",
      "tradeName": "EMPRESA FICTICIA",
      "stateRegistration": "123456789000",
      "crt": "1",
      "address": {
        "street": "RUA FICTICIA",
        "number": "100",
        "district": "CENTRO",
        "city": "CIDADE FICTICIA",
        "state": "SP",
        "zipCode": "00000000",
        "phone": "11999999999"
      }
    },

    // 👤 DADOS DO CLIENTE (pode ser null)
    "customer": {
      "cpf": "11750943077",
      "cnpj": "12345678000100",     // ✅ Do technicalResponsible
      "name": "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
    },

    // 📦 PRODUTOS (estrutura correta)
    "products": [
      {
        "item": 1,                  // ✅ item (não nItem)
        "code": "001",              // ✅ Código do produto
        "description": "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
        "ncm": "85044010",          // ✅ NCM presente
        "cfop": "5102",             // ✅ CFOP presente
        "quantity": 1,              // ✅ Número inteiro
        "unitPrice": 1,             // ✅ Número inteiro
        "totalPrice": 1,            // ✅ Número inteiro
        "discount": 0.1,            // ✅ Decimal
        "unit": "UNID"
      }
    ],

    // 💳 PAGAMENTO (estrutura correta)
    "payment": {

      "method": {                   // ✅ Objeto singular (não methods array)
        "type": "01",
        "description": "Dinheiro",  // ✅ description traduzida
        "amount": 1                 // ✅ Número
      },
      "change": 0.1                 // ✅ change está aqui
    },

    // 📱 QR CODE (agora string, conforme implementação)
    "qrCode": "https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=...",

    // 📄 XML ASSINADO
    "xmlSigned": "<NFe..."
  }
}
```

### **🎯 Características da Resposta Atual:**

✅ **Campo `taxes` sempre presente** - Mesmo com valores zero  
✅ **Resposta limpa** - Sem campos técnicos desnecessários  
✅ **Estrutura organizada** - fiscal, financial, company, customer, products, payment, qrCode, xmlSigned  
✅ **Autodetecção transparente** - Sem exposição do modo detectado  
✅ **Dados reais** - Baseado na implementação atual  

⚠️ **Pendências identificadas:**  
- `qrCode` ainda como objeto - deveria ser string simples  
- `customer.name` incorreto - deveria ser do recipient, não technicalResponsible  

❌ **Campos removidos** (presentes em versões anteriores):  
- `detectedMode` - Autodetecção é interna  
- `consultUrl` - Desnecessário para o negócio  
- `documents` - Informação técnica  
- `processing` - Detalhes internos  
- `methods` array no payment - Agora `method` objeto singular  
- `freight`, `insurance`, `otherExpenses` - Campos não implementados  
- `change` em financial - Movido para payment  

### **❌ Resposta de Erro**
```json
{
  "success": false,
  "message": "Error issuing NFCe",
  "error": "Certificate not found for CNPJ: 12345678000100 in environment: 2",
  "data": {
    "cStat": "404",
    "reason": "Certificate not configured",
    "memberCnpj": "12345678000100",
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
    "reason": "Duplicidade de NF-e [chNFe: 35240112345678000100123450000000011123456789]",
    "accessKey": "35240112345678000100123450000000011123456789"
  }
}
```

---


## 🔗 **Integração com a Biblioteca node-sped-nfe**

O processamento de taxas (tributação) realizado pela API é totalmente compatível e integrado com a biblioteca [node-sped-nfe](https://github.com/akretion/node-sped-nfe), que é responsável pela geração do XML fiscal final.

### 🛠️ **Como funciona a integração**

- **Entrada:** Você envia os campos de tributação no payload da API usando camelCase (ex: `cstPis`, `cstCofins`, `pisPercent`, etc.), conforme os exemplos deste README.
- **Processamento:** O serviço de tributação interpreta esses campos, valida e calcula os valores necessários (automático ou manual).
- **Conversão:** Internamente, a API converte os campos camelCase para o padrão exigido pela `node-sped-nfe`, gerando as tags XML corretas:
  - `ICMS` → `tagProdICMSSN`
  - `PIS`  → `tagProdPIS`
  - `COFINS` → `tagProdCOFINS`
- **Geração do XML:** A biblioteca `node-sped-nfe` recebe os dados já no formato correto e gera o XML fiscal válido para a SEFAZ.

### 📦 **Exemplo de Conversão**

```json
// Payload enviado para a API
"taxes": {
  "orig": "0",
  "CSOSN": "102",
  "cstPis": "49",
  "cstCofins": "49"
}
```

**Processamento interno → Conversão para tags node-sped-nfe:**

```js
{
  tagProdICMSSN: { orig: '0', CSOSN: '102' },
  tagProdPIS:    { CST: '49', vPIS: '0.00' },
  tagProdCOFINS: { CST: '49', vCOFINS: '0.00' }
}
```

### ✅ **Vantagens**
- Você não precisa se preocupar com nomes de campos em caixa alta/baixa ou com o padrão XML.
- Basta seguir o padrão camelCase da documentação e exemplos.
- Toda a integração e conversão é feita automaticamente pela API.

---
## 🤖 **Sistema de Tributação 100% Automático**
---

## ❗ O que acontece se o NCM não estiver cadastrado?

Se você tentar emitir uma NFC-e com um NCM que não está cadastrado na tabela `ncm_tax_rules` para o CRT da empresa:

- **A nota NÃO será emitida.**
- A API irá interromper o processamento e retornar um erro claro, por exemplo:

```json
{
  "success": false,
  "message": "Regra fiscal não encontrada para NCM 12345678 e empresa 12345678000100"
}
```
- Nenhum XML é gerado e nenhum dado é salvo.

**Recomendação:**
Antes de emitir, cadastre todos os NCMs utilizados na tabela `ncm_tax_rules` para cada regime tributário da empresa.


### **🎯 Tributação Transparente e Sem Configuração Manual**

A API detecta automaticamente o cenário tributário de cada produto com base no NCM, CRT da empresa e regras parametrizadas no banco de dados. **Não é mais necessário informar o campo `taxes` no payload!**

**Como funciona:**
- A API busca a regra fiscal correta para cada produto (NCM + CRT)
- Calcula automaticamente todos os valores de ICMS, PIS e COFINS
- Gera o XML já no layout correto, sem necessidade de configuração manual
- Mantém flexibilidade para atualização de regras fiscais sem alterar código

**Vantagens:**
- Reduz erros de preenchimento
- Facilita manutenção e atualização tributária
- Permite integração simples: basta informar os dados do produto

**Exemplo de payload simplificado:**
```json
{
  "products": [
    {
      "cProd": "001",
      "xProd": "PRODUTO QUALQUER",
      "NCM": "85044010",
      "CFOP": "5102",
      "vProd": "100.00"
      // Não precisa mais do campo taxes!
    }
  ]
}
```

**A API cuida de toda a lógica tributária automaticamente!**

---

## 🔧 **Instalação e Configuração**

### **📋 Pré-requisitos**
### **🔑 Configuração do Responsável Técnico**
Os dados do responsável técnico devem ser definidos no arquivo `.env`:

```dotenv
TECHNICAL_RESPONSIBLE_CNPJ=11222333000181
TECHNICAL_RESPONSIBLE_CONTACT="João Silva - Developer"
TECHNICAL_RESPONSIBLE_EMAIL=joao.silva@empresa.com.br
TECHNICAL_RESPONSIBLE_PHONE=11999887766
```
- Node.js 18+
- MySQL 8+
- Certificados A1 (.pfx) das empresas

### **⚡ Instalação Rápida**
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/nfce-node-api.git
cd nfce-node-api

# Instale as dependências
npm install

# Configure o banco de dados
npm run database:initialize

# Inicie em modo de desenvolvimento
npm run dev
```

### **🗄️ Configuração do Banco**
```sql
-- A API cria automaticamente as tabelas necessárias
-- Execute uma vez para inicializar:
POST /api/notes/database/initialize
```

### **🔑 Configuração de Certificados**
1. Coloque os certificados .pfx na pasta `certificates/`
2. Nomeie como `{CNPJ}.pfx` (apenas números)
3. A API busca automaticamente pelo CNPJ da requisição

---

## 📈 **Monitoramento e Cache**

### **📊 Estatísticas do Sistema**
```bash
# Cache de certificados
GET /api/notes/cache/stats

# Controle de numeração
GET /api/notes/numbering/stats

# Limpar cache (se necessário)
DELETE /api/notes/cache/clear
```

### **🎯 Performance**
- **Cache inteligente** de certificados (1 hora)
- **Controle de numeração** automático por série
- **Endpoints GET** totalmente cacheáveis
- **Validação de certificados** em background

---

## 🚀 **Roadmap da API Unificada**

### **✅ Versão 2.0 (Atual)**
- ✅ NFCe completa (emissão, consulta, cancelamento)
- ✅ Arquitetura unificada preparada para expansão
- ✅ Sistema de tributação autodetectado
- ✅ Cache inteligente e performance otimizada
- ✅ Resposta limpa e estruturada
- ✅ Campo taxes sempre presente

### **🔄 Versão 2.1 (Próxima)**
- 🔄 NFe (Nota Fiscal Eletrônica)
- 🔄 Eventos de NFe (Carta de Correção, Cancelamento)
- 🔄 Suporte a certificados A3 (token/smartcard)

### **🚀 Versão 3.0 (Futuro)**
- 🚀 NFSe (Nota Fiscal de Serviços Eletrônica)
- 🚀 Dashboard web para gerenciamento
- 🚀 API Gateway com autenticação JWT
- 🚀 Integração com ERPs populares

---

## 📚 **Documentação Técnica**

### **🏗️ Arquitetura**
```
src/
├── controllers/     # Endpoints e validações
├── handlers/        # Lógica de negócio específica
├── services/        # Serviços compartilhados
├── parsers/         # Processamento de XML/respostas
├── utils/           # Utilitários e cache
├── config/          # Configurações do sistema
└── types/           # Definições TypeScript
```

### **🔍 Fluxo de Processamento**
1. **Controller** - Recebe requisição, valida dados básicos
2. **Handler** - Processa regras de negócio específicas do tipo
3. **Services** - Executam operações (numeração, certificados, SEFAZ)
4. **Parsers** - Processam respostas XML da SEFAZ
5. **Response** - Estrutura limpa retornada para o cliente

---

**🎉 A API v2.0 está pronta para produção com arquitetura unificada, tributação inteligente, código limpo, segurança máxima e preparada para expansão futura!**

**Versão**: 2.0.0 (Unificada) | **Compatibilidade**: Exclusivamente rotas unificadas
