# 🚀 Guia de Uso - API Unificada Multi-Notas

## 📋 **Como Usar a Nova API Unificada**

### **✅ Rotas Disponíveis Agora:**

#### **1. Emissão Unificada:**
```bash
POST /api/notes/nfce/issue
POST /api/notes/nfe/issue    # 🔄 Coming Soon
POST /api/notes/nfse/issue   # 🔄 Coming Soon
```

#### **2. Consulta Unificada:**
```bash
GET /api/notes/nfce/consult/:accessKey/:memberCnpj/:environment
GET /api/notes/nfe/consult/:accessKey/:memberCnpj/:environment    # 🔄 Coming Soon
GET /api/notes/nfse/consult/:accessKey/:memberCnpj/:environment   # 🔄 Coming Soon
```

#### **3. Cancelamento Unificado:**
```bash
POST /api/notes/nfce/cancel
POST /api/notes/nfe/cancel   # 🔄 Coming Soon
POST /api/notes/nfse/cancel  # 🔄 Coming Soon
```

#### **4. Utilitários:**
```bash
GET /api/notes/types           # Tipos suportados
GET /api/notes/nfce/example    # Exemplo NFCe
GET /api/notes/nfe/example     # 🔄 Coming Soon
GET /api/notes/nfse/example    # 🔄 Coming Soon
```

---

## 🎯 **Exemplos Práticos:**

### **📝 Emissão NFCe (Nova Rota Unificada):**
```javascript
// ✅ Nova rota unificada
const response = await axios.post('/api/notes/nfce/issue', {
  "type": "nfce",  // Opcional, detectado da URL
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
    "products": [
      {
        "cProd": "001",
        "cEAN": "SEM GTIN",
        "xProd": "PRODUTO EXEMPLO",
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
        "indTot": "1"
      }
    ],
    "payment": {
      "detPag": [{
        "indPag": "0",
        "tPag": "01",
        "vPag": "10.00"
      }],
      "change": "0.00"
    }
  }
});
```

### **🔍 Consulta NFCe (Nova Rota Unificada):**
```javascript
// ✅ Nova rota unificada - GET RESTful
const response = await axios.get(
  '/api/notes/nfce/consult/35240112345678000199650010000000011123456789/12345678000199/2'
);
```

### **❌ Cancelamento NFCe (Nova Rota Unificada):**
```javascript
// ✅ Nova rota unificada
const response = await axios.post('/api/notes/nfce/cancel', {
  "memberCnpj": "12345678000199",
  "environment": 2,
  "accessKey": "35240112345678000199650010000000011123456789",
  "protocol": "135240000123456",
  "justification": "Cancelamento solicitado pelo cliente"
});
```

### **📋 Verificar Tipos Suportados:**
```javascript
// ✅ Ver quais tipos estão disponíveis
const response = await axios.get('/api/notes/types');

/* Resposta:
{
  "success": true,
  "data": {
    "available": ["nfce"],
    "comingSoon": ["nfe", "nfse"],
    "descriptions": {
      "nfce": "Nota Fiscal de Consumidor Eletrônica - ✅ Available",
      "nfe": "Nota Fiscal Eletrônica - 🔄 Coming Soon",
      "nfse": "Nota Fiscal de Serviços Eletrônica - 🔄 Coming Soon"
    }
  }
}
*/
```

---

## 🔄 **Compatibilidade Total:**

### **✅ Suas rotas NFCe antigas continuam funcionando:**
```javascript
// ✅ Rota específica antiga (ainda funciona)
POST /api/nfce/create-nfc
GET  /api/nfce/consult/:accessKey/:memberCnpj/:environment
POST /api/nfce/cancel

// ✅ Rota unificada nova (recomendada)
POST /api/notes/nfce/issue
GET  /api/notes/nfce/consult/:accessKey/:memberCnpj/:environment
POST /api/notes/nfce/cancel
```

---

## 🚀 **Futuro (Quando implementar NFe e NFSe):**

### **📝 Emissão NFe (Futuro):**
```javascript
// 🔄 Funcionará automaticamente quando implementar
const response = await axios.post('/api/notes/nfe/issue', {
  "memberCnpj": "12345678000199",
  "environment": 2,
  "noteData": {
    // Dados específicos da NFe
    "ide": { /* ... */ },
    "emit": { /* ... */ },
    "dest": { /* ... */ },
    "det": [ /* produtos NFe */ ]
  }
});
```

### **📝 Emissão NFSe (Futuro):**
```javascript
// 🔄 Funcionará automaticamente quando implementar
const response = await axios.post('/api/notes/nfse/issue', {
  "memberCnpj": "12345678000199",
  "environment": 2,
  "noteData": {
    // Dados específicos da NFSe
    "servico": { /* ... */ },
    "prestador": { /* ... */ },
    "tomador": { /* ... */ }
  }
});
```

---

## 🎯 **Vantagens da Nova Estrutura:**

### **✅ Para Desenvolvedores:**
- **Consistência**: Mesma estrutura para todos os tipos
- **Flexibilidade**: Use rota específica ou unificada
- **Zero Breaking Changes**: Código atual continua funcionando
- **Preparação Futura**: Pronto para NFe e NFSe

### **✅ Para API:**
- **Organização**: URLs mais limpa e organizadas
- **Escalabilidade**: Fácil adicionar novos tipos
- **Manutenibilidade**: Código reutilizável
- **Performance**: Switch/case otimizado

---

## 📊 **Status dos Tipos:**

| Tipo | Status | Emissão | Consulta | Cancelamento | Exemplo |
|------|--------|---------|----------|--------------|---------|
| **NFCe** | ✅ Disponível | ✅ | ✅ | ✅ | ✅ |
| **NFe** | 🔄 Em desenvolvimento | 🔄 | 🔄 | 🔄 | 🔄 |
| **NFSe** | 🔄 Planejado | 🔄 | 🔄 | 🔄 | 🔄 |

---

**🎉 A API está pronta para uso imediato com NFCe e preparada para expansão futura!**
