import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function getFromAddress() {
  const fromName = process.env.SMTP_FROM_NAME || 'GlobalSupply Techno';
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@globalsupply.in';
  return `"${fromName}" <${fromEmail}>`;
}

export async function sendResetCode(email: string, code: string, companyName?: string) {
  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: 'Password Reset Code - GlobalSupply Techno',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">GlobalSupply Techno</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Warehouse Management System</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 8px;">Password Reset Request</h2>
          ${companyName ? `<p style="color: #64748b; margin: 0 0 16px; font-size: 14px;">Company: ${companyName}</p>` : ''}
          <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">Use the code below to reset your password. It expires in 15 minutes.</p>
          <div style="background: #ffffff; border-radius: 8px; padding: 16px; text-align: center; border: 1px dashed #94a3b8;">
            <span style="font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #2563eb; font-family: 'Courier New', monospace;">${code}</span>
          </div>
          <p style="color: #94a3b8; margin: 16px 0 0; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>
    `,
  });
}

export async function sendAlertEmail(email: string, subject: string, message: string, details?: string) {
  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: `${subject} - GlobalSupply Techno`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="font-size: 24px; color: #1e293b; margin: 0;">GlobalSupply Techno</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Warehouse Management System</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 8px;">${subject}</h2>
          <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">${message}</p>
          ${details ? `<div style="background: #ffffff; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;"><pre style="color: #475569; margin: 0; font-size: 12px; white-space: pre-wrap;">${details}</pre></div>` : ''}
        </div>
        <p style="color: #94a3b8; margin: 16px 0 0; font-size: 12px; text-align: center;">This is an automated alert from GlobalSupply Techno WMS.</p>
      </div>
    `,
  });
}
