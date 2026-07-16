export interface InvitationRenderPlace {
  venueName: string;
  roomName: string;
  /** null → el template debe mostrar "Dirección por confirmar". */
  address: string | null;
}

export interface InvitationRenderBrand {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
}

export interface InvitationRenderContext {
  deceasedFullName: string;
  /** Data URI base64 lista para <image href>, o null → dibujar placeholder con iniciales. */
  deceasedPhotoDataUri: string | null;
  message: string | null;
  scheduledAt: Date;
  ceremonyType: string;
  /** null → "Dirección por confirmar" (caso borde §13 del spec). */
  place: InvitationRenderPlace | null;
  /** Solo se muestra si no es null — ver RN-INV-004. */
  accessCodeDisplay: string | null;
  tenantName: string;
  tenantLogoDataUri: string | null;
  brand: InvitationRenderBrand;
}

export interface InvitationRenderSize {
  width: number;
  height: number;
}

export interface InvitationTemplateRenderer {
  renderSvg(
    context: InvitationRenderContext,
    size: InvitationRenderSize,
  ): string;
}
