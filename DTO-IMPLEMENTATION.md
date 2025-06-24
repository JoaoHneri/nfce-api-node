# DTOs Organizados para NFCe NestJS API

Este documento descreve a estrutura organizacional dos DTOs (Data Transfer Objects) implementados para a API de NFCe usando NestJS, com uma arquitetura modular e bem organizada.

## 🏗️ Nova Estrutura Organizacional

### 📁 Estrutura de Diretórios

```
src/dto/
├── index.ts                              # Export barrel principal
├── auth/                                 # 🔐 Autenticação
│   ├── certificado-config.dto.ts        
│   └── index.ts
├── cache/                                # 💾 Sistema de cache
│   ├── cache-stats.dto.ts
│   └── index.ts
├── common/                               # 🔧 DTOs comuns/utilitários
│   ├── api-response.dto.ts
│   └── index.ts
└── nfce/                                # � NFCe específicos
    ├── index.ts
    ├── core/                            # 🎯 Dados principais da NFCe
    │   ├── emitente.dto.ts
    │   ├── ide.dto.ts
    │   ├── impostos.dto.ts
    │   ├── nfce-data.dto.ts
    │   ├── pagamento.dto.ts
    │   ├── produto.dto.ts
    │   ├── transporte.dto.ts
    │   └── index.ts
    ├── requests/                        # 📥 DTOs de entrada/requests
    │   ├── cancelamento-request.dto.ts
    │   ├── emissao-nfce-request.dto.ts
    │   └── index.ts
    └── responses/                       # � DTOs de saída/responses
        ├── cancelamento-response.dto.ts
        ├── consulta-response.dto.ts
        ├── sefaz-response.dto.ts
        └── index.ts
```

## 🎯 Organização por Contexto

### 🔐 **auth/** - Autenticação e Certificados
DTOs relacionados à autenticação e configuração de certificados digitais.

**CertificadoConfigDto**
- Configuração de certificado digital A1/A3
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

### 💾 **cache/** - Sistema de Cache  
DTOs para estatísticas e controle do cache de Tools.

**CacheStatsDto**
- Estatísticas de uso do cache
- Métricas de performance
- Dados de tempo de vida (TTL)

### 🔧 **common/** - DTOs Comuns
DTOs reutilizáveis em toda a aplicação.

**ApiResponseDto<T>**
- Estrutura padronizada de resposta da API
- Genérico para suportar qualquer tipo de dados
- Campos: `sucesso`, `mensagem`, `dados?`, `erro?`

### 📄 **nfce/** - NFCe Específicos

#### 🎯 **core/** - Dados Principais
DTOs que representam os dados fundamentais da NFCe.

**NFCeDataDto** - Estrutura principal da NFCe
**EmitenteDto** - Dados da empresa emitente  
**EnderecoDto** - Endereço (emitente/destinatário)  
**DestinatarioDto** - Dados do destinatário
**IdeDto** - Identificação da NFCe
**ProdutoDto** - Itens/produtos
**ImpostosDto** - Impostos e tributação
**PagamentoDto** - Formas de pagamento
**DetalhePagamentoDto** - Detalhes específicos de cada pagamento
**TransporteDto** - Dados de transporte

#### 📥 **requests/** - DTOs de Entrada
DTOs que definem os payloads de entrada dos endpoints.

**EmissaoNFCeRequestDto**
```typescript
{
  dadosNFCe: NFCeDataDto;
  certificado: CertificadoConfigDto;
}
```

**CancelamentoRequestDto**  
```typescript
{
  chaveAcesso: string;
  protocolo: string;
  justificativa: string;
}
```

#### 📤 **responses/** - DTOs de Saída  
DTOs que definem as respostas dos endpoints.

**SefazResponseDto** - Resposta padronizada da SEFAZ
**ConsultaResponseDto** - Resposta de consulta de NFCe
**CancelamentoResponseDto** - Resposta de cancelamento

## 🚀 Vantagens da Nova Estrutura

### ✅ **Separação por Domínio**
- Cada contexto (Auth, Cache, NFCe) tem sua própria pasta
- Facilita manutenção e localização de código
- Reduz acoplamento entre domínios

### ✅ **Imports Limpos com Barrel Exports**
```typescript
// ❌ Antes - Imports verbosos
import { EmissaoNFCeRequestDto } from './dto/emissao-nfce-request.dto';
import { CertificadoConfigDto } from './dto/certificado-config.dto';
import { CacheStatsDto } from './dto/cache-stats.dto';

// ✅ Agora - Import limpo e organizado  
import {
  EmissaoNFCeRequestDto,
  CertificadoConfigDto, 
  CacheStatsDto,
} from '../../dto';
```

### ✅ **Escalabilidade**
Estrutura preparada para crescimento:
```
src/dto/
├── nfe/          # ← Fácil adicionar NFe
├── cte/          # ← Fácil adicionar CTe  
├── mdfe/         # ← Fácil adicionar MDFe
└── nfce/         # ← Já existente
```

### ✅ **Reutilização e Organização**
- DTOs comuns centralizados em `common/`
- Core business logic separado de requests/responses
- Fácil identificar propósito de cada DTO pelo local

## 🔧 Como Usar os DTOs

### No Controller
```typescript
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  @Post('emitir')
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto) {
    // ...
  }
}
```

### No Service  
```typescript
import { NFCeDataDto, CertificadoConfigDto } from '../../dto';

@Injectable()
export class NfceService {
  async emitirNFCe(dados: NFCeDataDto, certificado: CertificadoConfigDto) {
    // ...
  }
}
```

