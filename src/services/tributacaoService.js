import mysql from 'mysql2/promise';
import { getDatabaseConfig } from '../config/database.js';

// Remover interfaces TypeScript

// Remover tipos dos parâmetros e retornos

export class TributacaoService {

    constructor(connectionConfig) {
        this.connectionPool = mysql.createPool({
            ...connectionConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    // Default values for automatic mode
    static DEFAULT_VALUES = {
        ICMS: {
            orig: "0",        // Nacional
            CSOSN: "400"      // Não tributada pelo Simples Nacional
        },
        PIS: {
            CST: "49",        // Outras operações de saída
            percent: "0.00",
            value: "0.00"
        },
        COFINS: {
            CST: "49",        // Outras operações de saída
            percent: "0.00",
            value: "0.00"
        }
    };

    /**
     * 🆕 DETECTAR MODO AUTOMATICAMENTE
     */
    static detectMode(taxes) {
        // Se não tem taxes, é automático
        if (!taxes || Object.keys(taxes).length === 0) {
            return 'auto';
        }

        // Campos que indicam controle manual total
        const manualFields = [
            'pisValue', 'cofinsValue',           // Valores diretos
            'pisQuantity', 'pisQuantityValue',   // Tributação por quantidade
            'cofinsQuantity', 'cofinsQuantityValue',
            'baseValue'                          // Base customizada
        ];

        // Se tem algum campo de controle manual, é manual
        const hasManualFields = manualFields.some(field =>
            taxes[field] !== undefined
        );

        return hasManualFields ? 'manual' : 'auto';
    }

    /**
     * Process tax data from request and return structured tax information
     */
    static processTaxData(taxes, productValue, crt) {
        // Detectar modo automaticamente
        const mode = this.detectMode(taxes);

        console.log(`🔍 Modo detectado: ${mode}`, { taxes, productValue });

        if (mode === 'auto') {
            return this.processAutomaticMode(taxes, productValue, crt);
        } else {
            return this.processManualMode(taxes, productValue, crt);
        }
    }

    /**
     * Process taxes in automatic mode using fallback values
     */
    static processAutomaticMode(taxes, productValue, crt) {
        const icmsOrig = taxes?.orig || this.DEFAULT_VALUES.ICMS.orig;

        let icms = { orig: icmsOrig };

        if (crt === "1") {
            // Simples Nacional
            icms.CSOSN = taxes?.CSOSN || this.DEFAULT_VALUES.ICMS.CSOSN;
        } else {
            // Regime Normal
            icms.CST = taxes?.cstIcms || "00"; // por padrão
            icms.modBC = taxes?.modalidadeBC || "3"; // base = valor operação
            icms.pICMS = taxes?.icmsPercent || "18.00";
            icms.vBC = productValue.toFixed(2);
            icms.vICMS = this.calculateTaxValue(productValue, icms.pICMS);
        }

        const pisCst = taxes?.cstPis || this.DEFAULT_VALUES.PIS.CST;
        const pisPercent = taxes?.pisPercent || this.DEFAULT_VALUES.PIS.percent;
        const pisValue = taxes?.pisValue || this.calculateTaxValue(productValue, pisPercent);

        const cofinsCst = taxes?.cstCofins || this.DEFAULT_VALUES.COFINS.CST;
        const cofinsPercent = taxes?.cofinsPercent || this.DEFAULT_VALUES.COFINS.percent;
        const cofinsValue = taxes?.cofinsValue || this.calculateTaxValue(productValue, cofinsPercent);

        return {
            icms,
            pis: this.buildPisData(pisCst, productValue, pisPercent, pisValue, taxes),
            cofins: this.buildCofinsData(cofinsCst, productValue, cofinsPercent, cofinsValue, taxes)
        };
    }

    /**
     * Process taxes in manual mode using only provided values
     */
    static processManualMode(taxes, productValue, crt) {
        this.validateManualModeData(taxes);

        const baseValue = taxes.baseValue ? parseFloat(taxes.baseValue) : productValue;

        let icms = {
            orig: taxes.orig
        };

        if (crt === "1") {
            icms.CSOSN = taxes.CSOSN;
        } else {
            icms.CST = taxes.cstIcms || "00";
            icms.modBC = taxes.modalidadeBC || "3";
            icms.pICMS = taxes.icmsPercent || "18.00";
            icms.vBC = baseValue.toFixed(2);
            icms.vICMS = this.calculateTaxValue(baseValue, icms.pICMS);
        }

        return {
            icms,
            pis: this.buildPisData(taxes.cstPis, baseValue, taxes.pisPercent, taxes.pisValue, taxes),
            cofins: this.buildCofinsData(taxes.cstCofins, baseValue, taxes.cofinsPercent, taxes.cofinsValue, taxes)
        };
    }

    /**
     * Build PIS tax data structure
     */
    static buildPisData(cst, baseValue, percent, value, taxes) {
        const pisData = { CST: cst };

        // Check if it's quantity-based taxation
        if (taxes?.pisQuantity && taxes?.pisQuantityValue) {
            pisData.qBCProd = taxes.pisQuantity;
            pisData.vAliqProd = taxes.pisQuantityValue;
            pisData.vPIS = this.calculateQuantityTax(taxes.pisQuantity, taxes.pisQuantityValue);
        } else if (percent && parseFloat(percent) > 0) {
            // Percentage-based taxation
            pisData.vBC = baseValue.toFixed(2);
            pisData.pPIS = percent;
            pisData.vPIS = value || this.calculateTaxValue(baseValue, percent);
        } else if (value && parseFloat(value) > 0) {
            // Fixed value taxation
            pisData.vPIS = value;
        } else {
            // No taxation
            pisData.qBCProd = "0.0000";
            pisData.vAliqProd = "0.0000";
            pisData.vPIS = "0.00";
        }

        return pisData;
    }

    /**
     * Build COFINS tax data structure
     */
    static buildCofinsData(cst, baseValue, percent, value, taxes) {
        const cofinsData = { CST: cst };

        // Check if it's quantity-based taxation
        if (taxes?.cofinsQuantity && taxes?.cofinsQuantityValue) {
            cofinsData.qBCProd = taxes.cofinsQuantity;
            cofinsData.vAliqProd = taxes.cofinsQuantityValue;
            cofinsData.vCOFINS = this.calculateQuantityTax(taxes.cofinsQuantity, taxes.cofinsQuantityValue);
        } else if (percent && parseFloat(percent) > 0) {
            // Percentage-based taxation
            cofinsData.vBC = baseValue.toFixed(2);
            cofinsData.pCOFINS = percent;
            cofinsData.vCOFINS = value || this.calculateTaxValue(baseValue, percent);
        } else if (value && parseFloat(value) > 0) {
            // Fixed value taxation
            cofinsData.vCOFINS = value;
        } else {
            // No taxation
            cofinsData.qBCProd = "0.0000";
            cofinsData.vAliqProd = "0.0000";
            cofinsData.vCOFINS = "0.00";
        }

        return cofinsData;
    }

    /**
     * Calculate tax value based on percentage
     */
    static calculateTaxValue(baseValue, percent) {
        const percentValue = parseFloat(percent);
        return (baseValue * percentValue / 100).toFixed(2);
    }

    /**
     * Calculate tax value based on quantity
     */
    static calculateQuantityTax(quantity, valuePerUnit) {
        const qty = parseFloat(quantity);
        const unitValue = parseFloat(valuePerUnit);
        return (qty * unitValue).toFixed(2);
    }

    /**
     * Validate required fields for manual mode
     */
    static validateManualModeData(taxes) {
        const errors = [];

        if (!taxes.orig) errors.push("orig is required in manual mode");
        if (!taxes.CSOSN) errors.push("CSOSN is required in manual mode");
        if (!taxes.cstPis) errors.push("cstPis is required in manual mode");
        if (!taxes.cstCofins) errors.push("cstCofins is required in manual mode");

        if (errors.length > 0) {
            throw new Error(`Manual taxation mode validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Validate CST codes
     */
    static validateCst(cst) {
        const validCsts = {
            "01": { description: "Taxable operation (base = operation value)", taxed: true },
            "02": { description: "Taxable operation (base = operation value, differentiated rate)", taxed: true },
            "03": { description: "Taxable operation (base = quantity sold × rate per unit)", taxed: true },
            "04": { description: "Taxable operation (single-phase taxation)", taxed: false },
            "05": { description: "Taxable operation (tax substitution)", taxed: false },
            "06": { description: "Taxable operation (zero rate)", taxed: false },
            "07": { description: "Operation exempt from contribution", taxed: false },
            "08": { description: "Operation without incidence of contribution", taxed: false },
            "09": { description: "Operation with contribution suspension", taxed: false },
            "49": { description: "Other outbound operations", taxed: false },
            "50": { description: "Operation with credit right - linked exclusively to taxed revenue in domestic market", taxed: true },
            "99": { description: "Other operations", taxed: false }
        };

        const cstInfo = validCsts[cst];

        if (!cstInfo) {
            return {
                valid: false,
                note: `CST ${cst} is not valid or not supported`
            };
        }

        return {
            valid: true,
            description: cstInfo.description,
            note: cstInfo.taxed ? "CST with taxation" : "CST without taxation"
        };
    }

    async buscarRegraNcm(
        ncm,
        cnpjEmpresa
    ) {
        const [rows] = await this.connectionPool.execute(
            `SELECT tr.*
       FROM ncm_tax_rules tr
       INNER JOIN member m ON m.cnpj = ?
       WHERE tr.ncm = ?
         AND tr.crt = m.tax_regime
       LIMIT 1`,
            [cnpjEmpresa.replace(/\D/g, ''), ncm]
        );
        if (rows.length === 0) return null;
        return rows[0];
    }

}
