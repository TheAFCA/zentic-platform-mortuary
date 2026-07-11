type TenantSuspendedTemplateInput = {
  tenantName: string;
  reason?: string;
  appName?: string;
};

export function buildTenantSuspendedEmail({
  tenantName,
  reason,
  appName = 'Homena',
}: TenantSuspendedTemplateInput) {
  const subject = `${appName}: tu cuenta ha sido suspendida`;
  const reasonLine = reason
    ? `Motivo: ${reason}`
    : 'No se especificó un motivo.';

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">La cuenta de ${tenantName} ha sido suspendida</h1>
        <p>Los usuarios de tu funeraria no podrán iniciar sesión mientras la cuenta permanezca suspendida.</p>
        <p>${reasonLine}</p>
        <p>Si crees que esto es un error, contacta a soporte respondiendo este correo.</p>
      </div>
    `,
    text: [
      `La cuenta de ${tenantName} ha sido suspendida.`,
      reasonLine,
      'Si crees que esto es un error, contacta a soporte respondiendo este correo.',
    ].join('\n\n'),
  };
}