## 📋 Lista Completa de DTOs
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

# DTOs Organizados para NFCe NestJS API

Este documento descreve a estrutura organizacional dos DTOs (Data Transfer Objects) implementados para a API de NFCe usando NestJS, com uma arquitetura modular e bem organizada.

## 🏗️ Nova Estrutura Organizacional

### 📁 Estrutura de Diretórios

```
src/dto/
├── index.ts                              # Export barrel principal
├── auth/                                 # 🔐 Autenticação
│   ├── certificado-config.dto.ts        
│   └── index.ts
├── cache/                                # 💾 Sistema de cache
│   ├── cache-stats.dto.ts
│   └── index.ts
├── common/                               # 🔧 DTOs comuns/utilitários
│   ├── api-response.dto.ts
│   └── index.ts
└── nfce/                                # � NFCe específicos
    ├── index.ts
    ├── core/                            # 🎯 Dados principais da NFCe
    │   ├── emitente.dto.ts
    │   ├── ide.dto.ts
    │   ├── impostos.dto.ts
    │   ├── nfce-data.dto.ts
    │   ├── pagamento.dto.ts
    │   ├── produto.dto.ts
    │   ├── transporte.dto.ts
    │   └── index.ts
    ├── requests/                        # 📥 DTOs de entrada/requests
    │   ├── cancelamento-request.dto.ts
    │   ├── emissao-nfce-request.dto.ts
    │   └── index.ts
    └── responses/                       # � DTOs de saída/responses
        ├── cancelamento-response.dto.ts
        ├── consulta-response.dto.ts
        ├── sefaz-response.dto.ts
        └── index.ts
```

## 🎯 Organização por Contexto

### 🔐 **auth/** - Autenticação e Certificados
DTOs relacionados à autenticação e configuração de certificados digitais.

**CertificadoConfigDto**
- Configuração de certificado digital A1/A3
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

### 💾 **cache/** - Sistema de Cache  
DTOs para estatísticas e controle do cache de Tools.

**CacheStatsDto**
- Estatísticas de uso do cache
- Métricas de performance
- Dados de tempo de vida (TTL)

### 🔧 **common/** - DTOs Comuns
DTOs reutilizáveis em toda a aplicação.

**ApiResponseDto<T>**
- Estrutura padronizada de resposta da API
- Genérico para suportar qualquer tipo de dados
- Campos: `sucesso`, `mensagem`, `dados?`, `erro?`

### 📄 **nfce/** - NFCe Específicos

#### 🎯 **core/** - Dados Principais
DTOs que representam os dados fundamentais da NFCe.

**NFCeDataDto** - Estrutura principal da NFCe
**EmitenteDto** - Dados da empresa emitente  
**EnderecoDto** - Endereço (emitente/destinatário)  
**DestinatarioDto** - Dados do destinatário
**IdeDto** - Identificação da NFCe
**ProdutoDto** - Itens/produtos
**ImpostosDto** - Impostos e tributação
**PagamentoDto** - Formas de pagamento
**DetalhePagamentoDto** - Detalhes específicos de cada pagamento
**TransporteDto** - Dados de transporte

#### 📥 **requests/** - DTOs de Entrada
DTOs que definem os payloads de entrada dos endpoints.

**EmissaoNFCeRequestDto**
```typescript
{
  dadosNFCe: NFCeDataDto;
  certificado: CertificadoConfigDto;
}
```

**CancelamentoRequestDto**  
```typescript
{
  chaveAcesso: string;
  protocolo: string;
  justificativa: string;
}
```

#### 📤 **responses/** - DTOs de Saída  
DTOs que definem as respostas dos endpoints.

**SefazResponseDto** - Resposta padronizada da SEFAZ
**ConsultaResponseDto** - Resposta de consulta de NFCe
**CancelamentoResponseDto** - Resposta de cancelamento

## 🚀 Vantagens da Nova Estrutura

### ✅ **Separação por Domínio**
- Cada contexto (Auth, Cache, NFCe) tem sua própria pasta
- Facilita manutenção e localização de código
- Reduz acoplamento entre domínios

### ✅ **Imports Limpos com Barrel Exports**
```typescript
// ❌ Antes - Imports verbosos
import { EmissaoNFCeRequestDto } from './dto/emissao-nfce-request.dto';
import { CertificadoConfigDto } from './dto/certificado-config.dto';
import { CacheStatsDto } from './dto/cache-stats.dto';

// ✅ Agora - Import limpo e organizado  
import {
  EmissaoNFCeRequestDto,
  CertificadoConfigDto, 
  CacheStatsDto,
} from '../../dto';
```

### ✅ **Escalabilidade**
Estrutura preparada para crescimento:
```
src/dto/
├── nfe/          # ← Fácil adicionar NFe
├── cte/          # ← Fácil adicionar CTe  
├── mdfe/         # ← Fácil adicionar MDFe
└── nfce/         # ← Já existente
```

### ✅ **Reutilização e Organização**
- DTOs comuns centralizados em `common/`
- Core business logic separado de requests/responses
- Fácil identificar propósito de cada DTO pelo local

## 🔧 Como Usar os DTOs

### No Controller
```typescript
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  @Post('emitir')
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto) {
    // ...
  }
}
```

### No Service  
```typescript
import { NFCeDataDto, CertificadoConfigDto } from '../../dto';

@Injectable()
export class NfceService {
  async emitirNFCe(dados: NFCeDataDto, certificado: CertificadoConfigDto) {
    // ...
  }
}
```

## 📋 Lista Completa de DTOs
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

# DTOs Organizados para NFCe NestJS API

