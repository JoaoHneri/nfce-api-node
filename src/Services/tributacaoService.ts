/**
 * Serviço de Tributação Simplificado
 * 
 * Para empresas de suvenirs e vestuários.
 * Centraliza o cálculo automático de PIS/COFINS
 * baseado no regime tributário e CST.
 */

export interface AliquotasResult {
    regime: string;
    pPIS?: string;
    pCOFINS?: string;
    zerado: boolean;
    observacao?: string;
}

export interface ImpostoCalculado {
    CST: string;
    vBC?: string;
    pPIS?: string;
    vPIS?: string;
    pCOFINS?: string;
    vCOFINS?: string;
    qBCProd?: string;
    vAliqProd?: string;
}

export class TributacaoService {
    
    // 🎯 CONFIGURAÇÕES CENTRALIZADAS
    private static readonly CONFIG = {
        // Alíquotas por regime
        ALIQUOTAS: {
            SIMPLES_NACIONAL: {
                PIS: 0.00,
                COFINS: 0.00
            },
            LUCRO_REAL: {
                PIS: 1.65,
                COFINS: 7.60
            },
            LUCRO_PRESUMIDO: {
                PIS: 0.65,
                COFINS: 3.00
            }
        },
        
        // Códigos de Regime Tributário
        CRT: {
            SIMPLES_NACIONAL: "1",
            SIMPLES_EXCESSO: "2", 
            REGIME_NORMAL: "3"
        },
        
        // CSTs válidos e suas configurações
        CST: {
            "01": { descricao: "Operação tributável (base = valor da operação)", tributado: true },
            "02": { descricao: "Operação tributável (base = valor da operação, alíquota diferenciada)", tributado: true },
            "03": { descricao: "Operação tributável (base = quantidade vendida × alíquota por unidade)", tributado: true },
            "04": { descricao: "Operação tributável (tributação monofásica)", tributado: false },
            "05": { descricao: "Operação tributável (substituição tributária)", tributado: false },
            "06": { descricao: "Operação tributável (alíquota zero)", tributado: false },
            "07": { descricao: "Operação isenta da contribuição", tributado: false },
            "08": { descricao: "Operação sem incidência da contribuição", tributado: false },
            "09": { descricao: "Operação com suspensão da contribuição", tributado: false },
            "49": { descricao: "Outras operações de saída", tributado: false },
            "50": { descricao: "Operação com direito a crédito - vinculada exclusivamente a receita tributada no mercado interno", tributado: true },
            "99": { descricao: "Outras operações", tributado: false }
        },
        
        // Observações padrão
        OBSERVACOES: {
            SIMPLES_NACIONAL: "Simples Nacional: PIS/COFINS recolhidos via DAS",
            LUCRO_REAL: "Lucro Real - Regime não-cumulativo",
            LUCRO_PRESUMIDO: "Lucro Presumido - Regime cumulativo",
            SEM_TRIBUTACAO: "Sem incidência de PIS/COFINS"
        }
    };

    // Casos de uso dinâmicos (apenas para demonstração e relatórios)
    private static get CASOS_USO() {
        return {
            loja_suvenirs_sn: {
                cenario: "Loja de suvenirs (Simples Nacional)",
                crt: this.CONFIG.CRT.SIMPLES_NACIONAL,
                cst: "49"
            },
            empresa_grande_lr: {
                cenario: "Empresa grande (Lucro Real)",
                crt: this.CONFIG.CRT.REGIME_NORMAL,
                cst: "01"
            },
            produto_isento: {
                cenario: "Produto isento",
                crt: this.CONFIG.CRT.REGIME_NORMAL,
                cst: "07"
            }
        };
    }

