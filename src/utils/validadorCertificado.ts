import { CertificadoConfig } from "../types";
import { FastifyReply } from 'fastify';

export function validarCertificado(certificado: CertificadoConfig, reply: FastifyReply): boolean {
    // Validação se certificado existe
    if (!certificado) {
      reply.status(400).send({
        sucesso: false,
        mensagem: 'Dados do certificado são obrigatórios',
        erro: 'O campo "certificado" deve ser enviado na requisição'
      });
      return false;
    }

    const camposObrigatorios: (keyof CertificadoConfig)[] = ['pfx', 'senha', 'CSC', 'CSCid'];

    const camposFaltando = camposObrigatorios.filter(campo => !certificado[campo]);
    
    if (camposFaltando.length > 0) {
      reply.status(400).send({
        sucesso: false,
        mensagem: 'Campos obrigatórios do certificado não informados',
        erro: `Campos faltando: ${camposFaltando.join(', ')}`
      });
      return false;
    }

    // Validar se arquivo do certificado existe
    // if (!fs.existsSync(certificado.pfx)) {
    //   reply.status(400).send({
    //     sucesso: false,
    //     mensagem: 'Arquivo de certificado não encontrado',
    //     erro: `Caminho inválido: ${certificado.pfx}`
    //   });
    //   return false;
    // }

    return true;
  }
