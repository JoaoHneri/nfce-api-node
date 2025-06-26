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
        // Lucro Real (não-cumulativo) - Lei 10.833/2003
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
     * 📋 CONSULTAR REGIME TRIBUTÁRIO
     */
    static consultarRegime(crt: string): string {
        switch (crt) {
            case "1":
                return "Simples Nacional";
            case "2": 
                return "Simples Nacional - Excesso";
            case "3":
                return "Regime Normal (Lucro Real/Presumido)";
            default:
                return "Não identificado";
        }
    }
}
