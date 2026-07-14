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

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
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
  // Sedes / Salas
  | 'venues:read'
  | 'venues:manage'
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

// ---------- Catálogo de permisos RBAC (Módulo 03: Roles y Permisos) ---------
// Ver mds/03_MODULO_ROLES_PERMISOS.md §4 (catálogo), §5 (matriz de asignabilidad) y §13 (presets).
// Fuente única de verdad para backend y frontend.

export interface PermissionMeta {
  code: Permission;
  module: string;
  label: string;
  description: string;
  /** ¿Puede un TENANT_ADMIN asignar este permiso a un usuario OPERATOR? */
  assignableToOperator: boolean;
  /** ¿Puede un TENANT_ADMIN asignar este permiso a un usuario VIEWER? (RN-RBAC-003: nunca de escritura) */
  assignableToViewer: boolean;
}

export const PERMISSION_CATALOG: Record<Permission, PermissionMeta> = {
  'streaming:read': {
    code: 'streaming:read',
    module: 'Streaming',
    label: 'Ver transmisiones',
    description: 'Ver el listado de eventos y transmisiones',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'streaming:create': {
    code: 'streaming:create',
    module: 'Streaming',
    label: 'Crear evento de streaming',
    description: 'Programar un nuevo evento de transmisión',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'streaming:update': {
    code: 'streaming:update',
    module: 'Streaming',
    label: 'Editar evento de streaming',
    description: 'Modificar datos de un evento programado',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'streaming:manage': {
    code: 'streaming:manage',
    module: 'Streaming',
    label: 'Iniciar/detener transmisión',
    description: 'Controlar el estado en vivo de la transmisión',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'streaming:moderate': {
    code: 'streaming:moderate',
    module: 'Streaming',
    label: 'Moderar mensajes en vivo',
    description: 'Aprobar/rechazar mensajes durante la transmisión',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'streaming:delete': {
    code: 'streaming:delete',
    module: 'Streaming',
    label: 'Eliminar evento',
    description: 'Eliminar un evento (soft delete)',
    assignableToOperator: false,
    assignableToViewer: false,
  },
  'obituary:read': {
    code: 'obituary:read',
    module: 'Obituarios',
    label: 'Ver obituarios',
    description: 'Listar y ver obituarios',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'obituary:create': {
    code: 'obituary:create',
    module: 'Obituarios',
    label: 'Crear obituario',
    description: 'Crear nuevo obituario para un difunto',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'obituary:update': {
    code: 'obituary:update',
    module: 'Obituarios',
    label: 'Editar obituario',
    description: 'Editar contenido de un obituario',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'obituary:publish': {
    code: 'obituary:publish',
    module: 'Obituarios',
    label: 'Publicar/despublicar',
    description: 'Controlar visibilidad pública del obituario',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'obituary:delete': {
    code: 'obituary:delete',
    module: 'Obituarios',
    label: 'Eliminar obituario',
    description: 'Eliminar obituario',
    assignableToOperator: false,
    assignableToViewer: false,
  },
  'messages:read': {
    code: 'messages:read',
    module: 'Mensajes y Homenajes',
    label: 'Ver mensajes',
    description: 'Ver todos los mensajes de homenaje',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'messages:approve': {
    code: 'messages:approve',
    module: 'Mensajes y Homenajes',
    label: 'Aprobar mensajes',
    description: 'Aprobar mensajes pendientes de moderación',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'messages:delete': {
    code: 'messages:delete',
    module: 'Mensajes y Homenajes',
    label: 'Eliminar mensajes',
    description: 'Eliminar mensajes inapropiados',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'messages:export': {
    code: 'messages:export',
    module: 'Mensajes y Homenajes',
    label: 'Exportar libro de homenajes',
    description: 'Generar y descargar el libro de homenajes',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'allies:read': {
    code: 'allies:read',
    module: 'Aliados / Tienda',
    label: 'Ver aliados',
    description: 'Ver listado de aliados y productos',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'allies:manage': {
    code: 'allies:manage',
    module: 'Aliados / Tienda',
    label: 'Gestionar aliados',
    description: 'Crear, editar y eliminar aliados',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'orders:read': {
    code: 'orders:read',
    module: 'Aliados / Tienda',
    label: 'Ver pedidos',
    description: 'Ver historial de pedidos',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'orders:manage': {
    code: 'orders:manage',
    module: 'Aliados / Tienda',
    label: 'Gestionar pedidos',
    description: 'Actualizar estado de pedidos',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'clients:read': {
    code: 'clients:read',
    module: 'Clientes / Familias',
    label: 'Ver clientes',
    description: 'Ver listado de familias/clientes',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'clients:manage': {
    code: 'clients:manage',
    module: 'Clientes / Familias',
    label: 'Gestionar clientes',
    description: 'Crear y editar clientes',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'leads:read': {
    code: 'leads:read',
    module: 'Clientes / Familias',
    label: 'Ver leads',
    description: 'Ver leads generados por la plataforma',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  // No está en 03_MODULO_ROLES_PERMISOS.md — inferido por analogía con clients:manage/orders:manage
  // para soportar el módulo 13 (Leads / Mini-CRM). Confirmar con el dueño de ese módulo.
  'leads:manage': {
    code: 'leads:manage',
    module: 'Clientes / Familias',
    label: 'Gestionar leads',
    description: 'Actualizar estado, notas y conversión de leads',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'leads:export': {
    code: 'leads:export',
    module: 'Clientes / Familias',
    label: 'Exportar leads',
    description: 'Descargar listado de leads',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'venues:read': {
    code: 'venues:read',
    module: 'Sedes / Salas',
    label: 'Ver sedes',
    description: 'Ver listado de sedes y salas',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'venues:manage': {
    code: 'venues:manage',
    module: 'Sedes / Salas',
    label: 'Gestionar sedes',
    description: 'Crear, editar y eliminar sedes y salas',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'invitations:read': {
    code: 'invitations:read',
    module: 'Invitaciones',
    label: 'Ver invitaciones',
    description: 'Ver invitaciones generadas',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'invitations:manage': {
    code: 'invitations:manage',
    module: 'Invitaciones',
    label: 'Crear/editar invitaciones',
    description: 'Generar y editar invitaciones digitales',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'users:read': {
    code: 'users:read',
    module: 'Administración',
    label: 'Ver usuarios',
    description: 'Ver listado de usuarios del tenant',
    assignableToOperator: false,
    assignableToViewer: false,
  },
  'users:manage': {
    code: 'users:manage',
    module: 'Administración',
    label: 'Gestionar usuarios',
    description: 'Crear, editar, activar/desactivar usuarios',
    assignableToOperator: false,
    assignableToViewer: false,
  },
  'settings:read': {
    code: 'settings:read',
    module: 'Administración',
    label: 'Ver configuración',
    description: 'Ver configuración del tenant',
    assignableToOperator: false,
    assignableToViewer: false,
  },
  'settings:manage': {
    code: 'settings:manage',
    module: 'Administración',
    label: 'Editar configuración',
    description: 'Modificar configuración y branding del tenant',
    assignableToOperator: false,
    assignableToViewer: false,
  },
  'analytics:read': {
    code: 'analytics:read',
    module: 'Administración',
    label: 'Ver panel / analytics',
    description: 'Ver dashboard de métricas',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'downloads:access': {
    code: 'downloads:access',
    module: 'Administración',
    label: 'Descargas',
    description: 'Acceso a informes y descargas',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  // Los siguientes 4 códigos no están en 03_MODULO_ROLES_PERMISOS.md — pertenecen al Módulo 17
  // (Gestión de Servicios / ERP), inferidos por el mismo patrón de la tabla (:read para
  // operator+viewer, :create/:update/:manage solo operator). Confirmar con el dueño de ese módulo.
  'services:read': {
    code: 'services:read',
    module: 'Servicios (ERP)',
    label: 'Ver servicios',
    description: 'Ver listado de servicios funerarios contratados',
    assignableToOperator: true,
    assignableToViewer: true,
  },
  'services:create': {
    code: 'services:create',
    module: 'Servicios (ERP)',
    label: 'Crear servicio',
    description: 'Registrar un nuevo servicio funerario',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'services:update': {
    code: 'services:update',
    module: 'Servicios (ERP)',
    label: 'Editar servicio',
    description: 'Modificar datos de un servicio en curso',
    assignableToOperator: true,
    assignableToViewer: false,
  },
  'services:manage': {
    code: 'services:manage',
    module: 'Servicios (ERP)',
    label: 'Gestionar servicios',
    description: 'Administrar el ciclo completo de un servicio funerario',
    assignableToOperator: true,
    assignableToViewer: false,
  },
};

export interface PermissionPreset {
  id: string;
  label: string;
  permissions: Permission[];
}

// §13 — Perfiles de Permisos Predefinidos. Son solo un punto de partida editable para el
// formulario (HU-RBAC-003): el frontend precarga los checkboxes, pero el guardado siempre pasa
// por PermissionsService.setUserPermissions — no existe un endpoint que "aplique" un preset ni se
// persiste el preset elegido.
export const PERMISSION_PRESETS: PermissionPreset[] = [
  {
    id: 'operador-streaming',
    label: 'Operador de Streaming',
    permissions: [
      'streaming:read',
      'streaming:create',
      'streaming:update',
      'streaming:manage',
      'streaming:moderate',
      'obituary:read',
      'messages:read',
      'messages:approve',
    ],
  },
  {
    id: 'operador-obituarios',
    label: 'Operador de Obituarios',
    permissions: [
      'obituary:read',
      'obituary:create',
      'obituary:update',
      'obituary:publish',
      'messages:read',
      'messages:approve',
      'invitations:read',
      'invitations:manage',
    ],
  },
  {
    id: 'operador-tienda',
    label: 'Operador de Tienda',
    permissions: ['allies:read', 'allies:manage', 'orders:read', 'orders:manage', 'clients:read'],
  },
  {
    id: 'solo-lectura',
    label: 'Solo Lectura Completa',
    permissions: [
      'streaming:read',
      'obituary:read',
      'messages:read',
      'allies:read',
      'orders:read',
      'clients:read',
      'leads:read',
      'invitations:read',
      'analytics:read',
      'downloads:access',
    ],
  },
  {
    id: 'recepcionista',
    label: 'Recepcionista',
    permissions: ['clients:read', 'clients:manage', 'leads:read', 'invitations:read', 'invitations:manage'],
  },
];

// ---------- JWT Payload -----------------------------------------------------

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  permissions: Permission[];
  /** Presente solo en tokens de impersonación de Super Admin (ver Módulo 04). */
  impersonatedTenantId?: string;
  impersonationLogId?: string;
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

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  plan: TenantPlan;
  status: TenantStatus;
  suspendedAt: string | null;
  suspendReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantBrandConfig {
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
}

export interface TenantAccountSettings {
  timezone: string;
  locale: string;
  notifyNewLead: boolean;
  notifyPendingMessages: boolean;
  notifyWeeklySummary: boolean;
  requireAccessCodeDefault: boolean;
}

// ---------- Admin General (Módulo 05) ----------------------------------------

export interface AdminDashboardMetrics {
  activeEventsToday: number;
  obituariesPublishedThisMonth: number;
  pendingMessages: number;
  leadsThisMonth: number;
  leadsLastMonth: number;
  leadsDeltaPercent: number | null;
  liveViewers: number;
  totalClients: number;
}

// ---------- Clientes / Familias (Módulo 05) ----------------------------------

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  notes: string | null;
  status: ClientStatus;
  serviceDate: string | null;
  convertedFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Obituarios (Módulo 07) -------------------------------------------

export interface Deceased {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  deathDate: string | null;
  birthCity: string | null;
  deathCity: string | null;
  biography: string | null;
  epitaph: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Obituary {
  id: string;
  tenantId: string;
  deceasedId: string;
  eventId: string | null;
  slug: string;
  status: ObituaryStatus;
  isPublic: boolean;
  accessCode: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deceased: Deceased;
}

export interface ObituaryMessage {
  id: string;
  obituaryId: string;
  authorName: string;
  content: string;
  iconType: string | null;
  status: MessageStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
}

/** Evento de streaming vinculado, forma reducida para la vista pública del obituario. */
export interface PublicObituaryEvent {
  slug: string;
  status: EventStatus;
}

/**
 * Respuesta de GET /obituaries/:slug/public — sin datos internos del tenant.
 * Cuando el obituario tiene isPublic=false y no se envió (o fue incorrecto) el accessCode,
 * accessGranted es false y el resto de campos de contenido vienen vacíos/null — el frontend
 * debe mostrar un formulario para ingresar el código en vez del contenido.
 */
export interface PublicObituary {
  slug: string;
  status: ObituaryStatus;
  isPublic: boolean;
  publishedAt: string | null;
  accessGranted: boolean;
  deceased: Deceased | null;
  event: PublicObituaryEvent | null;
  streamingAction: 'LIVE' | 'RECORDING' | null;
  approvedMessages: ObituaryMessage[];
}

// ---------- Sedes / Salas (Módulo 05) -----------------------------------------

export interface Room {
  id: string;
  venueId: string;
  name: string;
  capacity: number | null;
  createdAt: string;
}

export interface Venue {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  rooms: Room[];
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

// ---------- Security events -------------------------------------------------

export enum SecurityEventType {
  FAILED_LOGIN = 'FAILED_LOGIN',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TENANT_CONTEXT_MISMATCH = 'TENANT_CONTEXT_MISMATCH',
  INVALID_REFRESH_TOKEN = 'INVALID_REFRESH_TOKEN',
}

export interface SecurityEventAlert {
  id: string;
  type: SecurityEventType;
  actorId: string;
  role: UserRole;
  tenantId: string | null;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ---------- Super Admin (Módulo 04) ------------------------------------------

export interface AuditLogEntry {
  id: string;
  actorId: string;
  role: UserRole;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  tenantId: string | null;
  createdAt: string;
}

export interface ImpersonationSession {
  accessToken: string;
  expiresAt: string;
  tenantSlug: string;
  tenantName: string;
  impersonationLogId: string;
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
