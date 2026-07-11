type TenantReactivatedTemplateInput = {
  tenantName: string;
  loginUrl: string;
  appName?: string;
};

export function buildTenantReactivatedEmail({
  tenantName,
  loginUrl,
  appName = 'Homena',
}: TenantReactivatedTemplateInput) {
  const subject = `${appName}: tu cuenta ha sido reactivada`;

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">La cuenta de ${tenantName} fue reactivada</h1>
        <p>Ya puedes volver a ingresar con normalidad.</p>
        <p>
          <a href="${loginUrl}" style="display:inline-block;background:#0f5e59;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">
            Ir al login
          </a>
        </p>
      </div>
    `,
    text: [
      `La cuenta de ${tenantName} fue reactivada.`,
      `Ingresa aquí: ${loginUrl}`,
    ].join('\n\n'),
  };
}