    /**
     * DETERMINA ALÍQUOTAS (versão simples para suvenirs/vestuários)
     * 
     * @param crt Código de Regime Tributário (1=Simples, 3=Normal)
     * @param cst Código de Situação Tributária do PIS/COFINS
     * @returns Objeto com alíquotas e configurações
     */
    static obterAliquotas(crt: string, cst: string): AliquotasResult {
        
        // SIMPLES NACIONAL
        if (crt === this.CONFIG.CRT.SIMPLES_NACIONAL) {
            return {
                regime: "SIMPLES_NACIONAL",
                pPIS: this.CONFIG.ALIQUOTAS.SIMPLES_NACIONAL.PIS.toFixed(2),
                pCOFINS: this.CONFIG.ALIQUOTAS.SIMPLES_NACIONAL.COFINS.toFixed(2),
                zerado: true,
                observacao: this.CONFIG.OBSERVACOES.SIMPLES_NACIONAL
            };
        }
        
        // EMPRESA NORMAL (Lucro Real/Presumido)
        const cstInfo = this.CONFIG.CST[cst as keyof typeof this.CONFIG.CST];
        
        if (cstInfo?.tributado) {
            return {
                regime: "LUCRO_REAL",
                pPIS: this.CONFIG.ALIQUOTAS.LUCRO_REAL.PIS.toFixed(2),
                pCOFINS: this.CONFIG.ALIQUOTAS.LUCRO_REAL.COFINS.toFixed(2),
                zerado: false,
                observacao: this.CONFIG.OBSERVACOES.LUCRO_REAL
            };
        }
        
        // Sem tributação
        return {
            regime: "SEM_TRIBUTACAO",
            pPIS: "0.00",
            pCOFINS: "0.00",
            zerado: true,
            observacao: `${this.CONFIG.OBSERVACOES.SEM_TRIBUTACAO} (CST ${cst})`
        };
    }
    
    /**
     * CALCULAR VALORES DE PIS (versão simplificada)
     */
    static calcularPIS(valor: number, aliquotas: AliquotasResult, cst: string): ImpostoCalculado {
        
        if (aliquotas.zerado) {
            return {
                CST: cst,
                qBCProd: "0.0000",
                vAliqProd: "0.0000",
                vPIS: "0.00"
            };
        }
        
        // Tributação percentual normal
        const pPIS = parseFloat(aliquotas.pPIS || "0");
        const vPIS = (valor * pPIS / 100).toFixed(2);
        
        return {
            CST: cst,
            vBC: valor.toFixed(2),
            pPIS: aliquotas.pPIS,
            vPIS: vPIS
        };
    }
    
    /**
     * CALCULAR VALORES DE COFINS (versão simplificada)
     */
    static calcularCOFINS(valor: number, aliquotas: AliquotasResult, cst: string): ImpostoCalculado {
        
        if (aliquotas.zerado) {
            return {
                CST: cst,
                qBCProd: "0.0000",
                vAliqProd: "0.0000",
                vCOFINS: "0.00"
            };
        }
        
        // Tributação percentual normal
        const pCOFINS = parseFloat(aliquotas.pCOFINS || "0");
        const vCOFINS = (valor * pCOFINS / 100).toFixed(2);
        
        return {
            CST: cst,
            vBC: valor.toFixed(2),
            pCOFINS: aliquotas.pCOFINS,
            vCOFINS: vCOFINS
        };
    }
    
    /**
     * CONSULTAR REGIME TRIBUTÁRIO (versão completa)
     */
    static consultarRegime(crt: string): string {
        switch (crt) {
            case this.CONFIG.CRT.SIMPLES_NACIONAL:
                return "Simples Nacional";
            case this.CONFIG.CRT.SIMPLES_EXCESSO:
                return "Simples Nacional - Excesso de Receita";
            case this.CONFIG.CRT.REGIME_NORMAL:
                return "Regime Normal (Lucro Real/Presumido)";
            default:
                return `Regime não identificado (CRT: ${crt})`;
        }
    }
    
    /**
     * DETECTAR REGIME ESPECÍFICO (Lucro Real vs Presumido)
     * Para empresas CRT=3, detecta se é Real ou Presumido baseado no CST
     */
    static detectarRegimeEspecifico(crt: string, cst: string): AliquotasResult {
        if (crt === this.CONFIG.CRT.SIMPLES_NACIONAL) {
            return this.obterAliquotas(crt, cst);
        }
        
        // Para CRT=3, decidir entre Lucro Real e Presumido
        const cstInfo = this.CONFIG.CST[cst as keyof typeof this.CONFIG.CST];
        
        if (cstInfo?.tributado) {
            // CST específico para Lucro Presumido
            if (cst === "50") {
                return {
                    regime: "LUCRO_PRESUMIDO",
                    pPIS: this.CONFIG.ALIQUOTAS.LUCRO_PRESUMIDO.PIS.toFixed(2),
                    pCOFINS: this.CONFIG.ALIQUOTAS.LUCRO_PRESUMIDO.COFINS.toFixed(2),
                    zerado: false,
                    observacao: this.CONFIG.OBSERVACOES.LUCRO_PRESUMIDO
                };
            }
            
            // Padrão: Lucro Real
            return {
                regime: "LUCRO_REAL",
                pPIS: this.CONFIG.ALIQUOTAS.LUCRO_REAL.PIS.toFixed(2),
                pCOFINS: this.CONFIG.ALIQUOTAS.LUCRO_REAL.COFINS.toFixed(2),
                zerado: false,
                observacao: this.CONFIG.OBSERVACOES.LUCRO_REAL
            };
        }
        
        return this.obterAliquotas(crt, cst);
    }

