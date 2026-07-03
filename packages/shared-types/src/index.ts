// =============================================================================
// ZENTIC.pro — Shared TypeScript types
// Importar en backend: import { UserRole } from '@zentic/shared-types'
// Importar en frontend: import { UserRole } from '@zentic/shared-types'
// =============================================================================

// ---------- Enums -----------------------------------------------------------

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

export enum TenantPlan {
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TenantStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export enum EventStatus {
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  PAUSED = 'PAUSED',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
  INTERRUPTED = 'INTERRUPTED',
}

export enum ModerationMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum MessageStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ObituaryStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  INTERESTED = 'INTERESTED',
  CONVERTED = 'CONVERTED',
  DISCARDED = 'DISCARDED',
}

export enum LeadSource {
  DIRECT = 'DIRECT',
  WAITROOM = 'WAITROOM',
  EMBED = 'EMBED',
  INVITATION = 'INVITATION',
}

// ---------- Permission codes ------------------------------------------------

export type Permission =
  // Streaming
  | 'streaming:read'
  | 'streaming:create'
  | 'streaming:update'
  | 'streaming:manage'
  | 'streaming:moderate'
  | 'streaming:delete'
  // Obituario
  | 'obituary:read'
  | 'obituary:create'
  | 'obituary:update'
  | 'obituary:publish'
  | 'obituary:delete'
  // Mensajes / Homenajes
  | 'messages:read'
  | 'messages:approve'
  | 'messages:delete'
  | 'messages:export'
  // Aliados / Tienda
  | 'allies:read'
  | 'allies:manage'
  | 'orders:read'
  | 'orders:manage'
  // Clientes y Leads
  | 'clients:read'
  | 'clients:manage'
  | 'leads:read'
  | 'leads:manage'
  | 'leads:export'
  // Invitaciones
  | 'invitations:read'
  | 'invitations:manage'
  // Usuarios y configuración
  | 'users:read'
  | 'users:manage'
  | 'settings:read'
  | 'settings:manage'
  // Analytics
  | 'analytics:read'
  | 'downloads:access'
  // Servicios (ERP)
  | 'services:read'
  | 'services:create'
  | 'services:update'
  | 'services:manage';

// ---------- JWT Payload -----------------------------------------------------

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  permissions: Permission[];
  iat?: number;
  exp?: number;
}

// ---------- Auth responses --------------------------------------------------

export interface AuthTokens {
  accessToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  permissions: Permission[];
}

// ---------- Tenant ----------------------------------------------------------

export interface TenantBrandConfig {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
}

// ---------- Pagination ------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// ---------- API Error -------------------------------------------------------

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ---------- WebSocket events ------------------------------------------------

export interface WsEventPayload {
  eventId: string;
  tenantId: string;
}

export interface WsNewMessage extends WsEventPayload {
  message: {
    id: string;
    authorName: string;
    content: string;
    iconType: string | null;
    createdAt: string;
  };
}

export interface WsViewerCount extends WsEventPayload {
  count: number;
}

export interface WsStreamStatus extends WsEventPayload {
  status: EventStatus;
}
