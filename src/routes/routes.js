import fastify from 'fastify';
import { NFCeController } from '../controllers/nfceController.js';

const noteController = new NFCeController();

async function routes(fastify) {

    fastify.post('/notes/:type/issue', {
        schema: {
            tags: ['Notas'],
            description: 'Emitir nota fiscal (NFC-e, NFe, NFSe)',
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
                required: ['certificate', 'company', 'noteData'],
                properties: {
                    environment: { type: 'number', enum: [1, 2], description: '1=Produção, 2=Homologação' },
                    certificate: {
                        type: 'object',
                        required: ['pfxPath', 'password', 'consumer_key', 'consumer_key_id', 'uf'],
                        properties: {
                            pfxPath: { type: 'string' },
                            password: { type: 'string' },
                            consumer_key: { type: 'string' },
                            consumer_key_id: { type: 'string' },
                            uf: { type: 'string' },
                            environment: { type: 'number', enum: [1, 2] },
                            cnpj: { type: 'string' },
                        }
                    },
                    company: {
                        type: 'object',
                        required: ['cnpj', 'xName', 'xFant', 'ie', 'crt', 'address'],
                        properties: {
                            cnpj: { type: 'string' },
                            xName: { type: 'string' },
                            xFant: { type: 'string' },
                            ie: { type: 'string' },
                            crt: { type: 'string' },
                            address: {
                                type: 'object',
                                required: ['street', 'number', 'neighborhood', 'cityCode', 'city', 'state', 'zipCode', 'cCountry', 'xCountry', 'phone'],
                                properties: {
                                    street: { type: 'string' },
                                    number: { type: 'string' },
                                    neighborhood: { type: 'string' },
                                    cityCode: { type: 'string' },
                                    city: { type: 'string' },
                                    state: { type: 'string' },
                                    zipCode: { type: 'string' },
                                    cCountry: { type: 'string' },
                                    xCountry: { type: 'string' },
                                    phone: { type: 'string' }
                                }
                            }
                        }
                    },
                    noteData: {
                        type: 'object',
                        required: ['ide', 'recipient', 'products', 'payment'],
                        properties: {
                            ide: { type: 'object' }, // pode detalhar mais se quiser
                            recipient: { type: 'object' },
                            products: { type: 'array', items: { type: 'object' } },
                            payment: { type: 'object' }
                        }
                    }
                }
            }
        },
        handler: noteController.emitirNota.bind(noteController)
    });

    fastify.post('/notes/:type/consult/:accessKey', {
        schema: {
            tags: ['Notas'],
            description: 'Consultar nota fiscal informando a chave de acesso',
            params: {
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    accessKey: { type: 'string' }
                },
                required: ['type', 'accessKey']
            },
            body: {
                type: 'object',
                required: ['certificate'],
                properties: {
                    certificate: {
                        type: 'object',
                        required: ['pfxPath', 'password', 'consumer_key', 'consumer_key_id', 'uf', 'environment'],
                        properties: {
                            pfxPath: { type: 'string' },
                            password: { type: 'string' },
                            consumer_key: { type: 'string' },
                            consumer_key_id: { type: 'string' },
                            uf: { type: 'string' },
                            environment: { type: 'number', enum: [1, 2] }
                        }
                    },
                }
            }
        },
        handler: noteController.consultarNota.bind(noteController)
    });

    fastify.post('/notes/:type/cancel', {
        schema: {
            tags: ['Notas'],
            description: 'Cancelar nota fiscal informando a chave de acesso, protocolo e justificativa',
            params: {
                type: 'object',
                properties: {
                    type: { type: 'string' }
                },
                required: ['type']
            },
            body: {
                type: 'object',
                required: ['accessKey', 'protocol', 'justification', 'certificate'],
                properties: {
                    accessKey: { type: 'string' },
                    protocol: { type: 'string' },
                    justification: { type: 'string', minLength: 15 },
                    certificate: {
                        type: 'object',
                        required: ['pfxPath', 'password', 'consumer_key', 'consumer_key_id', 'uf', 'environment'],
                        properties: {
                            pfxPath: { type: 'string' },
                            password: { type: 'string' },
                            consumer_key: { type: 'string' },
                            consumer_key_id: { type: 'string' },
                            uf: { type: 'string' },
                            environment: { type: 'number', enum: [1, 2] }
                        }
                    }
                }
            }
        },
        handler: noteController.cancelarNota.bind(noteController)
    });

    fastify.get('/notes/:type/example', {  
        schema: {
            tags: ['Notas'],
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
        schema:{
             tags: ['Api Status'],
                description: 'Teste de conectividade da API',
        },
        handler: noteController.testeConectividade.bind(noteController)
    });

    fastify.get('/notes/cache/stats', {
        schema: {
            tags: ['Cache'],
            description: 'Obter estatísticas do cache de notas fiscais',
        },
        handler: noteController.obterEstatisticasCache.bind(noteController)
    });


    fastify.delete('/notes/cache/clear', {
        schema: {
            tags: ['Cache'],
            description: 'Limpar o cache de notas fiscais',
        },
        handler: noteController.limparCacheManual.bind(noteController)
    });

}

export default routes;
