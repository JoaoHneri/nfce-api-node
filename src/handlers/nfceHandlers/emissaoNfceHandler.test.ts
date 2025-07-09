// src/handlers/emissaoNfceHandler.test.ts
import { EmissaoNfceHandler } from './emissaoNfceHandler';

describe('EmissaoNfceHandler - Nova Estrutura de Resposta', () => {
    let handler: EmissaoNfceHandler;

    beforeEach(() => {
        handler = new EmissaoNfceHandler();
    });

    describe('formatarRespostaLimpa', () => {
        it('deve retornar apenas os campos essenciais para o negócio', () => {
            // Dados de teste simulando uma resposta do XML
            const dadosExtraidos = {
                accessKey: '35230714200166000187650010000000017',
                protocol: '135230001234567',
                totalValue: 150.75,
                qrCode: 'https://nfce.sefaz.sp.gov.br/qrcode?chNFe=35230714200166000187650010000000017',
                nfcData: {
                    identification: {
                        number: '000000001',
                        series: '001',
                        issueDate: '09/01/2025, 14:30:15',
                        environment: 'Homologation'
                    },
                    company: {
                        cnpj: '14.200.166/0001-87',
                        corporateName: 'EMPRESA TESTE LTDA',
                        tradeName: 'LOJA TESTE'
                    },
                    totals: {
                        productsTotal: 150.75,
                        discount: 0,
                        freight: 0,
                        insurance: 0,
                        otherExpenses: 0
                    },
                    products: [
                        {
                            nItem: 1,
                            description: 'PRODUTO TESTE',
                            quantity: 1,
                            unitPrice: 150.75,
                            totalPrice: 150.75
                        }
                    ],
                    payments: [
                        {
                            tPag: '01',
                            paymentType: 'Cash',
                            amount: 150.75
                        }
                    ],
                    change: 0,
                    customer: null
                }
            };

            const memberData = {
                cnpj: '14.200.166/0001-87',
                xName: 'EMPRESA TESTE LTDA',
                xFant: 'LOJA TESTE'
            };

            const resultadoEmissao = {
                xmlSigned: '<xml>dados assinados</xml>'
            };

            // Acessar método privado para teste (usando any para bypass TypeScript)
            const resultado = (handler as any).formatarRespostaLimpa(
                dadosExtraidos, 
                memberData, 
                resultadoEmissao
            );

            // ✅ Verificar estrutura essencial
            expect(resultado).toHaveProperty('success', true);
            expect(resultado).toHaveProperty('fiscal');
            expect(resultado).toHaveProperty('financial');
            expect(resultado).toHaveProperty('company');
            expect(resultado).toHaveProperty('customer');
            expect(resultado).toHaveProperty('products');
            expect(resultado).toHaveProperty('payment');
            expect(resultado).toHaveProperty('qrCode');
            expect(resultado).toHaveProperty('xmlSigned');

            // ❌ Verificar que campos técnicos foram removidos
            expect(resultado).not.toHaveProperty('detectedMode');
            expect(resultado).not.toHaveProperty('documents');
            expect(resultado).not.toHaveProperty('processing');
            expect(resultado).not.toHaveProperty('numbering');
            expect(resultado).not.toHaveProperty('dateTime');
            expect(resultado).not.toHaveProperty('status');
            expect(resultado).not.toHaveProperty('reason');
            expect(resultado).not.toHaveProperty('cStat');
            expect(resultado).not.toHaveProperty('nfcData');

            // ✅ Verificar conteúdo dos dados fiscais
            expect(resultado.fiscal).toEqual({
                accessKey: '35230714200166000187650010000000017',
                protocol: '135230001234567',
                number: '000000001',
                series: '001',
                issueDate: '09/01/2025, 14:30:15',
                environment: 'Homologation'
            });

            // ✅ Verificar conteúdo dos dados financeiros
            expect(resultado.financial).toEqual({
                totalValue: 150.75,
                productsTotal: 150.75,
                discount: 0,
                freight: 0,
                insurance: 0,
                otherExpenses: 0,
                change: 0
            });

            // ✅ Verificar QR Code e XML
            expect(resultado.qrCode).toBe('https://nfce.sefaz.sp.gov.br/qrcode?chNFe=35230714200166000187650010000000017');
            expect(resultado.xmlSigned).toBe('<xml>dados assinados</xml>');
        });

        it('deve tratar customer null adequadamente', () => {
            const dadosExtraidos = {
                accessKey: '123',
                protocol: '456',
                totalValue: 100,
                qrCode: 'test',
                nfcData: {
                    identification: {},
                    company: {},
                    totals: {},
                    products: [],
                    payments: [],
                    change: 0,
                    customer: null // Cliente não informado
                }
            };

            const resultado = (handler as any).formatarRespostaLimpa(
                dadosExtraidos, 
                { cnpj: '123', xName: 'Test', xFant: 'Test' }, 
                { xmlSigned: 'test' }
            );

            expect(resultado.customer).toBeNull();
        });

        it('deve usar fallbacks quando dados não estão disponíveis', () => {
            const dadosExtraidos = {
                accessKey: '123',
                protocol: '456',
                totalValue: 100,
                qrCode: 'test',
                nfcData: null // Dados não disponíveis
            };

            const memberData = {
                cnpj: '14.200.166/0001-87',
                xName: 'EMPRESA TESTE LTDA',
                xFant: 'LOJA TESTE'
            };

            const resultado = (handler as any).formatarRespostaLimpa(
                dadosExtraidos, 
                memberData, 
                { xmlSigned: 'test' }
            );

            // Deve usar dados do memberData como fallback
            expect(resultado.company.cnpj).toBe('14.200.166/0001-87');
            expect(resultado.company.corporateName).toBe('EMPRESA TESTE LTDA');
            expect(resultado.company.tradeName).toBe('LOJA TESTE');
            
            // Campos vazios devem ter valores padrão
            expect(resultado.products).toEqual([]);
            expect(resultado.payment.methods).toEqual([]);
            expect(resultado.financial.productsTotal).toBe(0);
        });
    });

    describe('Compatibilidade de resposta', () => {
        it('deve manter compatibilidade com clientes que esperam success e error', () => {
            const dadosExtraidos = {
                accessKey: '123',
                protocol: '456',
                totalValue: 100,
                qrCode: 'test',
                nfcData: { identification: {}, company: {}, totals: {}, products: [], payments: [], change: 0, customer: null }
            };

            const resultado = (handler as any).formatarRespostaLimpa(
                dadosExtraidos, 
                { cnpj: '123', xName: 'Test', xFant: 'Test' }, 
                { xmlSigned: 'test' }
            );

            // Campos de compatibilidade essenciais
            expect(resultado).toHaveProperty('success', true);
            expect(resultado).not.toHaveProperty('error');
        });
    });
});