    /**
     * CALCULAR TOTAIS DA NOTA (útil para validação)
     */
    static calcularTotaisNota(produtos: any[], crt: string, impostos: any): any {
        let totalProdutos = 0;
        let totalPIS = 0;
        let totalCOFINS = 0;
        
        produtos.forEach((produto, index) => {
            const valor = parseFloat(produto.vProd);
            totalProdutos += valor;
            
            const aliquotas = this.obterAliquotas(crt, impostos.CST_PIS);
            
            if (!aliquotas.zerado) {
                const pPIS = parseFloat(aliquotas.pPIS || "0");
                const pCOFINS = parseFloat(aliquotas.pCOFINS || "0");
                
                totalPIS += (valor * pPIS / 100);
                totalCOFINS += (valor * pCOFINS / 100);
            }
            
        });
        
        return {
            vProd: totalProdutos.toFixed(2),
            vPIS: totalPIS.toFixed(2),
            vCOFINS: totalCOFINS.toFixed(2),
            vNF: totalProdutos.toFixed(2) // Para NFCe, não soma impostos no total
        };
    }

    /**
     * VALIDAR CST (verificar se é válido)
     */
    static validarCST(cst: string): { valido: boolean; descricao?: string; observacao?: string } {
        const cstInfo = this.CONFIG.CST[cst as keyof typeof this.CONFIG.CST];
        
        if (!cstInfo) {
            return {
                valido: false,
                observacao: `CST ${cst} não é válido ou não é suportado`
            };
        }
        
        return {
            valido: true,
            descricao: cstInfo.descricao,
            observacao: cstInfo.tributado ? "CST com tributação" : "CST sem tributação"
        };
    }

    /**
     * VALIDAR DADOS ANTES DO CÁLCULO
     */
    static validarDadosTributacao(crt: string, cst: string, valor?: number): { valido: boolean; erros: string[] } {
        const erros: string[] = [];
        
        // Validar CRT usando constantes
        const crtsValidos = Object.values(this.CONFIG.CRT);
        if (!crtsValidos.includes(crt)) {
            erros.push(`Invalid CRT: ${crt}. Must be ${crtsValidos.join(', ')}`);
        }
        
        // Validar CST
        const validacaoCST = this.validarCST(cst);
        if (!validacaoCST.valido) {
            erros.push(`Invalid CST: ${cst}`);
        }
        
        // Validar valor (se fornecido)
        if (valor !== undefined && (valor < 0 || isNaN(valor))) {
            erros.push(`Invalid value: ${valor}. Must be a positive number`);
        }
        
        return {
            valido: erros.length === 0,
            erros
        };
    }

    /**
     * OBTER INFORMAÇÕES COMPLETAS (para debugging/logs)
     */
    static obterInformacoesCompletas(crt: string, cst: string): any {
        const aliquotas = this.obterAliquotas(crt, cst);
        const regime = this.consultarRegime(crt);
        const validacaoCST = this.validarCST(cst);
        
        return {
            entrada: { crt, cst },
            regime: {
                codigo: crt,
                nome: regime
            },
            cst: {
                codigo: cst,
                valido: validacaoCST.valido,
                descricao: validacaoCST.descricao,
                observacao: validacaoCST.observacao
            },
            tributacao: aliquotas,
            exemplo_calculo: {
                produto_r100: {
                    pis: aliquotas.zerado ? "R$ 0,00" : `R$ ${(100 * parseFloat(aliquotas.pPIS || "0") / 100).toFixed(2)}`,
                    cofins: aliquotas.zerado ? "R$ 0,00" : `R$ ${(100 * parseFloat(aliquotas.pCOFINS || "0") / 100).toFixed(2)}`
                }
            }
        };
    }

