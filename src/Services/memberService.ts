import { Connection } from 'mysql2/promise';
import { getDatabaseConfig, createDatabaseConnection } from '../config/database';

export class MemberService {
    
    // ✅ Buscar empresa + certificado (único método necessário)
    async buscarDadosCompletos(cnpj: string, environment: number): Promise<{
        member: any;
        certificate: any;
    } | null> {
        const dbConfig = getDatabaseConfig();
        const connection = await createDatabaseConnection(dbConfig);
        
        try {
            // Buscar empresa
            const [memberRows] = await connection.execute(`
                SELECT 
                    m.id, m.cnpj, m.company_name as xName, m.trade_name as xFant,
                    m.state_registration as ie, m.tax_regime as crt,
                    m.street, m.number, m.complement, m.neighborhood,
                    m.city_code as cityCode, m.city, m.state, m.zipcode as zipCode,
                    m.country_code as cPais, m.country as xPais, m.phone
                FROM member m 
                WHERE m.cnpj = ? AND m.is_active = TRUE
            `, [cnpj]);

            if (!Array.isArray(memberRows) || memberRows.length === 0) {
                return null;
            }

            // Buscar certificado
            const [certificateRows] = await connection.execute(`
                SELECT 
                    c.id, c.pfx_path as pfxPath, c.password, c.csc,
                    c.csc_id as cscId, c.environment, c.uf
                FROM certificates c 
                INNER JOIN member m ON c.member_id = m.id 
                WHERE m.cnpj = ? AND c.environment = ? AND c.is_active = TRUE
                ORDER BY c.created_at DESC LIMIT 1
            `, [cnpj, environment.toString()]);

            if (!Array.isArray(certificateRows) || certificateRows.length === 0) {
                return null;
            }

            return {
                member: memberRows[0],
                certificate: certificateRows[0]
            };

        } finally {
            await connection.end();
        }
    }

    // ✅ Salvar NFCe (único método de save necessário)
    async salvarNFCe(memberData: any, nfceData: any): Promise<void> {
        const dbConfig = getDatabaseConfig();
        const connection = await createDatabaseConnection(dbConfig);
        
        try {
            await connection.execute(`
                INSERT INTO invoices (
                    member_id, access_key, number, cnf, series, issue_date, total_value, 
                    status, protocol, environment, operation_nature, recipient_cpf, recipient_name,
                    xml_content, qr_code, rejection_reason
                ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                memberData.id,
                nfceData.accessKey,
                nfceData.number,
                nfceData.cnf,
                nfceData.series,
                nfceData.totalValue,
                nfceData.status, // 'authorized' ou 'denied'
                nfceData.protocol,
                nfceData.environment,
                nfceData.operationNature,
                nfceData.recipientCpf,
                nfceData.recipientName,
                nfceData.xmlContent,
                nfceData.qrCode,
                nfceData.rejectionReason
            ]);
        } finally {
            await connection.end();
        }
    }
}