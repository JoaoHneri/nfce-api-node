import { FastifyInstance } from 'fastify';
import { NFCeController } from '../controllers/nfceController';

const noteController = new NFCeController();

async function routes(fastify: FastifyInstance) {
    

    fastify.post('/notes/:type/issue', {
        schema: {
            tags: ['Notas'],
            summary: 'Emitir nota fiscal (NFC-e, NFe, NFSe)',
            description: 'Emite nota fiscal conforme o tipo informado. O payload de noteData varia conforme o tipo, obtenha json para exemplo usando o endpoint /notes/:type/example.',
            params: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['nfce', 'nfe', 'nfse'], description: 'Tipo da nota fiscal' }
                },
                required: ['type']
            },
            body: {
                type: 'object',
                required: ['memberCnpj', 'environment', 'noteData'],
                properties: {
                    memberCnpj: { type: 'string', description: 'CNPJ da empresa emissora' },
                    environment: { type: 'number', enum: [1, 2], description: '1=Produção, 2=Homologação' },
                    noteData: {
                        oneOf: [
                            {
                                title: 'NFC-e',
                                type: 'object',
                                properties: {
                                    type: { type: 'string', enum: ['nfce'] },
                                    ide: {
                                        type: 'object',
                                        properties: {
                                            natOp: { type: 'string' },
                                            serie: { type: 'string' }
                                        }
                                    },
                                    recipient: {
                                        type: 'object',
                                        properties: {
                                            cpf: { type: 'string' },
                                            xName: { type: 'string' },
                                            ieInd: { type: 'string' }
                                        }
                                    },
                                    products: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                cProd: { type: 'string' },
                                                cEAN: { type: 'string' },
                                                xProd: { type: 'string' },
                                                NCM: { type: 'string' },
                                                CFOP: { type: 'string' },
                                                uCom: { type: 'string' },
                                                qCom: { type: 'string' },
                                                vUnCom: { type: 'string' },
                                                vProd: { type: 'string' },
                                                cEANTrib: { type: 'string' },
                                                uTrib: { type: 'string' },
                                                qTrib: { type: 'string' },
                                                vUnTrib: { type: 'string' },
                                                vDesc: { type: 'string' },
                                                indTot: { type: 'string' }
                                            }
                                        }
                                    },
                                    taxes: {
                                        type: 'object',
                                        properties: {
                                            orig: { type: 'string' },
                                            CSOSN: { type: 'string' },
                                            cstPis: { type: 'string' },
                                            cstCofins: { type: 'string' }
                                        }
                                    },
                                    transport: {
                                        type: 'object',
                                        properties: {
                                            mode: { type: 'string' }
                                        }
                                    },
                                    payment: {
                                        type: 'object',
                                        properties: {
                                            detPag: {
                                                type: 'array',
                                                items: {
                                                    type: 'object',
                                                    properties: {
                                                        indPag: { type: 'string' },
                                                        tPag: { type: 'string' },
                                                        vPag: { type: 'string' }
                                                    }
                                                }
                                            },
                                            change: { type: 'string' }
                                        }
                                    },
                                    technicalResponsible: {
                                        type: 'object',
                                        properties: {
                                            CNPJ: { type: 'string' },
                                            xContact: { type: 'string' },
                                            email: { type: 'string' },
                                            phone: { type: 'string' }
                                        }
                                    }
                                }
                            },
                            {
                                title: 'NFe',
                                type: 'object',
                                properties: {
                                    type: { type: 'string', enum: ['nfe'] },
                                    ide: { type: 'object', properties: { natOp: { type: 'string' }, serie: { type: 'string' } } },
                                    emit: { type: 'object', properties: { cnpj: { type: 'string' }, xName: { type: 'string' } } },
                                    products: { type: 'array', items: { type: 'object', properties: { cProd: { type: 'string' }, xProd: { type: 'string' } } } }
                                }
                            },
                            {
                                title: 'NFSe',
                                type: 'object',
                                properties: {
                                    type: { type: 'string', enum: ['nfse'] },
                                    tomador: { type: 'object', properties: { cpfCnpj: { type: 'string' }, nome: { type: 'string' } } },
                                    servico: { type: 'object', properties: { descricao: { type: 'string' }, valor: { type: 'string' } } }
                                }
                            }
                        ]
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'object' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        error: { type: 'string' }
                    }
                }
            }
        },
        handler: noteController.emitirNota.bind(noteController)
    });
    
    fastify.get('/notes/:type/consult/:accessKey/:memberCnpj/:environment', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    accessKey: { type: 'string' },
                    memberCnpj: { type: 'string' },
                    environment: { type: 'string', enum: ['1', '2'] }
                },
                required: ['type', 'accessKey', 'memberCnpj', 'environment']
            }
        },
        handler: noteController.consultarNota.bind(noteController)
    });
    
    fastify.post('/notes/:type/cancel', {
        schema: {
            params: {
                type: 'object',
                properties: {
                    type: { type: 'string' }
                },
                required: ['type']
            },
            body: {
                type: 'object',
                required: ['memberCnpj', 'environment', 'accessKey', 'protocol', 'justification'],
                properties: {
                    memberCnpj: { type: 'string' },
                    environment: { type: 'number', enum: [1, 2] },
                    accessKey: { type: 'string' },
                    protocol: { type: 'string' },
                    justification: { type: 'string', minLength: 15 }
                }
            }
        },
        handler: noteController.cancelarNota.bind(noteController)
    });
    
    fastify.get('/notes/:type/example', {
        
        schema: {
            description: 'Tipos de notas: nfce, nfe, nfse',
            params: {
                type: 'object',
                properties: {
                    type: { type: 'string' }
                },
                required: ['type']
            }
        },
        handler: noteController.obterExemploUnificado.bind(noteController)
    });

    fastify.get('/notes/test', {
        handler: noteController.testeConectividade.bind(noteController)
    });
    

    fastify.get('/notes/cache/stats', {
        handler: noteController.obterEstatisticasCache.bind(noteController)
    });
    

    fastify.delete('/notes/cache/clear', {
        handler: noteController.limparCacheManual.bind(noteController)
    });
    
    fastify.get('/notes/numbering/stats', {
        schema: {
            description: 'Get numbering statistics',
            querystring: {
                type: 'object',
                required: ['cnpj', 'uf', 'serie', 'ambiente'],
                properties: {
                    cnpj: { type: 'string', description: 'Company CNPJ' },
                    uf: { type: 'string', description: 'State code' },
                    serie: { type: 'string', description: 'Note series' },
                    ambiente: { type: 'string', enum: ['1', '2'], description: 'Environment' }
                }
            },
            tags: ['Numbering', 'Statistics']
        },
        handler: noteController.obterEstatisticasNumeracao.bind(noteController)
    });
    
    fastify.post('/notes/numbering/release', {
        schema: {
            description: 'Release reserved numbering',
            body: {
                type: 'object',
                required: ['cnpj', 'uf', 'serie', 'ambiente', 'nNF', 'motivo'],
                properties: {
                    cnpj: { type: 'string' },
                    uf: { type: 'string' },
                    serie: { type: 'string' },
                    ambiente: { type: 'string', enum: ['1', '2'] },
                    nNF: { type: 'string' },
                    motivo: { type: 'string' }
                }
            },
            tags: ['Numbering', 'Maintenance']
        },
        handler: noteController.liberarNumeracao.bind(noteController)
    });
    
    fastify.post('/notes/database/initialize', {
        handler: noteController.criarTabelas.bind(noteController)
    });

}

export default routes;
