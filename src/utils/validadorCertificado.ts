import { CertificadoConfig } from "../types";
import { FastifyReply } from 'fastify';

export function validarCertificado(certificado: CertificadoConfig, reply: FastifyReply): boolean {
    // Validação se certificado existe
    if (!certificado) {
      reply.status(400).send({
        success: false,
        message: 'Certificate data is required',
        error: 'The "certificate" field must be sent in the request'
      });
      return false;
    }

    const camposObrigatorios: (keyof CertificadoConfig)[] = ['pfxPath', 'password', 'csc', 'cscId'];

    const camposFaltando = camposObrigatorios.filter(campo => !certificado[campo]);
    
    if (camposFaltando.length > 0) {
      reply.status(400).send({
        success: false,
        message: 'Required certificate fields not provided',
        error: `Missing fields: ${camposFaltando.join(', ')}`
      });
      return false;
    }

    // Validar se arquivo do certificado existe
    // if (!fs.existsSync(certificado.pfxPath)) {
    //   reply.status(400).send({
    //     success: false,
    //     message: 'Certificate file not found',
    //     error: `Invalid path: ${certificado.pfxPath}`
    //   });
    //   return false;
    // }

    return true;
  }