Este documento descreve a estrutura organizacional dos DTOs (Data Transfer Objects) implementados para a API de NFCe usando NestJS, com uma arquitetura modular e bem organizada.

## 🏗️ Nova Estrutura Organizacional

### 📁 Estrutura de Diretórios

```
src/dto/
├── index.ts                              # Export barrel principal
├── auth/                                 # 🔐 Autenticação
│   ├── certificado-config.dto.ts        
│   └── index.ts
├── cache/                                # 💾 Sistema de cache
│   ├── cache-stats.dto.ts
│   └── index.ts
├── common/                               # 🔧 DTOs comuns/utilitários
│   ├── api-response.dto.ts
│   └── index.ts
└── nfce/                                # � NFCe específicos
    ├── index.ts
    ├── core/                            # 🎯 Dados principais da NFCe
    │   ├── emitente.dto.ts
    │   ├── ide.dto.ts
    │   ├── impostos.dto.ts
    │   ├── nfce-data.dto.ts
    │   ├── pagamento.dto.ts
    │   ├── produto.dto.ts
    │   ├── transporte.dto.ts
    │   └── index.ts
    ├── requests/                        # 📥 DTOs de entrada/requests
    │   ├── cancelamento-request.dto.ts
    │   ├── emissao-nfce-request.dto.ts
    │   └── index.ts
    └── responses/                       # � DTOs de saída/responses
        ├── cancelamento-response.dto.ts
        ├── consulta-response.dto.ts
        ├── sefaz-response.dto.ts
        └── index.ts
```

## 🎯 Organização por Contexto

### 🔐 **auth/** - Autenticação e Certificados
DTOs relacionados à autenticação e configuração de certificados digitais.

**CertificadoConfigDto**
- Configuração de certificado digital A1/A3
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

### 💾 **cache/** - Sistema de Cache  
DTOs para estatísticas e controle do cache de Tools.

**CacheStatsDto**
- Estatísticas de uso do cache
- Métricas de performance
- Dados de tempo de vida (TTL)

### 🔧 **common/** - DTOs Comuns
DTOs reutilizáveis em toda a aplicação.

**ApiResponseDto<T>**
- Estrutura padronizada de resposta da API
- Genérico para suportar qualquer tipo de dados
- Campos: `sucesso`, `mensagem`, `dados?`, `erro?`

### 📄 **nfce/** - NFCe Específicos

#### 🎯 **core/** - Dados Principais
DTOs que representam os dados fundamentais da NFCe.

**NFCeDataDto** - Estrutura principal da NFCe
**EmitenteDto** - Dados da empresa emitente  
**EnderecoDto** - Endereço (emitente/destinatário)  
**DestinatarioDto** - Dados do destinatário
**IdeDto** - Identificação da NFCe
**ProdutoDto** - Itens/produtos
**ImpostosDto** - Impostos e tributação
**PagamentoDto** - Formas de pagamento
**DetalhePagamentoDto** - Detalhes específicos de cada pagamento
**TransporteDto** - Dados de transporte

#### 📥 **requests/** - DTOs de Entrada
DTOs que definem os payloads de entrada dos endpoints.

**EmissaoNFCeRequestDto**
```typescript
{
  dadosNFCe: NFCeDataDto;
  certificado: CertificadoConfigDto;
}
```

**CancelamentoRequestDto**  
```typescript
{
  chaveAcesso: string;
  protocolo: string;
  justificativa: string;
}
```

#### 📤 **responses/** - DTOs de Saída  
DTOs que definem as respostas dos endpoints.

**SefazResponseDto** - Resposta padronizada da SEFAZ
**ConsultaResponseDto** - Resposta de consulta de NFCe
**CancelamentoResponseDto** - Resposta de cancelamento

## 🚀 Vantagens da Nova Estrutura

### ✅ **Separação por Domínio**
- Cada contexto (Auth, Cache, NFCe) tem sua própria pasta
- Facilita manutenção e localização de código
- Reduz acoplamento entre domínios

### ✅ **Imports Limpos com Barrel Exports**
```typescript
// ❌ Antes - Imports verbosos
import { EmissaoNFCeRequestDto } from './dto/emissao-nfce-request.dto';
import { CertificadoConfigDto } from './dto/certificado-config.dto';
import { CacheStatsDto } from './dto/cache-stats.dto';

// ✅ Agora - Import limpo e organizado  
import {
  EmissaoNFCeRequestDto,
  CertificadoConfigDto, 
  CacheStatsDto,
} from '../../dto';
```

### ✅ **Escalabilidade**
Estrutura preparada para crescimento:
```
src/dto/
├── nfe/          # ← Fácil adicionar NFe
├── cte/          # ← Fácil adicionar CTe  
├── mdfe/         # ← Fácil adicionar MDFe
└── nfce/         # ← Já existente
```

### ✅ **Reutilização e Organização**
- DTOs comuns centralizados em `common/`
- Core business logic separado de requests/responses
- Fácil identificar propósito de cada DTO pelo local

## 🔧 Como Usar os DTOs

### No Controller
```typescript
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  @Post('emitir')
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto) {
    // ...
  }
}
```

### No Service  
```typescript
import { NFCeDataDto, CertificadoConfigDto } from '../../dto';

@Injectable()
export class NfceService {
  async emitirNFCe(dados: NFCeDataDto, certificado: CertificadoConfigDto) {
    // ...
  }
}
```

## 📋 Lista Completa de DTOs
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

# DTOs Organizados para NFCe NestJS API

