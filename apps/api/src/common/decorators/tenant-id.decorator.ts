import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type RequestWithTenant = {
  user?: { tenantId?: string };
  tenantId?: string;
  resolvedTenantId?: string;
};

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    return (
      request.user?.tenantId ??
      request.tenantId ??
      request.resolvedTenantId ??
      ''
    );
  },
);
