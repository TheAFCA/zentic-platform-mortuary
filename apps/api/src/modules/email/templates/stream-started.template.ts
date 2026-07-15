type StreamStartedTemplateInput = {
  eventTitle: string;
  eventUrl: string;
  appName?: string;
};

export function buildStreamStartedEmail({
  eventTitle,
  eventUrl,
  appName = 'Homena',
}: StreamStartedTemplateInput) {
  const subject = `${appName}: la transmisión de "${eventTitle}" ya comenzó`;

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">La transmisión de "${eventTitle}" está en vivo</h1>
        <p>Puedes acompañar la ceremonia desde cualquier lugar.</p>
        <p>
          <a href="${eventUrl}" style="display:inline-block;background:#0f5e59;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;">
            Ver transmisión
          </a>
        </p>
      </div>
    `,
    text: [
      `La transmisión de "${eventTitle}" está en vivo.`,
      `Míralo aquí: ${eventUrl}`,
    ].join('\n\n'),
  };
}
