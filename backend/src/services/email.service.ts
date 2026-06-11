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

function emailWrapper(content: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="font-size: 24px; color: #1e293b; margin: 0;">GlobalSupply Techno</h1>
        <p style="color: #64748b; margin: 4px 0 0;">Warehouse Management System</p>
      </div>
      ${content}
      <p style="color: #94a3b8; margin: 16px 0 0; font-size: 12px; text-align: center;">This is an automated message from GlobalSupply Techno WMS.</p>
    </div>`;
}

export async function sendResetCode(email: string, code: string, companyName?: string) {
  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: 'Password Reset Code - GlobalSupply Techno',
    html: emailWrapper(`
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
        <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 8px;">Password Reset Request</h2>
        ${companyName ? `<p style="color: #64748b; margin: 0 0 16px; font-size: 14px;">Company: ${companyName}</p>` : ''}
        <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">Use the code below to reset your password. It expires in 15 minutes.</p>
        <div style="background: #ffffff; border-radius: 8px; padding: 16px; text-align: center; border: 1px dashed #94a3b8;">
          <span style="font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #2563eb; font-family: 'Courier New', monospace;">${code}</span>
        </div>
        <p style="color: #94a3b8; margin: 16px 0 0; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `),
  });
}

export async function sendAlertEmail(email: string, subject: string, message: string, details?: string) {
  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: `${subject} - GlobalSupply Techno`,
    html: emailWrapper(`
      <div style="background: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
        <h2 style="font-size: 18px; color: #1e293b; margin: 0 0 8px;">${subject}</h2>
        <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">${message}</p>
        ${details ? `<div style="background: #ffffff; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;"><pre style="color: #475569; margin: 0; font-size: 12px; white-space: pre-wrap;">${details}</pre></div>` : ''}
      </div>
    `),
  });
}

export async function sendOrderConfirmation(email: string, orderNumber: string, customerName: string, items: { name: string; quantity: number; price: number }[], total: number) {
  const itemRows = items.map(i => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569;">${i.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: center;">${i.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569; text-align: right;">₹${i.price.toLocaleString('en-IN')}</td>
    </tr>`).join('');

  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: `Order Confirmed #${orderNumber} - GlobalSupply Techno`,
    html: emailWrapper(`
      <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; border: 1px solid #bbf7d0;">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 48px;">✅</span>
        </div>
        <h2 style="font-size: 18px; color: #166534; margin: 0 0 8px; text-align: center;">Order Confirmed!</h2>
        <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">Hi ${customerName}, your order <strong>#${orderNumber}</strong> has been confirmed.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Item</th>
              <th style="padding: 8px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
              <th style="padding: 8px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px; font-weight: bold; font-size: 14px;">Total</td>
              <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 14px;">₹${total.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
        <p style="color: #475569; font-size: 13px;">We'll notify you when your order ships.</p>
      </div>
    `),
  });
}

export async function sendDispatchNotification(email: string, orderNumber: string, customerName: string, courier: string, awbNumber: string, trackingUrl?: string) {
  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: `Order Shipped #${orderNumber} - GlobalSupply Techno`,
    html: emailWrapper(`
      <div style="background: #eff6ff; border-radius: 12px; padding: 24px; border: 1px solid #bfdbfe;">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 48px;">🚚</span>
        </div>
        <h2 style="font-size: 18px; color: #1e40af; margin: 0 0 8px; text-align: center;">Your Order Has Shipped!</h2>
        <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">Hi ${customerName}, your order <strong>#${orderNumber}</strong> is on its way.</p>
        <div style="background: #ffffff; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #475569;"><strong>Courier:</strong> ${courier}</p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #475569;"><strong>AWB Number:</strong> ${awbNumber}</p>
          ${trackingUrl ? `<p style="margin: 0; font-size: 13px;"><a href="${trackingUrl}" style="color: #2563eb;">Track your order →</a></p>` : ''}
        </div>
      </div>
    `),
  });
}

export async function sendDeliveryNotification(email: string, orderNumber: string, customerName: string, deliveredAt: Date) {
  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: `Order Delivered #${orderNumber} - GlobalSupply Techno`,
    html: emailWrapper(`
      <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; border: 1px solid #bbf7d0;">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 48px;">📦</span>
        </div>
        <h2 style="font-size: 18px; color: #166534; margin: 0 0 8px; text-align: center;">Order Delivered!</h2>
        <p style="color: #475569; margin: 0 0 16px; font-size: 14px;">Hi ${customerName}, your order <strong>#${orderNumber}</strong> has been delivered on ${deliveredAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
        <p style="color: #475569; font-size: 13px;">Thank you for shopping with us! We hope you love your purchase.</p>
      </div>
    `),
  });
}
