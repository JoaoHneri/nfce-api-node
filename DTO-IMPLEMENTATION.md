# DTOs Implementados para NFCe API

Este documento descreve os DTOs (Data Transfer Objects) implementados para a API de NFCe, baseados nas interfaces definidas no arquivo `src/types/index.ts`.

## Estrutura dos DTOs

### 📁 Localização
Os DTOs estão localizados em: `src/dto/`

### 📋 DTOs Implementados

#### 1. **CertificadoConfigDto** (`certificado-config.dto.ts`)
DTO para configuração de certificado digital
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

#### 2. **EnderecoDto** e **EmitenteDto** (`emitente.dto.ts`)
DTOs para dados do emitente e endereço
- **EnderecoDto**: Validação completa de endereço
- **EmitenteDto**: Dados da empresa emitente com validação aninhada do endereço
- **DestinatarioDto**: Dados opcionais do destinatário

#### 3. **IdeDto** (`ide.dto.ts`)
DTO para dados de identificação da NFCe
- Validação de todos os campos de identificação fiscal
- Campo opcional: `dhEmi`, `indIntermed`

#### 4. **ProdutoDto** (`produto.dto.ts`)
DTO para itens/produtos da NFCe
- Validação de códigos de produto, NCM, CFOP
- Campos opcionais: `cEAN`, `cEANTrib`, `vDesc`

#### 5. **ImpostosDto** (`impostos.dto.ts`)
DTO para configuração simplificada de impostos
- Todos os campos opcionais para flexibilidade

#### 6. **DetPagDto** e **PagamentoDto** (`pagamento.dto.ts`)
DTOs para formas de pagamento
- **DetPagDto**: Detalhes de cada forma de pagamento
- **PagamentoDto**: Array de pagamentos com troco opcional

#### 7. **TransporteDto** (`transporte.dto.ts`)
DTO para informações de transporte (opcional)

#### 8. **NFCeDataDto** (`nfce-data.dto.ts`)
DTO principal que combina todos os outros
- Validação aninhada de todos os componentes
- Estrutura completa para emissão de NFCe

### 📤 DTOs de Resposta

#### 9. **SefazResponseDto** (`sefaz-response.dto.ts`)
DTO para respostas gerais do SEFAZ

#### 10. **ConsultaResponseDto** (`consulta-response.dto.ts`)
DTO específico para respostas de consulta

#### 11. **CancelamentoRequestDto** (`cancelamento-request.dto.ts`)
DTO para solicitações de cancelamento

#### 12. **CancelamentoResponseDto** (`cancelamento-response.dto.ts`)
DTO para respostas de cancelamento

## 🔧 Funcionalidades

### Validação Automática
- Todos os DTOs usam decoradores do `class-validator`
- Validação de tipos, campos obrigatórios e opcionais
- Validação aninhada para objetos complexos

### Transformação de Dados
- Uso do `class-transformer` para conversão automática
- Suporte a arrays e objetos aninhados

### Exportação Centralizada
- Arquivo `index.ts` exporta todos os DTOs
- Importação simplificada: `import { NFCeDataDto } from '../dto'`

## 🎯 Uso nos Controllers

```typescript
import { NFCeDataDto, SefazResponseDto } from '../dto';

@Post('emitir')
async emitirNFCe(@Body() dados: NFCeDataDto): Promise<SefazResponseDto> {
  // O NestJS automaticamente valida os dados usando o DTO
  return this.nfceService.emitir(dados);
}
```

## ✅ Compatibilidade

Os DTOs são **100% compatíveis** com as interfaces originais definidas em `src/types/index.ts`, mantendo:
- Mesma estrutura de dados
- Mesmos tipos de campos
- Mesma opcionalidade dos campos
- Mesmas validações de negócio

## 📦 Dependências

- `class-validator`: Para validação automática
- `class-transformer`: Para transformação de dados
- `@nestjs/common`: Para decoradores do NestJS

## 🚀 Benefícios

1. **Validação Automática**: Dados são validados antes de chegar aos services
2. **Documentação**: DTOs servem como documentação da API
3. **Type Safety**: TypeScript garante tipagem forte
4. **Reutilização**: DTOs podem ser reutilizados em diferentes endpoints
5. **Manutenibilidade**: Mudanças centralizadas nos DTOs