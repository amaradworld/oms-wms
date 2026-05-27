import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';

export const generateZplLabel = async (req: AuthRequest, res: Response) => {
  const { skuCode, name, binLocation } = req.body;

  const zpl = `^XA
^FO50,50^ADN,36,20^FD${skuCode}^FS
^FO50,100^ADN,18,10^FD${name || ''}^FS
^FO50,150^ADN,18,10^FDBIN: ${binLocation || 'DEFAULT'}^FS
^FO50,220^BY3^BCN,80,Y,N,N^FD${skuCode}^FS
^XZ`;

  res.setHeader('Content-Type', 'application/x-zpl');
  res.setHeader('Content-Disposition', `attachment; filename=label_${skuCode}.zpl`);
  res.send(zpl);
};