Este documento descreve a estrutura organizacional dos DTOs (Data Transfer Objects) implementados para a API de NFCe usando NestJS, com uma arquitetura modular e bem organizada.

## 🏗️ Nova Estrutura Organizacional

### 📁 Estrutura de Diretórios

```
src/dto/
├── index.ts                              # Export barrel principal
├── auth/                                 # 🔐 Autenticação
│   ├── certificado-config.dto.ts        
│   └── index.ts
├── cache/                                # 💾 Sistema de cache
│   ├── cache-stats.dto.ts
│   └── index.ts
├── common/                               # 🔧 DTOs comuns/utilitários
│   ├── api-response.dto.ts
│   └── index.ts
└── nfce/                                # � NFCe específicos
    ├── index.ts
    ├── core/                            # 🎯 Dados principais da NFCe
    │   ├── emitente.dto.ts
    │   ├── ide.dto.ts
    │   ├── impostos.dto.ts
    │   ├── nfce-data.dto.ts
    │   ├── pagamento.dto.ts
    │   ├── produto.dto.ts
    │   ├── transporte.dto.ts
    │   └── index.ts
    ├── requests/                        # 📥 DTOs de entrada/requests
    │   ├── cancelamento-request.dto.ts
    │   ├── emissao-nfce-request.dto.ts
    │   └── index.ts
    └── responses/                       # � DTOs de saída/responses
        ├── cancelamento-response.dto.ts
        ├── consulta-response.dto.ts
        ├── sefaz-response.dto.ts
        └── index.ts
```

## 🎯 Organização por Contexto

### 🔐 **auth/** - Autenticação e Certificados
DTOs relacionados à autenticação e configuração de certificados digitais.

**CertificadoConfigDto**
- Configuração de certificado digital A1/A3
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

### 💾 **cache/** - Sistema de Cache  
DTOs para estatísticas e controle do cache de Tools.

**CacheStatsDto**
- Estatísticas de uso do cache
- Métricas de performance
- Dados de tempo de vida (TTL)

### 🔧 **common/** - DTOs Comuns
DTOs reutilizáveis em toda a aplicação.

**ApiResponseDto<T>**
- Estrutura padronizada de resposta da API
- Genérico para suportar qualquer tipo de dados
- Campos: `sucesso`, `mensagem`, `dados?`, `erro?`

### 📄 **nfce/** - NFCe Específicos

#### 🎯 **core/** - Dados Principais
DTOs que representam os dados fundamentais da NFCe.

**NFCeDataDto** - Estrutura principal da NFCe
**EmitenteDto** - Dados da empresa emitente  
**EnderecoDto** - Endereço (emitente/destinatário)  
**DestinatarioDto** - Dados do destinatário
**IdeDto** - Identificação da NFCe
**ProdutoDto** - Itens/produtos
**ImpostosDto** - Impostos e tributação
**PagamentoDto** - Formas de pagamento
**DetalhePagamentoDto** - Detalhes específicos de cada pagamento
**TransporteDto** - Dados de transporte

#### 📥 **requests/** - DTOs de Entrada
DTOs que definem os payloads de entrada dos endpoints.

**EmissaoNFCeRequestDto**
```typescript
{
  dadosNFCe: NFCeDataDto;
  certificado: CertificadoConfigDto;
}
```

**CancelamentoRequestDto**  
```typescript
{
  chaveAcesso: string;
  protocolo: string;
  justificativa: string;
}
```

#### 📤 **responses/** - DTOs de Saída  
DTOs que definem as respostas dos endpoints.

**SefazResponseDto** - Resposta padronizada da SEFAZ
**ConsultaResponseDto** - Resposta de consulta de NFCe
**CancelamentoResponseDto** - Resposta de cancelamento

## 🚀 Vantagens da Nova Estrutura

### ✅ **Separação por Domínio**
- Cada contexto (Auth, Cache, NFCe) tem sua própria pasta
- Facilita manutenção e localização de código
- Reduz acoplamento entre domínios

### ✅ **Imports Limpos com Barrel Exports**
```typescript
// ❌ Antes - Imports verbosos
import { EmissaoNFCeRequestDto } from './dto/emissao-nfce-request.dto';
import { CertificadoConfigDto } from './dto/certificado-config.dto';
import { CacheStatsDto } from './dto/cache-stats.dto';

// ✅ Agora - Import limpo e organizado  
import {
  EmissaoNFCeRequestDto,
  CertificadoConfigDto, 
  CacheStatsDto,
} from '../../dto';
```

### ✅ **Escalabilidade**
Estrutura preparada para crescimento:
```
src/dto/
├── nfe/          # ← Fácil adicionar NFe
├── cte/          # ← Fácil adicionar CTe  
├── mdfe/         # ← Fácil adicionar MDFe
└── nfce/         # ← Já existente
```

### ✅ **Reutilização e Organização**
- DTOs comuns centralizados em `common/`
- Core business logic separado de requests/responses
- Fácil identificar propósito de cada DTO pelo local

## 🔧 Como Usar os DTOs

### No Controller
```typescript
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  @Post('emitir')
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto) {
    // ...
  }
}
```

### No Service  
```typescript
import { NFCeDataDto, CertificadoConfigDto } from '../../dto';

@Injectable()
export class NfceService {
  async emitirNFCe(dados: NFCeDataDto, certificado: CertificadoConfigDto) {
    // ...
  }
}
```

## 📋 Lista Completa de DTOs
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

# DTOs Organizados para NFCe NestJS API

Este documento descreve a estrutura organizacional dos DTOs (Data Transfer Objects) implementados para a API de NFCe usando NestJS, com uma arquitetura modular e bem organizada.

