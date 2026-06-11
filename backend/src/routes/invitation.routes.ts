import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { sendInvitationMail, generateInvitationHtml } from '../services/invitation.service';

const router = Router();

router.post('/send', authenticate, authorize(['PLATFORM_ADMIN']), async (req: Request, res: Response) => {
  try {
    const { clientName, clientEmail, companyName, customMessage } = req.body;
    if (!clientEmail || !companyName) {
      return res.status(400).json({ message: 'clientEmail and companyName are required' });
    }

    const hasSmtp = !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!hasSmtp) {
      const html = generateInvitationHtml({ clientName, clientEmail, companyName, customMessage });
      const subject = encodeURIComponent(`Invitation: 45-Day Complimentary Pilot Program — GlobalSupply`);
      const body = encodeURIComponent(html);
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&to=${encodeURIComponent(clientEmail)}&body=${body}`;
      return res.json({ message: 'SMTP not configured. Opening Gmail.', gmailUrl, fallback: true });
    }

    const result = await sendInvitationMail({ clientName, clientEmail, companyName, customMessage });
    if (result.success) {
      res.json({ message: 'Invitation sent successfully', messageId: result.messageId });
    } else {
      res.status(500).json({ message: result.error || 'Failed to send email' });
    }
  } catch {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/preview', (req: Request, res: Response) => {
  try {
    const { clientName, clientEmail, companyName, customMessage } = req.body;
    const html = generateInvitationHtml({ clientName: clientName || '[Client Name]', clientEmail: clientEmail || '', companyName: companyName || '[Company Name]', customMessage });
    res.json({ html });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

router.get('/gmail', authenticate, authorize(['PLATFORM_ADMIN']), (req: Request, res: Response) => {
  try {
    const { name, email, company, message } = req.query as Record<string, string>;
    const html = generateInvitationHtml({
      clientName: name || '[Client Name]',
      clientEmail: email || '',
      companyName: company || '[Company Name]',
      customMessage: message,
    });
    const subject = encodeURIComponent(`Invitation: 45-Day Complimentary Pilot Program — GlobalSupply`);
    const body = encodeURIComponent(html);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    res.json({ url: gmailUrl });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

export default router;