    /*
     * SIMULAR CÁLCULO COMPLETO (para testes)
     */
    static simularCalculoCompleto(crt: string, cstPIS: string, cstCOFINS: string, valorProduto: number): any {
        // Validar dados
        const validacao = this.validarDadosTributacao(crt, cstPIS, valorProduto);
        if (!validacao.valido) {
            return { error: validacao.erros };
        }
        
        // Obter informações completas
        const info = this.obterInformacoesCompletas(crt, cstPIS);
        
        // Calcular impostos
        const resultadoPIS = this.calcularPIS(valorProduto, info.tributacao, cstPIS);
        const resultadoCOFINS = this.calcularCOFINS(valorProduto, info.tributacao, cstCOFINS);
        
        const resultado = {
            entrada: info.entrada,
            regime: info.regime,
            validacao: {
                cst_pis: this.validarCST(cstPIS),
                cst_cofins: this.validarCST(cstCOFINS)
            },
            calculos: {
                pis: resultadoPIS,
                cofins: resultadoCOFINS
            },
            resumo: {
                valor_produto: `R$ ${valorProduto.toFixed(2)}`,
                total_pis: `R$ ${resultadoPIS.vPIS}`,
                total_cofins: `R$ ${resultadoCOFINS.vCOFINS}`,
                total_impostos: `R$ ${(parseFloat(resultadoPIS.vPIS || "0") + parseFloat(resultadoCOFINS.vCOFINS || "0")).toFixed(2)}`,
                observacao: info.tributacao.observacao
            }
        };
    
        return resultado;
    }

    /**
     * RELATÓRIO DE ALÍQUOTAS (para consulta rápida)
     */
    static obterRelatorioAliquotas(): any {
        return {
            versao: "1.0.0",
            data_atualizacao: new Date().toISOString(),
            regimes: {
                simples_nacional: {
                    crt: this.CONFIG.CRT.SIMPLES_NACIONAL,
                    nome: "Simples Nacional",
                    pis: `${this.CONFIG.ALIQUOTAS.SIMPLES_NACIONAL.PIS.toFixed(2)}%`,
                    cofins: `${this.CONFIG.ALIQUOTAS.SIMPLES_NACIONAL.COFINS.toFixed(2)}%`,
                    observacao: "Recolhido via DAS - Lei Complementar 123/2006"
                },
                lucro_real: {
                    crt: this.CONFIG.CRT.REGIME_NORMAL,
                    nome: "Lucro Real",
                    pis: `${this.CONFIG.ALIQUOTAS.LUCRO_REAL.PIS.toFixed(2)}%`,
                    cofins: `${this.CONFIG.ALIQUOTAS.LUCRO_REAL.COFINS.toFixed(2)}%`,
                    observacao: "Regime não-cumulativo - Lei 10.833/2003"
                },
                lucro_presumido: {
                    crt: this.CONFIG.CRT.REGIME_NORMAL,
                    nome: "Lucro Presumido",
                    pis: `${this.CONFIG.ALIQUOTAS.LUCRO_PRESUMIDO.PIS.toFixed(2)}%`,
                    cofins: `${this.CONFIG.ALIQUOTAS.LUCRO_PRESUMIDO.COFINS.toFixed(2)}%`,
                    observacao: "Regime cumulativo - Lei 10.637/2002"
                }
            },
            csts_suportados: Object.fromEntries(
                Object.entries(this.CONFIG.CST).map(([cst, info]) => [cst, info.descricao])
            ),
            casos_uso: Object.fromEntries(
                Object.entries(this.CASOS_USO).map(([key, caso]) => [
                    key, 
                    {
                        ...caso,
                        resultado: this.calcularResultadoCasoUso(caso.crt, caso.cst)
                    }
                ])
            )
        };
    }

    /**
     * CALCULAR RESULTADO PARA CASO DE USO
     */
    private static calcularResultadoCasoUso(crt: string, cst: string): string {
        const aliquotas = this.obterAliquotas(crt, cst);
        return `PIS=${aliquotas.pPIS}%, COFINS=${aliquotas.pCOFINS}%`;
    }
}