## 🏗️ Nova Estrutura Organizacional

### 📁 Estrutura de Diretórios

```
src/dto/
├── index.ts                              # Export barrel principal
├── auth/                                 # 🔐 Autenticação
│   ├── certificado-config.dto.ts        
│   └── index.ts
├── cache/                                # 💾 Sistema de cache
│   ├── cache-stats.dto.ts
│   └── index.ts
├── common/                               # 🔧 DTOs comuns/utilitários
│   ├── api-response.dto.ts
│   └── index.ts
└── nfce/                                # � NFCe específicos
    ├── index.ts
    ├── core/                            # 🎯 Dados principais da NFCe
    │   ├── emitente.dto.ts
    │   ├── ide.dto.ts
    │   ├── impostos.dto.ts
    │   ├── nfce-data.dto.ts
    │   ├── pagamento.dto.ts
    │   ├── produto.dto.ts
    │   ├── transporte.dto.ts
    │   └── index.ts
    ├── requests/                        # 📥 DTOs de entrada/requests
    │   ├── cancelamento-request.dto.ts
    │   ├── emissao-nfce-request.dto.ts
    │   └── index.ts
    └── responses/                       # � DTOs de saída/responses
        ├── cancelamento-response.dto.ts
        ├── consulta-response.dto.ts
        ├── sefaz-response.dto.ts
        └── index.ts
```

## 🎯 Organização por Contexto

### 🔐 **auth/** - Autenticação e Certificados
DTOs relacionados à autenticação e configuração de certificados digitais.

**CertificadoConfigDto**
- Configuração de certificado digital A1/A3
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

### 💾 **cache/** - Sistema de Cache  
DTOs para estatísticas e controle do cache de Tools.

**CacheStatsDto**
- Estatísticas de uso do cache
- Métricas de performance
- Dados de tempo de vida (TTL)

### 🔧 **common/** - DTOs Comuns
DTOs reutilizáveis em toda a aplicação.

**ApiResponseDto<T>**
- Estrutura padronizada de resposta da API
- Genérico para suportar qualquer tipo de dados
- Campos: `sucesso`, `mensagem`, `dados?`, `erro?`

### 📄 **nfce/** - NFCe Específicos

#### 🎯 **core/** - Dados Principais
DTOs que representam os dados fundamentais da NFCe.

**NFCeDataDto** - Estrutura principal da NFCe
**EmitenteDto** - Dados da empresa emitente  
**EnderecoDto** - Endereço (emitente/destinatário)  
**DestinatarioDto** - Dados do destinatário
**IdeDto** - Identificação da NFCe
**ProdutoDto** - Itens/produtos
**ImpostosDto** - Impostos e tributação
**PagamentoDto** - Formas de pagamento
**DetalhePagamentoDto** - Detalhes específicos de cada pagamento
**TransporteDto** - Dados de transporte

#### 📥 **requests/** - DTOs de Entrada
DTOs que definem os payloads de entrada dos endpoints.

**EmissaoNFCeRequestDto**
```typescript
{
  dadosNFCe: NFCeDataDto;
  certificado: CertificadoConfigDto;
}
```

**CancelamentoRequestDto**  
```typescript
{
  chaveAcesso: string;
  protocolo: string;
  justificativa: string;
}
```

#### 📤 **responses/** - DTOs de Saída  
DTOs que definem as respostas dos endpoints.

**SefazResponseDto** - Resposta padronizada da SEFAZ
**ConsultaResponseDto** - Resposta de consulta de NFCe
**CancelamentoResponseDto** - Resposta de cancelamento

## 🚀 Vantagens da Nova Estrutura

### ✅ **Separação por Domínio**
- Cada contexto (Auth, Cache, NFCe) tem sua própria pasta
- Facilita manutenção e localização de código
- Reduz acoplamento entre domínios

### ✅ **Imports Limpos com Barrel Exports**
```typescript
// ❌ Antes - Imports verbosos
import { EmissaoNFCeRequestDto } from './dto/emissao-nfce-request.dto';
import { CertificadoConfigDto } from './dto/certificado-config.dto';
import { CacheStatsDto } from './dto/cache-stats.dto';

// ✅ Agora - Import limpo e organizado  
import {
  EmissaoNFCeRequestDto,
  CertificadoConfigDto, 
  CacheStatsDto,
} from '../../dto';
```

### ✅ **Escalabilidade**
Estrutura preparada para crescimento:
```
src/dto/
├── nfe/          # ← Fácil adicionar NFe
├── cte/          # ← Fácil adicionar CTe  
├── mdfe/         # ← Fácil adicionar MDFe
└── nfce/         # ← Já existente
```

### ✅ **Reutilização e Organização**
- DTOs comuns centralizados em `common/`
- Core business logic separado de requests/responses
- Fácil identificar propósito de cada DTO pelo local

## 🔧 Como Usar os DTOs

### No Controller
```typescript
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  @Post('emitir')
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto) {
    // ...
  }
}
```

### No Service  
```typescript
import { NFCeDataDto, CertificadoConfigDto } from '../../dto';

@Injectable()
export class NfceService {
  async emitirNFCe(dados: NFCeDataDto, certificado: CertificadoConfigDto) {
    // ...
  }
}
```

## 📋 Lista Completa de DTOs
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

# DTOs Organizados para NFCe NestJS API

Este documento descreve a estrutura organizacional dos DTOs (Data Transfer Objects) implementados para a API de NFCe usando NestJS, com uma arquitetura modular e bem organizada.

## 🏗️ Nova Estrutura Organizacional

