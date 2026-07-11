type NewUserCredentialsTemplateInput = {
  loginUrl: string;
  temporaryPassword: string;
  appName?: string;
};

export function buildNewUserCredentialsEmail({
  loginUrl,
  temporaryPassword,
  appName = 'Homena',
}: NewUserCredentialsTemplateInput) {
  const subject = `${appName}: acceso creado para tu cuenta`;

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">Se creó tu cuenta en ${appName}</h1>
        <p>Ya puedes ingresar al panel con tu email y la siguiente contraseña temporal:</p>
        <p style="font-size: 18px; font-weight: bold; letter-spacing: 1px;">${temporaryPassword}</p>
        <p>
          <a href="${loginUrl}" style="display:inline-block;background:#0f5e59;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">
            Ir al login
          </a>
        </p>
        <p>Te recomendamos cambiar esta contraseña apenas inicies sesión.</p>
      </div>
    `,
    text: [
      `Se creó tu cuenta en ${appName}`,
      `Contraseña temporal: ${temporaryPassword}`,
      `Ingresa aquí: ${loginUrl}`,
      'Te recomendamos cambiarla apenas inicies sesión.',
    ].join('\n\n'),
  };
}
