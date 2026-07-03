import { SetMetadata } from '@nestjs/common';
import { Permission } from '@zentic/shared-types';

export const PERMISSION_KEY = 'required_permission';

export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