### 📁 Estrutura de Diretórios

```
src/dto/
├── index.ts                              # Export barrel principal
├── auth/                                 # 🔐 Autenticação
│   ├── certificado-config.dto.ts        
│   └── index.ts
├── cache/                                # 💾 Sistema de cache
│   ├── cache-stats.dto.ts
│   └── index.ts
├── common/                               # 🔧 DTOs comuns/utilitários
│   ├── api-response.dto.ts
│   └── index.ts
└── nfce/                                # � NFCe específicos
    ├── index.ts
    ├── core/                            # 🎯 Dados principais da NFCe
    │   ├── emitente.dto.ts
    │   ├── ide.dto.ts
    │   ├── impostos.dto.ts
    │   ├── nfce-data.dto.ts
    │   ├── pagamento.dto.ts
    │   ├── produto.dto.ts
    │   ├── transporte.dto.ts
    │   └── index.ts
    ├── requests/                        # 📥 DTOs de entrada/requests
    │   ├── cancelamento-request.dto.ts
    │   ├── emissao-nfce-request.dto.ts
    │   └── index.ts
    └── responses/                       # � DTOs de saída/responses
        ├── cancelamento-response.dto.ts
        ├── consulta-response.dto.ts
        ├── sefaz-response.dto.ts
        └── index.ts
```

## 🎯 Organização por Contexto

### 🔐 **auth/** - Autenticação e Certificados
DTOs relacionados à autenticação e configuração de certificados digitais.

**CertificadoConfigDto**
- Configuração de certificado digital A1/A3
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

### 💾 **cache/** - Sistema de Cache  
DTOs para estatísticas e controle do cache de Tools.

**CacheStatsDto**
- Estatísticas de uso do cache
- Métricas de performance
- Dados de tempo de vida (TTL)

### 🔧 **common/** - DTOs Comuns
DTOs reutilizáveis em toda a aplicação.

**ApiResponseDto<T>**
- Estrutura padronizada de resposta da API
- Genérico para suportar qualquer tipo de dados
- Campos: `sucesso`, `mensagem`, `dados?`, `erro?`

### 📄 **nfce/** - NFCe Específicos

#### 🎯 **core/** - Dados Principais
DTOs que representam os dados fundamentais da NFCe.

**NFCeDataDto** - Estrutura principal da NFCe
**EmitenteDto** - Dados da empresa emitente  
**EnderecoDto** - Endereço (emitente/destinatário)  
**DestinatarioDto** - Dados do destinatário
**IdeDto** - Identificação da NFCe
**ProdutoDto** - Itens/produtos
**ImpostosDto** - Impostos e tributação
**PagamentoDto** - Formas de pagamento
**DetalhePagamentoDto** - Detalhes específicos de cada pagamento
**TransporteDto** - Dados de transporte

#### 📥 **requests/** - DTOs de Entrada
DTOs que definem os payloads de entrada dos endpoints.

**EmissaoNFCeRequestDto**
```typescript
{
  dadosNFCe: NFCeDataDto;
  certificado: CertificadoConfigDto;
}
```

**CancelamentoRequestDto**  
```typescript
{
  chaveAcesso: string;
  protocolo: string;
  justificativa: string;
}
```

#### 📤 **responses/** - DTOs de Saída  
DTOs que definem as respostas dos endpoints.

**SefazResponseDto** - Resposta padronizada da SEFAZ
**ConsultaResponseDto** - Resposta de consulta de NFCe
**CancelamentoResponseDto** - Resposta de cancelamento

## 🚀 Vantagens da Nova Estrutura

### ✅ **Separação por Domínio**
- Cada contexto (Auth, Cache, NFCe) tem sua própria pasta
- Facilita manutenção e localização de código
- Reduz acoplamento entre domínios

### ✅ **Imports Limpos com Barrel Exports**
```typescript
// ❌ Antes - Imports verbosos
import { EmissaoNFCeRequestDto } from './dto/emissao-nfce-request.dto';
import { CertificadoConfigDto } from './dto/certificado-config.dto';
import { CacheStatsDto } from './dto/cache-stats.dto';

// ✅ Agora - Import limpo e organizado  
import {
  EmissaoNFCeRequestDto,
  CertificadoConfigDto, 
  CacheStatsDto,
} from '../../dto';
```

### ✅ **Escalabilidade**
Estrutura preparada para crescimento:
```
src/dto/
├── nfe/          # ← Fácil adicionar NFe
├── cte/          # ← Fácil adicionar CTe  
├── mdfe/         # ← Fácil adicionar MDFe
└── nfce/         # ← Já existente
```

### ✅ **Reutilização e Organização**
- DTOs comuns centralizados em `common/`
- Core business logic separado de requests/responses
- Fácil identificar propósito de cada DTO pelo local

## 🔧 Como Usar os DTOs

### No Controller
```typescript
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  @Post('emitir')
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto) {
    // ...
  }
}
```

### No Service  
```typescript
import { NFCeDataDto, CertificadoConfigDto } from '../../dto';

@Injectable()
export class NfceService {
  async emitirNFCe(dados: NFCeDataDto, certificado: CertificadoConfigDto) {
    // ...
  }
}
```

## 📋 Lista Completa de DTOs
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

# DTOs Organizados para NFCe NestJS API

Este documento descreve a estrutura organizacional dos DTOs (Data Transfer Objects) implementados para a API de NFCe usando NestJS, com uma arquitetura modular e bem organizada.

## 🏗️ Nova Estrutura Organizacional

### 📁 Estrutura de Diretórios

