export interface PdfGenerator<TContext> {
  generate(context: TContext): Promise<Buffer>;
}
