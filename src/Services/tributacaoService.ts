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

}