```
src/dto/
├── index.ts                              # Export barrel principal
├── auth/                                 # 🔐 Autenticação
│   ├── certificado-config.dto.ts        
│   └── index.ts
├── cache/                                # 💾 Sistema de cache
│   ├── cache-stats.dto.ts
│   └── index.ts
├── common/                               # 🔧 DTOs comuns/utilitários
│   ├── api-response.dto.ts
│   └── index.ts
└── nfce/                                # � NFCe específicos
    ├── index.ts
    ├── core/                            # 🎯 Dados principais da NFCe
    │   ├── emitente.dto.ts
    │   ├── ide.dto.ts
    │   ├── impostos.dto.ts
    │   ├── nfce-data.dto.ts
    │   ├── pagamento.dto.ts
    │   ├── produto.dto.ts
    │   ├── transporte.dto.ts
    │   └── index.ts
    ├── requests/                        # 📥 DTOs de entrada/requests
    │   ├── cancelamento-request.dto.ts
    │   ├── emissao-nfce-request.dto.ts
    │   └── index.ts
    └── responses/                       # � DTOs de saída/responses
        ├── cancelamento-response.dto.ts
        ├── consulta-response.dto.ts
        ├── sefaz-response.dto.ts
        └── index.ts
```

## 🎯 Organização por Contexto

### 🔐 **auth/** - Autenticação e Certificados
DTOs relacionados à autenticação e configuração de certificados digitais.

**CertificadoConfigDto**
- Configuração de certificado digital A1/A3
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

### 💾 **cache/** - Sistema de Cache  
DTOs para estatísticas e controle do cache de Tools.

**CacheStatsDto**
- Estatísticas de uso do cache
- Métricas de performance
- Dados de tempo de vida (TTL)

### 🔧 **common/** - DTOs Comuns
DTOs reutilizáveis em toda a aplicação.

**ApiResponseDto<T>**
- Estrutura padronizada de resposta da API
- Genérico para suportar qualquer tipo de dados
- Campos: `sucesso`, `mensagem`, `dados?`, `erro?`

### 📄 **nfce/** - NFCe Específicos

#### 🎯 **core/** - Dados Principais
DTOs que representam os dados fundamentais da NFCe.

**NFCeDataDto** - Estrutura principal da NFCe
**EmitenteDto** - Dados da empresa emitente  
**EnderecoDto** - Endereço (emitente/destinatário)  
**DestinatarioDto** - Dados do destinatário
**IdeDto** - Identificação da NFCe
**ProdutoDto** - Itens/produtos
**ImpostosDto** - Impostos e tributação
**PagamentoDto** - Formas de pagamento
**DetalhePagamentoDto** - Detalhes específicos de cada pagamento
**TransporteDto** - Dados de transporte

#### 📥 **requests/** - DTOs de Entrada
DTOs que definem os payloads de entrada dos endpoints.

**EmissaoNFCeRequestDto**
```typescript
{
  dadosNFCe: NFCeDataDto;
  certificado: CertificadoConfigDto;
}
```

**CancelamentoRequestDto**  
```typescript
{
  chaveAcesso: string;
  protocolo: string;
  justificativa: string;
}
```

#### 📤 **responses/** - DTOs de Saída  
DTOs que definem as respostas dos endpoints.

**SefazResponseDto** - Resposta padronizada da SEFAZ
**ConsultaResponseDto** - Resposta de consulta de NFCe
**CancelamentoResponseDto** - Resposta de cancelamento

## 🚀 Vantagens da Nova Estrutura

### ✅ **Separação por Domínio**
- Cada contexto (Auth, Cache, NFCe) tem sua própria pasta
- Facilita manutenção e localização de código
- Reduz acoplamento entre domínios

### ✅ **Imports Limpos com Barrel Exports**
```typescript
// ❌ Antes - Imports verbosos
import { EmissaoNFCeRequestDto } from './dto/emissao-nfce-request.dto';
import { CertificadoConfigDto } from './dto/certificado-config.dto';
import { CacheStatsDto } from './dto/cache-stats.dto';

// ✅ Agora - Import limpo e organizado  
import {
  EmissaoNFCeRequestDto,
  CertificadoConfigDto, 
  CacheStatsDto,
} from '../../dto';
```

### ✅ **Escalabilidade**
Estrutura preparada para crescimento:
```
src/dto/
├── nfe/          # ← Fácil adicionar NFe
├── cte/          # ← Fácil adicionar CTe  
├── mdfe/         # ← Fácil adicionar MDFe
└── nfce/         # ← Já existente
```

### ✅ **Reutilização e Organização**
- DTOs comuns centralizados em `common/`
- Core business logic separado de requests/responses
- Fácil identificar propósito de cada DTO pelo local

## 🔧 Como Usar os DTOs

### No Controller
```typescript
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  @Post('emitir')
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto) {
    // ...
  }
}
```

### No Service  
```typescript
import { NFCeDataDto, CertificadoConfigDto } from '../../dto';

@Injectable()
export class NfceService {
  async emitirNFCe(dados: NFCeDataDto, certificado: CertificadoConfigDto) {
    // ...
  }
}
```

## 📋 Lista Completa de DTOs
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

# DTOs Organizados para NFCe NestJS API

Este documento descreve a estrutura organizacional dos DTOs (Data Transfer Objects) implementados para a API de NFCe usando NestJS, com uma arquitetura modular e bem organizada.

## 🏗️ Nova Estrutura Organizacional

### 📁 Estrutura de Diretórios

