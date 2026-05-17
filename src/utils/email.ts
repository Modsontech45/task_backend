import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordReset(to: string, name: string, resetToken: string): Promise<void> {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"${process.env.SMTP_NAME || 'MyDayAI'}" <${process.env.SMTP_FROM}>`,
    to,
    subject: 'Réinitialisation de ton mot de passe — MyDayAI',
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
          <tr><td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
              <!-- Header -->
              <tr>
                <td style="background:#2563eb;padding:32px 40px;text-align:center;">
                  <div style="font-size:32px;">📅</div>
                  <h1 style="color:#ffffff;margin:8px 0 0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">MyDayAI</h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:40px;">
                  <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">Bonjour ${name} 👋</p>
                  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                    Tu as demandé à réinitialiser ton mot de passe MyDayAI.<br>
                    Clique sur le bouton ci-dessous — ce lien est valable <strong>1 heure</strong>.
                  </p>
                  <div style="text-align:center;margin:32px 0;">
                    <a href="${resetLink}"
                       style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
                      Réinitialiser mon mot de passe →
                    </a>
                  </div>
                  <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
                    Si tu n'as pas fait cette demande, ignore cet email — ton compte reste sécurisé.<br>
                    Lien direct : <a href="${resetLink}" style="color:#2563eb;word-break:break-all;">${resetLink}</a>
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
                  <p style="margin:0;font-size:11px;color:#9ca3af;">MyDayAI — Ton planning personnel intelligent</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
    text: `Bonjour ${name},\n\nRéinitialise ton mot de passe MyDayAI en cliquant sur ce lien (valable 1 heure) :\n\n${resetLink}\n\nSi tu n'as pas fait cette demande, ignore cet email.\n\nMyDayAI`,
  });
}
