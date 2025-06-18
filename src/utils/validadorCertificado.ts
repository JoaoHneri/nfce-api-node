import { CertificadoConfig } from "../types";
import { Request, Response } from 'express';

export function validarCertificado(certificado: CertificadoConfig, res: Response): boolean {
    // Validação se certificado existe
    if (!certificado) {
      res.status(400).json({
        sucesso: false,
        mensagem: 'Dados do certificado são obrigatórios',
        erro: 'O campo "certificado" deve ser enviado na requisição'
      });
      return false;
    }

    const camposObrigatorios: (keyof CertificadoConfig)[] = ['pfx', 'senha', 'CSC', 'CSCid'];

    const camposFaltando = camposObrigatorios.filter(campo => !certificado[campo]);
    
    if (camposFaltando.length > 0) {
      res.status(400).json({
        sucesso: false,
        mensagem: 'Campos obrigatórios do certificado não informados',
        erro: `Campos faltando: ${camposFaltando.join(', ')}`
      });
      return false;
    }

    // Validar se arquivo do certificado existe
    // if (!fs.existsSync(certificado.pfx)) {
    //   res.status(400).json({
    //     sucesso: false,
    //     mensagem: 'Arquivo de certificado não encontrado',
    //     erro: `Caminho inválido: ${certificado.pfx}`
    //   });
    //   return false;
    // }

    return true;
  }