```
src/dto/
├── index.ts                              # Export barrel principal
├── auth/                                 # 🔐 Autenticação
│   ├── certificado-config.dto.ts        
│   └── index.ts
├── cache/                                # 💾 Sistema de cache
│   ├── cache-stats.dto.ts
│   └── index.ts
├── common/                               # 🔧 DTOs comuns/utilitários
│   ├── api-response.dto.ts
│   └── index.ts
└── nfce/                                # � NFCe específicos
    ├── index.ts
    ├── core/                            # 🎯 Dados principais da NFCe
    │   ├── emitente.dto.ts
    │   ├── ide.dto.ts
    │   ├── impostos.dto.ts
    │   ├── nfce-data.dto.ts
    │   ├── pagamento.dto.ts
    │   ├── produto.dto.ts
    │   ├── transporte.dto.ts
    │   └── index.ts
    ├── requests/                        # 📥 DTOs de entrada/requests
    │   ├── cancelamento-request.dto.ts
    │   ├── emissao-nfce-request.dto.ts
    │   └── index.ts
    └── responses/                       # � DTOs de saída/responses
        ├── cancelamento-response.dto.ts
        ├── consulta-response.dto.ts
        ├── sefaz-response.dto.ts
        └── index.ts
```

## 🎯 Organização por Contexto

### 🔐 **auth/** - Autenticação e Certificados
DTOs relacionados à autenticação e configuração de certificados digitais.

**CertificadoConfigDto**
- Configuração de certificado digital A1/A3
- Validação de campos obrigatórios: `pfx`, `senha`, `CSC`, `CSCid`
- Campos opcionais: `CNPJ`, `CPF`, `tpAmb`, `UF`

### 💾 **cache/** - Sistema de Cache  
DTOs para estatísticas e controle do cache de Tools.

**CacheStatsDto**
- Estatísticas de uso do cache
- Métricas de performance
- Dados de tempo de vida (TTL)

### 🔧 **common/** - DTOs Comuns
DTOs reutilizáveis em toda a aplicação.

**ApiResponseDto<T>**
- Estrutura padronizada de resposta da API
- Genérico para suportar qualquer tipo de dados
- Campos: `sucesso`, `mensagem`, `dados?`, `erro?`

### 📄 **nfce/** - NFCe Específicos

#### 🎯 **core/** - Dados Principais
DTOs que representam os dados fundamentais da NFCe.

**NFCeDataDto** - Estrutura principal da NFCe
**EmitenteDto** - Dados da empresa emitente  
**EnderecoDto** - Endereço (emitente/destinatário)  
**DestinatarioDto** - Dados do destinatário
**IdeDto** - Identificação da NFCe
**ProdutoDto** - Itens/produtos
**ImpostosDto** - Impostos e tributação
**PagamentoDto** - Formas de pagamento
**DetalhePagamentoDto** - Detalhes específicos de cada pagamento
**TransporteDto** - Dados de transporte

#### 📥 **requests/** - DTOs de Entrada
DTOs que definem os payloads de entrada dos endpoints.

**EmissaoNFCeRequestDto**
```typescript
{
  dadosNFCe: NFCeDataDto;
  certificado: CertificadoConfigDto;
}
```

**CancelamentoRequestDto**  
```typescript
{
  chaveAcesso: string;
  protocolo: string;
  justificativa: string;
}
```

#### 📤 **responses/** - DTOs de Saída  
DTOs que definem as respostas dos endpoints.

**SefazResponseDto** - Resposta padronizada da SEFAZ
**ConsultaResponseDto** - Resposta de consulta de NFCe
**CancelamentoResponseDto** - Resposta de cancelamento

## 🚀 Vantagens da Nova Estrutura

### ✅ **Separação por Domínio**
- Cada contexto (Auth, Cache, NFCe) tem sua própria pasta
- Facilita manutenção e localização de código
- Reduz acoplamento entre domínios

### ✅ **Imports Limpos com Barrel Exports**
```typescript
// ❌ Antes - Imports verbosos
import { EmissaoNFCeRequestDto } from './dto/emissao-nfce-request.dto';
import { CertificadoConfigDto } from './dto/certificado-config.dto';
import { CacheStatsDto } from './dto/cache-stats.dto';

// ✅ Agora - Import limpo e organizado  
import {
  EmissaoNFCeRequestDto,
  CertificadoConfigDto, 
  CacheStatsDto,
} from '../../dto';
```

### ✅ **Escalabilidade**
Estrutura preparada para crescimento:
```
src/dto/
├── nfe/          # ← Fácil adicionar NFe
├── cte/          # ← Fácil adicionar CTe  
├── mdfe/         # ← Fácil adicionar MDFe
└── nfce/         # ← Já existente
```

### ✅ **Reutilização e Organização**
- DTOs comuns centralizados em `common/`
- Core business logic separado de requests/responses
- Fácil identificar propósito de cada DTO pelo local

## 🔧 Como Usar os DTOs

### No Controller
```typescript
import {
  EmissaoNFCeRequestDto,
  CancelamentoRequestDto,
  CertificadoConfigDto,
  CacheStatsResponseDto,
} from '../../dto';

@Controller('nfce')
export class NfceController {
  @Post('emitir')
  async emitirNFCe(@Body() body: EmissaoNFCeRequestDto) {
    // ...
  }
}
```

### No Service  
```typescript
import { NFCeDataDto, CertificadoConfigDto } from '../../dto';

@Injectable()
export class NfceService {
  async emitirNFCe(dados: NFCeDataDto, certificado: CertificadoConfigDto) {
    // ...
  }
}
```

## 📋 Lista Completa de DTOs
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

##