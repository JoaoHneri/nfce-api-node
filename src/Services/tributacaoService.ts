/**
 * 🎯 Serviço de Tributação Simplificado
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
    
    // 📋 ALÍQUOTAS PADRÃO (suficiente para suvenirs e vestuários)
    private static readonly ALIQUOTAS = {
        LUCRO_REAL: {
            PIS: 1.65,      // %
            COFINS: 7.60    // %
        },
        
        // Lucro Presumido (cumulativo) - Lei 10.637/2002
        LUCRO_PRESUMIDO: {
            PIS: 0.65,      // %
            COFINS: 3.00    // %
        },
        
        // Simples Nacional - Lei Complementar 123/2006
        SIMPLES_NACIONAL: {
            PIS: 0.00,      // % (recolhido via DAS)
            COFINS: 0.00    // % (recolhido via DAS)
        }
    };

    /**
     * 🎯 DETERMINA ALÍQUOTAS (versão simples para suvenirs/vestuários)
     * 
     * @param crt Código de Regime Tributário (1=Simples, 3=Normal)
     * @param cst Código de Situação Tributária do PIS/COFINS
     * @returns Objeto com alíquotas e configurações
     */
    static obterAliquotas(crt: string, cst: string): AliquotasResult {
        console.log(`🔍 Consultando tributação: CRT=${crt}, CST=${cst}`);
        
        // 🏪 SIMPLES NACIONAL (99% dos casos de suvenirs/vestuários)
        if (crt === "1") {
            return {
                regime: "SIMPLES_NACIONAL",
                pPIS: "0.00",
                pCOFINS: "0.00",
                zerado: true,
                observacao: "Simples Nacional: PIS/COFINS recolhidos via DAS"
            };
        }
        
        // 🏢 EMPRESA NORMAL (Lucro Real/Presumido)
        switch (cst) {
            case "01":
            case "02":
                // Operação tributável - usar alíquotas padrão
                return {
                    regime: "LUCRO_REAL",
                    pPIS: "1.65",
                    pCOFINS: "7.60",
                    zerado: false,
                    observacao: "Lucro Real - Alíquotas padrão para suvenirs/vestuários"
                };
                
            case "07": // Operação isenta
            case "08": // Operação sem incidência
            case "49": // Outras operações de saída
            case "99": // Outras operações
            default:
                // Sem tributação
                return {
                    regime: "SEM_TRIBUTACAO",
                    pPIS: "0.00",
                    pCOFINS: "0.00",
                    zerado: true,
                    observacao: `CST ${cst} - Sem incidência de PIS/COFINS`
                };
        }
    }
    
    /**
     * 🧮 CALCULAR VALORES DE PIS (versão simplificada)
     */
    static calcularPIS(valor: number, aliquotas: AliquotasResult, cst: string): ImpostoCalculado {
        console.log(`💰 Calculando PIS: valor=R$${valor}, regime=${aliquotas.regime}`);
        
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
        
        console.log(`📊 PIS: R$${valor} × ${pPIS}% = R$${vPIS}`);
        
        return {
            CST: cst,
            vBC: valor.toFixed(2),
            pPIS: aliquotas.pPIS,
            vPIS: vPIS
        };
    }
    
    /**
     * 🧮 CALCULAR VALORES DE COFINS (versão simplificada)
     */
    static calcularCOFINS(valor: number, aliquotas: AliquotasResult, cst: string): ImpostoCalculado {
        console.log(`💰 Calculando COFINS: valor=R$${valor}, regime=${aliquotas.regime}`);
        
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
        
        console.log(`📊 COFINS: R$${valor} × ${pCOFINS}% = R$${vCOFINS}`);
        
        return {
            CST: cst,
            vBC: valor.toFixed(2),
            pCOFINS: aliquotas.pCOFINS,
            vCOFINS: vCOFINS
        };
    }
    
    /**
     * 📋 CONSULTAR REGIME TRIBUTÁRIO (versão completa)
     */
    static consultarRegime(crt: string): string {
        switch (crt) {
            case "1":
                return "Simples Nacional";
            case "2": 
                return "Simples Nacional - Excesso de Receita";
            case "3":
                return "Regime Normal (Lucro Real/Presumido)";
            default:
                return `Regime não identificado (CRT: ${crt})`;
        }
    }
    
    /**
     * 🎯 DETECTAR REGIME ESPECÍFICO (Lucro Real vs Presumido)
     * Para empresas CRT=3, detecta se é Real ou Presumido baseado no CST
     */
    static detectarRegimeEspecifico(crt: string, cst: string): AliquotasResult {
        if (crt === "1") {
            // Simples Nacional
            return this.obterAliquotas(crt, cst);
        }
        
        // Para CRT=3, decidir entre Lucro Real e Presumido
        switch (cst) {
            case "01":
            case "02":
                // Operação tributável - assumir Lucro Real (mais comum)
                return {
                    regime: "LUCRO_REAL",
                    pPIS: "1.65",
                    pCOFINS: "7.60", 
                    zerado: false,
                    observacao: "Lucro Real - Regime não-cumulativo"
                };
                
            case "50": // CST específico para Lucro Presumido (se existir)
                return {
                    regime: "LUCRO_PRESUMIDO",
                    pPIS: "0.65",
                    pCOFINS: "3.00",
                    zerado: false,
                    observacao: "Lucro Presumido - Regime cumulativo"
                };
                
            default:
                return this.obterAliquotas(crt, cst);
        }
    }

    /**
     * 🧮 CALCULAR TOTAIS DA NOTA (útil para validação)
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
            
            console.log(`📊 Produto ${index}: R$${valor} | PIS: R$${(valor * parseFloat(aliquotas.pPIS || "0") / 100).toFixed(2)} | COFINS: R$${(valor * parseFloat(aliquotas.pCOFINS || "0") / 100).toFixed(2)}`);
        });
        
        return {
            vProd: totalProdutos.toFixed(2),
            vPIS: totalPIS.toFixed(2),
            vCOFINS: totalCOFINS.toFixed(2),
            vNF: totalProdutos.toFixed(2) // Para NFCe, não soma impostos no total
        };
    }

    /**
     * 🔍 VALIDAR CST (verificar se é válido)
     */
    static validarCST(cst: string): { valido: boolean; descricao?: string; observacao?: string } {
        const cstsValidos = {
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
        };
        
        const cstInfo = cstsValidos[cst as keyof typeof cstsValidos];
        
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
     * ✅ VALIDAR DADOS ANTES DO CÁLCULO
     */
    static validarDadosTributacao(crt: string, cst: string, valor?: number): { valido: boolean; erros: string[] } {
        const erros: string[] = [];
        
        // Validar CRT
        if (!["1", "2", "3"].includes(crt)) {
            erros.push(`CRT inválido: ${crt}. Deve ser 1, 2 ou 3`);
        }
        
        // Validar CST
        const validacaoCST = this.validarCST(cst);
        if (!validacaoCST.valido) {
            erros.push(`CST inválido: ${cst}`);
        }
        
        // Validar valor (se fornecido)
        if (valor !== undefined && (valor < 0 || isNaN(valor))) {
            erros.push(`Valor inválido: ${valor}. Deve ser um número positivo`);
        }
        
        return {
            valido: erros.length === 0,
            erros
        };
    }

    /**
     * 📋 OBTER INFORMAÇÕES COMPLETAS (para debugging/logs)
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

    /**
     * 🎯 SIMULAR CÁLCULO COMPLETO (para testes)
     */
    static simularCalculoCompleto(crt: string, cstPIS: string, cstCOFINS: string, valorProduto: number): any {
        console.log(`\n🧮 === SIMULAÇÃO DE CÁLCULO TRIBUTÁRIO ===`);
        console.log(`📋 Dados: CRT=${crt}, CST_PIS=${cstPIS}, CST_COFINS=${cstCOFINS}, Valor=R$${valorProduto}`);
        
        // Validar dados
        const validacao = this.validarDadosTributacao(crt, cstPIS, valorProduto);
        if (!validacao.valido) {
            console.error(`❌ Dados inválidos:`, validacao.erros);
            return { erro: validacao.erros };
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
        
        console.log(`✅ Resultado:`, resultado.resumo);
        console.log(`🔚 === FIM DA SIMULAÇÃO ===\n`);
        
        return resultado;
    }

    /**
     * 📊 RELATÓRIO DE ALÍQUOTAS (para consulta rápida)
     */
    static obterRelatorioAliquotas(): any {
        return {
            versao: "1.0.0",
            data_atualizacao: new Date().toISOString(),
            regimes: {
                simples_nacional: {
                    crt: "1",
                    nome: "Simples Nacional", 
                    pis: "0.00%",
                    cofins: "0.00%",
                    observacao: "Recolhido via DAS - Lei Complementar 123/2006"
                },
                lucro_real: {
                    crt: "3",
                    nome: "Lucro Real",
                    pis: "1.65%", 
                    cofins: "7.60%",
                    observacao: "Regime não-cumulativo - Lei 10.833/2003"
                },
                lucro_presumido: {
                    crt: "3",
                    nome: "Lucro Presumido",
                    pis: "0.65%",
                    cofins: "3.00%", 
                    observacao: "Regime cumulativo - Lei 10.637/2002"
                }
            },
            csts_suportados: {
                "01": "Operação tributável",
                "02": "Operação tributável (alíquota diferenciada)",
                "07": "Operação isenta",
                "08": "Operação sem incidência", 
                "49": "Outras operações de saída",
                "99": "Outras operações"
            },
            casos_uso: {
                loja_suvenirs_sn: {
                    cenario: "Loja de suvenirs (Simples Nacional)",
                    crt: "1",
                    cst: "49",
                    resultado: "PIS=0%, COFINS=0%"
                },
                empresa_grande_lr: {
                    cenario: "Empresa grande (Lucro Real)",
                    crt: "3",
                    cst: "01", 
                    resultado: "PIS=1.65%, COFINS=7.60%"
                },
                produto_isento: {
                    cenario: "Produto isento",
                    crt: "3",
                    cst: "07",
                    resultado: "PIS=0%, COFINS=0%"
                }
            }
        };
    }
}
