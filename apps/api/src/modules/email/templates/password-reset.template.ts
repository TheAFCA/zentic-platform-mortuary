type PasswordResetTemplateInput = {
  resetUrl: string;
  appName?: string;
};

export function buildPasswordResetEmail({
  resetUrl,
  appName = 'Homena',
}: PasswordResetTemplateInput) {
  const subject = `${appName}: restablece tu contraseña`;

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">Restablece tu contraseña</h1>
        <p>Recibimos una solicitud para recuperar el acceso a tu cuenta en ${appName}.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#0f5e59;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">
            Restablecer contraseña
          </a>
        </p>
        <p>Este enlace es de un solo uso y vence en 1 hora.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `,
    text: [
      'Restablece tu contraseña',
      `Usa este enlace: ${resetUrl}`,
      'Este enlace es de un solo uso y vence en 1 hora.',
      'Si no solicitaste este cambio, ignora este correo.',
    ].join('\n\n'),
  };
}
