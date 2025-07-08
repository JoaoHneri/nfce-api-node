# 🆕 Guia Completo da API Unificada v2.0

## 📋 **Visão Geral**

A API agora opera **exclusivamente com rotas unificadas**, oferecendo um padrão consistente para todos os tipos de notas fiscais (NFCe, NFe, NFSe).

### 🎯 **Arquitetura Simplificada**

```
/api/notes/:type/*  ← APENAS UM PADRÃO
```

**Tipos suportados:**
- `nfce` ✅ Disponível
- `nfe` 🔄 Em desenvolvimento
- `nfse` 🔄 Em desenvolvimento

---

## 🔥 **Endpoints Unificados (ÚNICOS)**

### 1. 📝 **Emissão de Notas**
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

### 2. 🔍 **Consulta de Notas**
```http
GET /api/notes/:type/consult/:accessKey/:memberCnpj/:environment
```

### 3. ❌ **Cancelamento de Notas**
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

### 4. 📋 **Tipos Suportados**
```http
GET /api/notes/types
```

### 5. 📖 **Exemplo por Tipo**
```http
GET /api/notes/:type/example
```

---

## 🛠️ **Utilitários Essenciais**

### 🔧 **Conectividade**
```http
GET /api/notes/test
```

### 📊 **Cache**
```http
GET /api/notes/cache/stats      # Estatísticas
DELETE /api/notes/cache/clear   # Limpar cache
```

### 🔢 **Numeração**
```http
GET /api/notes/numbering/stats?cnpj=...&uf=...&serie=...&ambiente=...
POST /api/notes/numbering/release
```

### 🗄️ **Banco de Dados**
```http
POST /api/notes/database/initialize
```

---

## 💡 **Exemplos Práticos**

### NFCe - Emissão
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

### NFCe - Consulta
```bash
curl -X GET "http://localhost:3000/api/notes/nfce/consult/44123456789012345678901234567890123456789012/12345678000199/2"
```

### NFCe - Cancelamento
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

---

## 🔄 **Compatibilidade e Migração**

### ❌ **Rotas Antigas (REMOVIDAS)**
```bash
# ❌ Estas rotas não existem mais:
POST /api/nfce/create-nfc
GET /api/nfce/consult/:accessKey/:memberCnpj/:environment  
POST /api/nfce/cancel-nfc
GET /api/nfce/example
```

### ✅ **Migração para Unificadas**
```bash
# ✅ Use apenas estas:
POST /api/notes/nfce/issue
GET /api/notes/nfce/consult/:accessKey/:memberCnpj/:environment
POST /api/notes/nfce/cancel
GET /api/notes/nfce/example
```

---

## 🎯 **Vantagens da API Unificada**

### 🏗️ **Arquitetura Consistente**
- **Um só padrão** para todos os tipos de notas
- **Fácil expansão** para NFe e NFSe
- **Manutenção simplificada**

### 📈 **Escalabilidade**
- **Preparado para múltiplos tipos** de documentos fiscais
- **Estrutura padronizada** facilita integração
- **Documentação unificada**

### 🔐 **Segurança Mantida**
- **Certificados no banco** (nunca na requisição)
- **Validação automática** por CNPJ + ambiente
- **Logs unificados** e auditoria

---

## 🚀 **Próximos Passos**

### Q2 2025 - NFe
```bash
POST /api/notes/nfe/issue       # ← Em desenvolvimento
GET /api/notes/nfe/consult/...  # ← Em desenvolvimento  
POST /api/notes/nfe/cancel      # ← Em desenvolvimento
```

### Q3 2025 - NFSe
```bash
POST /api/notes/nfse/issue      # ← Planejado
GET /api/notes/nfse/consult/... # ← Planejado
POST /api/notes/nfse/cancel     # ← Planejado
```

---

## 📞 **Suporte**

Para dúvidas sobre a migração ou uso da API unificada:

1. **Verifique os tipos suportados**: `GET /api/notes/types`
2. **Obtenha exemplos**: `GET /api/notes/:type/example`
3. **Teste conectividade**: `GET /api/notes/test`

**Versão da API**: 2.0.0 (Unificada)  
**Compatibilidade**: Exclusivamente rotas unificadas
