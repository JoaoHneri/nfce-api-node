import { FastifyInstance } from 'fastify';
import { NFCeController } from '../controllers/nfceController';

const noteController = new NFCeController();

async function routes(fastify: FastifyInstance) {
    

    fastify.post('/notes/:type/issue', {
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
                required: ['memberCnpj', 'environment', 'noteData'],
                properties: {
                    memberCnpj: { type: 'string' },
                    environment: { type: 'number', enum: [1, 2] },
                    noteData: { type: 'object' }
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
